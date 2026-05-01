/**
 * channex-sync.service.spec.ts
 * Run: npx jest channex-sync.service.spec --verbose
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ChannexSyncService, MappingMissingError } from './channex-sync.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Prisma mock factory
// ---------------------------------------------------------------------------
const makePrismaMock = () => ({
  listing: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  rate: {
    upsert: jest.fn(),
  },
  syncLog: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((fn) => fn({
    rate: { upsert: jest.fn() },
    syncLog: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
  })),
  $queryRaw: jest.fn(),
});

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const VALID_LISTING = {
  id: 1,
  title: 'Beach House',
  channexPropertyId: 'prop-channex-abc',
  channexRoomId: 'room-channex-xyz',
};

const VALID_UPDATE = {
  listingId: 1,
  date: '2025-10-01',
  price: 199.99,
  available: true,
};

const API_KEY = 'test-api-key';

// ---------------------------------------------------------------------------
// Test 1 — Successful price push
// ---------------------------------------------------------------------------
describe('Test 1: Successful price push', () => {
  let service: ChannexSyncService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    prisma.listing.findUnique.mockResolvedValue(VALID_LISTING);
    prisma.syncLog.findFirst.mockResolvedValue(null);
    prisma.syncLog.create.mockResolvedValue({ id: 1 });
    prisma.syncLog.update.mockResolvedValue({});

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannexSyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ChannexSyncService);
  });

  afterEach(() => jest.clearAllMocks());

  test('applyChange writes to DB and enqueues, drainQueue pushes to Channex', async () => {
    await service.applyChange(VALID_UPDATE, API_KEY);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    prisma.syncLog.findMany.mockResolvedValue([
      { id: 1, details: VALID_UPDATE },
    ]);
    await service.drainQueue(API_KEY);

    const calls = mockFetch.mock.calls;
    const ariCall = calls.find(([url]: [string]) => url.includes('/ari/bulk_update'));
    expect(ariCall).toBeDefined();

    const body = JSON.parse(ariCall[1].body);
    expect(body.values[0].attributes.property_id).toBe(VALID_LISTING.channexPropertyId);
    expect(body.values[1].attributes.rate).toBe(199.99);
  });
});

// ---------------------------------------------------------------------------
// // ---------------------------------------------------------------------------
// Test 2 — Network timeout with retry
// ---------------------------------------------------------------------------
describe('Test 2: Network timeout — verifies retry logic', () => {
  let service: ChannexSyncService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(async () => {
    // CHEAT CODE: Force all backoff delays to execute instantly in the test
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => cb() as any);
    
    prisma = makePrismaMock();
    prisma.listing.findUnique.mockResolvedValue(VALID_LISTING);
    prisma.syncLog.findMany.mockResolvedValue([{ id: 99, details: VALID_UPDATE }]);
    prisma.syncLog.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannexSyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ChannexSyncService);
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('attempts 3 retries on network failure before marking the job as failed', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed: ETIMEDOUT'));

    // Because setTimeout is mocked to 0ms, this will finish almost instantly
    await service.drainQueue(API_KEY);

    const ariCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      url.includes('/ari/bulk_update'),
    );
    expect(ariCalls.length).toBe(16); // 4 queue retries * 4 internal HTTP retries

    expect(prisma.syncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99 },
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Invalid listingId (no Channex mapping)
// ---------------------------------------------------------------------------
describe('Test 3: Missing Channex mapping — verifies error handling', () => {
  let service: ChannexSyncService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(async () => {
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => cb() as any);
    prisma = makePrismaMock();

    prisma.listing.findUnique.mockResolvedValue({
      id: 999,
      title: 'Mystery Property',
      channexPropertyId: null,
      channexRoomId: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannexSyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ChannexSyncService);
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('applyChange throws MappingMissingError and never opens a transaction', async () => {
    const badUpdate = { ...VALID_UPDATE, listingId: 999 };

    await expect(service.applyChange(badUpdate, API_KEY)).rejects.toThrow(
      MappingMissingError,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();

    const ariCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      url.includes('/ari/bulk_update'),
    );
    expect(ariCalls).toHaveLength(0);
  });

  test('drainQueue marks job failed for missing mapping, does not crash worker', async () => {
    prisma.syncLog.findMany.mockResolvedValue([
      { id: 55, details: { ...VALID_UPDATE, listingId: 999 } },
    ]);
    prisma.syncLog.update.mockResolvedValue({});

    await service.drainQueue(API_KEY);

    expect(prisma.syncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 55 },
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
});
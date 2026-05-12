/**
 * channex-certification.spec.ts
 *
 * Backend test suite for Channex PMS Certification — Tasks 1, 2, 3
 *
 * Coverage:
 *   Task 1 — POST /properties/:id/force-sync  →  returns task_id array
 *   Task 2 — POST /bookings/manual            →  creates booking, calls applyChange()
 *   Task 3 — PATCH /bookings/:id              →  modify dates, calls applyChange() x2 (restore + deduct)
 *   Task 3 — PATCH /bookings/:id/cancel       →  cancels booking, calls applyChange() (restore)
 *
 * Anti-patterns eliminated:
 *  ✗ No real Channex API calls (ChannexSyncService is fully mocked)
 *  ✗ No real database writes (PrismaService is fully mocked)
 *  ✗ No test touching channex-sync.service.ts or webhook.service.ts
 *
 * Run:  npm test -- channex-certification --verbose
 *       npm run test:cov  (coverage report)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as sinon from 'sinon';

import { AppModule } from '../app.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ChannexSyncService } from '../channex/channex-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualBookingDto } from './dto/create-manual-booking.dto';

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------

function makePrismaMock() {
  return {
    listing: {
      findUnique:     sinon.stub(),
      findFirst:      sinon.stub(),
      create:         sinon.stub(),
    },
    booking: {
      create:         sinon.stub(),
      findUnique:     sinon.stub(),
      update:         sinon.stub(),
      findMany:       sinon.stub(),
    },
    syncLog: {
      create:         sinon.stub(),
      update:         sinon.stub(),
      findFirst:      sinon.stub(),
      findMany:       sinon.stub(),
    },
    rate: {
      upsert:         sinon.stub(),
    },
    $transaction:    sinon.stub(),
    channexMapping: {
      findFirst:      sinon.stub(),
      create:         sinon.stub(),
      update:         sinon.stub(),
    },
  };
}

function makeChannexSyncMock() {
  return {
    applyChange:  sinon.stub().resolves(undefined),
    pushRateSync: sinon.stub().resolves('mock-task-id-abc'),
    resolveChannexIds: sinon.stub().resolves({
      channexPropertyId: 'prop-123',
      channexRoomTypeId: 'room-456',
      channexRatePlanId: 'rate-789',
    }),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_LISTING = {
  id: 1,
  userId: 'user-abc',
  title: 'Beach Villa',
  channexPropertyId: 'prop-123',
  channexRoomId: 'room-456',
  isActive: true,
};

const MOCK_BOOKING = (overrides = {}) => ({
  id: 42,
  userId: 'user-abc',
  listingId: 1,
  guestName: 'Jane Smith',
  guestEmail: 'jane@example.com',
  guestPhone: null,
  checkIn:  new Date('2025-06-01'),
  checkOut: new Date('2025-06-03'),
  numGuests: 2,
  totalPrice: 599.00,
  status: 'confirmed',
  bookingSource: 'direct',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const AUTH_HEADER = { Authorization: 'Bearer mock-jwt-token' };

// ---------------------------------------------------------------------------
// Tests — TASK 1: Force Full Sync
// ---------------------------------------------------------------------------

describe('Task 1 — POST /properties/:id/force-sync', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof makePrismaMock>;
  let channexSync: ReturnType<typeof makeChannexSyncMock>;
  let controller: any;

  beforeEach(async () => {
    prisma      = makePrismaMock();
    channexSync = makeChannexSyncMock();

    // Mock listing + mapping existence
    prisma.listing.findUnique.resolves(MOCK_LISTING);
    prisma.channexMapping.findFirst.resolves({
      id: 1,
      listingId: 1,
      channexPropertyId: 'prop-123',
      channexRoomTypeId: 'room-456',
      channexRatePlanId: 'rate-789',
      syncStatus: 'active',
    });

    // --- Full module approach: load the real app, override just the services ---
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ChannexSyncService)
      .useValue(channexSync)
      .compile();

    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    sinon.restore();
    await app?.close();
  });

  test('returns { success: true, taskIds[], message } for a valid listing', async () => {
    const res = await request(app.getHttpServer())
      .post('/properties/1/force-sync')
      .set(AUTH_HEADER)
      .expect(200);

    const { success, taskIds, message } = res.body;
    expect(success).toBe(true);
    expect(Array.isArray(taskIds)).toBe(true);
    expect(taskIds.length).toBeGreaterThan(0);
    expect(message).toContain('Force sync complete');
  });

  test('returns 404 when listing has no Channex mapping', async () => {
    prisma.listing.findUnique.resolves({ ...MOCK_LISTING, channexPropertyId: null, channexRoomId: null });
    prisma.channexMapping.findFirst.resolves(null);

    await request(app.getHttpServer())
      .post('/properties/1/force-sync')
      .set(AUTH_HEADER)
      .expect(404);
  });

  test('returns 401 when no auth token is provided', async () => {
    await request(app.getHttpServer())
      .post('/properties/1/force-sync')
      .expect(401);
  });
});

// ---------------------------------------------------------------------------
// Tests — TASK 2: Manual Direct Booking
// ---------------------------------------------------------------------------

describe('Task 2 — POST /bookings/manual', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof makePrismaMock>;
  let channexSync: ReturnType<typeof makeChannexSyncMock>;

  beforeEach(async () => {
    prisma      = makePrismaMock();
    channexSync = makeChannexSyncMock();

    prisma.listing.findUnique.resolves(MOCK_LISTING);
    prisma.booking.create.resolves(MOCK_BOOKING());
    // Allow the $transaction to call rate.upsert and syncLog.create without throwing
    prisma.$transaction.callsFake(async (fn) => {
      const tx = {
        rate: { upsert: sinon.stub().resolves(undefined) },
        syncLog: { create: sinon.stub().resolves({ id: 1 }) },
      };
      return fn(tx);
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ChannexSyncService)
      .useValue(channexSync)
      .compile();

    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    sinon.restore();
    await app?.close();
  });

  test('201 — creates booking with correct fields and calls applyChange()', async () => {
    const payload: CreateManualBookingDto = {
      listingId: 1,
      guestName: 'Jane Smith',
      checkIn:   '2025-06-01',
      checkOut:  '2025-06-03',
      numGuests: 2,
      totalPrice: 599.00,
      bookingSource: 'direct',
    };

    const res = await request(app.getHttpServer())
      .post('/bookings/manual')
      .set(AUTH_HEADER)
      .send(payload)
      .expect(201);

    // Verify booking was created in DB
    expect(prisma.booking.create.calledOnce).toBe(true);
    const createCall = prisma.booking.create.getCall(0);
    expect(createCall.args[0].data.listingId).toBe(1);
    expect(createCall.args[0].data.guestName).toBe('Jane Smith');
    expect(createCall.args[0].data.status).toBe('confirmed');

    // Verify applyChange was called (setImmediate — check via clock or wait)
    // It should be called once per stay night (Jun 1, Jun 2 = 2 calls)
    expect(channexSync.applyChange.callCount).toBe(2);
    const firstCall = channexSync.applyChange.getCall(0).args[0];
    expect(firstCall.listingId).toBe(1);
    expect(firstCall.available).toBe(false); // blocked — not available

    // Verify response body
    expect(res.body.id).toBe(42);
    expect(res.body.guestName).toBe('Jane Smith');
  });

  test('400 — rejects missing guestName', async () => {
    await request(app.getHttpServer())
      .post('/bookings/manual')
      .set(AUTH_HEADER)
      .send({ listingId: 1, checkIn: '2025-06-01', checkOut: '2025-06-03', numGuests: 1, totalPrice: 100 })
      .expect(400);
  });

  test('400 — rejects checkOut before checkIn', async () => {
    await request(app.getHttpServer())
      .post('/bookings/manual')
      .set(AUTH_HEADER)
      .send({
        listingId: 1,
        guestName: 'Jane',
        checkIn:   '2025-06-05',
        checkOut:  '2025-06-01',
        numGuests: 1,
        totalPrice: 100,
      })
      .expect(400);
  });

  test('400 — rejects unknown listingId', async () => {
    prisma.listing.findUnique.resolves(null);

    await request(app.getHttpServer())
      .post('/bookings/manual')
      .set(AUTH_HEADER)
      .send({
        listingId: 999,
        guestName: 'Jane',
        checkIn:   '2025-06-01',
        checkOut:  '2025-06-03',
        numGuests: 1,
        totalPrice: 100,
      })
      .expect(400);
  });
});

// ---------------------------------------------------------------------------
// Tests — TASK 3: Modify Booking Dates
// ---------------------------------------------------------------------------

describe('Task 3 — PATCH /bookings/:id (Modify Dates)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof makePrismaMock>;
  let channexSync: ReturnType<typeof makeChannexSyncMock>;

  const OLD_BOOKING = MOCK_BOOKING({ id: 99 });
  const UPDATED_BOOKING = {
    ...OLD_BOOKING,
    checkIn:  new Date('2025-07-01'),
    checkOut: new Date('2025-07-04'),
  };

  beforeEach(async () => {
    prisma      = makePrismaMock();
    channexSync = makeChannexSyncMock();

    prisma.booking.findUnique.withArgs({ where: { id: 99 } }).resolves(OLD_BOOKING);
    prisma.booking.update.resolves(UPDATED_BOOKING);
    prisma.$transaction.callsFake(async (fn) => {
      const tx = {
        rate: { upsert: sinon.stub().resolves(undefined) },
        syncLog: { create: sinon.stub().resolves({ id: 1 }) },
      };
      return fn(tx);
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ChannexSyncService)
      .useValue(channexSync)
      .compile();

    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    sinon.restore();
    await app?.close();
  });

  test('200 — date change calls applyChange() twice: restore old + deduct new', async () => {
    await request(app.getHttpServer())
      .patch('/bookings/99')
      .set(AUTH_HEADER)
      .send({ checkIn: '2025-07-01', checkOut: '2025-07-04' })
      .expect(200);

    expect(channexSync.applyChange.callCount).toBe(2); // restore + deduct

    // First call: restore old dates (available = true)
    const restoreCall = channexSync.applyChange.getCall(0);
    expect(restoreCall.args[0].listingId).toBe(1);
    expect(restoreCall.args[0].available).toBe(true);
    // Old range: Jun 1 and Jun 2 → 2 calls
    expect(restoreCall.args[0].date).toMatch(/^2025-06-/);

    // Second call: deduct new dates (available = false)
    const deductCall = channexSync.applyChange.getCall(1);
    expect(deductCall.args[0].listingId).toBe(1);
    expect(deductCall.args[0].available).toBe(false);
    // New range: Jul 1, 2, 3 → 3 calls
    expect(deductCall.args[0].date).toMatch(/^2025-07-/);
  });

  test('404 — returns 404 when booking does not exist', async () => {
    prisma.booking.findUnique.withArgs({ where: { id: 999 } }).resolves(null);

    await request(app.getHttpServer())
      .patch('/bookings/999')
      .set(AUTH_HEADER)
      .send({ checkIn: '2025-07-01', checkOut: '2025-07-04' })
      .expect(404);
  });
});

// ---------------------------------------------------------------------------
// Tests — TASK 3: Cancel Booking
// ---------------------------------------------------------------------------

describe('Task 3 — PATCH /bookings/:id/cancel (Cancel)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof makePrismaMock>;
  let channexSync: ReturnType<typeof makeChannexSyncMock>;

  const ACTIVE_BOOKING = MOCK_BOOKING({ id: 55, status: 'confirmed' });
  const CANCELLED_BOOKING = { ...ACTIVE_BOOKING, status: 'cancelled' };

  beforeEach(async () => {
    prisma      = makePrismaMock();
    channexSync = makeChannexSyncMock();

    prisma.booking.findUnique.withArgs({ where: { id: 55 } }).resolves(ACTIVE_BOOKING);
    prisma.booking.update.resolves(CANCELLED_BOOKING);
    prisma.$transaction.callsFake(async (fn) => {
      const tx = {
        rate: { upsert: sinon.stub().resolves(undefined) },
        syncLog: { create: sinon.stub().resolves({ id: 1 }) },
      };
      return fn(tx);
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ChannexSyncService)
      .useValue(channexSync)
      .compile();

    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    sinon.restore();
    await app?.close();
  });

  test('200 — cancel calls applyChange() for all stay nights with available=true', async () => {
    await request(app.getHttpServer())
      .patch('/bookings/55/cancel')
      .set(AUTH_HEADER)
      .expect(200);

    // Jun 1 + Jun 2 = 2 stay nights → 2 applyChange calls
    expect(channexSync.applyChange.callCount).toBe(2);

    channexSync.applyChange.getCalls().forEach(call => {
      expect(call.args[0].listingId).toBe(1);
      expect(call.args[0].available).toBe(true); // restore = available
    });

    // Verify DB was updated to cancelled
    expect(prisma.booking.update.calledOnce).toBe(true);
    expect(prisma.booking.update.getCall(0).args[0].data.status).toBe('cancelled');

    // Verify response
    const res = await request(app.getHttpServer()).patch('/bookings/55/cancel');
    expect(res.body.status).toBe('cancelled');
  });

  test('404 — returns 404 when booking does not exist', async () => {
    prisma.booking.findUnique.withArgs({ where: { id: 888 } }).resolves(null);

    await request(app.getHttpServer())
      .patch('/bookings/888/cancel')
      .set(AUTH_HEADER)
      .expect(404);
  });

  test('401 — rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .patch('/bookings/55/cancel')
      .expect(401);
  });
});

// ---------------------------------------------------------------------------
// Integration: applyChange event emission correctness
// ---------------------------------------------------------------------------

describe('Event emission correctness — applyChange called with correct params', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof makePrismaMock>;
  let channexSync: ReturnType<typeof makeChannexSyncMock>;

  beforeEach(async () => {
    prisma      = makePrismaMock();
    channexSync = makeChannexSyncMock();

    prisma.listing.findUnique.resolves(MOCK_LISTING);
    prisma.booking.create.resolves(MOCK_BOOKING());
    prisma.booking.findUnique.resolves(MOCK_BOOKING());
    prisma.booking.update.resolves(MOCK_BOOKING());
    prisma.$transaction.callsFake(async (fn) => {
      const tx = {
        rate: { upsert: sinon.stub().resolves(undefined) },
        syncLog: { create: sinon.stub().resolves({ id: 1 }) },
      };
      return fn(tx);
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ChannexSyncService)
      .useValue(channexSync)
      .compile();

    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    sinon.restore();
    await app?.close();
  });

  test('applyChange never called with available=undefined (always explicit boolean)', async () => {
    await request(app.getHttpServer())
      .post('/bookings/manual')
      .set(AUTH_HEADER)
      .send({
        listingId: 1,
        guestName: 'Test Guest',
        checkIn:   '2025-06-01',
        checkOut:  '2025-06-02',
        numGuests: 1,
        totalPrice: 100,
      })
      .expect(201);

    channexSync.applyChange.getCalls().forEach(call => {
      const update = call.args[0];
      expect(typeof update.available).toBe('boolean');
    });
  });
});
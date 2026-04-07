import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testListingId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    authToken = 'Bearer test-token';

    // Create test user and listing
    const user = await prisma.user.create({
      data: {
        id: 'booking-test-user-uuid',
        email: 'bookingtest@example.com',
      },
    });
    testUserId = user.id;

    const listing = await prisma.listing.create({
      data: {
        userId: testUserId,
        title: 'Booking Test Property',
      },
    });
    testListingId = listing.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({});
    await prisma.listing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('/bookings (POST)', () => {
    it('should create a new booking', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send({
          listingId: testListingId,
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          checkIn: new Date('2024-06-01'),
          checkOut: new Date('2024-06-05'),
          numGuests: 2,
          totalPrice: 600.00,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.guestName).toBe('John Doe');
          expect(res.body.numGuests).toBe(2);
        });
    });
  });

  describe('/bookings (GET)', () => {
    it('should return array of bookings', () => {
      return request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/bookings/upcoming (GET)', () => {
    it('should return upcoming bookings', () => {
      return request(app.getHttpServer())
        .get('/bookings/upcoming')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/bookings/:id/cancel (PATCH)', () => {
    it('should cancel a booking', async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          listingId: testListingId,
          guestName: 'Cancel Test',
          checkIn: new Date('2024-07-01'),
          checkOut: new Date('2024-07-05'),
          numGuests: 2,
          totalPrice: 500,
        },
      });

      return request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/cancel`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('cancelled');
        });
    });
  });
});


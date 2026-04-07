import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Calendar (e2e)', () => {
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

    const user = await prisma.user.create({
      data: {
        id: 'calendar-test-user-uuid',
        email: 'calendartest@example.com',
      },
    });
    testUserId = user.id;

    const listing = await prisma.listing.create({
      data: {
        userId: testUserId,
        title: 'Calendar Test Property',
      },
    });
    testListingId = listing.id;
  });

  afterAll(async () => {
    await prisma.rate.deleteMany({});
    await prisma.blockedDate.deleteMany({});
    await prisma.listing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('/calendar/rates (POST)', () => {
    it('should update a rate', () => {
      return request(app.getHttpServer())
        .post('/calendar/rates')
        .set('Authorization', authToken)
        .send({
          listingId: testListingId,
          date: new Date('2024-06-01'),
          price: 150.00,
          minStay: 2,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.price).toBeDefined();
        });
    });
  });

  describe('/calendar/rates/bulk (POST)', () => {
    it('should bulk update rates', () => {
      return request(app.getHttpServer())
        .post('/calendar/rates/bulk')
        .set('Authorization', authToken)
        .send({
          listingId: testListingId,
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-07-07'),
          price: 175.00,
          minStay: 3,
        })
        .expect(201);
    });
  });

  describe('/calendar/block (POST)', () => {
    it('should block a date', () => {
      return request(app.getHttpServer())
        .post('/calendar/block')
        .set('Authorization', authToken)
        .send({
          listingId: testListingId,
          date: new Date('2024-08-01'),
          reason: 'Maintenance',
        })
        .expect(201);
    });
  });

  describe('/calendar/block/bulk (POST)', () => {
    it('should bulk block dates', () => {
      return request(app.getHttpServer())
        .post('/calendar/block/bulk')
        .set('Authorization', authToken)
        .send({
          listingId: testListingId,
          dates: [
            new Date('2024-09-01'),
            new Date('2024-09-02'),
            new Date('2024-09-03'),
          ],
          reason: 'Owner block',
        })
        .expect(201);
    });
  });

  describe('/calendar/data (GET)', () => {
    it('should return calendar data', () => {
      return request(app.getHttpServer())
        .get('/calendar/data')
        .query({
          listingId: testListingId,
          startDate: '2024-06-01',
          endDate: '2024-06-30',
        })
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('rates');
          expect(res.body).toHaveProperty('blockedDates');
          expect(res.body).toHaveProperty('bookings');
        });
    });
  });
});


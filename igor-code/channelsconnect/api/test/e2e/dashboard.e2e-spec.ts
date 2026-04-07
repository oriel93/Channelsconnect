import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/dashboard (GET)', () => {
    it('should return dashboard data', () => {
      return request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('stats');
          expect(res.body).toHaveProperty('recentBookings');
        });
    });
  });

  describe('/dashboard/calendar (GET)', () => {
    it('should return calendar dashboard data', () => {
      return request(app.getHttpServer())
        .get('/dashboard/calendar')
        .query({
          startDate: '2024-06-01',
          endDate: '2024-06-30',
        })
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('listings');
          expect(res.body).toHaveProperty('bookings');
        });
    });
  });

  describe('/dashboard/channels (GET)', () => {
    it('should return channels dashboard data', () => {
      return request(app.getHttpServer())
        .get('/dashboard/channels')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('stats');
        });
    });
  });
});


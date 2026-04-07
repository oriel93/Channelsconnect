import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Users (e2e)', () => {
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

    // Mock auth token for testing
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should return array of users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });

  describe('/users/me (GET)', () => {
    it('should return current user', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', authToken)
        .expect(200);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return a specific user', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: 'test-user-uuid-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      return request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user.id);
          expect(res.body.email).toBe(user.email);
        });
    });
  });

  describe('/users/:id (PATCH)', () => {
    it('should update a user', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-uuid-2',
          email: 'test2@example.com',
        },
      });

      return request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .set('Authorization', authToken)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
        });
    });
  });
});


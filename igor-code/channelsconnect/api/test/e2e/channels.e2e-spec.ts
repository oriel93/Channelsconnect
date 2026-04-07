import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Channels (e2e)', () => {
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
    await prisma.channel.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('/channels (POST)', () => {
    it('should create a new channel', () => {
      return request(app.getHttpServer())
        .post('/channels')
        .set('Authorization', authToken)
        .send({
          name: 'Test Channel',
          slug: 'test-channel',
          description: 'A test channel',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Test Channel');
          expect(res.body.slug).toBe('test-channel');
        });
    });
  });

  describe('/channels (GET)', () => {
    it('should return array of channels', () => {
      return request(app.getHttpServer())
        .get('/channels')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/channels/active (GET)', () => {
    it('should return only active channels', () => {
      return request(app.getHttpServer())
        .get('/channels/active')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});


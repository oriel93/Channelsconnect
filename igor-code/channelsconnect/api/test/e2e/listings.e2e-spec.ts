import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Listings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    authToken = 'Bearer test-token';

    // Create test user
    const user = await prisma.user.create({
      data: {
        id: 'listing-test-user-uuid',
        email: 'listingtest@example.com',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.listing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('/listings (POST)', () => {
    it('should create a new listing', () => {
      return request(app.getHttpServer())
        .post('/listings')
        .set('Authorization', authToken)
        .send({
          title: 'Test Property',
          description: 'A beautiful test property',
          city: 'Test City',
          country: 'Test Country',
          bedrooms: 3,
          bathrooms: 2,
          maxGuests: 6,
          basePrice: 150.00,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe('Test Property');
          expect(res.body.bedrooms).toBe(3);
        });
    });
  });

  describe('/listings (GET)', () => {
    it('should return array of listings', () => {
      return request(app.getHttpServer())
        .get('/listings')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/listings/my-listings (GET)', () => {
    it('should return current user listings', () => {
      return request(app.getHttpServer())
        .get('/listings/my-listings')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/listings/:id (GET)', () => {
    it('should return a specific listing with details', async () => {
      const listing = await prisma.listing.create({
        data: {
          userId: testUserId,
          title: 'Detail Test Property',
          city: 'Test City',
        },
      });

      return request(app.getHttpServer())
        .get(`/listings/${listing.id}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(listing.id);
          expect(res.body.title).toBe('Detail Test Property');
        });
    });
  });

  describe('/listings/:id (PATCH)', () => {
    it('should update a listing', async () => {
      const listing = await prisma.listing.create({
        data: {
          userId: testUserId,
          title: 'Update Test Property',
        },
      });

      return request(app.getHttpServer())
        .patch(`/listings/${listing.id}`)
        .set('Authorization', authToken)
        .send({ title: 'Updated Property Name', bedrooms: 4 })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Property Name');
          expect(res.body.bedrooms).toBe(4);
        });
    });
  });

  describe('/listings/:id (DELETE)', () => {
    it('should delete a listing', async () => {
      const listing = await prisma.listing.create({
        data: {
          userId: testUserId,
          title: 'Delete Test Property',
        },
      });

      return request(app.getHttpServer())
        .delete(`/listings/${listing.id}`)
        .set('Authorization', authToken)
        .expect(200);
    });
  });
});


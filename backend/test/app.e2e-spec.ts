import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/shared/prisma.service';

// Los bodies de supertest son `any`.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe('InvoiceShield (e2e)', () => {
  let app: INestApplication;

  const prismaStub = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api → envelope de identidad del protocolo', async () => {
    const res = await request(app.getHttpServer()).get('/api').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('InvoiceShield API');
    expect(res.body.data.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('GET /api/health → estado del servicio', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.database).toBe('up');
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/audit sin sesión → 401 con código AUTH_REQUIRED', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit')
      .expect(401);
    expect(res.body).toMatchObject({ ok: false, code: 'AUTH_REQUIRED' });
  });

  it('login con body inválido → 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'no-es-un-email', password: 'x' })
      .expect(400);
    expect(res.body).toMatchObject({
      ok: false,
      code: 'VALIDATION_ERROR',
    });
  });
});

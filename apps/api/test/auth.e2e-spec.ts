import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MailService } from '../src/mail/mail.service';
import { JwtService } from '../src/auth/jwt.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hash'),
  compare: jest.fn().mockResolvedValue(true),
}));

const prismaMock = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailVerification: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordReset: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  loginAttempt: {
    count: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const mailMock = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const jwtMock = {
  signAccess: jest.fn().mockReturnValue('access-token'),
  signRefresh: jest.fn().mockReturnValue('refresh-token'),
  verifyAccess: jest.fn(),
  verifyRefresh: jest.fn(),
};

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(MailService)
      .useValue(mailMock)
      .overrideProvider(JwtService)
      .useValue(jwtMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/auth/register rejects invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'bad', password: 'short' })
      .expect(400);
  });

  it('POST /api/auth/login returns access token and sets refresh cookie', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      status: 'active',
      role: 'user',
    });
    prismaMock.loginAttempt.count.mockResolvedValue(0);

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Password1' })
      .expect(200);

    expect(res.body).toEqual({
      accessToken: 'access-token',
      user: { id: 'user-1', email: 'user@example.com', role: 'user' },
    });
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('refreshToken=')]),
    );
  });

  it('POST /api/auth/refresh returns 401 when cookie missing', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .expect(401);
  });

  it('POST /api/auth/refresh returns access token for valid cookie', async () => {
    jwtMock.verifyRefresh.mockReturnValue({ sub: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
      status: 'active',
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=refresh-token'])
      .expect(200);

    expect(res.body).toEqual({ accessToken: 'access-token' });
  });

  it('POST /api/auth/forgot-password returns safe response for unknown email', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(200);

    expect(res.body).toEqual({
      message: 'If that email exists, you will receive a reset link',
    });
    expect(prismaMock.passwordReset.create).not.toHaveBeenCalled();
    expect(mailMock.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('POST /api/auth/reset-password returns 400 for invalid token', async () => {
    prismaMock.passwordReset.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: 'bad', password: 'Password1' })
      .expect(400);
  });
});

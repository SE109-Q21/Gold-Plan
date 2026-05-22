import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '../src/auth/jwt.service';
import { AuthService } from '../src/auth/auth.service';

const prismaMock = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const jwtMock = {
  signAccess: jest.fn(),
  signRefresh: jest.fn(),
  verifyAccess: jest.fn(),
  verifyRefresh: jest.fn(),
};

const authMock = {
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
};

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(JwtService)
      .useValue(jwtMock)
      .overrideProvider(AuthService)
      .useValue(authMock)
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

  it('GET /api/users/me returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/users/me')
      .expect(401);
  });

  it('GET /api/users/me returns profile with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      status: 'active',
    });

    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(res.body).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      status: 'active',
    });
  });

  it('PATCH /api/users/me returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/me')
      .send({ displayName: 'New Name' })
      .expect(401);
  });

  it('PATCH /api/users/me returns 400 for too-long displayName', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ displayName: 'x'.repeat(101) })
      .expect(400);
  });

  it('PATCH /api/users/me updates profile with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      status: 'active',
      displayName: 'New Name',
    });

    const res = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ displayName: 'New Name' })
      .expect(200);

    expect(res.body).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      status: 'active',
      displayName: 'New Name',
    });
  });

  it('POST /api/users/me/change-password returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .post('/api/users/me/change-password')
      .send({ oldPassword: 'OldPass1', newPassword: 'NewPass1' })
      .expect(401);
  });

  it('POST /api/users/me/change-password returns 400 for weak password', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/users/me/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'OldPass1', newPassword: 'password' })
      .expect(400);
  });

  it('POST /api/users/me/change-password returns success with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    authMock.changePassword.mockResolvedValue({
      message: 'Password changed successfully',
    });

    const res = await request(app.getHttpServer())
      .post('/api/users/me/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'OldPass1', newPassword: 'NewPass1' })
      .expect(200);

    expect(res.body).toEqual({ message: 'Password changed successfully' });
  });

  it('DELETE /api/users/me deletes account with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    authMock.deleteAccount.mockResolvedValue({ message: 'Account deleted' });

    const res = await request(app.getHttpServer())
      .delete('/api/users/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(res.body).toEqual({ message: 'Account deleted' });
  });
});

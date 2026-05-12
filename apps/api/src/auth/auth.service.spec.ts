import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from './jwt.service';

// ─── Mock factories ───────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    emailVerification: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    passwordReset: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    loginAttempt: {
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
}

function makeMailMock() {
  return {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };
}

function makeJwtMock() {
  return {
    signAccess: jest.fn().mockReturnValue('access-token'),
    signRefresh: jest.fn().mockReturnValue('refresh-token'),
    verifyAccess: jest.fn(),
    verifyRefresh: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let mail: ReturnType<typeof makeMailMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    mail = makeMailMock();
    const jwtMock = makeJwtMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('happy path: creates user + emailVerification + calls mailService', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const createdUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: 'pending',
        role: 'user',
        displayName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      prisma.user.create.mockResolvedValue(createdUser);
      prisma.emailVerification.create.mockResolvedValue({ id: 'ev-1' });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password1',
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          status: 'pending',
        }),
      });
      expect(prisma.emailVerification.create).toHaveBeenCalledTimes(1);
      expect(prisma.emailVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
      expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
      expect(result).toEqual({ message: 'Verification email sent' });
    });

    it('duplicate email: throws ConflictException (409)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({ email: 'dup@example.com', password: 'Password1' }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('duplicate email via Prisma P2002: throws ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      prisma.user.create.mockRejectedValue(p2002);

      await expect(
        service.register({ email: 'dup@example.com', password: 'Password1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('non-existent user: throws UnauthorizedException without crash', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.loginAttempt.create.mockResolvedValue({});

      const fakeRes = { cookie: jest.fn() } as any;

      await expect(
        service.login('nobody@example.com', 'password', fakeRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lockout: 5 failed LoginAttempts in last 15 min → throws 429', async () => {
      const activeUser = {
        id: 'user-2',
        email: 'locked@example.com',
        passwordHash: '$2b$10$somehash',
        status: 'active',
        role: 'user',
      };
      prisma.user.findFirst.mockResolvedValue(activeUser);
      prisma.loginAttempt.count.mockResolvedValue(5);

      const fakeRes = { cookie: jest.fn() } as any;

      const err = await service.login('locked@example.com', 'WrongPass1', fakeRes as any).catch(e => e);
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(429);
    });
  });

  // ─── verifyEmail ─────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('happy path: marks user active and token usedAt', async () => {
      const validVerification = {
        id: 'ev-1',
        token: 'valid-token',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        userId: 'user-1',
        user: { id: 'user-1', email: 'user@example.com', status: 'pending' },
      };
      prisma.emailVerification.findUnique.mockResolvedValue(validVerification);
      prisma.user.update.mockResolvedValue({ ...validVerification.user, status: 'active' });
      prisma.emailVerification.update.mockResolvedValue({ ...validVerification, usedAt: new Date() });

      const result = await service.verifyEmail('valid-token');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'active' } }),
      );
      expect(prisma.emailVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) }),
      );
      expect(result).toEqual({ message: 'Email verified successfully' });
    });

    it('expired token: throws BadRequestException', async () => {
      const expiredVerification = {
        id: 'ev-expired',
        token: 'expired-token',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000), // already expired
        userId: 'user-3',
        user: { id: 'user-3', email: 'user@example.com', status: 'pending' },
      };
      prisma.emailVerification.findUnique.mockResolvedValue(expiredVerification);

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('invalid / already-used token: throws BadRequestException', async () => {
      const usedVerification = {
        id: 'ev-used',
        token: 'used-token',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        userId: 'user-4',
        user: { id: 'user-4' },
      };
      prisma.emailVerification.findUnique.mockResolvedValue(usedVerification);

      await expect(service.verifyEmail('used-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('null token (not found): throws BadRequestException', async () => {
      prisma.emailVerification.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

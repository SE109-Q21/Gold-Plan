import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from './jwt.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { Response } from 'express';

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user: Awaited<ReturnType<typeof this.prisma.user.create>>;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          status: 'pending',
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await this.mailService.sendVerificationEmail(user.email, token);

    return { message: 'Verification email sent' };
  }

  // ─── Verify Email ────────────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification || verification.usedAt !== null) {
      throw new BadRequestException('Invalid or already used token');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { status: 'active' },
      }),
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: now },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    res: Response,
  ): Promise<{ accessToken: string; user: { id: string; email: string; role: string } }> {
    const user = await this.prisma.user.findFirst({
      where: { email, status: { not: 'deleted' } },
    });

    if (!user) {
      await this.recordLoginAttempt(null, email, null, false);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'pending') {
      await this.recordLoginAttempt(user.id, email, null, false);
      throw new UnauthorizedException('Please verify your email first');
    }

    if (user.status === 'locked') {
      await this.recordLoginAttempt(user.id, email, null, false);
      throw new UnauthorizedException(
        'Account is locked. Please contact support or try again later.',
      );
    }

    // Rate-limit check: count failed attempts in last 15 minutes
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const failedCount = await this.prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        attemptedAt: { gte: windowStart },
      },
    });

    if (failedCount >= 5) {
      throw new HttpException(
        {
          message: 'Too many failed attempts, try again in 15 minutes',
          retryAfterMinutes: 15,
        },
        429,
      );
    }

    if (!user.passwordHash) {
      await this.recordLoginAttempt(user.id, email, null, false);
      throw new UnauthorizedException('This account uses social login');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      await this.recordLoginAttempt(user.id, email, null, false);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.recordLoginAttempt(user.id, email, null, true);

    const accessToken = this.jwtService.signAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = this.jwtService.signRefresh({ sub: user.id });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = this.jwtService.signAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(res: Response): Promise<{ message: string }> {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return { message: 'Logged out' };
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const SAFE_RESPONSE = {
      message: 'If that email exists, you will receive a reset link',
    };

    const user = await this.prisma.user.findFirst({
      where: { email, status: { not: 'deleted' } },
    });

    if (!user) {
      return SAFE_RESPONSE;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1h

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);

    return SAFE_RESPONSE;
  }

  // ─── Reset Password ───────────────────────────────────────────────────────────

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt !== null) {
      throw new BadRequestException('Invalid or already used token');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: now },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }

  // ─── Change Password ──────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Password change not available for this account type');
    }

    const passwordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  // ─── Delete Account ───────────────────────────────────────────────────────────

  async deleteAccount(
    userId: string,
    res: Response,
  ): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'deleted', deletedAt: new Date() },
    });

    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    return { message: 'Account deleted' };
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────────

  async googleLogin(
    googleUser: { email: string; displayName: string },
    res: Response,
  ): Promise<{ accessToken: string }> {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          passwordHash: null,
          status: 'active',
          role: 'user',
          displayName: googleUser.displayName,
        },
      });
    } else if (user.status === 'deleted' || user.status === 'locked') {
      throw new UnauthorizedException('Account not accessible');
    } else if (user.status === 'pending') {
      // Auto-activate accounts that were pending — Google verified the email
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'active' },
      });
      user = { ...user, status: 'active' };
    }

    const accessToken = this.jwtService.signAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = this.jwtService.signRefresh({ sub: user.id });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    return { accessToken };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async recordLoginAttempt(
    userId: string | null,
    email: string,
    ipAddress: string | null,
    success: boolean,
  ): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        userId: userId ?? undefined,
        email,
        ipAddress: ipAddress ?? undefined,
        success,
      },
    });
  }
}

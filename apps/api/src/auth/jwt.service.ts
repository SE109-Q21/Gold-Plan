import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  ver: number;
}

export interface RefreshTokenPayload {
  sub: string;
  ver: number;
}

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly refreshSecret: string;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    this.secret = secret;
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    this.refreshSecret = refreshSecret;
  }

  signAccess(payload: AccessTokenPayload): string {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '24h');
    return jwt.sign(payload, this.secret, { expiresIn } as jwt.SignOptions);
  }

  signRefresh(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: '7d' });
  }

  verifyAccess(token: string): AccessTokenPayload {
    return jwt.verify(token, this.secret) as AccessTokenPayload;
  }

  verifyRefresh(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.refreshSecret) as RefreshTokenPayload;
  }
}

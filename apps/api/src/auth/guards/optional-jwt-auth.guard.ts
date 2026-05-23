import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '../jwt.service';
import { PrismaService } from '../../database/prisma.service';

/** Like JwtAuthGuard but never throws — populates req.user if token is valid, otherwise leaves it undefined. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) return true;

    try {
      const payload = this.jwtService.verifyAccess(auth.slice(7));
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { tokenVersion: true, status: true },
      });
      if (user && user.status === 'active' && user.tokenVersion === payload.ver) {
        req.user = payload;
      }
    } catch {
      // invalid / expired / revoked token — treat as anonymous
    }
    return true;
  }
}

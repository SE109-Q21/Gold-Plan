import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '../jwt.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = auth.slice(7);

    let payload: ReturnType<typeof this.jwtService.verifyAccess>;
    try {
      payload = this.jwtService.verifyAccess(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true, status: true },
    });

    if (!user || user.status !== 'active' || user.tokenVersion !== payload.ver) {
      throw new UnauthorizedException('Token has been revoked');
    }

    req.user = payload;
    return true;
  }
}

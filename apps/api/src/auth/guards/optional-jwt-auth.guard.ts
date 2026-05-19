import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '../jwt.service';

/** Like JwtAuthGuard but never throws — populates req.user if token is valid, otherwise leaves it undefined. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers['authorization'];
    if (auth?.startsWith('Bearer ')) {
      try {
        req.user = this.jwtService.verifyAccess(auth.slice(7));
      } catch {
        // invalid / expired token — treat as anonymous
      }
    }
    return true;
  }
}

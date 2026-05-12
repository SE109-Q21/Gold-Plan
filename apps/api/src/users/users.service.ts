import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type UserWithoutPassword<T extends { passwordHash: string | null }> = Omit<T, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.excludePassword(user);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return this.excludePassword(user);
  }

  async updateProfile(id: string, data: { displayName?: string }) {
    try {
      const user = await this.prisma.user.update({ where: { id }, data });
      return this.excludePassword(user);
    } catch (error: any) {
      if (error?.code === 'P2025') throw new NotFoundException('User not found');
      throw error;
    }
  }

  async softDelete(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'deleted', deletedAt: new Date() },
    });
    return this.excludePassword(user);
  }

  private excludePassword<T extends { passwordHash: string | null }>(
    user: T,
  ): UserWithoutPassword<T> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...rest } = user;
    return rest as UserWithoutPassword<T>;
  }
}

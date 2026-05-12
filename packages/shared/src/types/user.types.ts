export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'locked' | 'deleted';

export interface AuthTokenDto {
  accessToken: string;
  expiresIn: number;
}

export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

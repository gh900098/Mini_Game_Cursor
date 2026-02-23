import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (level: number) => SetMetadata(ROLES_KEY, level);

export enum RoleLevel {
  SUPER_ADMIN = 100,
  COMPANY_ADMIN = 80,
  STAFF = 10,
  OPERATOR = 5,
}

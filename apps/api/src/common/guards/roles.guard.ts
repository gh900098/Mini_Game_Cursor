import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredLevel = this.reflector.getAllAndOverride<number>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredLevel) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new UnauthorizedException('User session not found');
        }

        // Super Admins bypass all role checks
        if (user.isSuperAdmin) {
            return true;
        }

        if (!user.currentRoleLevel) {
            throw new ForbiddenException('User has no role level assigned');
        }

        if (user.currentRoleLevel < requiredLevel) {
            throw new ForbiddenException(`Insufficient permissions. Required level: ${requiredLevel}, Current level: ${user.currentRoleLevel}`);
        }

        return true;
    }
}

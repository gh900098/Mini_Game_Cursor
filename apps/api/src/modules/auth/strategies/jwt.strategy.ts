import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
    });
  }

  async validate(payload: any) {
    // Handle Member tokens (Marketplace players)
    if (payload.role === 'member' || payload.isMember === true) {
      return {
        userId: payload.sub, // Added for consistency with admin
        memberId: payload.sub,
        externalId: payload.externalId,
        currentCompanyId: payload.companyId, // Added for consistency with admin
        companyId: payload.companyId,
        role: 'member',
        isImpersonated: !!payload.isImpersonated,
      };
    }

    // Existing User (Admin) logic
    const user = await this.usersService.findOne(payload.sub);
    const isSuperAdmin = user.userCompanies?.some(
      (uc) => uc.role?.slug === 'super_admin',
    );

    // Find current company context
    const currentCompanyId = payload.currentCompanyId;
    const userCompany = user.userCompanies?.find(
      (uc: any) => uc.companyId === currentCompanyId,
    );

    // If Super Admin, they have all permissions regardless of the current company
    if (isSuperAdmin) {
      return {
        userId: payload.sub,
        email: payload.email,
        currentCompanyId: currentCompanyId,
        currentRoleId: userCompany?.roleId || user.userCompanies?.[0]?.roleId,
        currentRoleLevel: 100,
        permissions: ['all'],
        isSuperAdmin: true,
      };
    }

    return {
      userId: payload.sub,
      email: payload.email,
      currentCompanyId: currentCompanyId,
      currentRoleId: userCompany?.roleId || user.userCompanies?.[0]?.roleId,
      currentRoleLevel: userCompany?.role?.level || 0,
      permissions:
        userCompany?.role?.permissions?.map((p: any) => p.slug) || [],
      isSuperAdmin: false,
    };
  }
}

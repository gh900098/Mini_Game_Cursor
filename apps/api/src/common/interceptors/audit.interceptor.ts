import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { SystemSettingsService } from '../../modules/system-settings/system-settings.service';
import { CompaniesService } from '../../modules/companies/companies.service';
import { UsersService } from '../../modules/users/users.service';
import { RolesService } from '../../modules/roles/roles.service';
import { PermissionsService } from '../../modules/permissions/permissions.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly jwtService: JwtService,
    private readonly settingsService: SystemSettingsService,
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, body, params, query, ip, user } = request;
    const userAgent = request.get('user-agent') || '';

    // Only log mutations
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    if (!isMutation) {
      return next.handle();
    }

    // Skip log for audit-logs itself to avoid loop (though it's a GET, just in case)
    if (path.includes('/audit-logs')) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logAction(request, data, duration, 200);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logAction(request, error, duration, error.status || 500);
        },
      }),
    );
  }

  private async logAction(
    request: any,
    result: any,
    duration: number,
    status: number,
  ) {
    try {
      const { method, path, body, params, query, ip, user } = request;
      const userAgent = request.get('user-agent') || '';

      // 1. Determine Module
      const parts = path.split('/').filter((p: string) => !!p);
      // Ignore 'api' and version prefixes (v1, v2, etc.)
      const startIndex = parts.findIndex(
        (p: string) => p !== 'api' && !/^v\d+$/.test(p),
      );
      const moduleName = startIndex !== -1 ? parts[startIndex] : 'unknown';

      // 0. Check System Settings (Optimization)
      const auditConfig =
        await this.settingsService.getSetting('AUDIT_LOG_CONFIG');
      if (auditConfig) {
        // If global disable
        if (auditConfig.enabled === false) return;

        // If specific module disable
        if (auditConfig.modules && auditConfig.modules[moduleName] === false)
          return;
      }

      // 2. Resolve User Context (UserId, UserName, CompanyId)
      let userId = user?.userId;
      let userName = user?.email;
      let companyId =
        user?.currentCompanyId || body?.companyId || query?.companyId;

      // SPECIAL CASE: Enrich Payload with Company Name
      const enrichedBody = { ...body };

      // --- UNIVERSAL ENTITY RESOLUTION START ---
      // Automatically find IDs in Body/Params and resolve them to Names
      const idMap: Record<string, any> = {
        companyId: body?.companyId || query?.companyId,
        userId: body?.userId || query?.userId,
        roleId: body?.roleId || query?.roleId,
        permissionId: body?.permissionId || query?.permissionId,
      };

      // 2.1 Resolve Target Company
      if (idMap.companyId) {
        try {
          const company = await this.companiesService.findOne(idMap.companyId);
          if (company) enrichedBody.targetCompanyName = company.name;
        } catch (e) {}
      }

      // 2.2 Resolve Target User
      if (idMap.userId) {
        try {
          const targetUser = await this.usersService.findOne(idMap.userId);
          if (targetUser) enrichedBody.targetUserEmail = targetUser.email;
        } catch (e) {}
      }

      // 2.3 Resolve Target Role
      if (idMap.roleId) {
        try {
          const role = await this.rolesService.findOne(idMap.roleId);
          if (role) enrichedBody.targetRoleName = role.name;
        } catch (e) {}
      }

      // 2.4 Resolve Target Permission
      if (idMap.permissionId) {
        try {
          const permission = await this.permissionsService.findOne(
            idMap.permissionId,
          );
          if (permission) enrichedBody.targetPermissionSlug = permission.slug;
        } catch (e) {}
      }
      // --- UNIVERSAL ENTITY RESOLUTION END ---

      // SPECIAL CASE: Login and Switch Company
      // If the user is missing (login) or we need to capture the NEW context (switch), decode the resulting token
      const isLoginOrSwitch =
        path.includes('/auth/login') || path.includes('/auth/switch-company');
      if (status < 400 && result?.access_token && isLoginOrSwitch) {
        try {
          const decoded: any = this.jwtService.decode(result.access_token);
          if (decoded) {
            userId = decoded.sub || userId;
            userName = decoded.email || userName;

            // Use the company ID from the token as the definitive "target" company
            const newCompanyId = decoded.currentCompanyId;
            if (newCompanyId) {
              companyId = newCompanyId;

              // Try to resolve company name for better readability
              try {
                const company =
                  await this.companiesService.findOne(newCompanyId);
                if (company) {
                  enrichedBody.companyName = company.name;
                  enrichedBody.targetCompany = company.name; // Explicit field
                }
              } catch (err) {
                // Ignore lookup errors, keep ID
              }
            }
          }
        } catch (e) {
          this.logger.warn(
            `Failed to decode token in AuditInterceptor: ${e.message}`,
          );
        }
      }

      // 3. Save Log
      await this.auditLogService.create({
        userId,
        userName,
        companyId,
        module: moduleName,
        action: this.getActionName(method, path),
        method,
        path,
        ip,
        userAgent,
        payload: this.redact(enrichedBody),
        params: this.redact({ ...params, ...query }),
        result: status >= 400 ? this.redact(result) : { success: true },
        status,
        duration,
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error.stack);
    }
  }

  private getActionName(method: string, path: string): string {
    const parts = path
      .split('/')
      .filter((p) => !!p && p !== 'api' && !/^v\d+$/.test(p));
    const pathStr = path.toLowerCase();

    // 1. Path-based Specific Overrides (Smarter naming)

    // AUTH MODULE
    if (pathStr.includes('/auth/')) {
      if (pathStr.includes('/login')) return 'Login';
      if (pathStr.includes('/register')) return 'Register';
      if (pathStr.includes('/switch-company')) return 'Switch Company';
      if (pathStr.includes('/profile')) return 'Update Profile';
      if (pathStr.includes('/reset-password')) return 'Reset Password';
      if (pathStr.includes('/send-password-reset-code'))
        return 'Request Password Reset';
      if (pathStr.includes('/verify-password-reset-code'))
        return 'Verify Reset Code';
      if (pathStr.includes('/send-registration-code'))
        return 'Request Registration Code';
      if (pathStr.includes('/verify-email')) return 'Verify Email';
      if (pathStr.includes('/resend-verification'))
        return 'Resend Verification';
    }

    // USER COMPANY ASSIGNMENTS (Specific Nested Routes)
    if (pathStr.includes('/users/') && pathStr.includes('/companies')) {
      if (method === 'POST') return 'Assign Company Access';
      if (method === 'DELETE') return 'Remove Company Access';
      if (pathStr.includes('/set-primary')) return 'Set Primary Company';
      if (pathStr.includes('/role/')) return 'Update Access Role';
    }

    // CORE ENTITIES (More Professional Naming)

    // Users
    if (pathStr.startsWith('/users')) {
      if (method === 'POST') return 'Create User Account';
      if (method === 'PATCH' || method === 'PUT') return 'Update User Details';
      if (method === 'DELETE') return 'Remove User Account';
    }

    // Roles
    if (pathStr.startsWith('/roles')) {
      if (method === 'POST') return 'Create Functional Role';
      if (method === 'PATCH' || method === 'PUT')
        return 'Update Role & Permissions';
      if (method === 'DELETE') return 'Delete Functional Role';
    }

    // Permissions
    if (pathStr.startsWith('/permissions')) {
      if (method === 'POST') return 'Define New Permission';
      if (method === 'PATCH' || method === 'PUT')
        return 'Update Permission Definition';
      if (method === 'DELETE') return 'Remove Permission Definition';
    }

    // Companies
    if (pathStr.startsWith('/companies')) {
      if (method === 'POST') return 'Register New Company';
      if (method === 'PATCH' || method === 'PUT')
        return 'Update Company Profile';
      if (method === 'DELETE') return 'Remove Company Record';
    }

    // SYSTEM SETTINGS
    if (pathStr.includes('/system-settings')) {
      if (method === 'PATCH' || method === 'PUT')
        return 'Update System Settings';
    }

    // SEEDING
    if (pathStr.includes('/seed')) {
      return 'Seed System Data';
    }

    const actionMap: Record<string, string> = {
      POST: 'Create',
      PUT: 'Update',
      PATCH: 'Update',
      DELETE: 'Delete',
    };

    const actionPrefix = actionMap[method] || method;

    if (parts.length === 0) return `${method} ${path}`;

    // If the last part is a UUID or a number, it's an ID
    const lastPart = parts[parts.length - 1];
    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        lastPart,
      ) || /^\d+$/.test(lastPart);

    let entity = lastPart;

    if (isId) {
      // Use the part before the ID as the entity name
      entity = parts.length > 1 ? parts[parts.length - 2] : parts[0];
    } else if (method === 'POST' && parts.length > 1) {
      // Check if it's an action on a resource, e.g., /users/login
      const previousPart = parts[parts.length - 2];
      const commonActions = [
        'login',
        'register',
        'upload',
        'send',
        'reset',
        'verify',
        'seed',
        'sync',
      ];
      if (commonActions.includes(lastPart.toLowerCase())) {
        return `${this.capitalize(lastPart)} ${this.singularize(previousPart)}`;
      }
    }

    return `${actionPrefix} ${this.capitalize(this.singularize(entity))}`;
  }

  private redact(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item));
    }

    const redacted = { ...obj };
    for (const key in redacted) {
      if (this.isSensitiveField(key)) {
        redacted[key] = '********';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redact(redacted[key]);
      }
    }
    return redacted;
  }

  private isSensitiveField(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'credit',
      'card',
      'cvv',
      'cvc',
      'pin',
      'access_token',
      'refresh_token',
      'apiKey',
    ];
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some((sk) => lowerKey.includes(sk));
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private singularize(str: string): string {
    if (!str) return '';
    // Basic singularization: remove trailing 's' if it's not a short word
    if (str.toLowerCase().endsWith('ies')) {
      return str.slice(0, -3) + 'y';
    }
    if (str.toLowerCase().endsWith('s') && str.length > 3) {
      return str.slice(0, -1);
    }
    return str;
  }
}

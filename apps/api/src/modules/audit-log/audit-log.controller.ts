import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  private readonly logger = new Logger(AuditLogController.name);
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('options')
  @ApiOperation({ summary: 'Get distinct modules and actions for filtering' })
  getOptions(@Req() req: any) {
    const { user } = req;
    const isSuperAdmin = user?.isSuperAdmin;
    const companyId = isSuperAdmin ? undefined : user?.currentCompanyId;
    const ownUserId = isSuperAdmin ? undefined : user?.userId;

    return this.auditLogService.getOptions(companyId, ownUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Get audit logs with pagination and filters' })
  findAll(@Req() req: any, @Query() query: any) {
    const { user } = req;
    const isSuperAdmin = user?.isSuperAdmin;

    // If not super admin, enforce tenant isolation with identity bypass for own logs
    if (!isSuperAdmin) {
      if (!user?.permissions?.includes('audit-logs:read')) {
        throw new ForbiddenException(
          'You do not have permission to view audit logs',
        );
      }

      // Critical Safety: If they are not super admin, we MUST at least restrict to their own records
      // OR to the current company they are managing.
      query.companyId = user?.currentCompanyId;
      query.ownUserId = user?.userId; // Special flag for the service to allow "OR userId = self"

      if (!query.companyId && !query.ownUserId) {
        this.logger.warn(
          `User ${user?.userId} attempted to view audit logs without a valid context`,
        );
        throw new ForbiddenException(
          'You must belong to a company to view audit logs',
        );
      }
    }

    return this.auditLogService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log details' })
  async findOne(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    const { user } = req;
    const log = await this.auditLogService.findOne(id);

    if (!log) return null;

    // Authorization check
    if (!user?.isSuperAdmin && log.companyId !== user?.currentCompanyId) {
      throw new ForbiddenException('You do not have access to this log');
    }

    return log;
  }
}

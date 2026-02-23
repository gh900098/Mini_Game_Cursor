import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserCompaniesService } from './user-companies.service';
import { AddUserCompanyDto } from './dto/add-user-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  PermissionsGuard,
  RequirePermission,
} from '../../common/guards/permissions.guard';

@ApiTags('user-companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('users/:userId/companies')
export class UserCompaniesController {
  constructor(private readonly userCompaniesService: UserCompaniesService) {}

  @Post()
  @RequirePermission('users:update')
  @ApiOperation({ summary: 'Add company access to user' })
  @ApiResponse({
    status: 201,
    description: 'Company access added successfully',
  })
  @ApiResponse({ status: 404, description: 'User, company, or role not found' })
  @ApiResponse({
    status: 409,
    description: 'User already has access to this company',
  })
  addCompany(@Param('userId') userId: string, @Body() dto: AddUserCompanyDto) {
    return this.userCompaniesService.addCompanyToUser(userId, dto);
  }

  @Get()
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get all companies for a user' })
  @ApiResponse({ status: 200, description: 'Returns user companies' })
  getUserCompanies(@Param('userId') userId: string) {
    return this.userCompaniesService.getUserCompanies(userId);
  }

  @Delete(':companyId')
  @RequirePermission('users:update')
  @ApiOperation({ summary: 'Remove company access from user' })
  @ApiResponse({ status: 200, description: 'Company access removed' })
  @ApiResponse({ status: 404, description: 'Association not found' })
  removeCompany(
    @Param('userId') userId: string,
    @Param('companyId') companyId: string,
  ) {
    return this.userCompaniesService.removeCompanyFromUser(userId, companyId);
  }

  @Patch(':companyId/role/:roleId')
  @RequirePermission('users:update')
  @ApiOperation({ summary: 'Update user role for a company' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  updateRole(
    @Param('userId') userId: string,
    @Param('companyId') companyId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.userCompaniesService.updateUserCompanyRole(
      userId,
      companyId,
      roleId,
    );
  }

  @Patch(':companyId/set-primary')
  @RequirePermission('users:update')
  @ApiOperation({ summary: 'Set company as primary for user' })
  @ApiResponse({ status: 200, description: 'Primary company set' })
  setPrimary(
    @Param('userId') userId: string,
    @Param('companyId') companyId: string,
  ) {
    return this.userCompaniesService.setPrimaryCompany(userId, companyId);
  }
}

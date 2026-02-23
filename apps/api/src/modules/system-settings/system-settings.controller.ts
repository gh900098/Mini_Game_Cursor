import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, RoleLevel } from '../../common/decorators/roles.decorator';

@ApiTags('System Settings')
@Controller('system-settings')
@ApiBearerAuth()
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get public system settings' })
  async getPublic() {
    return this.settingsService.getPublicSettings();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleLevel.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all system settings' })
  async getAll() {
    return this.settingsService.getAllSettings();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleLevel.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update system settings' })
  async update(@Body() settings: Record<string, any>) {
    for (const [key, value] of Object.entries(settings)) {
      await this.settingsService.setSetting(key, value);
    }
    return { message: 'Settings updated successfully' };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ThemesService } from './themes.service';
import { CreateThemeDto, UpdateThemeDto } from './dto/theme.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermission,
} from '../../common/guards/permissions.guard';

@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('games:manage')
  create(@Request() req: any, @Body() createThemeDto: CreateThemeDto) {
    // Super Admin can create global themes (if they don't provide a companyId)
    // Regular admins create themes attached to their company
    const companyId = req.user.isSuperAdmin
      ? createThemeDto.companyId
      : req.user.currentCompanyId;
    return this.themesService.create(createThemeDto, companyId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Request() req: any,
    @Query('gameTemplateSlug') gameTemplateSlug?: string,
  ) {
    const companyId = req.user.currentCompanyId;
    return this.themesService.findAll(gameTemplateSlug, companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.themesService.findOne(id);
  }

  @Get('by-slug/:slug')
  @UseGuards(JwtAuthGuard)
  findBySlug(@Param('slug') slug: string) {
    return this.themesService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('games:manage')
  update(@Param('id') id: string, @Body() updateThemeDto: UpdateThemeDto) {
    return this.themesService.update(id, updateThemeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('games:manage')
  remove(@Param('id') id: string) {
    return this.themesService.remove(id);
  }
}

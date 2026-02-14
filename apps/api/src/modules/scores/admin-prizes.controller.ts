import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, Request, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberPrize, PrizeStatus } from './entities/member-prize.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../../common/guards/permissions.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('admin/prizes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPrizesController {
    constructor(
        @InjectRepository(MemberPrize)
        private readonly memberPrizeRepo: Repository<MemberPrize>,
    ) { }

    @Get()
    @RequirePermission('manage_games')
    async getAllPrizes(
        @Request() req: any,
        @Query('status') status?: PrizeStatus,
        @Query('memberId') memberId?: string,
        @Query('instanceId') instanceId?: string,
    ) {
        const companyId = req.user.currentCompanyId;

        const query = this.memberPrizeRepo.createQueryBuilder('prize')
            .leftJoinAndSelect('prize.member', 'member')
            .leftJoinAndSelect('prize.instance', 'instance')
            .leftJoinAndSelect('instance.company', 'company')
            .orderBy('prize.createdAt', 'DESC');

        // Tenant Isolation Check: Only Super Admins see all, others restricted to their company
        if (!req.user.isSuperAdmin) {
            query.where('instance.companyId = :companyId', { companyId });
        }

        if (status) {
            query.andWhere('prize.status = :status', { status });
        }
        if (memberId) {
            query.andWhere('prize.memberId = :memberId', { memberId });
        }
        if (instanceId) {
            query.andWhere('prize.instanceId = :instanceId', { instanceId });
        }

        return query.getMany();
    }

    @Patch(':id/status')
    @RequirePermission('manage_games')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: PrizeStatus; metadata?: any }
    ) {
        const prize = await this.memberPrizeRepo.findOneOrFail({ where: { id } });
        prize.status = body.status;
        if (body.metadata) {
            prize.metadata = { ...prize.metadata, ...body.metadata };
        }
        return this.memberPrizeRepo.save(prize);
    }

    @Post(':id/receipt')
    @RequirePermission('manage_games')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req: any, file, cb) => {
                const companyId = req.user?.currentCompanyId || 'default';
                const prizeId = req.params.id;
                const uploadPath = `./uploads/${companyId}/receipts/${prizeId}`;

                const fs = require('fs');
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath);
            },
            filename: (req: any, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `receipt_${Date.now()}_${randomName}${extname(file.originalname)}`);
            }
        }),
        fileFilter: (req: any, file, cb) => {
            // Accept images and PDFs
            if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/i)) {
                return cb(new BadRequestException('Only image files (jpg, jpeg, png) and PDF are allowed for receipts!'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 5 * 1024 * 1024 // Max 5MB
        }
    }))
    async uploadReceipt(
        @Param('id') id: string,
        @UploadedFile() file: any,
        @Request() req: any
    ) {
        const companyId = req.user?.currentCompanyId || 'default';
        const prizeId = id;

        return {
            url: `/api/uploads/${companyId}/receipts/${prizeId}/${file.filename}`
        };
    }

    @Get('stats')
    @RequirePermission('manage_games')
    async getPrizeStats(@Request() req: any) {
        const companyId = req.user.currentCompanyId;

        const query = this.memberPrizeRepo.createQueryBuilder('prize')
            .select('prize.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .leftJoin('prize.instance', 'instance')
            .groupBy('prize.status');

        if (!req.user.isSuperAdmin) {
            query.where('instance.companyId = :companyId', { companyId });
        }

        return query.getRawMany();
    }
}

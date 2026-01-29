import { IsString, IsNotEmpty, MinLength, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
    @ApiProperty({ description: 'Company name', example: 'Acme Corporation' })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @ApiProperty({ description: 'URL-friendly slug (auto-generated if not provided)', example: 'acme-corporation', required: false })
    @IsOptional()
    @IsString()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be lowercase alphanumeric with hyphens only'
    })
    slug?: string;

    @ApiProperty({ description: 'Company settings (JSON)', required: false })
    @IsOptional()
    settings?: Record<string, any>;

    @ApiProperty({ description: 'Whether the company is active', default: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ description: 'Date when the company became inactive', required: false })
    @IsOptional()
    @IsString()
    inactiveAt?: string;
}

import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
    @ApiProperty({ description: 'Role name', example: 'Company Admin' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Role description', example: 'Administrator for a specific company', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Role Unique Slug', example: 'custom_role', required: true })
    @IsString()
    @IsNotEmpty()
    slug: string;

    @ApiProperty({ description: 'Role Level (1-100)', example: 10, required: false })
    @IsOptional()
    level?: number;

    @ApiProperty({ description: 'Array of permission IDs to assign to this role', example: [], required: false })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    permissionIds?: string[];
}

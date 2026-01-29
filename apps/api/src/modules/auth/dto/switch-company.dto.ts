import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchCompanyDto {
    @ApiProperty({ description: 'Company ID to switch to' })
    // @IsUUID() - Removed to allow 'ALL'
    @IsString()
    @IsNotEmpty()
    companyId: string;
}

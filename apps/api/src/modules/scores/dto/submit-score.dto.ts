import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class SubmitScoreDto {
    @IsString()
    gameId: string;

    @IsNumber()
    @Min(0)
    score: number;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

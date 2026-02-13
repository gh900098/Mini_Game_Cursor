import { PartialType } from '@nestjs/swagger';
import { CreatePrizeTypeDto } from './create-prize-type.dto';

export class UpdatePrizeTypeDto extends PartialType(CreatePrizeTypeDto) { }

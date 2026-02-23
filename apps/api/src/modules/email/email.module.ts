import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Global()
@Module({
  imports: [SystemSettingsModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

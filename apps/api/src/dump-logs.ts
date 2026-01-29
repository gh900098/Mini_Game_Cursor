import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditLogService } from './modules/audit-log/audit-log.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(AuditLogService);
    const logs = await service.findAll({ limit: 20 });
    const simplified = logs.items.map(l => ({
        id: l.id,
        userName: l.userName,
        companyId: l.companyId,
        action: l.action,
        createdAt: l.createdAt
    }));
    console.table(simplified);
    await app.close();
}
bootstrap();

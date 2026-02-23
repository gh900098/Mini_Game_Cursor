import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MembersService } from '../src/modules/members/members.service';

async function bootstrap() {
    console.log('Bootstrapping testing module...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const membersService = app.get(MembersService);

    const companyId = '0ec2976d-7faf-4dd4-b2e7-5f40383c2e3a';
    const externalUserId = 'dev_user_1';
    const exchangeRate = 10;

    console.log('Sending deposit 1: 10 units');
    await membersService.processDeposit(companyId, externalUserId, 10, exchangeRate, 'direct_test_001');

    console.log('Sending deposit 2: 20 units');
    await membersService.processDeposit(companyId, externalUserId, 20, exchangeRate, 'direct_test_002');

    console.log('Sending deposit 3: 15 units');
    await membersService.processDeposit(companyId, externalUserId, 15, exchangeRate, 'direct_test_003');

    console.log('Sending deposit 4: 50 units');
    await membersService.processDeposit(companyId, externalUserId, 50, exchangeRate, 'direct_test_004');

    console.log('Sending deposit 5: 10 units');
    await membersService.processDeposit(companyId, externalUserId, 10, exchangeRate, 'direct_test_005');

    console.log('Deposits injected. Validate via Database!');
    await app.close();
    process.exit(0);
}

bootstrap();

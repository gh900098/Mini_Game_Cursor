import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');

  // Create application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule);

  // Enable shutdown hooks
  app.enableShutdownHooks();

  logger.log('Worker started successfully');

  // Keep the process alive
  // In BullMQ with NestJS, the workers start automatically when the module is initialized.
}

bootstrap();

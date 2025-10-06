import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './exceptions/global-exception.filter';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { MinimalLogger } from './common/logger/minimal-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new MinimalLogger()
  });
  
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    credentials: true,
    origin: process.env.FRONTEND_URL
  })
  
  app.use(cookieParser())

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, 
      whitelist: true,
      forbidNonWhitelisted: true
    }),
  )

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './exceptions/global-exception.filter';
import cookieParser from 'cookie-parser';
import { MinimalLogger } from './common/logger/minimal-logger';
import { useContainer } from 'class-validator';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new MinimalLogger(),
    bodyParser: false
  });

  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  // const app = await NestFactory.create(AppModule);
  
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    credentials: true,
    origin: process.env.FRONTEND_URL
  })
  
  app.use(cookieParser())

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

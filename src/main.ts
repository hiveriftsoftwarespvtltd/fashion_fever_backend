import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/responses/response.interceptor';
import { GlobalExceptionFilter } from './common/responses/exception-filter';
import * as express from 'express';
import { join } from 'path';
import { Get, ValidationPipe } from '@nestjs/common';
import { winstonLogger } from './common/logger/winston.logger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  const uploadDir =
    process.env.NODE_ENV === 'production' &&
      process.env.STORAGE_USED === 'local'
      ? process.env.UPLOAD_DIR || '/var/www/uploads'
      : join(process.cwd(), 'uploads');

  app.use('/uploads', express.static(uploadDir));

  app.setGlobalPrefix('/api/v1');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use((req: any, res: any, next: any) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  });
  const port = process.env.PORT ?? 9000;
  await app.listen(port, '0.0.0.0');

  console.log(`backend running on http://0.0.0.0:${port}`);
}

process.on('unhandledRejection', (reason: any) => {
  winstonLogger.error('UNHANDLED_REJECTION', {
    timestamp: new Date().toISOString(),
    reason:
      reason instanceof Error
        ? {
          message: reason.message,
          stack: reason.stack,
        }
        : reason,
  });
});

process.on('uncaughtException', (error: Error) => {
  winstonLogger.error('UNCAUGHT_EXCEPTION', {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
});
bootstrap();

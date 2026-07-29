import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/responses/response.interceptor';
import { GlobalExceptionFilter } from './common/responses/exception-filter';
import * as express from 'express';
import { join } from 'path';
import { Get, ValidationPipe } from '@nestjs/common';
import { winstonLogger } from './common/logger/winston.logger';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  const getUploadDir = () => {
    if (process.env.UPLOAD_DIR && fs.existsSync(process.env.UPLOAD_DIR)) {
      return process.env.UPLOAD_DIR;
    }
    if (fs.existsSync('/home/fashionfever/uploads')) {
      return '/home/fashionfever/uploads';
    }
    return join(process.cwd(), 'uploads');
  };

  const uploadDir = getUploadDir();

  app.use('/uploads', express.static(uploadDir));
  app.use('/api/v1/uploads', express.static(uploadDir));

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
  app.enableCors({
    origin: (origin, callback) => {
      // Allow any origin dynamically to support credentials: true
      callback(null, true);
    },
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);

  console.log(`backend running on http://localhost:${process.env.PORT ?? 3000}`);
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

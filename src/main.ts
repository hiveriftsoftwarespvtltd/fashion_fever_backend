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
    if (process.env.NODE_ENV === 'production') {
      if (process.env.UPLOAD_DIR) {
        if (!fs.existsSync(process.env.UPLOAD_DIR)) {
          try { fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true }); } catch (_) {}
        }
        if (fs.existsSync(process.env.UPLOAD_DIR)) {
          return process.env.UPLOAD_DIR;
        }
      }
      const userDir = '/home/fashionfever/uploads';
      if (!fs.existsSync(userDir)) {
        try { fs.mkdirSync(userDir, { recursive: true }); } catch (_) {}
      }
      if (fs.existsSync(userDir)) {
        return userDir;
      }
    }
    const localDir = join(process.cwd(), 'uploads');
    if (!fs.existsSync(localDir)) {
      try { fs.mkdirSync(localDir, { recursive: true }); } catch (_) {}
    }
    return localDir;
  };

  const uploadDir = getUploadDir();

  app.use('/uploads', express.static(uploadDir));
  app.use('/api/v1/uploads', express.static(uploadDir));

  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-FashionFever-Version', 'v99');
    next();
  });
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
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

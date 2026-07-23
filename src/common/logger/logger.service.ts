import { Injectable } from '@nestjs/common';
import { winstonLogger } from './winston.logger';

@Injectable()
export class LoggerService {
  error(message: string, meta?: any) {
    winstonLogger.error(message, meta);
  }
}
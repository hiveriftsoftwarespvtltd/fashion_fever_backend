import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiResponse } from '../responses/api-response';
import { winstonLogger } from '../logger/winston.logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // catch(exception: any, host: ArgumentsHost) {
  //   const ctx = host.switchToHttp();
  //   const response = ctx.getResponse();
  //   const request = ctx.getRequest();
  //   // console.error('🔥 FULL ERROR:', exception);

  //   let status = HttpStatus.INTERNAL_SERVER_ERROR;
  //   let message = 'Internal server error';

  //   if (exception instanceof HttpException) {
  //     status = exception.getStatus();

  //     const res = exception.getResponse();

  //     if (typeof res === 'string') {
  //       message = res;
  //     } else if (typeof res === 'object') {
  //       message = (res as any).message;
  //     }
  //   }

  //   //   if (status >= 500) {
  //   //   console.error("🔥 SERVER ERROR:", exception);
  //   //   winstonLogger.error({
  //   //       timestamp: new Date(),
  //   //       status,
  //   //       method: request.method,
  //   //       url: request.originalUrl,
  //   //       body: request.body,
  //   //       query: request.query,
  //   //       params: request.params,
  //   //       message,
  //   //       stack: exception?.stack,
  //   //     });
  //   // }

  //   if (status >= 400) {
  //     const errorLog = {
  //       timestamp: new Date().toISOString(),

  //       status,

  //       request: {
  //         method: request.method,
  //         url: request.originalUrl,
  //         body: request.body,
  //         query: request.query,
  //         params: request.params,
  //       },

  //       error: {
  //         name: exception?.name,
  //         message: exception?.message,
  //         stack: exception?.stack,
  //         code: exception?.code,
  //         response: exception?.response,
  //         keyValue: exception?.keyValue,
  //         errors: exception?.errors,
  //       },
  //     };

  //     winstonLogger.error('APPLICATION_ERROR', errorLog);
  //     console.error('🔥 SERVER ERROR:', exception);

  //     winstonLogger.error('SERVER_ERROR', errorLog);
  //   }

  //   response.status(status).json(ApiResponse.error(message, status));
  // }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    const sanitizedBody = { ...request.body };

delete sanitizedBody.password;
delete sanitizedBody.oldPassword;
delete sanitizedBody.newPassword;
delete sanitizedBody.confirmPassword;
delete sanitizedBody.token;
delete sanitizedBody.accessToken;
delete sanitizedBody.refreshToken;
delete sanitizedBody.otp;

    const errorLog: any = {
      timestamp: new Date().toISOString(),

      request: {
        method: request.method,
        url: request.originalUrl,
        body: sanitizedBody,
        query: request.query,
        params: request.params,
        userId: request.user?._id,
        userEmail: request.user?.email,
      },

      error: {
        name: exception?.name,
        message: exception?.message,
        stack: exception?.stack,
        code: exception?.code,
        response: exception?.response,
        keyValue: exception?.keyValue,
        errors: exception?.errors,
        rawException: exception?.toString?.() || null,
      },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = (res as any).message;

        // Add validation details
        errorLog.error.validationResponse = res;
      }
    }

    if (!(exception instanceof HttpException)) {
      message = exception?.message || message;
    }

    if (status >= 400) {
      errorLog.status = status;
      errorLog.message = message;
      winstonLogger.log({
        level: 'error',
        type: 'APPLICATION_ERROR',
        ...errorLog,
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error(exception);
    }

    const clientMessage =
  status >= 500 ? 'Internal server error' : message;

    response.status(status).json(ApiResponse.error(clientMessage, status));
  }
}

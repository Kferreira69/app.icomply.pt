import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = uuid();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: string[] | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, any>;
        // Validation errors come as arrays
        if (Array.isArray(b.message)) {
          errors = b.message;
          message = 'Validation failed';
        } else {
          message = b.message ?? exception.message;
        }
      } else {
        message = body as string;
      }
    } else if (exception instanceof Error) {
      // NEVER expose internal error details or stack traces to the client
      this.logger.error(`[${traceId}] Unhandled exception: ${exception.message}`, exception.stack);
      // In dev we return the message; in prod we return a generic message
      message = this.isProd ? 'An unexpected error occurred' : exception.message;
    } else {
      this.logger.error(`[${traceId}] Unknown exception type`, String(exception));
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      traceId,
      timestamp: new Date().toISOString(),
      // Never expose internal paths in production
      path: this.isProd ? undefined : request.url,
    });
  }
}

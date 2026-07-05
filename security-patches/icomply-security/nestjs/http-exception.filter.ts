// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly isProduction: boolean) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Logar o erro completo internamente (com stack trace)
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
        {
          userId: (request as any).user?.id,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} → ${status}`,
      );
    }

    // Resposta ao cliente — NUNCA expõe stack trace em produção
    const clientResponse = this.buildClientResponse(exception, status, request);
    response.status(status).json(clientResponse);
  }

  private buildClientResponse(
    exception: unknown,
    status: number,
    request: Request,
  ) {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Em produção: mensagens genéricas para erros 500
    if (this.isProduction && status >= 500) {
      return {
        statusCode: status,
        timestamp,
        path,
        message: 'Ocorreu um erro interno. Por favor tente mais tarde.',
        // SEM stack, SEM detalhes internos
      };
    }

    // Para HttpExceptions conhecidas (4xx): pode expor a mensagem
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      return {
        statusCode: status,
        timestamp,
        path,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message || exception.message,
        // Em dev: inclui detalhes extra
        ...(this.isProduction
          ? {}
          : { details: exceptionResponse }),
      };
    }

    // Fallback
    return {
      statusCode: status,
      timestamp,
      path,
      message: this.isProduction
        ? 'Erro interno do servidor'
        : String(exception),
    };
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

const STATUS_BY_CODE: Record<string, number> = {
  P2002: HttpStatus.CONFLICT,
  P2025: HttpStatus.NOT_FOUND,
  P2003: HttpStatus.BAD_REQUEST,
};

const MESSAGE_BY_CODE: Record<string, string> = {
  P2002: 'Unique constraint violation',
  P2025: 'Record not found',
  P2003: 'Foreign key constraint violation',
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      STATUS_BY_CODE[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      MESSAGE_BY_CODE[exception.code] ?? 'Internal server error';

    response.status(status).json({ statusCode: status, message });
  }
}

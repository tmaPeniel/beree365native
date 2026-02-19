/**
 * Gestion centralisée des erreurs
 */

import { toast } from 'sonner';
import { logger } from './logger';

export enum ErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
}

class ErrorHandler {
  handle(error: AppError | Error, showToast = true): void {
    if (this.isAppError(error)) {
      logger.error(`[${error.code}] ${error.message}`, error.details);
      if (showToast) {
        toast.error(error.message);
      }
    } else {
      logger.error('Unexpected error:', error);
      if (showToast) {
        toast.error('Une erreur inattendue est survenue');
      }
    }
  }

  private isAppError(error: any): error is AppError {
    return error && typeof error.code === 'string' && typeof error.message === 'string';
  }

  create(code: ErrorCode, message: string, details?: any): AppError {
    return { code, message, details };
  }
}

export const errorHandler = new ErrorHandler();

/**
 * 统一错误处理工具类
 */

export class ErrorHandler extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ErrorHandler.prototype);
  }
}

export const handleApiError = (error: any, defaultMessage: string = 'An error occurred') => {
  console.error(defaultMessage, error);

  if (error instanceof ErrorHandler) {
    return {
      error: error.message,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  return {
    error: error.message || defaultMessage,
    statusCode: error.statusCode || 500,
    details: error.details || undefined
  };
};

export const logError = (error: Error, context?: string) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    message: error.message,
    stack: error.stack,
    context: context || 'unknown',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
  };

  console.error('Error Log:', errorInfo);
};
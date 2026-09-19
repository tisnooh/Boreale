import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Application error with HTTP status and machine-readable code. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code = 'bad_request', message = 'Requête invalide.', details?: unknown) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(code = 'unauthorized', message = 'Authentification requise.') {
    return new AppError(401, code, message);
  }
  static forbidden(code = 'forbidden', message = 'Accès refusé.') {
    return new AppError(403, code, message);
  }
  static notFound(code = 'not_found', message = 'Ressource introuvable.') {
    return new AppError(404, code, message);
  }
  static conflict(code = 'conflict', message = 'Conflit.', details?: unknown) {
    return new AppError(409, code, message, details);
  }
  static unprocessable(code = 'validation_error', message = 'Données invalides.', details?: unknown) {
    return new AppError(422, code, message, details);
  }
  static serviceUnavailable(code = 'service_unavailable', message = 'Service non configuré.') {
    return new AppError(503, code, message);
  }
}

/** Wraps an async handler so rejections reach the Express error middleware. */
export function asyncHandler<T extends RequestHandler>(fn: T): T {
  const wrapped = ((req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }) as unknown as T;
  return wrapped;
}

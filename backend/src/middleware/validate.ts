import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          AppError.unprocessable(
            'validation_error',
            'Données invalides.',
            err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
          )
        );
        return;
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      // Express query is a getter on some versions — assign via defineProperty
      Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          AppError.unprocessable(
            'validation_error',
            'Paramètres de requête invalides.',
            err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
          )
        );
        return;
      }
      next(err);
    }
  };
}

/** Final error handler — normalized JSON envelope. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'validation_error',
        message: 'Données invalides.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof Error && err.message.startsWith('CORS:')) {
    res.status(403).json({ error: { code: 'cors_rejected', message: 'Origine non autorisée.' } });
    return;
  }
  logger.error('Unhandled error', { path: req.path, err: err instanceof Error ? { message: err.message, stack: err.stack } : String(err) });
  res.status(500).json({ error: { code: 'internal_error', message: 'Erreur interne du serveur.' } });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: `Route inconnue : ${req.method} ${req.path}` } });
}

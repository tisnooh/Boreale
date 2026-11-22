import type { Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { runOrderConfirmations } from '../services/order-notifications.js';

export const processOrderConfirmations = asyncHandler(async (req: Request, res: Response) => {
  const secret = config().CRON_SECRET;
  const actual = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (secret.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw AppError.unauthorized('cron_unauthorized');
  }
  res.json({ data: await runOrderConfirmations() });
});

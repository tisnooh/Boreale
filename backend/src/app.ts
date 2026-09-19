import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { buildCorsOptions } from './middleware/cors.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { errorHandler, notFoundHandler } from './middleware/validate.js';
import { optionalUser } from './middleware/auth.js';
import { buildRouter } from './routes/index.js';
import { checkoutController } from './controllers/checkout.js';

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1); // Vercel
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(cors(buildCorsOptions()));
  app.use(cookieParser());

  // Stripe webhook needs the RAW body for signature verification — mounted BEFORE json parser.
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), checkoutController.stripeWebhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(optionalUser);
  app.use(buildRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const app = createApp();
export default app;

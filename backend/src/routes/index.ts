import { Router } from 'express';
import { healthController, catalogController } from '../controllers/health.js';
import { authController } from '../controllers/auth.js';
import { checkoutController, ordersController } from '../controllers/checkout.js';
import { newsletterController, contactController, cronController } from '../controllers/misc.js';
import { adminController } from '../controllers/admin.js';
import { requireAdmin, requireUser, optionalUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  updateProfileSchema,
} from '../validators/auth.js';
import {
  variantsQuerySchema,
  productListQuerySchema,
  adminListQuerySchema,
  productUpsertSchema,
  discountUpsertSchema,
  orderStatusSchema,
  refundSchema,
  campaignSchema,
  settingsSchema,
  newsletterSubscribeSchema,
  contactSchema,
} from '../validators/catalog.js';
import {
  checkoutSchema,
  validateDiscountSchema,
  abandonedCartSchema,
  orderLookupSchema,
} from '../validators/checkout.js';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'auth' });
const adminAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'admin-auth' });
const publicFormLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 12, keyPrefix: 'form' });

export function buildRouter(): Router {
  const r = Router();

  /* ---------- public ---------- */
  r.get('/api/health', healthController);
  r.get('/api/products', validateQuery(productListQuerySchema), catalogController.listProducts);
  r.get('/api/products/:slug', catalogController.getProduct);
  r.get('/api/categories', catalogController.listCategories);
  r.get('/api/categories/:slug', catalogController.getCategory);
  r.get('/api/bundles', catalogController.listBundles);
  r.get('/api/settings/homepage', catalogController.homepageSettings);
  r.get('/api/variants', validateQuery(variantsQuerySchema), catalogController.listVariants);
  r.post('/api/discounts/validate', publicFormLimiter, validateBody(validateDiscountSchema), checkoutController.validateDiscount);
  r.post('/api/newsletter', publicFormLimiter, validateBody(newsletterSubscribeSchema), newsletterController.subscribe);
  r.get('/api/newsletter/unsubscribe', newsletterController.unsubscribe);
  r.post('/api/contact', publicFormLimiter, validateBody(contactSchema), contactController.submit);
  r.post('/api/carts/abandoned', validateBody(abandonedCartSchema), checkoutController.registerAbandonedCart);
  r.get('/api/orders/lookup', validateQuery(orderLookupSchema), ordersController.lookup);

  /* ---------- customer auth ---------- */
  r.post('/api/auth/register', authLimiter, validateBody(registerSchema), authController.register);
  r.post('/api/auth/login', authLimiter, validateBody(loginSchema), authController.login);
  r.post('/api/auth/logout', authController.logout);
  r.get('/api/me', requireUser, authController.me);
  r.patch('/api/me', requireUser, validateBody(updateProfileSchema), authController.updateProfile);
  r.get('/api/me/orders', requireUser, ordersController.myOrders);
  r.get('/api/orders/:id', optionalUser, requireUserOrAdmin, ordersController.getById);

  /* ---------- checkout / stripe ---------- */
  r.post('/api/stripe/checkout', validateBody(checkoutSchema), checkoutController.createCheckout);
  r.get('/api/stripe/session/:id', checkoutController.getSession);
  r.post('/api/webhooks/stripe', checkoutController.stripeWebhook);

  /* ---------- cron ---------- */
  r.get('/api/cron/abandoned-carts', cronController.abandonedCarts);

  /* ---------- admin ---------- */
  r.post('/api/admin/auth/login', adminAuthLimiter, validateBody(adminLoginSchema), authController.adminLogin);
  r.post('/api/admin/auth/logout', authController.adminLogout);
  r.get('/api/admin/auth/me', requireAdmin, authController.adminMe);

  r.get('/api/admin/products', requireAdmin, adminController.listProducts);
  r.post('/api/admin/products', requireAdmin, validateBody(productUpsertSchema), adminController.createProduct);
  r.put('/api/admin/products/:id', requireAdmin, validateBody(productUpsertSchema), adminController.updateProduct);
  r.delete('/api/admin/products/:id', requireAdmin, adminController.deleteProduct);

  r.get('/api/admin/orders', requireAdmin, validateQuery(adminListQuerySchema), adminController.listOrders);
  r.get('/api/admin/orders/:id', requireAdmin, adminController.getOrder);
  r.post('/api/admin/orders/:id/status', requireAdmin, validateBody(orderStatusSchema), adminController.setOrderStatus);
  r.post('/api/admin/orders/:id/refund', requireAdmin, validateBody(refundSchema), adminController.refundOrder);

  r.get('/api/admin/customers', requireAdmin, validateQuery(adminListQuerySchema), adminController.listCustomers);

  r.get('/api/admin/discounts', requireAdmin, adminController.listDiscounts);
  r.post('/api/admin/discounts', requireAdmin, validateBody(discountUpsertSchema), adminController.createDiscount);
  r.put('/api/admin/discounts/:id', requireAdmin, validateBody(discountUpsertSchema), adminController.updateDiscount);
  r.delete('/api/admin/discounts/:id', requireAdmin, adminController.deleteDiscount);

  r.get('/api/admin/newsletter/subscribers', requireAdmin, validateQuery(adminListQuerySchema), adminController.listSubscribers);
  r.post('/api/admin/newsletter/campaigns', requireAdmin, validateBody(campaignSchema), adminController.sendCampaign);

  r.get('/api/admin/messages', requireAdmin, validateQuery(adminListQuerySchema), adminController.listMessages);
  r.post('/api/admin/messages/:id/handled', requireAdmin, adminController.markMessageHandled);

  r.get('/api/admin/settings/homepage', requireAdmin, adminController.getHomepageSettings);
  r.put('/api/admin/settings/homepage', requireAdmin, validateBody(settingsSchema), adminController.setHomepageSettings);
  r.get('/api/admin/settings/:key', requireAdmin, adminController.getSetting);

  r.get('/api/admin/stats', requireAdmin, adminController.stats);

  return r;
}

/** GET /api/orders/:id accepts a user OR an admin token. */
function requireUserOrAdmin(req: Parameters<typeof requireUser>[0], res: Parameters<typeof requireUser>[1], next: Parameters<typeof requireUser>[2]) {
  // Try admin first (cookie/Bearer), else require user
  requireAdmin(req, res, (adminErr?: unknown) => {
    if (!adminErr) return next();
    requireUser(req, res, next);
  });
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from 'express';
import { adminController } from '../src/controllers/admin.js';
import { ordersRepo } from '../src/repositories/orders.js';
import { catalogRepo } from '../src/repositories/catalog.js';

// Controller behavior is real; all persistence is mocked, no provider contacted.
const order = { id: 'order-qa', number: 'QA', status: 'paid', paid_at: '2026-11-14',
  fulfillment_status: 'blocked', order_items: [], tracking_carrier: null, tracking_number: null };
beforeEach(() => {
  vi.spyOn(ordersRepo, 'getById').mockResolvedValue(order as never);
  vi.spyOn(ordersRepo, 'setStatus').mockResolvedValue(order as never);
  vi.spyOn(ordersRepo, 'adminOperation').mockResolvedValue(order as never);
  vi.spyOn(ordersRepo, 'addEvent').mockResolvedValue(undefined);
  vi.spyOn(ordersRepo, 'cancelPending').mockResolvedValue(true);
  vi.spyOn(catalogRepo, 'restoreInventory').mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());
function update(status: string, extra: Record<string, unknown> = {}) {
  return new Promise<unknown>((resolve, reject) => {
    (adminController.setOrderStatus as RequestHandler)({ params: { id: order.id }, body: { status, expectedStatus: status === 'cancelled' || status === 'paid' ? 'pending' : 'paid', ...extra },
      admin: { email: 'qa@example.invalid' } } as never, { json: resolve } as never, reject);
  });
}
describe('administration des commandes : preuves paiement et stock', () => {
  it('refuse de marquer payé sans confirmation du prestataire', async () => {
    vi.mocked(ordersRepo.getById).mockResolvedValue({ ...order, status: 'pending', paid_at: null } as never);
    await expect(update('paid')).rejects.toMatchObject({ code: 'provider_confirmation_required' });
    expect(ordersRepo.setStatus).not.toHaveBeenCalled();
  });
  it.each(['refunded', 'partially_refunded'])('refuse le statut financier %s sans confirmation prestataire', async (status) => {
    await expect(update(status)).rejects.toMatchObject({ code: 'provider_confirmation_required' });
    expect(ordersRepo.setStatus).not.toHaveBeenCalled();
  });
  it.each(['processing', 'shipped'])('bloque %s si paiement avec incident de stock', async (status) => {
    await expect(update(status)).rejects.toMatchObject({ code: 'fulfillment_blocked' });
    expect(ordersRepo.setStatus).not.toHaveBeenCalled();
  });
  it('ne recrée pas du stock en annulant une commande payée bloquée', async () => {
    await expect(update('cancelled', { expectedStatus: 'paid' })).rejects.toMatchObject({ code: 'paid_cancellation_requires_review' });
    expect(ordersRepo.setStatus).not.toHaveBeenCalled();
    expect(catalogRepo.restoreInventory).not.toHaveBeenCalled();
  });
  it('exige transporteur et suivi avant expédition', async () => {
    vi.mocked(ordersRepo.getById).mockResolvedValue({ ...order, fulfillment_status: 'ready' } as never);
    await expect(update('shipped')).rejects.toMatchObject({ code: 'tracking_required' });
    expect(ordersRepo.setStatus).not.toHaveBeenCalled();
  });
  it('prépare seulement une commande dont le stock est alloué', async () => {
    vi.mocked(ordersRepo.getById).mockResolvedValue({ ...order, fulfillment_status: 'ready' } as never);
    await update('processing');
    expect(ordersRepo.adminOperation).toHaveBeenCalledWith(order.id, expect.objectContaining({ action: 'advance', expectedStatus: 'paid', status: 'processing' }));
  });
  it('annule pending via une opération atomique', async () => {
    vi.mocked(ordersRepo.getById).mockResolvedValue({ ...order, status: 'pending', paid_at: null } as never);
    vi.mocked(ordersRepo.adminOperation).mockResolvedValue({ ...order, status: 'cancelled', fulfillment_status: 'pending' } as never);
    await expect(update('cancelled')).resolves.toMatchObject({ data: { status: 'cancelled', fulfillmentStatus: 'pending' } });
    expect(ordersRepo.adminOperation).toHaveBeenCalledWith(order.id, expect.objectContaining({ action: 'advance', status: 'cancelled', expectedStatus: 'pending' }));
    expect(ordersRepo.setStatus).not.toHaveBeenCalled();
  });
  it('refuse un statut périmé sans mutation', async () => {
    await expect(update('processing', { expectedStatus: 'shipped' })).rejects.toMatchObject({ code: 'order_state_changed' });
    expect(ordersRepo.adminOperation).not.toHaveBeenCalled();
  });
  it('refuse les notifications avant toute mutation', async () => {
    await expect(update('processing', { notify: true })).rejects.toMatchObject({ code: 'notifications_unavailable' });
    expect(ordersRepo.adminOperation).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrdersPage from '@/app/admin/(panel)/commandes/page';
import DetailPage from '@/app/admin/(panel)/commandes/[id]/page';
import Dashboard from '@/app/admin/(panel)/page';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));
const order = {
  id: 'o1', number: 'BOR-TEST-1', email: 'client@example.test', status: 'paid', fulfillmentStatus: 'ready', currency: 'EUR',
  subtotalCents: 2500, discountCents: 0, shippingCents: 500, totalCents: 3000, shippingMethod: 'standard', discountCode: null,
  shippingAddress: { firstName: 'Client', lastName: 'Test', line1: '1 rue test', city: 'Paris', postalCode: '75001', country: 'FR' },
  items: [{ sku: 'TEST', productName: 'Article test', variantTitle: 'Bleu', unitPriceCents: 2500, quantity: 1, totalCents: 2500 }],
  tracking: { carrier: null, number: null, url: null }, placedAt: '2026-11-16T10:00:00Z', paidAt: '2026-11-16T10:01:00Z',
  payment: { status: 'succeeded', amount_cents: 3000, refunded_cents: 0, stripe_payment_intent_id: 'pi_test' },
  events: [{ id: 1, type: 'admin_note', data: { note: 'À contrôler', by: 'admin@example.test' }, created_at: '2026-11-16T10:00:00Z' }],
  incidents: [{ id: 'i1', code: 'stock_unavailable', status: 'open', owner_role: 'operations', next_action: 'Vérifier le stock', created_at: '2026-11-16T10:00:00Z' }],
  notifications: [{ id: 'n1', type: 'confirmation', status: 'pending', attempts: 0, last_error: null, sent_at: null }],
  capabilities: { allowedStatuses: ['processing', 'shipped'], canEditTracking: false, canAddNote: true, refund: { enabled: false, reason: 'Remboursements indisponibles.' }, notifications: { enabled: false, reason: 'Envoi automatique indisponible.' } },
};
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => { api.get.mockReset(); api.post.mockReset(); });
afterEach(cleanup);

describe('administration des commandes', () => {
  it('affiche une erreur réseau sans prétendre que la liste est vide, puis permet une reprise', async () => {
    api.get.mockRejectedValueOnce(new Error('API indisponible')).mockResolvedValueOnce({ data: [], total: 0 });
    render(<OrdersPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API indisponible');
    expect(screen.queryByText('Aucune commande ne correspond.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Aucune commande ne correspond.')).toBeInTheDocument();
  });
  it('soumet la recherche explicitement et ignore une ancienne réponse', async () => {
    const first = deferred<{ data: unknown[]; total: number }>();
    api.get.mockReturnValueOnce(first.promise).mockResolvedValue({ data: [], total: 0 });
    render(<OrdersPage />);
    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'nouveau' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
    await screen.findByText('Aucune commande ne correspond.');
    first.resolve({ data: [order], total: 1 });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(order.number)).not.toBeInTheDocument();
    expect(api.get.mock.calls[1][0]).toContain('q=nouveau');
  });
  it('affiche les incidents, notes, notifications et uniquement les transitions autorisées', async () => {
    api.get.mockResolvedValue({ data: order });
    render(<DetailPage params={Promise.resolve({ id: 'o1' })} />);
    await screen.findByRole('heading', { name: order.number });
    expect(screen.getByText('Prochaine action : Vérifier le stock')).toBeInTheDocument();
    expect(screen.getByText('Note : À contrôler')).toBeInTheDocument();
    expect(screen.getByText('Par : admin@example.test')).toBeInTheDocument();
    expect(screen.getByText('Confirmation de commande')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /rembourser/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('transmet le statut attendu sans activer les emails ni modifier le suivi pour la préparation', async () => {
    api.get.mockResolvedValue({ data: order }); api.post.mockResolvedValue({ data: order });
    render(<DetailPage params={Promise.resolve({ id: 'o1' })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer le statut' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/admin/orders/o1/status', { status: 'processing', expectedStatus: 'paid', notify: false }));
  });
  it('conserve une note refusée puis la vide seulement après confirmation du serveur', async () => {
    api.get.mockResolvedValue({ data: order }); api.post.mockRejectedValueOnce(new Error('Conflit serveur')).mockResolvedValueOnce({ data: order });
    render(<DetailPage params={Promise.resolve({ id: 'o1' })} />);
    const input = await screen.findByLabelText('Ajouter une note');
    fireEvent.change(input, { target: { value: 'Vérifier la livraison' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la note' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflit serveur');
    expect(input).toHaveValue('Vérifier la livraison');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la note' }));
    await screen.findByText('Note enregistrée.');
    expect(await screen.findByLabelText('Ajouter une note')).toHaveValue('');
    expect(api.post).toHaveBeenLastCalledWith('/api/admin/orders/o1/notes', { note: 'Vérifier la livraison' });
  });
  it('permet de corriger le suivi sans changer le statut avec sa version attendue', async () => {
    const shipped = { ...order, status: 'shipped', tracking: { carrier: 'Transporteur', number: 'ABC', url: null }, capabilities: { ...order.capabilities, allowedStatuses: ['delivered'], canEditTracking: true } };
    api.get.mockResolvedValue({ data: shipped }); api.post.mockResolvedValue({ data: shipped });
    render(<DetailPage params={Promise.resolve({ id: 'o1' })} />);
    fireEvent.change(await screen.findByLabelText('N° de suivi'), { target: { value: 'ABC2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le suivi' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/admin/orders/o1/tracking', { expectedStatus: 'shipped', expectedTracking: shipped.tracking, trackingCarrier: 'Transporteur', trackingNumber: 'ABC2', trackingUrl: null }));
  });
  it('ne masque pas une panne de statistiques derrière de faux zéros', async () => {
    api.get.mockRejectedValue(new Error('Statistiques indisponibles'));
    render(<Dashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Statistiques indisponibles');
    expect(screen.queryByText('CA net (total)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
  it('la touche Entrée dans le suivi ne valide pas accidentellement la livraison', async () => {
    const shipped = { ...order, status: 'shipped', tracking: { carrier: 'Transporteur', number: 'ABC', url: null }, capabilities: { ...order.capabilities, allowedStatuses: ['delivered'], canEditTracking: true } };
    api.get.mockResolvedValue({ data: shipped }); api.post.mockResolvedValue({ data: shipped });
    render(<DetailPage params={Promise.resolve({ id: 'o1' })} />);
    const input = await screen.findByLabelText('N° de suivi');
    fireEvent.change(input, { target: { value: 'ABC3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][0]).toBe('/api/admin/orders/o1/tracking');
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('status');
  });
});

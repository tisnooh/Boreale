import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SourcingForm, SourcingList } from '@/components/admin/Sourcing';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProductForm } from '@/components/admin/ProductForm';
import ProductsPage from '@/app/admin/(panel)/produits/page';
import { ToastProvider } from '@/hooks/use-toast';
import { isAlibabaUrl, type SourcingCandidate } from '@/lib/admin-sourcing';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/admin/sourcing' }));
const candidate: SourcingCandidate = {
  id: 'c1', candidate_key: 'BOR-ALI-20261114-01', product_id: 'p1', title: 'Plaid observé',
  supplier_name: 'Fournisseur observé', supplier_url: 'https://supplier.en.alibaba.com',
  source_platform: 'alibaba', source_product_id: '1234567890', source_url: 'https://www.alibaba.com/product-detail/1234567890.html',
  observed_at: '2026-11-14', observed_facts: { composition: 'Non confirmé' },
  missing_evidence: ['Échantillon', 'Conformité'], notes: null, status: 'unverified',
  created_at: '2026-11-14T00:00:00Z', updated_at: '2026-11-14T00:00:00Z',
  products: { id: 'p1', name: 'Plaid observé', slug: 'plaid-observe', is_active: false, procurement_status: 'unverified', source_candidate_key: 'BOR-ALI-20261114-01' },
};
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
// Model the API's validation and procurement gate, rather than accepting every POST.
function manualProductApi(url: string, init: RequestInit) {
  if (url.endsWith('/api/categories')) return Promise.resolve(response({ data: [] }));
  const body = JSON.parse(String(init.body));
  const variants = body.variants as { sku: string; title: string; priceCents: number | null; isActive: boolean }[];
  if (body.name.length < 2 || body.description.length < 10 || variants.length === 0 || variants.some((variant) => variant.sku.length < 2 || !variant.title || !Number.isInteger(variant.priceCents))) {
    return Promise.resolve(response({ error: { code: 'validation_error', message: 'Métadonnées produit ou variante incomplètes.' } }, 400));
  }
  if (body.isActive || variants.some((variant) => variant.isActive)) {
    return Promise.resolve(response({ error: { code: 'procurement_unverified', message: 'Vérifiez l’approvisionnement avant toute activation du produit ou de ses variantes.' } }, 409));
  }
  return Promise.resolve(response({ data: { id: 'manual-created' } }, 201));
}

function fillEligibleManual(view: ReturnType<typeof render>) {
  fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Produit manuel' } });
  fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: 'produit-manuel' } });
  fireEvent.change(screen.getByLabelText('Description courte *'), { target: { value: 'Description observée du produit manuel.' } });
  screen.getAllByPlaceholderText('BOR-XXX-01').forEach((input, index) => fireEvent.change(input, { target: { value: `BOR-MAN-0${index + 1}` } }));
  screen.getAllByPlaceholderText('S/M · Bleu nuit').forEach((input, index) => fireEvent.change(input, { target: { value: `Variante observée ${index + 1}` } }));
  view.container.querySelectorAll('input[required][inputmode="decimal"]').forEach((input) => fireEvent.change(input, { target: { value: '18.00' } }));
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function expectNoPublication() {
  expect(screen.queryByRole('button', { name: /publier|qualifier|activer/i })).not.toBeInTheDocument();
}
function fillNew() {
  const values = {
    'Référence dossier': candidate.candidate_key, 'Titre observé': candidate.title,
    'Nom du fournisseur': candidate.supplier_name, 'URL fournisseur Alibaba': candidate.supplier_url,
    'Identifiant produit Alibaba': candidate.source_product_id, 'URL source Alibaba': candidate.source_url,
    'Date d’observation': candidate.observed_at,
  };
  for (const [label, value] of Object.entries(values)) fireEvent.change(screen.getByLabelText(`${label} *`), { target: { value } });
}

const SOURCE_URLS = ["https://www.alibaba.com/product-detail/Premium-Red-Tartan-Plaid-Throw-Blanket_1601619873272.html", "https://www.alibaba.com/product-detail/Wholesale-Women-High-Quality-Fluffy-Sleep_1600562253833.html", "https://www.alibaba.co.uk/product-detail/Custom-Polar-Fleece-Neck-Gaiter-Winter_1601693375789.html"];

describe('admin sourcing', () => {
  it.each(SOURCE_URLS)('accepte le domaine de la source réelle %s', (url) => {
    expect(isAlibabaUrl(url)).toBe(true);
  });
  it.each(['https://evilalibaba.com/product', 'https://alibaba.co.uk.example.org', 'http://www.alibaba.com', 'https://user:secret@www.alibaba.com'])('rejette la source non autorisée %s', (url) => {
    expect(isAlibabaUrl(url)).toBe(false);
  });


  it('garde toutes les rubriques accessibles dans la navigation admin mobile', async () => {
    fetchMock.mockResolvedValue(response({ data: { id: 'a1', email: 'admin@example.test', role: 'admin' } }));
    render(<AdminShell><p>Dossiers</p></AdminShell>);
    const navigation = await screen.findByRole('navigation', { name: 'Navigation admin mobile' });
    const routes = {
      Dashboard: '/admin', Commandes: '/admin/commandes', Produits: '/admin/produits',
      Sourcing: '/admin/sourcing', Clients: '/admin/clients', Promotions: '/admin/promotions',
      Newsletter: '/admin/newsletter', 'Contenu accueil': '/admin/contenu', Messages: '/admin/messages',
    };
    for (const [name, href] of Object.entries(routes)) {
      expect(within(navigation).getByRole('link', { name })).toHaveAttribute('href', href);
    }
    expect(within(navigation).getAllByRole('link')).toHaveLength(9);
  });
  it('conserve l’origine historique en lecture seule et permet de modifier les observations', async () => {
    fetchMock.mockResolvedValueOnce(response({ data: candidate })).mockResolvedValueOnce(response({ data: { candidate: { ...candidate, title: 'Observation mise à jour' }, product: candidate.products, created: false } }));
    render(<SourcingForm candidateKey={candidate.candidate_key} />);
    await screen.findByDisplayValue(candidate.title);
    const origins = ['Référence dossier *', 'Nom du fournisseur *', 'URL fournisseur Alibaba *', 'Identifiant produit Alibaba *', 'URL source Alibaba *'];
    for (const label of origins) expect(screen.getByLabelText(label)).toHaveAttribute('readonly');
    expect(screen.getByText(/L’origine historique du dossier est conservée/)).toBeInTheDocument();
    for (const label of ['Titre observé *', 'Date d’observation *', 'Faits observés (objet JSON, sans supposition)', 'Preuves manquantes (une par ligne)', 'Notes']) {
      expect(screen.getByLabelText(label)).not.toHaveAttribute('readonly');
    }
    fireEvent.change(screen.getByLabelText('Titre observé *'), { target: { value: 'Observation mise à jour' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Complément d’observation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les métadonnées' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Métadonnées enregistrées');
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(payload).toMatchObject({
      candidateKey: candidate.candidate_key, supplierName: candidate.supplier_name,
      supplierUrl: candidate.supplier_url, sourceProductId: candidate.source_product_id,
      sourceUrl: candidate.source_url, title: 'Observation mise à jour', notes: 'Complément d’observation',
    });
  });
  it('charge les dossiers réels via le client API et expose un lien source sécurisé', async () => {
    fetchMock.mockResolvedValue(response({ data: [candidate] }));
    render(<SourcingList />);
    expect(screen.getByText('Chargement des dossiers sourcing…')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: candidate.title })).toHaveAttribute('href', `/admin/sourcing/${candidate.candidate_key}`);
    expect(screen.getByText('Brouillon fournisseur — non vendable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Source Alibaba/ })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include', method: 'GET' });
    expectNoPublication();
  });
  it('distingue une liste vide d’une erreur serveur', async () => {
    fetchMock.mockResolvedValueOnce(response({ data: [] })).mockResolvedValueOnce(response({ error: { code: 'forbidden', message: 'Accès refusé' } }, 403));
    const first = render(<SourcingList />);
    expect(await screen.findByText('Aucun dossier sourcing enregistré.')).toBeInTheDocument();
    first.unmount(); render(<SourcingList />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé (forbidden)');
    expect(screen.queryByText('Aucun dossier sourcing enregistré.')).not.toBeInTheDocument();
  });
  it('crée uniquement les métadonnées camelCase, sans prix, variante ou activation', async () => {
    fetchMock.mockResolvedValue(response({ data: { candidate, product: candidate.products, created: true } }, 201));
    render(<SourcingForm />); fillNew();
    for (const label of ['Référence dossier *', 'Nom du fournisseur *', 'URL fournisseur Alibaba *', 'Identifiant produit Alibaba *', 'URL source Alibaba *']) expect(screen.getByLabelText(label)).not.toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Preuves manquantes (une par ligne)'), { target: { value: 'Échantillon\nConformité' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les métadonnées' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Dossier créé');
    const request = fetchMock.mock.calls[0][1];
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({ candidateKey: candidate.candidate_key, title: candidate.title, supplierName: candidate.supplier_name, supplierUrl: candidate.supplier_url, sourcePlatform: 'alibaba', sourceProductId: candidate.source_product_id, sourceUrl: candidate.source_url, observedAt: '2026-11-14', observedFacts: {}, missingEvidence: ['Échantillon', 'Conformité'], notes: null });
    expectNoPublication();
  });
  it('charge le détail et affiche la réponse d’erreur PUT sans annoncer un succès', async () => {
    fetchMock.mockResolvedValueOnce(response({ data: candidate })).mockResolvedValueOnce(response({ error: { code: 'validation_error', message: 'Observation invalide', details: [{ path: 'observedAt', message: 'Date requise' }] } }, 400));
    render(<SourcingForm candidateKey={candidate.candidate_key} />);
    expect(await screen.findByDisplayValue(candidate.title)).toBeInTheDocument();
    expect(screen.getByLabelText('Référence dossier *')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les métadonnées' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Observation invalide (validation_error)');
    expect(screen.getByRole('alert')).toHaveTextContent('Date requise');
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expectNoPublication();
  });
  it('refuse les faits non objet et les liens hors Alibaba avant tout appel', async () => {
    render(<SourcingForm />); fillNew();
    fireEvent.change(screen.getByLabelText(/Faits observés/), { target: { value: '[]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les métadonnées' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('objet JSON valide');
    fireEvent.change(screen.getByLabelText(/Faits observés/), { target: { value: '{}' } });
    fireEvent.change(screen.getByLabelText('URL source Alibaba *'), { target: { value: 'https://alibaba.com.example.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les métadonnées' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('URL HTTPS Alibaba');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('affiche un brouillon sans prix supposé dans les produits et mène au dossier', async () => {
    fetchMock.mockResolvedValue(response({ data: [{ ...candidate.products, type: 'product', is_featured: false, product_variants: [] }] }));
    render(<ToastProvider><ProductsPage /></ToastProvider>);
    expect(await screen.findByText('Brouillon fournisseur — non vendable')).toBeInTheDocument();
    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
    expect(screen.getAllByText('Non confirmé').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Dossier sourcing' })).toHaveAttribute('href', `/admin/sourcing/${candidate.candidate_key}`);
    expect(screen.queryByText(/0,00/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Éditer' })).not.toBeInTheDocument();
  });
  it('rend les produits sourcés en lecture seule, sans sauvegarde générique', async () => {
    fetchMock.mockImplementation((url: string) => Promise.resolve(response({ data: url.endsWith('/api/categories') ? [] : [candidate.products] })));
    render(<ToastProvider><ProductForm productId="p1" /></ToastProvider>);
    expect(await screen.findByRole('link', { name: /Ouvrir le dossier/ })).toHaveAttribute('href', `/admin/sourcing/${candidate.candidate_key}`);
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expectNoPublication();
  });
  it('conserve les champs inconnus et transmet un brouillon manuel inactif', async () => {
    fetchMock.mockImplementation(manualProductApi);
    const view = render(<ToastProvider><ProductForm /></ToastProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText(/Actif \(visible/)).not.toBeChecked();
    const inputs = view.container.querySelectorAll('input');
    expect(Array.from(inputs).some((input) => input.value === 'Taille unique' || input.value === '300')).toBe(false);
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Manuel' } });
    fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: 'manuel' } });
    fireEvent.change(screen.getByLabelText('Description courte *'), { target: { value: 'Description' } });
    // Submit the form directly to inspect the unchanged generic payload independently of native required fields.
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(payload.isActive).toBe(false);
    expect(payload.variants.every((variant: { isActive: boolean }) => variant.isActive === false)).toBe(true);
    expect(await screen.findByRole('alert')).toHaveTextContent('Métadonnées produit ou variante incomplètes.');
    expect(screen.queryByText('Produit créé.')).not.toBeInTheDocument();
    expect(payload.variants[0]).toMatchObject({ title: '', weightG: null, priceCents: null });
    expect(payload.variants[0]).not.toHaveProperty('stock');
  });

  it('crée un brouillon manuel éligible avec toutes les nouvelles variantes inactives', async () => {
    fetchMock.mockImplementation(manualProductApi);
    const view = render(<ToastProvider><ProductForm /></ToastProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter une variante' }));
    fillEligibleManual(view);
    expect(view.container.querySelector('form')!.checkValidity()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le produit' }));
    expect(await screen.findByText('Produit créé.')).toBeInTheDocument();
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(payload.isActive).toBe(false);
    expect(payload.variants).toHaveLength(2);
    expect(payload.variants.every((variant: { isActive: boolean }) => variant.isActive === false)).toBe(true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('affiche le refus 409 si une nouvelle variante est forcée active', async () => {
    fetchMock.mockImplementation(manualProductApi);
    const view = render(<ToastProvider><ProductForm /></ToastProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fillEligibleManual(view);
    fireEvent.click(screen.getByRole('checkbox', { name: 'active' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le produit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vérifiez l’approvisionnement');
    expect(screen.queryByText('Produit créé.')).not.toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).variants[0].isActive).toBe(true);
  });
  it('omet un stock vidé sur une variante existante au lieu de le remettre à zéro', async () => {
    const product = {
      id: 'manual', name: 'Produit manuel', slug: 'manuel', description: 'Description',
      product_variants: [{ id: 'v1', sku: 'BOR-MAN-01', title: 'Observée', options: {}, price_cents: 1800, is_active: true, inventory: [{ quantity: 42, low_stock_threshold: 5 }] }],
    };
    fetchMock.mockImplementation((url: string) => Promise.resolve(response({ data: url.endsWith('/api/categories') ? [] : [product] })));
    const view = render(<ToastProvider><ProductForm productId="manual" /></ToastProvider>);
    const stock = await screen.findByDisplayValue('42');
    expect(screen.getByRole('checkbox', { name: 'active' })).toBeChecked();
    fireEvent.change(stock, { target: { value: '' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const request = fetchMock.mock.calls[2][1];
    expect(request.method).toBe('PUT');
    expect(JSON.parse(request.body).variants[0]).not.toHaveProperty('stock');
    expect(JSON.parse(request.body).variants[0].isActive).toBe(true);
  });

});

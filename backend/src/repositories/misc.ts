import { db } from '../lib/supabase.js';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  source: string | null;
  created_at: string;
}

export const newsletterRepo = {
  async upsertSubscriber(email: string, source: string): Promise<NewsletterSubscriber> {
    const c = db();
    const normalized = email.toLowerCase();
    const { data: existing } = await c.from('newsletter_subscribers').select('*').eq('email', normalized).maybeSingle();
    if (existing) {
      const row = existing as NewsletterSubscriber;
      if (row.status === 'unsubscribed') {
        const { data, error } = await c
          .from('newsletter_subscribers')
          .update({ status: 'subscribed', unsubscribed_at: null, source })
          .eq('id', row.id)
          .select()
          .single();
        if (error) throw error;
        return data as NewsletterSubscriber;
      }
      return row;
    }
    const { data, error } = await c
      .from('newsletter_subscribers')
      .insert({ email: normalized, status: 'subscribed', source })
      .select()
      .single();
    if (error) throw error;
    return data as NewsletterSubscriber;
  },

  async unsubscribe(email: string): Promise<boolean> {
    const { data, error } = await db()
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('email', email.toLowerCase())
      .select('id');
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  async listSubscribers(opts: { page: number; limit: number; q?: string; status?: string }): Promise<{ rows: NewsletterSubscriber[]; total: number }> {
    let query = db().from('newsletter_subscribers').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.q) query = query.ilike('email', `%${opts.q}%`);
    const from = (opts.page - 1) * opts.limit;
    const { data, error, count } = await query.range(from, from + opts.limit - 1);
    if (error) throw error;
    return { rows: (data ?? []) as NewsletterSubscriber[], total: count ?? 0 };
  },

  async listSubscribedEmails(limit: number): Promise<string[]> {
    const { data, error } = await db()
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'subscribed')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as { email: string }[]).map((r) => r.email);
  },

  async createCampaign(input: { subject: string; bodyHtml: string; sentCount: number; failedCount: number; status: string }): Promise<void> {
    const { error } = await db()
      .from('newsletter_campaigns')
      .insert({
        subject: input.subject,
        body_html: input.bodyHtml,
        sent_count: input.sentCount,
        failed_count: input.failedCount,
        status: input.status,
        sent_at: new Date().toISOString(),
      });
    if (error) throw error;
  },

  async countSubscribed(): Promise<number> {
    const { count, error } = await db()
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'subscribed');
    if (error) throw error;
    return count ?? 0;
  },
};

export const settingsRepo = {
  async get<T>(key: string): Promise<T | null> {
    const { data, error } = await db().from('site_settings').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    return (data?.value as T) ?? null;
  },

  async set(key: string, value: unknown): Promise<void> {
    const c = db();
    const { data: existing } = await c.from('site_settings').select('key').eq('key', key).maybeSingle();
    if (existing) {
      const { error } = await c.from('site_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
      if (error) throw error;
    } else {
      const { error } = await c.from('site_settings').insert({ key, value });
      if (error) throw error;
    }
  },
};

export interface AbandonedCartRow {
  id: string;
  email: string;
  items: { variantId: string; quantity: number }[];
  status: string;
  sent_at: string | null;
  created_at: string;
}

export const abandonedCartsRepo = {
  async upsertOpen(email: string, items: { variantId: string; quantity: number }[]): Promise<void> {
    const c = db();
    const normalized = email.toLowerCase();
    const { data: existing } = await c
      .from('abandoned_carts')
      .select('id')
      .eq('email', normalized)
      .eq('status', 'open')
      .maybeSingle();
    if (existing) {
      const { error } = await c
        .from('abandoned_carts')
        .update({ items, updated_at: new Date().toISOString() })
        .eq('id', (existing as { id: string }).id);
      if (error) throw error;
      return;
    }
    const { error } = await c.from('abandoned_carts').insert({ email: normalized, items, status: 'open' });
    if (error) throw error;
  },

  async findDue(cutoffIso: string): Promise<AbandonedCartRow[]> {
    const { data, error } = await db()
      .from('abandoned_carts')
      .select('*')
      .eq('status', 'open')
      .is('sent_at', null)
      .lt('created_at', cutoffIso)
      .limit(100);
    if (error) throw error;
    return (data ?? []) as AbandonedCartRow[];
  },

  async markSent(id: string): Promise<void> {
    const { error } = await db()
      .from('abandoned_carts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async markConverted(email: string): Promise<void> {
    const { error } = await db()
      .from('abandoned_carts')
      .update({ status: 'converted' })
      .eq('email', email.toLowerCase())
      .eq('status', 'open');
    if (error) throw error;
  },

  async hasRecentOrder(email: string, sinceIso: string): Promise<boolean> {
    const { data, error } = await db()
      .from('orders')
      .select('id')
      .eq('email', email.toLowerCase())
      .gte('placed_at', sinceIso)
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  },
};

export const contactRepo = {
  async create(input: { name: string; email: string; subject: string; message: string; orderNumber?: string | null }): Promise<void> {
    const { error } = await db().from('contact_messages').insert({
      name: input.name,
      email: input.email.toLowerCase(),
      subject: input.subject,
      message: input.message,
      order_number: input.orderNumber ?? null,
    });
    if (error) throw error;
  },

  async list(opts: { page: number; limit: number }): Promise<{ rows: unknown[]; total: number }> {
    const from = (opts.page - 1) * opts.limit;
    const { data, error, count } = await db()
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + opts.limit - 1);
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  },

  async markHandled(id: string): Promise<void> {
    const { error } = await db().from('contact_messages').update({ handled: true }).eq('id', id);
    if (error) throw error;
  },
};

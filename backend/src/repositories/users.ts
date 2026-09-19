import { db } from '../lib/supabase.js';

export interface DbUserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  profiles?: { first_name: string | null; last_name: string | null; phone: string | null; marketing_optin: boolean } | null;
}

export const usersRepo = {
  async findByEmail(email: string): Promise<DbUserRow | null> {
    const { data, error } = await db()
      .from('users')
      .select('*, profiles(*)')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as DbUserRow) ?? null;
  },

  async findById(id: string): Promise<DbUserRow | null> {
    const { data, error } = await db().from('users').select('*, profiles(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as unknown as DbUserRow) ?? null;
  },

  async create(input: { email: string; passwordHash: string; firstName?: string; lastName?: string; marketingOptin?: boolean }): Promise<DbUserRow> {
    const c = db();
    const email = input.email.toLowerCase();
    const { data: user, error } = await c
      .from('users')
      .insert({ email, password_hash: input.passwordHash })
      .select('id,email,created_at')
      .single();
    if (error) throw error;
    const { error: profileError } = await c.from('profiles').insert({
      user_id: (user as { id: string }).id,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      marketing_optin: input.marketingOptin ?? false,
    });
    if (profileError) throw profileError;
    return { ...(user as { id: string; email: string; created_at: string }), password_hash: input.passwordHash };
  },

  async updateProfile(userId: string, patch: { firstName?: string; lastName?: string; phone?: string; marketingOptin?: boolean }): Promise<void> {
    const { error } = await db()
      .from('profiles')
      .update({
        ...(patch.firstName !== undefined ? { first_name: patch.firstName } : {}),
        ...(patch.lastName !== undefined ? { last_name: patch.lastName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
        ...(patch.marketingOptin !== undefined ? { marketing_optin: patch.marketingOptin } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (error) throw error;
  },
};

export interface DbAdminRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: 'admin' | 'staff';
  is_active: boolean;
}

export const adminUsersRepo = {
  async findByEmail(email: string): Promise<DbAdminRow | null> {
    const { data, error } = await db().from('admin_users').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (error) throw error;
    return (data as unknown as DbAdminRow) ?? null;
  },

  async create(input: { email: string; passwordHash: string; name?: string; role?: 'admin' | 'staff' }): Promise<{ id: string }> {
    const { data, error } = await db()
      .from('admin_users')
      .insert({ email: input.email.toLowerCase(), password_hash: input.passwordHash, name: input.name ?? null, role: input.role ?? 'admin', is_active: true })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id as string };
  },

  async touchLogin(id: string): Promise<void> {
    const { error } = await db().from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};

export interface DbDiscountRow {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export const discountsRepo = {
  async findActiveByCode(code: string): Promise<DbDiscountRow | null> {
    const { data, error } = await db().from('discounts').select('*').eq('code', code.toUpperCase()).maybeSingle();
    if (error) throw error;
    return (data as DbDiscountRow | null) ?? null;
  },

  async incrementUsage(code: string): Promise<void> {
    const c = db();
    const { data: row, error } = await c.from('discounts').select('used_count').eq('code', code.toUpperCase()).maybeSingle();
    if (error) throw error;
    const current = (row as { used_count: number } | null)?.used_count ?? 0;
    const { error: upErr } = await c.from('discounts').update({ used_count: current + 1 }).eq('code', code.toUpperCase());
    if (upErr) throw upErr;
  },

  async adminList(): Promise<unknown[]> {
    const { data, error } = await db().from('discounts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async adminUpsert(input: Record<string, unknown>, id?: string) {
    const c = db();
    if (id) {
      const { data, error } = await c.from('discounts').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await c.from('discounts').insert(input).select().single();
    if (error) throw error;
    return data;
  },

  async adminDelete(id: string): Promise<void> {
    const { error } = await db().from('discounts').delete().eq('id', id);
    if (error) throw error;
  },
};

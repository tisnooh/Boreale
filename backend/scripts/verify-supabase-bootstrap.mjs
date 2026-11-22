import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import console from 'node:console';

// Only the newly created BORÉALE project. Never prints keys, tokens or passwords.
assert.equal(process.env.SUPABASE_URL, 'https://luojeyfznonjnacftxbm.supabase.co');
assert.ok(process.env.SUPABASE_PUBLISHABLE_KEY);
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY);
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const publicClient = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, options);
const run = randomUUID();
const fixtures = [];
const checks = [];
let cleaned = 0;
let failed = false;
function checked(name, condition) { assert.ok(condition, name); checks.push(name); }
try {
  for (let index = 0; index < 2; index++) {
    const email = `boreale-qa-${run}-${index}@example.invalid`;
    const password = `${randomBytes(24).toString('base64url')}aA1!`;
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { first_name: 'QA', last_name: 'Test', marketing_optin: false, role: 'admin', boreale_qa_run: run } });
    checked('create_test_auth_user', !created.error && Boolean(created.data.user));
    const id = created.data.user.id;
    fixtures.push({ id, email });
    const client = publicClient();
    const login = await client.auth.signInWithPassword({ email, password });
    checked('password_login', !login.error && Boolean(login.data.session));
    const verified = await client.auth.getUser();
    checked('verified_identity', !verified.error && verified.data.user?.id === id && login.data.user?.role === 'authenticated');
    const own = await client.from('profiles').select('user_id,first_name,last_name,marketing_optin').eq('user_id', id).single();
    checked('auth_trigger_and_own_profile', !own.error && own.data?.user_id === id && own.data.first_name === 'QA' && own.data.marketing_optin === false);
    fixtures[index].client = client;
  }
  const [first, second] = fixtures;
  const other = await first.client.from('profiles').select('user_id').eq('user_id', second.id);
  checked('other_profile_hidden', !other.error && other.data.length === 0);
  const changeOther = await first.client.from('profiles').update({ first_name: 'Forbidden' }).eq('user_id', second.id).select('user_id');
  checked('other_profile_update_denied', !changeOther.error && changeOther.data.length === 0);
  const updateOwn = await first.client.from('profiles').update({ first_name: 'QA updated' }).eq('user_id', first.id).select('first_name').single();
  checked('own_profile_update', !updateOwn.error && updateOwn.data.first_name === 'QA updated');
  const steal = await first.client.from('profiles').update({ user_id: second.id }).eq('user_id', first.id);
  checked('ownership_column_denied', steal.error?.code === '42501');
  const insert = await first.client.from('profiles').insert({ user_id: randomUUID() });
  checked('client_profile_insert_denied', insert.error?.code === '42501');
  const anonProfile = await publicClient().from('profiles').select('user_id').limit(1);
  checked('anonymous_profile_denied', anonProfile.error?.code === '42501');
  for (const table of ['customers', 'addresses', 'orders', 'payments', 'inventory', 'admin_users']) {
    for (const client of [publicClient(), first.client]) {
      const result = await client.from(table).select('*').limit(1);
      checked(`private_${table}_denied`, result.error?.code === '42501');
    }
  }
  const rpc = await publicClient().rpc('decrement_inventory', { p_variant: randomUUID(), p_qty: 1 });
  checked('anonymous_stock_rpc_denied', rpc.error?.code === '42501');
  const catalog = await publicClient().from('products').select('id');
  checked('empty_public_catalog', !catalog.error && catalog.data.length === 0);
  const active = await service.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true);
  checked('no_published_products', !active.error && active.count === 0);
} catch (error) {
  failed = true;
  console.error(JSON.stringify({ failedCheck: error instanceof Error ? error.message : 'QA failed' }));
} finally {
  for (const fixture of fixtures) {
    const current = await service.auth.admin.getUserById(fixture.id);
    if (current.error || current.data.user?.email !== fixture.email || current.data.user?.user_metadata?.boreale_qa_run !== run) {
      failed = true;
      console.error('QA cleanup identity check failed');
      continue;
    }
    const deleted = await service.auth.admin.deleteUser(fixture.id);
    if (deleted.error) { failed = true; console.error('QA cleanup failed'); } else cleaned++;
  }
  console.log(JSON.stringify({ checksPassed: checks.length, temporaryUsersCreated: fixtures.length, temporaryUsersRemoved: cleaned, success: !failed }));
}
if (failed) process.exitCode = 1;

/**
 * Creates (or resets) an admin account.
 * Usage: npm run admin:create -- admin@example.com 'StrongPass123!' [Nom] [role]
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local / environment.
 * The password is hashed with scrypt; it is never stored in plain text nor committed.
 */
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '../src/lib/password.js';

async function main() {
  const [email, password, name, role] = process.argv.slice(2) as string[];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!email || !password) {
    console.error('Usage : npm run admin:create -- email motdepasse [nom] [admin|staff]');
    process.exit(1);
  }
  if (!url || !key) {
    console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (voir .env.example).');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Le mot de passe admin doit contenir au moins 10 caractères.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const passwordHash = hashPassword(password);
  const normalized = email.toLowerCase();

  const { data: existing } = await supabase.from('admin_users').select('id').eq('email', normalized).maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: passwordHash, is_active: true, role: role === 'staff' ? 'staff' : 'admin' })
      .eq('id', existing.id as string);
    if (error) throw error;
    console.log(`Mot de passe mis à jour pour l'admin existant : ${normalized}`);
    return;
  }
  const { error } = await supabase.from('admin_users').insert({
    email: normalized,
    password_hash: passwordHash,
    name: name ?? null,
    role: role === 'staff' ? 'staff' : 'admin',
    is_active: true,
  });
  if (error) throw error;
  console.log(`Admin créé : ${normalized} (connexion : /admin)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur :', err instanceof Error ? err.message : err);
    process.exit(1);
  });

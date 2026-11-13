import { createClient, type Session, type User } from '@supabase/supabase-js';
import { config } from '../config.js';
import { AppError } from './errors.js';
import type { UserDTO } from '../types/index.js';

/** Per-operation public client: never reuse mutable Auth sessions between requests. */
export function publicAuthClient() {
  const env = config();
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw AppError.serviceUnavailable('auth_not_configured', 'Supabase Auth non configuré.');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function authUserDTO(user: User): UserDTO {
  // Metadata is presentation only, NEVER ownership, roles or permissions.
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id, email: user.email ?? '', createdAt: user.created_at,
    firstName: typeof metadata.first_name === 'string' ? metadata.first_name : null,
    lastName: typeof metadata.last_name === 'string' ? metadata.last_name : null,
    marketingOptin: metadata.marketing_optin === true,
  };
}

export function authSessionResult(session: Session) {
  return { token: session.access_token, refreshToken: session.refresh_token,
    expiresIn: session.expires_in, user: authUserDTO(session.user) };
}

export const supabaseAuth = {
  async register(input: { email: string; password: string; firstName?: string; lastName?: string; marketingOptin?: boolean }) {
    const { data, error } = await publicAuthClient().auth.signUp({ email: input.email, password: input.password,
      options: { data: { first_name: input.firstName, last_name: input.lastName, marketing_optin: input.marketingOptin ?? false } } });
    if (error) throw AppError.unprocessable('registration_failed', 'Inscription impossible. Vérifiez les informations et réessayez.');
    if (!data.session) throw AppError.unprocessable('email_confirmation_required', 'Vérifiez votre email pour confirmer votre compte avant de vous connecter.');
    return authSessionResult(data.session);
  },
  async login(email: string, password: string) {
    const { data, error } = await publicAuthClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw AppError.unauthorized('invalid_credentials', 'Email ou mot de passe incorrect, ou email non confirmé.');
    return authSessionResult(data.session);
  },
  async getUser(token: string) {
    const { data, error } = await publicAuthClient().auth.getUser(token);
    if (error || !data.user) throw AppError.unauthorized('auth_invalid', 'Session invalide ou expirée.');
    return data.user;
  },
  async refresh(refreshToken: string) {
    const { data, error } = await publicAuthClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw AppError.unauthorized('auth_invalid', 'Session expirée. Reconnectez-vous.');
    return authSessionResult(data.session);
  },
  async logout(accessToken: string, refreshToken: string) {
    const client = publicAuthClient();
    const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (sessionError) throw AppError.unauthorized('auth_invalid', 'Session expirée.');
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw AppError.serviceUnavailable('auth_logout_failed', 'Révocation distante indisponible.');
  },
};

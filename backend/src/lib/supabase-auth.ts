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

/** Authenticated Data API client: publishable key + this caller's verified JWT, under RLS. */
export function userDataClient(accessToken: string) {
  if (!accessToken) throw AppError.unauthorized('auth_required', 'Connexion requise.');
  const env = config();
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw AppError.serviceUnavailable('auth_not_configured', 'Supabase non configuré.');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => accessToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

interface AuthProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  marketing_optin: boolean;
}
const PROFILE_FIELDS = 'user_id,first_name,last_name,phone,marketing_optin';

function profileDTO(user: User, profile: AuthProfile): UserDTO {
  if (profile.user_id !== user.id) throw AppError.forbidden('profile_owner_mismatch', 'Accès au profil refusé.');
  return { id: user.id, email: user.email ?? '', createdAt: user.created_at,
    firstName: profile.first_name, lastName: profile.last_name, marketingOptin: profile.marketing_optin };
}

export const supabaseProfiles = {
  async read(user: User, accessToken: string): Promise<UserDTO> {
    const { data, error } = await userDataClient(accessToken).from('profiles')
      .select(PROFILE_FIELDS).eq('user_id', user.id).maybeSingle();
    if (error || !data) throw AppError.serviceUnavailable('profile_unavailable', 'Profil indisponible. Vérifiez le schéma et les permissions.');
    return profileDTO(user, data as AuthProfile);
  },
  async update(user: User, accessToken: string, patch: { firstName?: string; lastName?: string; phone?: string; marketingOptin?: boolean }): Promise<UserDTO> {
    const values = {
      ...(patch.firstName !== undefined ? { first_name: patch.firstName } : {}),
      ...(patch.lastName !== undefined ? { last_name: patch.lastName } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
      ...(patch.marketingOptin !== undefined ? { marketing_optin: patch.marketingOptin } : {}),
    };
    if (!Object.keys(values).length) throw AppError.badRequest('empty_profile_update', 'Aucune modification de profil.');
    const { data, error } = await userDataClient(accessToken).from('profiles').update(values)
      .eq('user_id', user.id).select(PROFILE_FIELDS).maybeSingle();
    if (error || !data) throw AppError.serviceUnavailable('profile_unavailable', 'Modification du profil non confirmée. Vérifiez le schéma et les permissions.');
    return profileDTO(user, data as AuthProfile);
  },
};

export async function authSessionResult(session: Session) {
  // Auth metadata may be stale after a profile edit; every session response uses persisted data.
  const user = await supabaseProfiles.read(session.user, session.access_token);
  return { token: session.access_token, refreshToken: session.refresh_token,
    expiresIn: session.expires_in, user };
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

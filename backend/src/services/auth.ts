import { AppError } from '../lib/errors.js';
import { signAdminToken, signUserToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { newsletterRepo } from '../repositories/misc.js';
import { adminUsersRepo, usersRepo } from '../repositories/users.js';
import { emailTemplates, sendEmail } from './email.js';
import type { AdminUserDTO, UserDTO } from '../types/index.js';
import { z } from 'zod';
import { registerSchema } from '../validators/auth.js';

export const authService = {
  async register(input: z.infer<typeof registerSchema>): Promise<{ token: string; user: UserDTO }> {
    const existing = await usersRepo.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('email_taken', 'Un compte existe déjà avec cet email.');
    }
    const passwordHash = hashPassword(input.password);
    const created = await usersRepo.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      marketingOptin: input.marketingOptin,
    });
    const user: UserDTO = {
      id: created.id,
      email: created.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      marketingOptin: input.marketingOptin ?? false,
      createdAt: created.created_at,
    };
    if (input.marketingOptin) {
      await newsletterRepo.upsertSubscriber(input.email, 'register').catch(() => undefined);
      await sendEmail(emailTemplates.welcome(input.email, input.firstName)).catch(() => undefined);
    }
    return { token: signUserToken({ sub: user.id, email: user.email }), user };
  },

  async login(email: string, password: string): Promise<{ token: string; user: UserDTO }> {
    const row = await usersRepo.findByEmail(email);
    // Same error for unknown email / wrong password (no account enumeration)
    if (!row || !verifyPassword(password, row.password_hash)) {
      throw AppError.unauthorized('invalid_credentials', 'Email ou mot de passe incorrect.');
    }
    const profile = row.profiles;
    const user: UserDTO = {
      id: row.id,
      email: row.email,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      marketingOptin: profile?.marketing_optin ?? false,
      createdAt: row.created_at,
    };
    return { token: signUserToken({ sub: user.id, email: user.email }), user };
  },

  async me(userId: string): Promise<UserDTO> {
    const row = await usersRepo.findById(userId);
    if (!row) throw AppError.unauthorized('user_not_found', 'Compte introuvable.');
    return {
      id: row.id,
      email: row.email,
      firstName: row.profiles?.first_name ?? null,
      lastName: row.profiles?.last_name ?? null,
      marketingOptin: row.profiles?.marketing_optin ?? false,
      createdAt: row.created_at,
    };
  },

  async adminLogin(email: string, password: string): Promise<{ token: string; admin: AdminUserDTO }> {
    const row = await adminUsersRepo.findByEmail(email);
    if (!row || !row.is_active || !verifyPassword(password, row.password_hash)) {
      throw AppError.unauthorized('invalid_credentials', 'Identifiants admin incorrects.');
    }
    await adminUsersRepo.touchLogin(row.id).catch(() => undefined);
    const admin: AdminUserDTO = { id: row.id, email: row.email, name: row.name, role: row.role };
    return { token: signAdminToken({ sub: admin.id, email: admin.email, role: admin.role }), admin };
  },
};

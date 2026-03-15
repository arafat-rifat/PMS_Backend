import { supabase } from '../../db/supabase';

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  password_hash: string;
  refresh_token_hash: string | null;
  is_active: boolean;
}

export const authRepository = {
  async findUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, password_hash, refresh_token_hash, is_active')
      .eq('email', email)
      .single<UserRecord>();

    if (error) {
      return null;
    }

    return data;
  },

  async createMember(payload: { fullName: string; email: string; passwordHash: string }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        full_name: payload.fullName,
        email: payload.email,
        password_hash: payload.passwordHash,
        role: 'MEMBER',
      })
      .select('id, full_name, email, role')
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    const { error } = await supabase
      .from('users')
      .update({ refresh_token_hash: refreshTokenHash, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  },

  async findUserById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, password_hash, refresh_token_hash, is_active')
      .eq('id', userId)
      .single<UserRecord>();

    if (error) {
      return null;
    }

    return data;
  },
};

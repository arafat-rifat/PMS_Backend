import { supabase } from '../../db/supabase';
import { CreateUserInput, UpdateUserInput } from './dto';

export const userRepository = {
  async listUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async findByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createUser(payload: CreateUserInput & { passwordHash: string }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        full_name: payload.fullName,
        email: payload.email,
        password_hash: payload.passwordHash,
        role: payload.role,
      })
      .select('id, full_name, email, role, is_active, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async updateUser(id: string, payload: UpdateUserInput) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.fullName !== undefined) updateData.full_name = payload.fullName;
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, full_name, email, role, is_active, created_at')
      .single();

    if (error) throw error;
    return data;
  },
};

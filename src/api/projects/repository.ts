import { supabase } from '../../db/supabase';
import { CreateProjectInput, UpdateProjectInput } from './dto';

export const projectRepository = {
  async listProjects(limit: number, offset: number, search?: string) {
    let query = supabase
      .from('projects')
      .select('id, name, description, start_date, end_date, is_archived, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, count: count ?? 0 };
  },

  async findById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, start_date, end_date, is_archived, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createProject(payload: CreateProjectInput, createdBy: string) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: payload.name,
        description: payload.description,
        start_date: payload.startDate,
        end_date: payload.endDate,
        created_by: createdBy,
      })
      .select('id, name, description, start_date, end_date, is_archived, created_at')
      .single();

    if (error) throw error;

    return data;
  },

  async updateProject(projectId: string, payload: UpdateProjectInput) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.startDate !== undefined) updateData.start_date = payload.startDate;
    if (payload.endDate !== undefined) updateData.end_date = payload.endDate;
    if (payload.isArchived !== undefined) updateData.is_archived = payload.isArchived;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select('id, name, description, start_date, end_date, is_archived, created_at')
      .single();

    if (error) throw error;

    return data;
  },

  async deleteProject(projectId: string) {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
  },

  async replaceMembers(projectId: string, memberIds: string[]) {
    const { error: deleteError } = await supabase.from('project_members').delete().eq('project_id', projectId);
    if (deleteError) throw deleteError;

    if (memberIds.length === 0) {
      return;
    }

    const rows = memberIds.map((memberId) => ({ project_id: projectId, user_id: memberId }));
    const { error: insertError } = await supabase.from('project_members').insert(rows);
    if (insertError) throw insertError;
  },

  async getMembers(projectId: string) {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id, users(id, full_name, email)')
      .eq('project_id', projectId);

    if (error) throw error;
    return data;
  },

  async getProgress(projectId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', projectId);

    if (error) throw error;

    const total = data.length;
    const completed = data.filter((task) => task.status === 'COMPLETED').length;
    const progress = total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2));

    return { totalTasks: total, completedTasks: completed, progress };
  },
};

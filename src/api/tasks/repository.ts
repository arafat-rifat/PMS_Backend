import { supabase } from '../../db/supabase';
import { CreateTaskInput, UpdateTaskInput } from './dto';

export const taskRepository = {
  async listTasks(query: {
    projectId?: string;
    assignedTo?: string;
    status?: string;
    search?: string;
  }) {
    let builder = supabase
      .from('tasks')
      .select('id, project_id, title, description, assigned_to, priority, due_date, status, created_at, projects(name), users!tasks_assigned_to_fkey(id, full_name, email)')
      .order('created_at', { ascending: false });

    if (query.projectId) builder = builder.eq('project_id', query.projectId);
    if (query.assignedTo) builder = builder.eq('assigned_to', query.assignedTo);
    if (query.status) builder = builder.eq('status', query.status);
    if (query.search) builder = builder.ilike('title', `%${query.search}%`);

    const { data, error } = await builder;
    if (error) throw error;

    return data;
  },

  async findById(id: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, project_id, title, description, assigned_to, priority, due_date, status, created_at, projects(name), users!tasks_assigned_to_fkey(id, full_name, email)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createTask(payload: CreateTaskInput, createdBy: string) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: payload.projectId,
        title: payload.title,
        description: payload.description,
        assigned_to: payload.assignedTo,
        priority: payload.priority,
        due_date: payload.dueDate,
        status: payload.status,
        created_by: createdBy,
      })
      .select('id, project_id, title, description, assigned_to, priority, due_date, status, created_at, projects(name), users!tasks_assigned_to_fkey(id, full_name, email)')
      .single();

    if (error) throw error;
    return data;
  },

  async updateTask(taskId: string, payload: UpdateTaskInput) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.assignedTo !== undefined) updateData.assigned_to = payload.assignedTo;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.dueDate !== undefined) updateData.due_date = payload.dueDate;
    if (payload.status !== undefined) updateData.status = payload.status;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('id, project_id, title, description, assigned_to, priority, due_date, status, created_at, projects(name), users!tasks_assigned_to_fkey(id, full_name, email)')
      .single();

    if (error) throw error;
    return data;
  },

  async logReassignment(input: {
    taskId: string;
    projectId: string;
    previousStatus: string;
    newStatus: string;
    reason: string;
    reassignedBy: string;
    reassignedDate: string;
  }) {
    const { error } = await supabase.from('task_reassignment_logs').insert({
      task_id: input.taskId,
      project_id: input.projectId,
      previous_status: input.previousStatus,
      new_status: input.newStatus,
      reassigned_reason: input.reason,
      reassigned_by: input.reassignedBy,
      reassigned_date: input.reassignedDate,
    });

    if (error) throw error;
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  },

  async listComments(taskId: string) {
    const { data, error } = await supabase
      .from('task_comments')
      .select('id, task_id, user_id, body, created_at, users(id, full_name, email)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addComment(taskId: string, userId: string, body: string) {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        body,
      })
      .select('id, task_id, user_id, body, created_at, users(id, full_name, email)')
      .single();

    if (error) throw error;
    return data;
  },
};


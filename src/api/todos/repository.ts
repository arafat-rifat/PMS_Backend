import { supabase } from '../../db/supabase';
import { CreateTodoInput, UpdateTodoInput } from './dto';

export const todoRepository = {
  async listTodos(userId: string, upcomingOnly = false) {
    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from('todo_plans')
      .select('id, user_id, task_id, title, planned_date, planned_time, priority, is_done, created_at, tasks(id, title, project_id, status, projects(name))')
      .eq('user_id', userId);

    if (upcomingOnly) {
      query = query.eq('is_done', false).gte('planned_date', today);
    }

    const { data, error } = await query
      .order('planned_date', { ascending: true })
      .order('planned_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  async findTaskById(taskId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, project_id')
      .eq('id', taskId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createTodo(userId: string, payload: CreateTodoInput, taskTitle: string) {
    const { data, error } = await supabase
      .from('todo_plans')
      .insert({
        user_id: userId,
        task_id: payload.taskId,
        title: taskTitle,
        planned_date: payload.plannedDate,
        planned_time: payload.plannedTime,
        priority: payload.priority,
      })
      .select('id, user_id, task_id, title, planned_date, planned_time, priority, is_done, created_at, tasks(id, title, project_id, status, projects(name))')
      .single();

    if (error) throw error;
    return data;
  },

  async updateTodo(todoId: string, userId: string, payload: UpdateTodoInput, taskTitle?: string) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.taskId !== undefined) updateData.task_id = payload.taskId;
    if (taskTitle !== undefined) updateData.title = taskTitle;
    if (payload.plannedDate !== undefined) updateData.planned_date = payload.plannedDate;
    if (payload.plannedTime !== undefined) updateData.planned_time = payload.plannedTime;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.isDone !== undefined) updateData.is_done = payload.isDone;

    const { data, error } = await supabase
      .from('todo_plans')
      .update(updateData)
      .eq('id', todoId)
      .eq('user_id', userId)
      .select('id, user_id, task_id, title, planned_date, planned_time, priority, is_done, created_at, tasks(id, title, project_id, status, projects(name))')
      .single();

    if (error) throw error;
    return data;
  },

  async findById(todoId: string, userId: string) {
    const { data, error } = await supabase
      .from('todo_plans')
      .select('id, user_id, task_id, title, planned_date, planned_time, priority, is_done, created_at, tasks(id, title, project_id, status)')
      .eq('id', todoId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async hasActiveSession(todoId: string, userId: string) {
    const { data, error } = await supabase
      .from('work_sessions')
      .select('id')
      .eq('todo_id', todoId)
      .eq('user_id', userId)
      .is('stop_time', null)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  },

  async deleteTodo(todoId: string, userId: string) {
    const { error: activitiesError } = await supabase
      .from('daily_activities')
      .delete()
      .eq('todo_id', todoId)
      .eq('user_id', userId);
    if (activitiesError) throw activitiesError;

    const { error: sessionsError } = await supabase
      .from('work_sessions')
      .delete()
      .eq('todo_id', todoId)
      .eq('user_id', userId);
    if (sessionsError) throw sessionsError;

    const { error } = await supabase.from('todo_plans').delete().eq('id', todoId).eq('user_id', userId);
    if (error) throw error;
  },

  async listNextTodos(userId: string, limit = 5) {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('todo_plans')
      .select('id, task_id, title, planned_date, planned_time, priority, is_done, tasks(title)')
      .eq('user_id', userId)
      .eq('is_done', false)
      .gte('planned_date', today)
      .order('planned_date', { ascending: true })
      .order('planned_time', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  },
};

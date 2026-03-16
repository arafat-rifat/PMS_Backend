import { supabase } from '../../db/supabase';

export const workSessionRepository = {
  async getActiveSessions(userId: string) {
    const { data, error } = await supabase
      .from('work_sessions')
      .select(
        'id, user_id, task_id, todo_id, start_time, stop_time, duration_seconds, status, created_at, tasks(id, title, project_id, projects(name)), todos:todo_plans(id, planned_date, planned_time, priority)',
      )
      .eq('user_id', userId)
      .eq('status', 'RUNNING')
      .is('stop_time', null)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async getActiveSessionForTask(userId: string, taskId: string) {
    const { data, error } = await supabase
      .from('work_sessions')
      .select(
        'id, user_id, task_id, todo_id, start_time, stop_time, duration_seconds, status, created_at, tasks(id, title, project_id, projects(name)), todos:todo_plans(id, planned_date, planned_time, priority)',
      )
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .eq('status', 'RUNNING')
      .is('stop_time', null)
      .order('start_time', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createSession(input: { userId: string; taskId: string; todoId: string; startTime: string }) {
    const { data, error } = await supabase
      .from('work_sessions')
      .insert({
        user_id: input.userId,
        task_id: input.taskId,
        todo_id: input.todoId,
        start_time: input.startTime,
        status: 'RUNNING',
      })
      .select('id, user_id, task_id, todo_id, start_time, stop_time, duration_seconds, status, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async closeSession(input: {
    sessionId: string;
    userId: string;
    stopTime: string;
    durationSeconds: number;
    finalStatus: 'PAUSED' | 'COMPLETED';
  }) {
    const { data, error } = await supabase
      .from('work_sessions')
      .update({
        stop_time: input.stopTime,
        duration_seconds: input.durationSeconds,
        status: input.finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.sessionId)
      .eq('user_id', input.userId)
      .eq('status', 'RUNNING')
      .is('stop_time', null)
      .select('id, user_id, task_id, todo_id, start_time, stop_time, duration_seconds, status, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async stopSession(input: { sessionId: string; userId: string; stopTime: string; durationSeconds: number }) {
    return this.closeSession({ ...input, finalStatus: 'PAUSED' });
  },

  async findSessionById(sessionId: string, userId: string) {
    const { data, error } = await supabase
      .from('work_sessions')
      .select('id, user_id, task_id, todo_id, start_time, stop_time, duration_seconds, status, created_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findLatestTodoByTask(userId: string, taskId: string) {
    const { data, error } = await supabase
      .from('todo_plans')
      .select('id, user_id, task_id, planned_date, planned_time, is_done, created_at')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .order('planned_date', { ascending: false })
      .order('planned_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getTaskCumulativeSeconds(userId: string, taskId: string) {
    const { data, error } = await supabase
      .from('daily_activities')
      .select('total_duration_seconds')
      .eq('user_id', userId)
      .eq('task_id', taskId);

    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + (row.total_duration_seconds ?? 0), 0);
  },

  async createDailyActivity(input: {
    userId: string;
    taskId: string;
    projectId: string;
    todoId: string;
    startTime: string;
    stopTime: string;
    durationSeconds: number;
    workDate: string;
    workLogNote: string;
    blockerReason?: string;
    progressPercent?: number;
    carryForward: boolean;
    cumulativeSeconds: number;
  }) {
    const { data, error } = await supabase
      .from('daily_activities')
      .insert({
        user_id: input.userId,
        task_id: input.taskId,
        project_id: input.projectId,
        todo_id: input.todoId,
        start_time: input.startTime,
        stop_time: input.stopTime,
        total_duration_seconds: input.durationSeconds,
        work_date: input.workDate,
        work_log_note: input.workLogNote,
        blocker_reason: input.blockerReason,
        progress_percent: input.progressPercent,
        carry_forward: input.carryForward,
        cumulative_seconds: input.cumulativeSeconds,
        submitted: false,
      })
      .select('id, user_id, task_id, project_id, todo_id, start_time, stop_time, total_duration_seconds, work_date, work_log_note, blocker_reason, progress_percent, carry_forward, cumulative_seconds, submitted, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async markTodoDone(todoId: string, userId: string, isDone: boolean) {
    const { error } = await supabase
      .from('todo_plans')
      .update({ is_done: isDone, updated_at: new Date().toISOString() })
      .eq('id', todoId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async updateTaskStatus(taskId: string, status: 'PENDING' | 'RUNNING' | 'COMPLETED') {
    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;
  },
};

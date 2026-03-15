import { supabase } from '../../db/supabase';

export const dashboardRepository = {
  async countProjects() {
    const { count, error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },

  async countTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, assigned_to, due_date, created_at, projects(name), users!tasks_assigned_to_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      total: data.length,
      pending: data.filter((task) => task.status === 'PENDING').length,
      running: data.filter((task) => task.status === 'RUNNING').length,
      completed: data.filter((task) => task.status === 'COMPLETED').length,
      recent: data.slice(0, 10),
    };
  },

  async projectProgress() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, tasks(id, status)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((project: any) => {
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task: any) => task.status === 'COMPLETED').length;
      const progressPercent = totalTasks === 0 ? 0 : Number(((completedTasks / totalTasks) * 100).toFixed(2));

      return {
        projectId: project.id,
        projectName: project.name,
        totalTasks,
        completedTasks,
        progressPercent,
      };
    });
  },

  async nextTodos(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('todo_plans')
      .select('id, task_id, planned_date, planned_time, priority, tasks(title)')
      .eq('user_id', userId)
      .eq('is_done', false)
      .gte('planned_date', today)
      .order('planned_date', { ascending: true })
      .order('planned_time', { ascending: true })
      .limit(5);

    if (error) throw error;
    return data;
  },

  // Source: active work session only
  async currentRunningTask(userId: string) {
    const { data, error } = await supabase
      .from('work_sessions')
      .select('id, task_id, todo_id, start_time, tasks(title, project_id, projects(name)), todo_plans(priority)')
      .eq('user_id', userId)
      .is('stop_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Source: Todo Planner + linked work logs
  async dailyWorkSummary(userId: string, workDate: string) {
    const dayStart = new Date(`${workDate}T00:00:00.000Z`).getTime();

    const [
      { data: todoData, error: todoError },
      { data: activityData, error: activityError },
      { data: activeSessions, error: sessionError },
    ] = await Promise.all([
      supabase
        .from('todo_plans')
        .select('id, task_id, is_done')
        .eq('user_id', userId)
        .eq('planned_date', workDate),
      supabase
        .from('daily_activities')
        .select('total_duration_seconds, task_id, todo_id')
        .eq('user_id', userId)
        .eq('work_date', workDate),
      supabase
        .from('work_sessions')
        .select('task_id, todo_id, start_time')
        .eq('user_id', userId)
        .is('stop_time', null),
    ]);

    if (todoError) throw todoError;
    if (activityError) throw activityError;
    if (sessionError) throw sessionError;

    const todayTodos = todoData ?? [];
    const todayTodoIds = new Set(todayTodos.map((todo) => todo.id));
    const completedTodos = todayTodos.filter((todo) => todo.is_done);

    const completedSeconds = (activityData ?? []).reduce((sum, row) => sum + (row.total_duration_seconds ?? 0), 0);

    const now = Date.now();
    const activeSeconds = (activeSessions ?? []).reduce((sum, session) => {
      if (!todayTodoIds.has(session.todo_id)) return sum;

      const startMs = new Date(session.start_time).getTime();
      if (Number.isNaN(startMs)) return sum;

      const clampedStart = Math.max(startMs, dayStart);
      return sum + Math.max(0, Math.floor((now - clampedStart) / 1000));
    }, 0);

    const totalSeconds = completedSeconds + activeSeconds;

    const uniqueTaskIds = new Set<string>([
      ...completedTodos.map((item) => item.task_id),
      ...(activeSessions ?? []).filter((session) => todayTodoIds.has(session.todo_id)).map((item) => item.task_id),
    ]);

    return {
      workDate,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(2)),
      uniqueTasks: uniqueTaskIds.size,
      entries: completedTodos.length,
    };
  },
};


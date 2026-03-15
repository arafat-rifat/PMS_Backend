import { supabase } from '../../db/supabase';

const pad2 = (value: number) => String(value).padStart(2, '0');

const getLocalDateString = (value = new Date()) => {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  return `${year}-${month}-${day}`;
};

const buildDateRange = (dateParam?: string) => {
  const date = dateParam ?? getLocalDateString();
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endLocal = new Date(year, month - 1, day, 23, 59, 59, 999);

  return {
    date,
    start: startLocal.toISOString(),
    end: endLocal.toISOString(),
  };
};

export const publicReportService = {
  async getTeamLiveTaskReport(dateParam?: string) {
    const { date, start, end } = buildDateRange(dateParam);
    const now = Date.now();
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();

    const [
      { data: runningRows, error: runningError },
      { data: pendingRows, error: pendingError },
      { data: activityRows, error: activityError },
      { data: pendingReasonRows, error: pendingReasonError },
    ] = await Promise.all([
      supabase
        .from('work_sessions')
        .select('id, task_id, user_id, start_time, stop_time, status, tasks(id, title, status, priority, due_date, projects(name)), users(full_name, email)')
        .eq('status', 'RUNNING')
        .is('stop_time', null)
        .order('start_time', { ascending: false }),
      supabase
        .from('tasks')
        .select('id, title, priority, due_date, created_at, status, projects(name), users!tasks_assigned_to_fkey(full_name, email)')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false }),
      supabase
        .from('daily_activities')
        .select('task_id, user_id, stop_time, total_duration_seconds, work_log_note, tasks(id, title, status, projects(name)), users(full_name, email)')
        .eq('work_date', date)
        .order('stop_time', { ascending: false }),
      supabase
        .from('task_reassignment_logs')
        .select('task_id, reassigned_reason, reassigned_date, new_status')
        .eq('new_status', 'PENDING')
        .gte('reassigned_date', start)
        .lte('reassigned_date', end)
        .order('reassigned_date', { ascending: false }),
    ]);

    if (runningError) {
      console.error('[TeamLiveTaskReport] running query failed', runningError);
      throw runningError;
    }
    if (pendingError) {
      console.error('[TeamLiveTaskReport] pending query failed', pendingError);
      throw pendingError;
    }
    if (activityError) {
      console.error('[TeamLiveTaskReport] activity query failed', activityError);
      throw activityError;
    }
    if (pendingReasonError) {
      console.error('[TeamLiveTaskReport] pending reason query failed', pendingReasonError);
      throw pendingReasonError;
    }

    const running = (runningRows ?? [])
      .filter((row: any) => row.tasks?.status === 'RUNNING')
      .map((row: any) => {
      const durationSeconds = Math.max(0, Math.floor((now - new Date(row.start_time).getTime()) / 1000));
      return {
        taskId: row.task_id,
        taskName: row.tasks?.title ?? '-',
        projectName: row.tasks?.projects?.name ?? '-',
        developerName: row.users?.full_name ?? row.users?.email ?? '-',
        startTime: row.start_time,
        durationSeconds,
      };
    });

    const pendingReasonMap = new Map<string, { reason: string; date: string }>();

    (activityRows ?? []).forEach((row: any) => {
      if (!row.task_id || !row.work_log_note) return;
      const existing = pendingReasonMap.get(row.task_id);
      if (!existing) {
        pendingReasonMap.set(row.task_id, {
          reason: row.work_log_note ?? '-',
          date: row.stop_time,
        });
        return;
      }

      const existingTime = new Date(existing.date).getTime();
      const nextTime = new Date(row.stop_time).getTime();
      if (nextTime > existingTime) {
        pendingReasonMap.set(row.task_id, {
          reason: row.work_log_note ?? '-',
          date: row.stop_time,
        });
      }
    });

    (pendingReasonRows ?? []).forEach((row: any) => {
      if (!row.task_id) return;
      const existing = pendingReasonMap.get(row.task_id);
      if (!existing) {
        pendingReasonMap.set(row.task_id, {
          reason: row.reassigned_reason ?? '-',
          date: row.reassigned_date,
        });
        return;
      }

      const existingTime = new Date(existing.date).getTime();
      const nextTime = new Date(row.reassigned_date).getTime();
      if (nextTime > existingTime) {
        pendingReasonMap.set(row.task_id, {
          reason: row.reassigned_reason ?? '-',
          date: row.reassigned_date,
        });
      }
    });

    const activeTodayTaskIds = new Set<string>();
    (activityRows ?? []).forEach((row: any) => {
      if (row.task_id) activeTodayTaskIds.add(row.task_id);
    });

    const pending = (pendingRows ?? [])
      .filter((row: any) => {
        const createdAt = new Date(row.created_at).getTime();
        const createdToday = createdAt >= startMs && createdAt <= endMs;
        const reassignedToday = pendingReasonMap.has(row.id);
        const activeToday = activeTodayTaskIds.has(row.id);
        return createdToday || reassignedToday || activeToday;
      })
      .map((row: any) => {
        const pendingReason = pendingReasonMap.get(row.id)?.reason ?? (row.created_at ? 'New task' : '-');
        return {
          taskId: row.id,
          taskName: row.title ?? '-',
          projectName: row.projects?.name ?? '-',
          priority: row.priority ?? '-',
          pendingReason,
          dueDate: row.due_date ?? '-',
        };
      });

    const completedMap = new Map<string, {
      taskId: string;
      taskName: string;
      projectName: string;
      developerName: string;
      completedTime: string;
      totalDurationSeconds: number;
    }>();

    (activityRows ?? []).forEach((row: any) => {
      if (row.tasks?.status !== 'COMPLETED') return;
      const taskId = row.task_id;
      const current = completedMap.get(taskId);
      const duration = row.total_duration_seconds ?? 0;
      const completedTime = row.stop_time;
      const developerName = row.users?.full_name ?? row.users?.email ?? '-';
      const projectName = row.tasks?.projects?.name ?? '-';
      const taskName = row.tasks?.title ?? '-';

      if (!current) {
        completedMap.set(taskId, {
          taskId,
          taskName,
          projectName,
          developerName,
          completedTime,
          totalDurationSeconds: duration,
        });
        return;
      }

      const latestTime = new Date(current.completedTime).getTime();
      const nextTime = new Date(completedTime).getTime();
      const nextDeveloper = nextTime >= latestTime ? developerName : current.developerName;

      completedMap.set(taskId, {
        ...current,
        developerName: nextDeveloper,
        completedTime: nextTime >= latestTime ? completedTime : current.completedTime,
        totalDurationSeconds: current.totalDurationSeconds + duration,
      });
    });

    const completed = Array.from(completedMap.values()).sort((a, b) => {
      return new Date(b.completedTime).getTime() - new Date(a.completedTime).getTime();
    });

    return {
      date,
      generatedAt: new Date().toISOString(),
      running,
      pending,
      completed,
    };
  },
};

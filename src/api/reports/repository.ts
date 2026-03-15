import { supabase } from '../../db/supabase';

export const reportRepository = {
  async getInvoiceData(query: { projectId?: string; from: string; to: string }) {
    let builder = supabase
      .from('daily_activities')
      .select('id, project_id, task_id, work_date, total_duration_seconds, start_time, stop_time, tasks(title), projects(name), users(full_name, email)')
      .gte('work_date', query.from)
      .lte('work_date', query.to)
      .order('work_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (query.projectId) builder = builder.eq('project_id', query.projectId);

    const { data, error } = await builder;
    if (error) throw error;

    return data;
  },

  async getDailyActivityData(query: { date?: string; projectId?: string; taskId?: string; userId?: string }) {
    let activityBuilder = supabase
      .from('daily_activities')
      .select('id, user_id, task_id, project_id, start_time, stop_time, total_duration_seconds, work_date, work_log_note, blocker_reason, carry_forward, cumulative_seconds, tasks(title, status), projects(name), users(full_name, email)')
      .eq('submitted', true)
      .order('work_date', { ascending: false })
      .order('stop_time', { ascending: false })
      .order('start_time', { ascending: false });

    let reassignBuilder = supabase
      .from('task_reassignment_logs')
      .select('id, task_id, project_id, previous_status, new_status, reassigned_reason, reassigned_by, reassigned_date, tasks(title), projects(name), users:users!task_reassignment_logs_reassigned_by_fkey(full_name, email)')
      .order('reassigned_date', { ascending: false });

    if (query.userId) {
      activityBuilder = activityBuilder.eq('user_id', query.userId);
      reassignBuilder = reassignBuilder.eq('reassigned_by', query.userId);
    }

    if (query.projectId) {
      activityBuilder = activityBuilder.eq('project_id', query.projectId);
      reassignBuilder = reassignBuilder.eq('project_id', query.projectId);
    }

    if (query.taskId) {
      activityBuilder = activityBuilder.eq('task_id', query.taskId);
      reassignBuilder = reassignBuilder.eq('task_id', query.taskId);
    }

    if (query.date) {
      activityBuilder = activityBuilder.eq('work_date', query.date);
      reassignBuilder = reassignBuilder.gte('reassigned_date', `${query.date}T00:00:00.000Z`).lt('reassigned_date', `${query.date}T23:59:59.999Z`);
    }

    const [{ data: activities, error: activityError }, { data: reassignments, error: reassignError }] = await Promise.all([
      activityBuilder,
      reassignBuilder,
    ]);

    if (activityError) throw activityError;
    if (reassignError) throw reassignError;

    const workRows = (activities ?? []).map((row: any) => ({
      id: row.id,
      rowType: 'WORK' as const,
      taskName: row.tasks?.title ?? 'Untitled task',
      projectName: row.projects?.name ?? '-',
      userName: row.users?.full_name ?? row.users?.email ?? '-',
      status: row.tasks?.status ?? '-',
      workDate: row.work_date,
      startTime: row.start_time,
      stopTime: row.stop_time,
      totalDurationSeconds: row.total_duration_seconds ?? 0,
      workLogNote: row.work_log_note ?? '-',
      blockerReason: row.blocker_reason ?? '-',
      carryForward: Boolean(row.carry_forward),
      cumulativeSeconds: row.cumulative_seconds ?? 0,
      reassignmentReason: '-',
    }));

    const reassignmentRows = (reassignments ?? []).map((row: any) => ({
      id: `reassign-${row.id}`,
      rowType: 'REASSIGNMENT' as const,
      taskName: row.tasks?.title ?? 'Untitled task',
      projectName: row.projects?.name ?? '-',
      userName: row.users?.full_name ?? row.users?.email ?? '-',
      status: `${row.previous_status} -> ${row.new_status}`,
      workDate: row.reassigned_date.slice(0, 10),
      startTime: row.reassigned_date,
      stopTime: row.reassigned_date,
      totalDurationSeconds: 0,
      workLogNote: '-',
      blockerReason: '-',
      carryForward: true,
      cumulativeSeconds: 0,
      reassignmentReason: row.reassigned_reason,
    }));

    return [...workRows, ...reassignmentRows].sort((a, b) => {
      const aTs = new Date(a.stopTime).getTime();
      const bTs = new Date(b.stopTime).getTime();
      return bTs - aTs;
    });
  },
};

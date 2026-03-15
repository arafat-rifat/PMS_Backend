import { supabase } from '../../db/supabase';

export const dailyActivityRepository = {
  async listDailyActivities(query: {
    userId?: string;
    date?: string;
    projectId?: string;
    taskId?: string;
    includeDraft: boolean;
    page: number;
    limit: number;
  }) {
    let activityBuilder = supabase
      .from('daily_activities')
      .select('id, user_id, task_id, project_id, todo_id, start_time, stop_time, total_duration_seconds, work_date, work_log_note, blocker_reason, progress_percent, carry_forward, cumulative_seconds, reassignment_reason, submitted, submission_id, created_at, users(full_name, email), tasks(title, status), projects(name)')
      .order('work_date', { ascending: false })
      .order('stop_time', { ascending: false })
      .order('start_time', { ascending: false });

    let reassignmentBuilder = supabase
      .from('task_reassignment_logs')
      .select('id, task_id, project_id, previous_status, new_status, reassigned_reason, reassigned_by, reassigned_date, users:users!task_reassignment_logs_reassigned_by_fkey(full_name, email), tasks(title, status), projects(name)')
      .order('reassigned_date', { ascending: false });

    if (query.userId) {
      activityBuilder = activityBuilder.eq('user_id', query.userId);
      reassignmentBuilder = reassignmentBuilder.eq('reassigned_by', query.userId);
    }

    if (query.date) {
      activityBuilder = activityBuilder.eq('work_date', query.date);
      reassignmentBuilder = reassignmentBuilder.gte('reassigned_date', `${query.date}T00:00:00.000Z`).lt('reassigned_date', `${query.date}T23:59:59.999Z`);
    }

    if (query.projectId) {
      activityBuilder = activityBuilder.eq('project_id', query.projectId);
      reassignmentBuilder = reassignmentBuilder.eq('project_id', query.projectId);
    }

    if (query.taskId) {
      activityBuilder = activityBuilder.eq('task_id', query.taskId);
      reassignmentBuilder = reassignmentBuilder.eq('task_id', query.taskId);
    }

    if (!query.includeDraft) {
      activityBuilder = activityBuilder.eq('submitted', true);
    }

    const [{ data: activities, error: activityError }, { data: reassignments, error: reassignError }] = await Promise.all([
      activityBuilder,
      reassignmentBuilder,
    ]);

    if (activityError) throw activityError;
    if (reassignError) throw reassignError;

    const workRows = (activities ?? []).map((row: any) => ({
      ...row,
      row_type: 'WORK' as const,
    }));

    const reassignmentRows = (reassignments ?? []).map((row: any) => ({
      id: `reassign-${row.id}`,
      row_type: 'REASSIGNMENT',
      user_id: row.reassigned_by,
      task_id: row.task_id,
      project_id: row.project_id,
      todo_id: null,
      start_time: row.reassigned_date,
      stop_time: row.reassigned_date,
      total_duration_seconds: 0,
      work_date: row.reassigned_date.slice(0, 10),
      work_log_note: null,
      blocker_reason: null,
      progress_percent: null,
      carry_forward: true,
      cumulative_seconds: null,
      reassignment_reason: row.reassigned_reason,
      submitted: true,
      submission_id: null,
      created_at: row.reassigned_date,
      users: row.users,
      tasks: row.tasks,
      projects: row.projects,
      previous_status: row.previous_status,
      new_status: row.new_status,
    }));

    const merged = [...workRows, ...reassignmentRows].sort((a: any, b: any) => {
      const aTime = new Date(a.stop_time ?? a.start_time ?? a.created_at).getTime();
      const bTime = new Date(b.stop_time ?? b.start_time ?? b.created_at).getTime();
      return bTime - aTime;
    });

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit;

    return {
      rows: merged.slice(from, to),
      total: merged.length,
    };
  },

  async listDraftActivities(userId: string, workDate: string) {
    const { data, error } = await supabase
      .from('daily_activities')
      .select('id, total_duration_seconds')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .eq('submitted', false);

    if (error) throw error;
    return data ?? [];
  },

  async createSubmission(input: {
    userId: string;
    workDate: string;
    totalDurationSeconds: number;
    entryCount: number;
  }) {
    const { data, error } = await supabase
      .from('daily_activity_submissions')
      .insert({
        user_id: input.userId,
        work_date: input.workDate,
        total_duration_seconds: input.totalDurationSeconds,
        entry_count: input.entryCount,
      })
      .select('id, user_id, work_date, total_duration_seconds, entry_count, submitted_at')
      .single();

    if (error) throw error;
    return data;
  },

  async markActivitiesSubmitted(ids: string[], submissionId: string) {
    const { error } = await supabase
      .from('daily_activities')
      .update({ submitted: true, submission_id: submissionId, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;
  },

  async getDailySummary(userId: string, workDate: string) {
    const { data, error } = await supabase
      .from('daily_activities')
      .select('total_duration_seconds, task_id')
      .eq('user_id', userId)
      .eq('work_date', workDate);

    if (error) throw error;

    const totalSeconds = data.reduce((sum, row) => sum + (row.total_duration_seconds ?? 0), 0);

    return {
      totalSeconds,
      taskCount: new Set(data.map((row) => row.task_id)).size,
      entries: data.length,
    };
  },
};

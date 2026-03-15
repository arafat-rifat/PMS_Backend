import { StatusCodes } from 'http-status-codes';

import { HttpError } from '../../utils/http-error';
import { dailyActivityRepository } from './repository';

export const dailyActivityService = {
  async listDailyActivities(query: {
    userId?: string;
    date?: string;
    projectId?: string;
    taskId?: string;
    includeDraft?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const { rows, total } = await dailyActivityRepository.listDailyActivities({
      userId: query.userId,
      date: query.date,
      projectId: query.projectId,
      taskId: query.taskId,
      includeDraft: Boolean(query.includeDraft),
      page,
      limit,
    });

    return {
      rows,
      pagination: {
        page,
        limit,
        total,
      },
    };
  },

  async submitDay(userId: string, workDate: string) {
    const drafts = await dailyActivityRepository.listDraftActivities(userId, workDate);

    if (!drafts.length) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'No draft activities found for this date');
    }

    const totalSeconds = drafts.reduce((sum, row) => sum + (row.total_duration_seconds ?? 0), 0);
    const submission = await dailyActivityRepository.createSubmission({
      userId,
      workDate,
      totalDurationSeconds: totalSeconds,
      entryCount: drafts.length,
    });

    await dailyActivityRepository.markActivitiesSubmitted(
      drafts.map((row) => row.id),
      submission.id,
    );

    return {
      submissionId: submission.id,
      workDate,
      entries: drafts.length,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(2)),
    };
  },
};

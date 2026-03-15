import { StatusCodes } from 'http-status-codes';

import { TaskStatus } from '../../constants/enums';
import { HttpError } from '../../utils/http-error';
import { todoRepository } from '../todos/repository';
import { workSessionRepository } from './repository';

type FinalizeInput = {
  markTaskCompleted: boolean;
  workLogNote: string;
  blockerReason?: string;
  progressPercent?: number;
};

const relationOne = <T>(value: T | T[] | null | undefined): T | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const calculateDurationSeconds = (startIso: string, stopIso: string) =>
  Math.max(0, Math.floor((new Date(stopIso).getTime() - new Date(startIso).getTime()) / 1000));

const normalizeBlocker = (reason?: string) => {
  if (!reason || reason === 'none') return undefined;
  return reason;
};

export const workSessionService = {
  async getActiveSession(userId: string) {
    return workSessionRepository.getActiveSession(userId);
  },

  async startWork(userId: string, todoId: string) {
    const activeSession = await workSessionRepository.getActiveSession(userId);
    if (activeSession) {
      throw new HttpError(StatusCodes.CONFLICT, 'Active work session already exists. Pause/complete it first.');
    }

    const todo = await todoRepository.findById(todoId, userId);
    if (!todo) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Todo not found');
    }

    const task = relationOne(todo.tasks);

    if (todo.is_done) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Cannot start work on a completed todo');
    }

    if (!todo.task_id) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Todo must be linked with a task');
    }

    if (task?.status === TaskStatus.COMPLETED) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Completed tasks cannot start work until reopened.');
    }

    const startTime = new Date().toISOString();
    const session = await workSessionRepository.createSession({
      userId,
      taskId: todo.task_id,
      todoId: todo.id,
      startTime,
    });

    await workSessionRepository.updateTaskStatus(todo.task_id, TaskStatus.RUNNING);

    return {
      ...session,
      taskId: todo.task_id,
      todoId: todo.id,
      startTime,
    };
  },

  async pauseWork(userId: string, sessionId: string, input: { workLogNote: string; blockerReason?: string; progressPercent?: number }) {
    return this.finalizeWorkSession(userId, sessionId, {
      markTaskCompleted: false,
      workLogNote: input.workLogNote,
      blockerReason: input.blockerReason,
      progressPercent: input.progressPercent,
    });
  },

  async completeWork(userId: string, sessionId: string, input: { workLogNote: string; blockerReason?: string; progressPercent?: number }) {
    return this.finalizeWorkSession(userId, sessionId, {
      markTaskCompleted: true,
      workLogNote: input.workLogNote,
      blockerReason: input.blockerReason,
      progressPercent: input.progressPercent,
    });
  },

  async stopWork(
    userId: string,
    sessionId: string,
    options: { markTaskCompleted?: boolean; workLogNote: string; blockerReason?: string; progressPercent?: number },
  ) {
    return this.finalizeWorkSession(userId, sessionId, {
      markTaskCompleted: Boolean(options.markTaskCompleted),
      workLogNote: options.workLogNote,
      blockerReason: options.blockerReason,
      progressPercent: options.progressPercent,
    });
  },

  async finalizeWorkSession(userId: string, sessionId: string, input: FinalizeInput) {
    const session = await workSessionRepository.findSessionById(sessionId, userId);
    if (!session) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Work session not found');
    }

    if (session.stop_time || session.status !== 'RUNNING') {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Work session is not in RUNNING state');
    }

    const note = input.workLogNote?.trim();
    if (!note || note.length < 10) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Daily work note is required (minimum 10 characters).');
    }

    const stopTime = new Date().toISOString();
    const durationSeconds = calculateDurationSeconds(session.start_time, stopTime);
    const finalStatus = input.markTaskCompleted ? 'COMPLETED' : 'PAUSED';

    const stopped = await workSessionRepository.closeSession({
      sessionId,
      userId,
      stopTime,
      durationSeconds,
      finalStatus,
    });

    const todo = await todoRepository.findById(session.todo_id, userId);
    const task = relationOne(todo?.tasks);

    if (!todo || !task?.project_id) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Unable to resolve todo/task/project for daily activity');
    }

    const cumulativeBefore = await workSessionRepository.getTaskCumulativeSeconds(userId, session.task_id);
    const cumulativeSeconds = cumulativeBefore + durationSeconds;

    const dailyActivity = await workSessionRepository.createDailyActivity({
      userId,
      taskId: session.task_id,
      projectId: task.project_id,
      todoId: session.todo_id,
      startTime: session.start_time,
      stopTime,
      durationSeconds,
      workDate: stopTime.slice(0, 10),
      workLogNote: note,
      blockerReason: normalizeBlocker(input.blockerReason),
      progressPercent: input.progressPercent,
      carryForward: !input.markTaskCompleted,
      cumulativeSeconds,
    });

    if (input.markTaskCompleted) {
      await workSessionRepository.markTodoDone(session.todo_id, userId, true);
      await workSessionRepository.updateTaskStatus(session.task_id, TaskStatus.COMPLETED);
    } else {
      await workSessionRepository.markTodoDone(session.todo_id, userId, false);
      await workSessionRepository.updateTaskStatus(session.task_id, TaskStatus.PENDING);
    }

    return {
      session: stopped,
      dailyActivity,
    };
  },
};

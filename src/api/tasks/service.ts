import { StatusCodes } from 'http-status-codes';

import { TaskStatus, validTaskTransitions } from '../../constants/enums';
import { HttpError } from '../../utils/http-error';
import { trashService } from '../trash/service';
import { workSessionRepository } from '../work-sessions/repository';
import { CreateTaskInput, UpdateTaskInput } from './dto';
import { taskRepository } from './repository';

const ensureValidTransition = (currentStatus: TaskStatus, nextStatus: TaskStatus) => {
  if (currentStatus === nextStatus) return;

  const allowed = validTaskTransitions[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(StatusCodes.BAD_REQUEST, `Invalid status transition: ${currentStatus} -> ${nextStatus}`);
  }
};

export const taskService = {
  async listTasks(query: {
    projectId?: string;
    assignedTo?: string;
    status?: string;
    search?: string;
  }) {
    const tasks = await taskRepository.listTasks(query);

    const grouped = {
      pending: tasks.filter((task) => task.status === TaskStatus.PENDING),
      running: tasks.filter((task) => task.status === TaskStatus.RUNNING),
      completed: tasks.filter((task) => task.status === TaskStatus.COMPLETED),
    };

    return {
      tasks,
      categorized: grouped,
    };
  },

  async createTask(payload: CreateTaskInput, createdBy: string) {
    const task = await taskRepository.createTask(payload, createdBy);

    const initialComment = payload.comment?.trim();
    if (initialComment) {
      try {
        await taskRepository.addComment(task.id, createdBy, initialComment);
      } catch {
        // Do not fail task creation if optional initial comment persistence fails.
      }
    }

    return task;
  },

  async updateTask(taskId: string, payload: UpdateTaskInput, actorId: string) {
    const existingTask = await taskRepository.findById(taskId);
    if (!existingTask) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    const currentStatus = existingTask.status as TaskStatus;
    const nextStatus = (payload.status ?? existingTask.status) as TaskStatus;

    ensureValidTransition(currentStatus, nextStatus);

    const isReassignment = currentStatus === TaskStatus.COMPLETED && (nextStatus === TaskStatus.PENDING || nextStatus === TaskStatus.RUNNING);
    if (isReassignment && !payload.reassignedReason?.trim()) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'Reassignment reason is required when changing task from COMPLETED to PENDING or RUNNING.',
      );
    }

    const updated = await taskRepository.updateTask(taskId, payload);

    if (payload.comment) {
      await taskRepository.addComment(taskId, actorId, payload.comment);
    }

    if (isReassignment) {
      const reassignedDate = new Date().toISOString();
      const reason = payload.reassignedReason!.trim();

      await taskRepository.logReassignment({
        taskId,
        projectId: existingTask.project_id,
        previousStatus: currentStatus,
        newStatus: nextStatus,
        reason,
        reassignedBy: actorId,
        reassignedDate,
      });
    }

    if (payload.status === TaskStatus.PENDING) {
      const activeSession = await workSessionRepository.getActiveSession(actorId);
      if (activeSession && activeSession.task_id === taskId) {
        const stopTime = new Date().toISOString();
        const durationSeconds = Math.max(
          0,
          Math.floor((new Date(stopTime).getTime() - new Date(activeSession.start_time).getTime()) / 1000),
        );

        await workSessionRepository.closeSession({
          sessionId: activeSession.id,
          userId: actorId,
          stopTime,
          durationSeconds,
          finalStatus: 'PAUSED',
        });

        const cumulativeBefore = await workSessionRepository.getTaskCumulativeSeconds(actorId, taskId);

        await workSessionRepository.createDailyActivity({
          userId: actorId,
          taskId,
          projectId: existingTask.project_id,
          todoId: activeSession.todo_id,
          startTime: activeSession.start_time,
          stopTime,
          durationSeconds,
          workDate: stopTime.slice(0, 10),
          workLogNote: payload.comment?.trim() || payload.reassignedReason?.trim() || 'Task moved to pending from task board.',
          blockerReason: undefined,
          progressPercent: undefined,
          carryForward: true,
          cumulativeSeconds: cumulativeBefore + durationSeconds,
        });

        await workSessionRepository.markTodoDone(activeSession.todo_id, actorId, false);
      }
    }

    if (payload.status === TaskStatus.RUNNING) {
      const activeSession = await workSessionRepository.getActiveSession(actorId);

      if (!activeSession) {
        const latestTodo = await workSessionRepository.findLatestTodoByTask(actorId, taskId);

        if (latestTodo) {
          const startTime = new Date().toISOString();

          await workSessionRepository.markTodoDone(latestTodo.id, actorId, false);
          await workSessionRepository.createSession({
            userId: actorId,
            taskId,
            todoId: latestTodo.id,
            startTime,
          });
        }
      }
    }

    return updated;
  },

  async deleteTask(taskId: string, actorId: string, reason: string) {
    const existingTask = await taskRepository.findById(taskId);
    if (!existingTask) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    await taskRepository.deleteTask(taskId);

    await trashService.logDeletion({
      moduleName: 'TASKS',
      entityId: existingTask.id,
      entityName: existingTask.title,
      reason,
      deletedBy: actorId,
      payload: {
        projectId: existingTask.project_id,
        description: existingTask.description,
        status: existingTask.status,
        priority: existingTask.priority,
        dueDate: existingTask.due_date,
      },
    });
  },

  async listComments(taskId: string) {
    const existingTask = await taskRepository.findById(taskId);
    if (!existingTask) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    return taskRepository.listComments(taskId);
  },

  async addComment(taskId: string, userId: string, body: string) {
    const existingTask = await taskRepository.findById(taskId);
    if (!existingTask) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    return taskRepository.addComment(taskId, userId, body);
  },
};




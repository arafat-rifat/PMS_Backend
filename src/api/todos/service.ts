import { StatusCodes } from 'http-status-codes';

import { HttpError } from '../../utils/http-error';
import { trashService } from '../trash/service';
import { CreateTodoInput, UpdateTodoInput } from './dto';
import { todoRepository } from './repository';

const priorityRank: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const todoService = {
  async listTodos(
    userId: string,
    options: {
      upcomingOnly?: boolean;
      sortBy?: 'date' | 'priority';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const todos = await todoRepository.listTodos(userId, options.upcomingOnly);

    const sorted = [...todos].sort((a, b) => {
      if (options.sortBy === 'priority') {
        const rankA = priorityRank[a.priority] ?? 0;
        const rankB = priorityRank[b.priority] ?? 0;
        return options.sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
      }

      const dateA = `${a.planned_date}T${a.planned_time}`;
      const dateB = `${b.planned_date}T${b.planned_time}`;

      if (dateA === dateB) return 0;
      if (options.sortOrder === 'desc') return dateA > dateB ? -1 : 1;
      return dateA > dateB ? 1 : -1;
    });

    return sorted;
  },

  async createTodo(userId: string, payload: CreateTodoInput) {
    const task = await todoRepository.findTaskById(payload.taskId);
    if (!task) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Task not found for scheduling');
    }

    const todo = await todoRepository.createTodo(userId, payload, task.title);
    if (!todo) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Unable to create todo');
    }

    return todo;
  },

  async updateTodo(todoId: string, userId: string, payload: UpdateTodoInput) {
    const existing = await todoRepository.findById(todoId, userId);
    if (!existing) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Todo not found');
    }

    let taskTitle: string | undefined;
    if (payload.taskId) {
      const task = await todoRepository.findTaskById(payload.taskId);
      if (!task) {
        throw new HttpError(StatusCodes.NOT_FOUND, 'Task not found for scheduling');
      }
      taskTitle = task.title;
    }

    return todoRepository.updateTodo(todoId, userId, payload, taskTitle);
  },

  async deleteTodo(todoId: string, userId: string, reason: string) {
    const existing = await todoRepository.findById(todoId, userId);
    if (!existing) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Todo not found');
    }

    const hasActiveSession = await todoRepository.hasActiveSession(todoId, userId);
    if (hasActiveSession) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Stop active work session before deleting this todo');
    }

    await todoRepository.deleteTodo(todoId, userId);

    await trashService.logDeletion({
      moduleName: 'TODOS',
      entityId: existing.id,
      entityName: existing.title,
      reason,
      deletedBy: userId,
      payload: {
        taskId: existing.task_id,
        plannedDate: existing.planned_date,
        plannedTime: existing.planned_time,
        priority: existing.priority,
        isDone: existing.is_done,
      },
    });
  },
};


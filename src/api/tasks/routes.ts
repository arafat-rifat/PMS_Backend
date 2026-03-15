import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { taskController } from './controller';
import { createTaskCommentSchema, createTaskSchema, deleteTaskSchema, updateTaskSchema } from './dto';

export const taskRouter = Router();

taskRouter.use(authMiddleware);

taskRouter.get('/', taskController.listTasks);
taskRouter.post('/', validate(createTaskSchema), taskController.createTask);
taskRouter.patch('/:id', validate(updateTaskSchema), taskController.updateTask);
taskRouter.delete('/:id', validate(deleteTaskSchema), taskController.deleteTask);
taskRouter.get('/:id/comments', taskController.listComments);
taskRouter.post('/:id/comments', validate(createTaskCommentSchema), taskController.addComment);

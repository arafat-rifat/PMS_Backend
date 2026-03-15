import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { todoController } from './controller';
import { createTodoSchema, deleteTodoSchema, updateTodoSchema } from './dto';

export const todoRouter = Router();

todoRouter.use(authMiddleware);

todoRouter.get('/', todoController.listTodos);
todoRouter.post('/', validate(createTodoSchema), todoController.createTodo);
todoRouter.patch('/:id', validate(updateTodoSchema), todoController.updateTodo);
todoRouter.delete('/:id', validate(deleteTodoSchema), todoController.deleteTodo);

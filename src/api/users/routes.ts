import { Router } from 'express';

import { UserRole } from '../../constants/enums';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { userController } from './controller';
import { createUserSchema, updateUserSchema } from './dto';

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get('/', requireRole(UserRole.ADMIN), userController.listUsers);
userRouter.post('/', requireRole(UserRole.ADMIN), validate(createUserSchema), userController.createUser);
userRouter.patch('/:id', requireRole(UserRole.ADMIN), validate(updateUserSchema), userController.updateUser);

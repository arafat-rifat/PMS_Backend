import { Router } from 'express';

import { UserRole } from '../../constants/enums';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { projectController } from './controller';
import { createProjectSchema, deleteProjectSchema, updateProjectSchema } from './dto';

export const projectRouter = Router();

projectRouter.use(authMiddleware);

projectRouter.get('/', projectController.listProjects);
projectRouter.get('/:id', projectController.getProjectById);
projectRouter.post('/', requireRole(UserRole.ADMIN), validate(createProjectSchema), projectController.createProject);
projectRouter.patch('/:id', requireRole(UserRole.ADMIN), validate(updateProjectSchema), projectController.updateProject);
projectRouter.delete('/:id', requireRole(UserRole.ADMIN), validate(deleteProjectSchema), projectController.deleteProject);

import { StatusCodes } from 'http-status-codes';

import { HttpError } from '../../utils/http-error';
import { trashService } from '../trash/service';
import { CreateProjectInput, UpdateProjectInput } from './dto';
import { projectRepository } from './repository';

export const projectService = {
  async listProjects(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const { data, count } = await projectRepository.listProjects(limit, offset, query.search);

    const rows = await Promise.all(
      data.map(async (project) => {
        const progress = await projectRepository.getProgress(project.id);
        return { ...project, progress };
      }),
    );

    return {
      rows,
      pagination: {
        page,
        limit,
        total: count,
      },
    };
  },

  async getProjectById(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new HttpError(StatusCodes.NOT_FOUND, 'Project not found');

    const [members, progress] = await Promise.all([
      projectRepository.getMembers(projectId),
      projectRepository.getProgress(projectId),
    ]);

    return {
      ...project,
      members,
      progress,
    };
  },

  async createProject(payload: CreateProjectInput, createdBy: string) {
    const project = await projectRepository.createProject(payload, createdBy);
    await projectRepository.replaceMembers(project.id, payload.memberIds);

    return project;
  },

  async updateProject(projectId: string, payload: UpdateProjectInput) {
    const project = await projectRepository.updateProject(projectId, payload);

    if (payload.memberIds) {
      await projectRepository.replaceMembers(projectId, payload.memberIds);
    }

    return project;
  },

  async deleteProject(projectId: string, actorId: string, reason: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Project not found');
    }

    await projectRepository.deleteProject(projectId);

    await trashService.logDeletion({
      moduleName: 'PROJECTS',
      entityId: project.id,
      entityName: project.name,
      reason,
      deletedBy: actorId,
      payload: {
        description: project.description,
        startDate: project.start_date,
        endDate: project.end_date,
      },
    });
  },
};

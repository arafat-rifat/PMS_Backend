import { UserRole } from '../../constants/enums';
import { trashRepository } from './repository';

export const trashService = {
  async logDeletion(input: {
    moduleName: string;
    entityId?: string;
    entityName?: string;
    reason: string;
    deletedBy: string;
    payload?: Record<string, unknown>;
  }) {
    await trashRepository.purgeExpired();
    await trashRepository.createDeletionLog(input);
  },

  async listTrash(
    query: { page?: number; limit?: number; module?: string; search?: string },
    user: { id: string; role: UserRole },
  ) {
    await trashRepository.purgeExpired();

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const { rows, total } = await trashRepository.listDeletedItems({
      page,
      limit,
      module: query.module,
      search: query.search,
      deletedBy: user.role === UserRole.ADMIN ? undefined : user.id,
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
};

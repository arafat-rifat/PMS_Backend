import { supabase } from '../../db/supabase';

export const trashRepository = {
  async purgeExpired() {
    const { error } = await supabase.from('deleted_items').delete().lte('purge_at', new Date().toISOString());
    if (error) throw error;
  },

  async createDeletionLog(input: {
    moduleName: string;
    entityId?: string;
    entityName?: string;
    reason: string;
    deletedBy: string;
    payload?: Record<string, unknown>;
  }) {
    const { error } = await supabase.from('deleted_items').insert({
      module_name: input.moduleName,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      reason: input.reason,
      deleted_by: input.deletedBy,
      payload: input.payload ?? null,
      purge_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) throw error;
  },

  async listDeletedItems(query: {
    page: number;
    limit: number;
    module?: string;
    search?: string;
    deletedBy?: string;
  }) {
    let builder = supabase
      .from('deleted_items')
      .select('id, module_name, entity_id, entity_name, reason, deleted_by, deleted_at, purge_at, payload, users!deleted_items_deleted_by_fkey(full_name, email)', { count: 'exact' })
      .order('deleted_at', { ascending: false });

    if (query.module) builder = builder.eq('module_name', query.module);
    if (query.search) builder = builder.or(`entity_name.ilike.%${query.search}%,reason.ilike.%${query.search}%`);
    if (query.deletedBy) builder = builder.eq('deleted_by', query.deletedBy);

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    const { data, error, count } = await builder.range(from, to);
    if (error) throw error;

    return {
      rows: data,
      total: count ?? 0,
    };
  },
};

import { getSupabase } from '../lib/supabase';

export class InventoryRepository {
    static async getStock(companyId: string) {
        const sb = getSupabase();
        if (!sb) return [];
        const { data } = await sb.from('inventory_stock').select('*').eq('company_id', companyId);
        return data || [];
    }
}

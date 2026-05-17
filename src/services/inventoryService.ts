import { supabase } from '../lib/supabase';
import { db_offline } from '../lib/offline-db';
import { InventoryStock, MovementType } from '../types/enterprise';

export class InventoryService {
  /**
   * Real-time Stock Sync Engine
   * Pulls from Supabase and updates local IndexedDB cache
   */
  static async syncStock(companyId: string) {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*, products(company_id)')
      .eq('products.company_id', companyId);

    if (data && !error) {
      await db_offline.inventoryStock.bulkPut(data as any);
    }
    return { data, error };
  }

  /**
   * Reserve stock to prevent overselling
   */
  static async reserveStock(productId: string, warehouseId: string, quantity: number) {
    // Optimistic local update
    const local = await db_offline.inventoryStock
      .where({ product_id: productId, warehouse_id: warehouseId })
      .first();

    if (local && (local.quantity - local.reserved_quantity) >= quantity) {
      await db_offline.inventoryStock.update(local.id, {
        reserved_quantity: local.reserved_quantity + quantity
      });
      
      // Cloud update (atomic increment via RPC or direct update if permitted)
      const { data, error } = await supabase.rpc('reserve_stock', {
        p_id: productId,
        w_id: warehouseId,
        qty: quantity
      });

      return { success: !error, data };
    }
    
    throw new Error('Stock insuffisant pour la réservation');
  }

  /**
   * Record inventory movement (In, Out, Transfer)
   */
  static async recordMovement(params: {
    productId: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity: number;
    type: MovementType;
    reason: string;
    userId: string;
    companyId: string;
  }) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: params.productId,
        from_warehouse_id: params.fromWarehouseId,
        to_warehouse_id: params.toWarehouseId,
        quantity: params.quantity,
        type: params.type,
        reason: params.reason,
        user_id: params.userId,
        company_id: params.companyId
      })
      .select()
      .single();

    if (!error && data) {
      // Trigger local cache refresh
      await this.syncStock(params.companyId);
    }

    return { data, error };
  }

  /**
   * AI-powered Inventory Forecasting
   * (Uses Gemini via our backend proxy)
   */
  static async getInventoryForecast(productId: string, history: any[]) {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'inventory_forecast',
        context: { productId, history }
      })
    });
    return response.json();
  }
}

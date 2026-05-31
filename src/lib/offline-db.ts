import Dexie, { Table } from 'dexie';
import { Product, Order, Warehouse, InventoryStock } from '../types/enterprise';

export class NexusOfflineDB extends Dexie {
  products!: Table<Product>;
  orders!: Table<Order>;
  warehouses!: Table<Warehouse>;
  inventoryStock!: Table<InventoryStock>;
  syncQueue!: Table<{
    id?: number;
    action: 'create' | 'update' | 'delete';
    collection: string;
    payload: any;
    timestamp: number;
  }>;

  constructor() {
    super('NexusERP_Offline');
    this.version(1).stores({
      products: 'id, company_id, category, is_marketplace_visible',
      orders: 'id, company_id, status, payment_status, created_at',
      warehouses: 'id, company_id',
      inventoryStock: 'id, product_id, warehouse_id',
      syncQueue: '++id, collection, action'
    });
  }
}

export const db_offline = new NexusOfflineDB();

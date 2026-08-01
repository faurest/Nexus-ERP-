#!/usr/bin/env node
// =============================================================================
// Import exported Firestore JSON → Supabase
// =============================================================================
// Usage:
//   1. Dans l'app (localhost:3000) → Admin → Exporter les données (JSON)
//   2. Place le fichier dans /scripts/
//   3. node scripts/import-to-supabase.mjs <fichier.json>
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Manque SUPABASE_URL ou SUPABASE_SERVICE_KEY dans .env');
  process.exit(1);
}

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node scripts/import-to-supabase.mjs <fichier-export.json>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Column mapping (camelCase → snake_case) — same as migration script
const COLUMN_MAPS = {
  companies: { ownerId: 'owner_id', ownerEmail: 'owner_email', joinCode: 'join_code', deliveryFees: 'delivery_fees', nairaRate: 'naira_rate', totalProfit: 'total_profit', whatsappNumber: 'whatsapp_number', createdAt: 'created_at', updatedAt: 'updated_at' },
  personnel: { companyId: 'company_id', firstName: 'first_name', lastName: 'last_name', joinMethod: 'join_method', tasksAssignedCount: 'tasks_assigned_count', createdAt: 'created_at', updatedAt: 'updated_at' },
  clients: { companyId: 'company_id', salesTotal: 'sales_total', loyaltyPoints: 'loyalty_points', createdAt: 'created_at', updatedAt: 'updated_at' },
  products: { companyId: 'company_id', purchasePrice: 'purchase_price', stockThreshold: 'stock_threshold', soldCount: 'sold_count', createdAt: 'created_at', updatedAt: 'updated_at' },
  ecommerce_orders: { companyId: 'company_id', globalOrderId: 'global_order_id', paymentMethod: 'payment_method', paymentStatus: 'payment_status', realizedProfit: 'realized_profit', transactionFee: 'transaction_fee', cancellationReason: 'cancellation_reason', customerEmail: 'customer_email', customerQuartier: 'customer_quartier', customerPhone: 'customer_phone', customerName: 'customer_name', internalNotes: 'internal_notes', deliveryLocation: 'delivery_location', deliveryFee: 'delivery_fee', checkoutSource: 'checkout_source', createdAt: 'created_at', updatedAt: 'updated_at' },
  order_history: { companyId: 'company_id', orderId: 'order_id', previousStatus: 'previous_status', newStatus: 'new_status', authorName: 'author_name', authorRole: 'author_role', createdAt: 'created_at' },
  tasks: { companyId: 'company_id', assignedTo: 'assigned_to', startDate: 'start_date', endDate: 'end_date', createdAt: 'created_at', updatedAt: 'updated_at' },
  notifications: { companyId: 'company_id', userId: 'user_id', isRead: 'is_read', createdAt: 'created_at' },
  leave_requests: { companyId: 'company_id', staffId: 'staff_id', startDate: 'start_date', endDate: 'end_date', createdAt: 'created_at', updatedAt: 'updated_at' },
  time_entries: { companyId: 'company_id', staffId: 'staff_id', projectId: 'project_id', createdAt: 'created_at', updatedAt: 'updated_at' },
  salary_advances: { companyId: 'company_id', staffId: 'staff_id', requestDate: 'request_date', deductionMonth: 'deduction_month', createdAt: 'created_at', updatedAt: 'updated_at' },
  projects: { companyId: 'company_id', createdAt: 'created_at', updatedAt: 'updated_at' },
  resources: { companyId: 'company_id', createdAt: 'created_at', updatedAt: 'updated_at' },
  services: { companyId: 'company_id', createdAt: 'created_at', updatedAt: 'updated_at' },
  sales: { companyId: 'company_id', itemName: 'item_name', clientId: 'client_id', clientName: 'client_name', createdAt: 'created_at', updatedAt: 'updated_at' },
  sales_invoices: { companyId: 'company_id', saleId: 'sale_id', orderId: 'order_id', invoiceNumber: 'invoice_number', clientName: 'client_name', tableNumber: 'table_number', createdAt: 'created_at', updatedAt: 'updated_at' },
  payments: { companyId: 'company_id', orderId: 'order_id', invoiceId: 'invoice_id', customerName: 'customer_name', createdAt: 'created_at', updatedAt: 'updated_at' },
  expenses: { companyId: 'company_id', createdAt: 'created_at', updatedAt: 'updated_at' },
  open_orders: { companyId: 'company_id', customerName: 'customer_name', customerPhone: 'customer_phone', createdAt: 'created_at', updatedAt: 'updated_at' },
  partners: { companyId: 'company_id', createdAt: 'created_at', updatedAt: 'updated_at' },
  support_tickets: { companyId: 'company_id', userEmail: 'user_email', createdAt: 'created_at', updatedAt: 'updated_at' },
  messages: { companyId: 'company_id', conversationId: 'conversation_id', senderId: 'sender_id', senderEmail: 'sender_email', recipientId: 'recipient_id', recipientEmail: 'recipient_email', senderName: 'sender_name', isRead: 'is_read', createdAt: 'created_at' },
  project_discussions: { companyId: 'company_id', projectId: 'project_id', senderId: 'sender_id', senderName: 'sender_name', createdAt: 'created_at' },
  order_messages: { companyId: 'company_id', orderId: 'order_id', senderId: 'sender_id', senderName: 'sender_name', recipientId: 'recipient_id', isRead: 'is_read', createdAt: 'created_at' },
  collaborations: { companyId: 'company_id', recipientEmail: 'recipient_email', referenceId: 'reference_id', fileUrl: 'file_url', fileName: 'file_name', senderEmail: 'sender_email', readBy: 'read_by', createdAt: 'created_at' },
  guide_steps: { sortOrder: 'sort_order', createdAt: 'created_at', updatedAt: 'updated_at' },
  global_orders: { cartTotal: 'cart_total', totalDeliveryFees: 'total_delivery_fees', deliveryDiscount: 'delivery_discount', paymentMethod: 'payment_method', paymentStatus: 'payment_status', customerName: 'customer_name', customerPhone: 'customer_phone', customerQuartier: 'customer_quartier', customerEmail: 'customer_email', subOrderIds: 'sub_order_ids', createdAt: 'created_at', updatedAt: 'updated_at' },
  interventions: { companyId: 'company_id', createdAt: 'created_at', updatedAt: 'updated_at' },
};

const EXCLUDE = ['__type'];

function transformItem(item, table) {
  const map = COLUMN_MAPS[table] || {};
  const row = { id: String(item.id ?? '') };
  for (const [key, value] of Object.entries(item)) {
    if (key === 'id' || EXCLUDE.includes(key)) continue;
    if (value === null || value === undefined) continue;
    if (value && typeof value.toDate === 'function') {
      row[map[key] || key] = value.toDate().toISOString();
      continue;
    }
    if (typeof value === 'object') {
      row[map[key] || key] = JSON.stringify(value);
    } else {
      row[map[key] || key] = value;
    }
  }
  return row;
}

async function importCollection(supabase, table, items) {
  if (!items || items.length === 0) {
    console.log(`  ⏭ ${table}: vide`);
    return { total: 0, ok: 0, fail: 0 };
  }
  console.log(`  📄 ${table}: ${items.length} documents`);
  let ok = 0, fail = 0;
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50).map(item => transformItem(item, table));
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`    ❌ Batch ${table}: ${error.message}`);
      for (const item of batch) {
        const { error: e2 } = await supabase.from(table).upsert(item, { onConflict: 'id' });
        if (e2) {
          console.error(`      ❌ ${item.id}: ${e2.message}`);
          fail++;
        } else ok++;
      }
    } else ok += batch.length;
  }
  console.log(`  📊 ${table}: ${ok}/${items.length} OK, ${fail} erreurs`);
  return { total: items.length, ok, fail };
}

const data = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'));

console.log('🚀 Import Firestore JSON → Supabase');
console.log('='.repeat(50));
const tables = Object.keys(COLUMN_MAPS);
let totalOk = 0, totalFail = 0;
for (const table of tables) {
  if (!data[table]) continue;
  const r = await importCollection(supabase, table, data[table]);
  totalOk += r.ok;
  totalFail += r.fail;
}
console.log('='.repeat(50));
console.log(`TOTAL: ${totalOk} documents importés, ${totalFail} erreurs`);

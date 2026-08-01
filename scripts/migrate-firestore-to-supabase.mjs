#!/usr/bin/env node
// =============================================================================
// Phase 3: Firestore → Supabase Data Migration Script
// =============================================================================
// Usage:
//   1. Set env vars: FIREBASE_PROJECT_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY
//   2. node scripts/migrate-firestore-to-supabase.mjs
// =============================================================================

import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'serious-avenue-28kj5';
const FIRESTORE_DB_ID = process.env.FIRESTORE_DB_ID || 'ai-studio-remixnexuserpsol-3398cae5-6da9-434f-86b1-97453b18c9eb';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/migrate-firestore-to-supabase.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Firestore REST API helper ---
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;

async function fetchCollection(collectionName) {
  const url = `${FIRESTORE_BASE}/${collectionName}`;
  const results = [];
  let nextPageToken = null;

  do {
    const fetchUrl = nextPageToken ? `${url}?pageToken=${nextPageToken}` : url;
    const res = await fetch(fetchUrl);

    if (!res.ok) {
      console.warn(`  [SKIP] ${collectionName}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (data.documents) {
      results.push(...data.documents);
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return results;
}

function parseFirestoreValue(field) {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.arrayValue) {
    return (field.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (field.mapValue) {
    const result = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      result[k] = parseFirestoreValue(v);
    }
    return result;
  }
  return null;
}

function parseFirestoreDoc(doc) {
  const name = doc.name || '';
  const id = name.split('/').pop();
  const fields = doc.fields || {};
  const result = { id };
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

// --- Column name mapping (Firestore camelCase → Supabase snake_case) ---
const COLUMN_MAPS = {
  resources: {
    companyId: 'company_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  services: {
    companyId: 'company_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  sales: {
    companyId: 'company_id',
    itemName: 'item_name',
    clientId: 'client_id',
    clientName: 'client_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  sales_invoices: {
    companyId: 'company_id',
    saleId: 'sale_id',
    orderId: 'order_id',
    invoiceNumber: 'invoice_number',
    clientName: 'client_name',
    tableNumber: 'table_number',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  payments: {
    companyId: 'company_id',
    orderId: 'order_id',
    invoiceId: 'invoice_id',
    customerName: 'customer_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  expenses: {
    companyId: 'company_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  open_orders: {
    companyId: 'company_id',
    customerName: 'customer_name',
    customerPhone: 'customer_phone',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  partners: {
    companyId: 'company_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  support_tickets: {
    companyId: 'company_id',
    userEmail: 'user_email',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  messages: {
    companyId: 'company_id',
    conversationId: 'conversation_id',
    senderId: 'sender_id',
    senderEmail: 'sender_email',
    recipientId: 'recipient_id',
    recipientEmail: 'recipient_email',
    senderName: 'sender_name',
    isRead: 'is_read',
    createdAt: 'created_at',
  },
  project_discussions: {
    companyId: 'company_id',
    projectId: 'project_id',
    senderId: 'sender_id',
    senderName: 'sender_name',
    createdAt: 'created_at',
  },
  order_messages: {
    companyId: 'company_id',
    orderId: 'order_id',
    senderId: 'sender_id',
    senderName: 'sender_name',
    recipientId: 'recipient_id',
    isRead: 'is_read',
    createdAt: 'created_at',
  },
  collaborations: {
    companyId: 'company_id',
    recipientEmail: 'recipient_email',
    referenceId: 'reference_id',
    fileUrl: 'file_url',
    fileName: 'file_name',
    senderEmail: 'sender_email',
    readBy: 'read_by',
    createdAt: 'created_at',
  },
  guide_steps: {
    sortOrder: 'sort_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  global_orders: {
    cartTotal: 'cart_total',
    totalDeliveryFees: 'total_delivery_fees',
    deliveryDiscount: 'delivery_discount',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    customerName: 'customer_name',
    customerPhone: 'customer_phone',
    customerQuartier: 'customer_quartier',
    customerEmail: 'customer_email',
    subOrderIds: 'sub_order_ids',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  interventions: {
    companyId: 'company_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  // Already existing tables
  companies: {
    ownerId: 'owner_id',
    ownerEmail: 'owner_email',
    joinCode: 'join_code',
    deliveryFees: 'delivery_fees',
    nairaRate: 'naira_rate',
    totalProfit: 'total_profit',
    whatsappNumber: 'whatsapp_number',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  personnel: {
    companyId: 'company_id',
    firstName: 'first_name',
    lastName: 'last_name',
    joinMethod: 'join_method',
    tasksAssignedCount: 'tasks_assigned_count',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  clients: {
    companyId: 'company_id',
    salesTotal: 'sales_total',
    loyaltyPoints: 'loyalty_points',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  products: {
    companyId: 'company_id',
    purchasePrice: 'purchase_price',
    stockThreshold: 'stock_threshold',
    soldCount: 'sold_count',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  ecommerce_orders: {
    companyId: 'company_id',
    globalOrderId: 'global_order_id',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    realizedProfit: 'realized_profit',
    transactionFee: 'transaction_fee',
    cancellationReason: 'cancellation_reason',
    customerEmail: 'customer_email',
    customerQuartier: 'customer_quartier',
    customerPhone: 'customer_phone',
    customerName: 'customer_name',
    internalNotes: 'internal_notes',
    deliveryLocation: 'delivery_location',
    deliveryFee: 'delivery_fee',
    checkoutSource: 'checkout_source',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  order_history: {
    companyId: 'company_id',
    orderId: 'order_id',
    previousStatus: 'previous_status',
    newStatus: 'new_status',
    authorName: 'author_name',
    authorRole: 'author_role',
    createdAt: 'created_at',
  },
  tasks: {
    companyId: 'company_id',
    assignedTo: 'assigned_to',
    startDate: 'start_date',
    endDate: 'end_date',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  notifications: {
    companyId: 'company_id',
    userId: 'user_id',
    isRead: 'is_read',
    createdAt: 'created_at',
  },
  leave_requests: {
    companyId: 'company_id',
    staffId: 'staff_id',
    startDate: 'start_date',
    endDate: 'end_date',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  time_entries: {
    companyId: 'company_id',
    staffId: 'staff_id',
    projectId: 'project_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  salary_advances: {
    companyId: 'company_id',
    staffId: 'staff_id',
    requestDate: 'request_date',
    deductionMonth: 'deduction_month',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  projects: {
    companyId: 'company_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

// --- Fields to exclude (Firestore internal / don't persist) ---
const EXCLUDE_FIELDS = ['__type'];

// --- Transform & insert one collection ---
async function migrateCollection(collectionName) {
  console.log(`\n📦 Migrating: ${collectionName}`);

  const docs = await fetchCollection(collectionName);
  if (docs.length === 0) {
    console.log(`  ⏭ No documents found`);
    return { collection: collectionName, total: 0, success: 0, failed: 0 };
  }

  console.log(`  📄 Found ${docs.length} documents`);

  const columnMap = COLUMN_MAPS[collectionName] || {};
  let success = 0;
  let failed = 0;

  // Process in batches of 50 (Supabase limit)
  for (let i = 0; i < docs.length; i += 50) {
    const batch = docs.slice(i, i + 50);
    const rows = [];

    for (const doc of batch) {
      const parsed = parseFirestoreDoc(doc);
      const row = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (EXCLUDE_FIELDS.includes(key)) continue;
        const columnName = columnMap[key] || key;

        // Skip null/undefined values (let DB defaults apply)
        if (value === null || value === undefined) continue;

        // Handle Firestore timestamps
        if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
          row[columnName] = value;
        }
        // Handle objects/arrays → JSONB
        else if (typeof value === 'object' && !Array.isArray(value)) {
          row[columnName] = JSON.stringify(value);
        }
        else {
          row[columnName] = value;
        }
      }

      // Ensure ID is text
      if (row.id) {
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      console.log(`  ⏭ No valid rows after transform`);
      continue;
    }

    const { data, error } = await supabase
      .from(collectionName)
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error(`  ❌ Batch error:`, error.message);
      // Try one by one for better error reporting
      for (const row of rows) {
        const { error: singleErr } = await supabase
          .from(collectionName)
          .upsert(row, { onConflict: 'id' });
        if (singleErr) {
          console.error(`    ❌ Doc ${row.id}: ${singleErr.message}`);
          failed++;
        } else {
          success++;
        }
      }
    } else {
      success += rows.length;
      console.log(`  ✅ Batch ${Math.floor(i / 50) + 1}: ${rows.length} rows`);
    }
  }

  console.log(`  📊 Result: ${success}/${docs.length} success, ${failed} failed`);
  return { collection: collectionName, total: docs.length, success, failed };
}

// --- Main ---
async function main() {
  console.log('🚀 Phase 3: Firestore → Supabase Migration');
  console.log(`  Firebase Project: ${FIREBASE_PROJECT_ID}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  // Collections to migrate (order matters for foreign keys)
  const collections = [
    // Auth & core
    'users',
    'companies',
    // People
    'personnel',
    'clients',
    'partners',
    // Products & inventory
    'products',
    'resources',
    'services',
    // Sales
    'sales',
    'sales_invoices',
    'payments',
    'expenses',
    'open_orders',
    // Orders
    'ecommerce_orders',
    'global_orders',
    'order_history',
    // Projects
    'projects',
    'tasks',
    'interventions',
    // Communication
    'messages',
    'project_discussions',
    'order_messages',
    'collaborations',
    // HR
    'leave_requests',
    'time_entries',
    'salary_advances',
    // Support
    'support_tickets',
    // Notifications
    'notifications',
    // Knowledge
    'guide_steps',
  ];

  const results = [];

  for (const collection of collections) {
    try {
      const result = await migrateCollection(collection);
      results.push(result);
    } catch (err) {
      console.error(`\n💥 Fatal error on ${collection}:`, err.message);
      results.push({ collection, total: 0, success: 0, failed: 0, error: err.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  let totalDocs = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  for (const r of results) {
    const status = r.error ? '💥' : r.total === 0 ? '⏭' : r.failed > 0 ? '⚠️' : '✅';
    console.log(`  ${status} ${r.collection}: ${r.success}/${r.total}${r.failed > 0 ? ` (${r.failed} failed)` : ''}`);
    totalDocs += r.total;
    totalSuccess += r.success;
    totalFailed += r.failed;
  }
  console.log('='.repeat(60));
  console.log(`  Total: ${totalSuccess}/${totalDocs} documents migrated, ${totalFailed} failed`);
  console.log('='.repeat(60));
}

main().catch(console.error);

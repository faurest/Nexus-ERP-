import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  mapCompanies, mapPersonnel, mapClients, mapProducts,
  mapOrders, mapOrderHistory, mapTasks, mapStockHistory, mapNotifications,
} from './migrate-mappers';

const url = process.env.SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(url, key);

const testId = `migtest_${Date.now()}`;

// Données factices représentant un doc Firestore (camelCase)
const fixtures: Record<string, any> = {
  companies: {
    id: testId,
    name: 'Test SAS',
    ownerId: 'firebase-uid-123',
    ownerEmail: 'owner@test.local',
    joinCode: 'ABCDEF',
    deliveryFees: { Douala: 500, Yaounde: 1000 },
    nairaRate: 1.6,
    totalProfit: 2500.5,
    categories: [{ name: 'Bureau', isPriority: true }],
    whatsappNumber: '+237690000000',
    objectives: 'Doubler le CA',
    location: 'Douala',
    logo: null,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-06-01T10:00:00Z'),
  },
  personnel: {
    id: `${testId}_p1`,
    companyId: testId,
    uid: 'firebase-uid-123',
    firstName: 'Jean',
    lastName: 'Dupont',
    name: 'Jean Dupont',
    email: 'jean@test.local',
    phone: '+237690000001',
    role: 'Admin',
    department: 'IT',
    status: 'active',
    joinMethod: 'invite_code',
    notes: null,
    tasksAssignedCount: 3,
    createdAt: new Date('2025-01-02T10:00:00Z'),
    updatedAt: new Date('2025-06-02T10:00:00Z'),
  },
  clients: {
    id: `${testId}_c1`,
    companyId: testId,
    name: 'Client A',
    email: 'client@test.local',
    phone: '+237690000002',
    address: 'Rue 123',
    salesTotal: 1200,
    loyaltyPoints: 5,
    createdAt: new Date('2025-01-03T10:00:00Z'),
    updatedAt: new Date('2025-06-03T10:00:00Z'),
  },
  products: {
    id: `${testId}_pr1`,
    companyId: testId,
    name: 'Produit X',
    description: 'Desc',
    price: 1000,
    purchasePrice: 700,
    category: 'Bureau',
    image: null,
    stock: 10,
    stockThreshold: 5,
    points: 2,
    views: 50,
    tags: ['vente'],
    soldCount: 3,
    createdAt: new Date('2025-01-04T10:00:00Z'),
    updatedAt: new Date('2025-06-04T10:00:00Z'),
  },
  ecommerce_orders: {
    id: `${testId}_o1`,
    companyId: testId,
    globalOrderId: 'g-1',
    items: [{ productId: `${testId}_pr1`, qty: 2, price: 1000 }],
    total: 2000,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    status: 'COMPLETED',
    realizedProfit: 600,
    transactionFee: 0,
    cancellationReason: null,
    customerEmail: 'client@test.local',
    customerName: 'Client A',
    customerPhone: '+237690000002',
    customerQuartier: 'Bonapriso',
    deliveryLocation: 'Douala',
    deliveryFee: 500,
    operator: 'Jean',
    checkoutSource: 'shop',
    internalNotes: null,
    date: new Date('2025-06-05T10:00:00Z'),
    createdAt: new Date('2025-06-05T10:00:00Z'),
    updatedAt: new Date('2025-06-05T10:00:00Z'),
  },
  order_history: {
    id: `${testId}_oh1`,
    orderId: `${testId}_o1`,
    companyId: testId,
    previousStatus: 'PENDING',
    newStatus: 'COMPLETED',
    reason: null,
    comment: 'ok',
    authorName: 'Jean',
    authorRole: 'Admin',
    createdAt: new Date('2025-06-05T11:00:00Z'),
  },
  tasks: {
    id: `${testId}_t1`,
    companyId: testId,
    title: 'Livrer commande',
    assignedTo: `${testId}_p1`,
    startDate: '2025-06-10',
    endDate: '2025-06-12',
    status: 'in_progress',
    createdAt: new Date('2025-06-08T10:00:00Z'),
    updatedAt: new Date('2025-06-09T10:00:00Z'),
  },
  stock_history: {
    id: `${testId}_s1`,
    companyId: testId,
    productId: `${testId}_pr1`,
    productName: 'Produit X',
    type: 'SALE',
    quantity: 2,
    previousStock: 12,
    newStock: 10,
    purchasePrice: 700,
    reason: 'Vente',
    authorName: 'Jean',
    createdAt: new Date('2025-06-05T10:00:00Z'),
  },
  notifications: {
    id: `${testId}_n1`,
    companyId: testId,
    userId: 'firebase-uid-123',
    title: 'Nouvelle vente',
    message: 'Une vente de 2000 FCFA',
    type: 'sale',
    isRead: false,
    date: new Date('2025-06-05T10:00:00Z'),
    createdAt: new Date('2025-06-05T10:00:00Z'),
  },
};

const mappers: Record<string, (d: any) => any> = {
  companies: mapCompanies,
  personnel: mapPersonnel,
  clients: mapClients,
  products: mapProducts,
  ecommerce_orders: mapOrders,
  order_history: mapOrderHistory,
  tasks: mapTasks,
  stock_history: mapStockHistory,
  notifications: mapNotifications,
};

async function main() {
  const order = [
    'companies',
    'personnel',
    'clients',
    'products',
    'ecommerce_orders',
    'order_history',
    'tasks',
    'stock_history',
    'notifications',
  ];

  let allOk = true;
  for (const table of order) {
    const mapped = mappers[table](fixtures[table]);
    const { error } = await supabase.from(table).upsert(mapped, { onConflict: 'id' });
    if (error) {
      allOk = false;
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: insertion OK (colonne mappées: ${Object.keys(mapped).join(', ')})`);
    }
  }

  // Nettoyage (l'ordre inverse pour respecter les FK)
  const cleanupOrder = [...order].reverse();
  for (const table of cleanupOrder) {
    await supabase.from(table).delete().eq('id', fixtures[table].id);
  }
  // compagnie : les enfants supprimés, on supprime la compagnie elle-même
  await supabase.from('companies').delete().eq('id', testId);

  console.log(allOk ? '\n🎉 Mapping VALIDÉ (toutes les insertions factices OK)' : '\n⚠️ Mapping INVALIDE');
  process.exit(allOk ? 0 : 1);
}

main();

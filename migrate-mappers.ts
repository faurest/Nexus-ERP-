// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const toISO = (v: any): string | null => {
  if (v === undefined || v === null) return null;
  // Duck-typing Firestore Timestamp { seconds, nanoseconds, toDate }
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number' && v > 1e11) return new Date(v).toISOString();
  if (typeof v === 'string' && !isNaN(Date.parse(v))) return new Date(v).toISOString();
  return String(v);
};

const sanitize = (rec: Record<string, any>) => {
  for (const k of Object.keys(rec)) {
    if (rec[k] === undefined) delete rec[k];
    if (typeof rec[k] === 'string' && rec[k].length === 0) rec[k] = null;
  }
  return rec;
};

const generateJoinCode = () =>
  `NEX${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// ---------------------------------------------------------------------------
// Mapping Firestore (camelCase) → Supabase (snake_case), une transformée/table
// ---------------------------------------------------------------------------
export const mapCompanies = (d: any) => {
  const ownerEmail = String(d.ownerEmail || d.owner_email || '')
    .trim()
    .toLowerCase();
  const ownerId =
    d.ownerId || d.owner_id || ownerEmail || `unknown_${d.id}`;
  return sanitize({
    id: d.id,
    name: d.name || 'Entreprise',
    owner_id: ownerId,
    owner_email: ownerEmail || `owner_${d.id}@unknown.local`,
    join_code: d.joinCode || d.join_code || generateJoinCode(),
    delivery_fees: d.deliveryFees ?? d.delivery_fees ?? {},
    naira_rate: d.nairaRate ?? d.naira_rate ?? 0,
    total_profit: d.totalProfit ?? d.total_profit ?? 0,
    categories: d.categories ?? [],
    whatsapp_number: d.whatsappNumber ?? d.whatsapp_number ?? null,
    objectives: d.objectives ?? null,
    location: d.location ?? null,
    logo: d.logo ?? null,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
    updated_at: toISO(d.updatedAt ?? d.updated_at) || new Date().toISOString(),
  });
};

export const mapPersonnel = (d: any) =>
  sanitize({
    id: d.id,
    company_id: d.companyId || d.company_id || null,
    uid: d.uid || d.userId || null,
    first_name: d.firstName ?? d.first_name ?? null,
    last_name: d.lastName ?? d.last_name ?? null,
    name: d.name || d.email?.split('@')[0] || 'Membre',
    email: String(d.email || d.primaryEmail || '').trim().toLowerCase() || d.id,
    phone: d.phone ?? null,
    role: d.role ?? null,
    department: d.department ?? null,
    status: d.status || 'active',
    join_method: d.joinMethod ?? d.join_method ?? null,
    notes: d.notes ?? null,
    tasks_assigned_count: d.tasksAssignedCount ?? d.tasks_assigned_count ?? 0,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
    updated_at: toISO(d.updatedAt ?? d.updated_at) || new Date().toISOString(),
  });

export const mapClients = (d: any) =>
  sanitize({
    id: d.id,
    company_id: d.companyId || d.company_id || null,
    name: d.name || 'Client',
    email: d.email ?? null,
    phone: d.phone ?? null,
    address: d.address ?? null,
    sales_total: d.salesTotal ?? d.sales_total ?? 0,
    loyalty_points: d.loyaltyPoints ?? d.loyalty_points ?? 0,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
    updated_at: toISO(d.updatedAt ?? d.updated_at) || new Date().toISOString(),
  });

export const mapProducts = (d: any) =>
  sanitize({
    id: d.id,
    company_id: d.companyId || d.company_id || null,
    name: d.name || 'Produit',
    description: d.description ?? null,
    price: d.price ?? 0,
    purchase_price: d.purchasePrice ?? d.purchase_price ?? null,
    category: d.category ?? null,
    image: d.image ?? null,
    stock: d.stock ?? 0,
    stock_threshold: d.stockThreshold ?? d.stock_threshold ?? 5,
    points: d.points ?? 0,
    views: d.views ?? 0,
    tags: d.tags ?? [],
    sold_count: d.soldCount ?? d.sold_count ?? 0,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
    updated_at: toISO(d.updatedAt ?? d.updated_at) || new Date().toISOString(),
  });

export const mapOrders = (d: any) =>
  sanitize({
    id: d.id,
    company_id: d.companyId || d.company_id || null,
    global_order_id: d.globalOrderId ?? d.global_order_id ?? null,
    items: d.items ?? [],
    total: d.total ?? 0,
    payment_method: d.paymentMethod ?? d.payment_method ?? null,
    payment_status: d.paymentStatus ?? d.payment_status ?? 'UNPAID',
    status: d.status ?? 'PENDING',
    realized_profit: d.realizedProfit ?? d.realized_profit ?? 0,
    transaction_fee: d.transactionFee ?? d.transaction_fee ?? 0,
    cancellation_reason: d.cancellationReason ?? d.cancellation_reason ?? null,
    customer_email: d.customerEmail ?? d.customer_email ?? null,
    customer_name: d.customerName ?? d.customer_name ?? null,
    customer_phone: d.customerPhone ?? d.customer_phone ?? null,
    customer_quartier: d.customerQuartier ?? d.customer_quartier ?? null,
    delivery_location: d.deliveryLocation ?? d.delivery_location ?? null,
    delivery_fee: d.deliveryFee ?? d.delivery_fee ?? 0,
    operator: d.operator ?? null,
    checkout_source: d.checkoutSource ?? d.checkout_source ?? null,
    internal_notes: d.internalNotes ?? d.internal_notes ?? null,
    date: toISO(d.date) || toISO(d.createdAt) || null,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
    updated_at: toISO(d.updatedAt ?? d.updated_at) || new Date().toISOString(),
  });

export const mapOrderHistory = (d: any) =>
  sanitize({
    id: d.id,
    order_id: d.orderId || d.order_id || null,
    company_id: d.companyId || d.company_id || null,
    previous_status: d.previousStatus ?? d.previous_status ?? null,
    new_status: d.newStatus || d.new_status || 'UNKNOWN',
    reason: d.reason ?? null,
    comment: d.comment ?? null,
    author_name: d.authorName ?? d.author_name ?? null,
    author_role: d.authorRole ?? d.author_role ?? null,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
  });

export const mapTasks = (d: any) =>
  sanitize({
    id: d.id,
    company_id: d.companyId || d.company_id || null,
    title: d.title || 'Tâche',
    assigned_to: d.assignedTo ?? d.assigned_to ?? null,
    start_date: d.startDate ?? d.start_date ?? null,
    end_date: d.endDate ?? d.end_date ?? null,
    status: d.status || 'pending',
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
    updated_at: toISO(d.updatedAt ?? d.updated_at) || new Date().toISOString(),
  });

export const mapStockHistory = (d: any) =>
  sanitize({
    id: d.id,
    company_id: d.companyId || d.company_id || null,
    product_id: d.productId ?? d.product_id ?? null,
    product_name: d.productName ?? d.product_name ?? null,
    type: d.type || 'IN',
    quantity: d.quantity ?? 0,
    previous_stock: d.previousStock ?? d.previous_stock ?? null,
    new_stock: d.newStock ?? d.new_stock ?? null,
    purchase_price: d.purchasePrice ?? d.purchase_price ?? null,
    reason: d.reason ?? null,
    author_name: d.authorName ?? d.author_name ?? null,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
  });

export const mapNotifications = (d: any) =>
  sanitize({
    id: d.id,
    company_id: d.companyId || d.company_id || null,
    user_id: d.userId ?? d.user_id ?? null,
    title: d.title || 'Notification',
    message: d.message || d.body || '',
    type: d.type ?? null,
    is_read: d.isRead === true || d.isRead === 1 || d.is_read === true ? true : false,
    date: toISO(d.date) || toISO(d.createdAt) || null,
    created_at: toISO(d.createdAt ?? d.created_at) || new Date().toISOString(),
  });

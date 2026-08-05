// =============================================================================
// NEXUS ERP - Compat Layer Firestore -> Supabase
// -----------------------------------------------------------------------------
// Expose une API compatible `firebase/firestore` (collection, doc, query, where,
// getDocs, addDoc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, orderBy,
// limit, serverTimestamp, arrayUnion, increment, or, and) adossée à Supabase.
//
// Le module est aliasé dans vite.config.ts : toutes les imports
// `firebase/firestore`, `firebase/auth` et `firebase/app` pointent ici.
//
// Règles de mapping :
//   - Chaque collection Firestore = une table Supabase (invoices -> sales_invoices)
//   - camelCase -> snake_case pour les colonnes (ex: companyId -> company_id)
//   - La table `users` est en camelCase directe + colonne `fid` pour les ids
//     Firestore non-uuid (email, uid)
//   - Les écritures sont filtrées aux colonnes connues (allow-list par table),
//     avec retry automatique en cas de colonne absente (PGRST204)
// =============================================================================

import { supabase, supabaseAuth, isSupabaseConfigured } from './supabase';

// ----------------------------------------------------------------------------
// Génération d'ids style Firestore (20 caractères alphanumériques)
// ----------------------------------------------------------------------------
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateId(len = 20): string {
  let out = '';
  for (let i = 0; i < len; i++) out += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return out;
}

// ----------------------------------------------------------------------------
// Schéma par collection (allow-list des colonnes + alias spécifiques)
// ----------------------------------------------------------------------------
interface TableDef {
  table: string;
  camel?: boolean;                       // users : colonnes déjà en camelCase
  aliases?: Record<string, string>;      // champ camel -> colonne (exception)
  readAliases?: Record<string, string>;  // colonne -> champ camel (exception lecture)
  cols?: string[];                       // colonnes autorisées en écriture
}

const TABLES: Record<string, TableDef> = {
  companies: {
    table: 'companies',
    cols: ['name', 'owner_id', 'owner_email', 'join_code', 'delivery_fees', 'naira_rate',
      'total_profit', 'categories', 'whatsapp_number', 'objectives', 'location', 'logo',
      'member_emails', 'employees', 'members', 'nexus_commission_rate', 'description',
      'created_at', 'updated_at'],
  },
  personnel: {
    table: 'personnel',
    cols: ['company_id', 'uid', 'first_name', 'last_name', 'name', 'email', 'phone', 'role',
      'department', 'status', 'join_method', 'notes', 'tasks_assigned_count', 'created_at', 'updated_at'],
  },
  clients: {
    table: 'clients',
    cols: ['company_id', 'name', 'email', 'phone', 'address', 'sales_total', 'loyalty_points',
      'interactions', 'uid', 'status', 'created_at', 'updated_at'],
  },
  products: {
    table: 'products',
    cols: ['company_id', 'name', 'description', 'price', 'purchase_price', 'category', 'image',
      'stock', 'points', 'views', 'tags', 'sold_count', 'stock_threshold', 'config_options',
      'allow_backorder', 'created_at', 'updated_at'],
  },
  ecommerce_orders: {
    table: 'ecommerce_orders',
    cols: ['company_id', 'global_order_id', 'items', 'total', 'payment_method', 'payment_status',
      'status', 'realized_profit', 'transaction_fee', 'cancellation_reason', 'customer_email',
      'internal_notes', 'customer_quartier', 'customer_phone', 'operator', 'delivery_location',
      'delivery_fee', 'date', 'checkout_source', 'customer_name', 'subtotal', 'nexus_commission',
      'created_at', 'updated_at'],
  },
  order_history: {
    table: 'order_history',
    cols: ['order_id', 'company_id', 'previous_status', 'new_status', 'reason', 'comment',
      'author_name', 'author_role', 'created_at'],
  },
  stock_history: {
    table: 'stock_history',
    cols: ['company_id', 'product_id', 'product_name', 'type', 'quantity', 'previous_stock',
      'new_stock', 'purchase_price', 'reason', 'author_name', 'created_at'],
  },
  notifications: {
    table: 'notifications',
    cols: ['company_id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at', 'date'],
  },
  tasks: {
    table: 'tasks',
    cols: ['company_id', 'title', 'assigned_to', 'start_date', 'end_date', 'status', 'description',
      'priority', 'due_date', 'completed_at', 'needs', 'constraints', 'project_id', 'requester_name',
      'blocked_since', 'reminder_sent_at', 'escalation_sent_at',
      'created_at', 'updated_at'],
  },
  task_updates: {
    table: 'task_updates',
    cols: ['company_id', 'task_id', 'actor_id', 'actor_name', 'from_status', 'to_status', 'comment',
      'created_at'],
  },
  leave_requests: {
    table: 'leave_requests',
    cols: ['company_id', 'staff_id', 'start_date', 'end_date', 'type', 'reason', 'status',
      'created_at', 'updated_at'],
  },
  time_entries: {
    table: 'time_entries',
    cols: ['company_id', 'staff_id', 'project_id', 'date', 'hours', 'description', 'created_at', 'updated_at'],
  },
  salary_advances: {
    table: 'salary_advances',
    cols: ['company_id', 'staff_id', 'amount', 'request_date', 'reason', 'status', 'deduction_month',
      'created_at', 'updated_at'],
  },
  projects: {
    table: 'projects',
    cols: ['company_id', 'name', 'description', 'status', 'budget', 'start_date', 'end_date',
      'client_name', 'progress', 'partner_id', 'created_at', 'updated_at'],
  },
  resources: {
    table: 'resources',
    cols: ['company_id', 'name', 'type', 'quantity', 'status', 'location', 'condition', 'duration',
      'warranty', 'price', 'created_at', 'updated_at'],
  },
  services: {
    table: 'services',
    cols: ['company_id', 'name', 'price', 'description', 'image', 'quantity', 'type',
      'created_at', 'updated_at'],
  },
  sales: {
    table: 'sales',
    cols: ['company_id', 'item_name', 'type', 'quantity', 'amount', 'total', 'client_id',
      'client_name', 'status', 'date', 'created_at', 'updated_at'],
  },
  sales_invoices: {
    table: 'sales_invoices',
    cols: ['company_id', 'sale_id', 'order_id', 'invoice_number', 'amount', 'status', 'client_name',
      'table_number', 'items', 'date', 'project_id', 'partner_id', 'description',
      'created_at', 'updated_at'],
  },
  invoices: {
    table: 'sales_invoices',
    cols: ['company_id', 'sale_id', 'order_id', 'invoice_number', 'amount', 'status', 'client_name',
      'table_number', 'items', 'date', 'project_id', 'partner_id', 'description',
      'created_at', 'updated_at'],
  },
  payments: {
    table: 'payments',
    cols: ['company_id', 'order_id', 'invoice_id', 'amount', 'method', 'status', 'customer_name',
      'notes', 'date', 'project_id', 'type', 'description', 'reference', 'created_at', 'updated_at'],
  },
  expenses: {
    table: 'expenses',
    cols: ['company_id', 'description', 'amount', 'category', 'date', 'project_id',
      'created_at', 'updated_at'],
  },
  open_orders: {
    table: 'open_orders',
    cols: ['company_id', 'customer_name', 'customer_phone', 'items', 'total', 'status', 'notes',
      'date', 'table_number', 'created_at', 'updated_at'],
  },
  partners: {
    table: 'partners',
    aliases: { contactEmail: 'email' },
    readAliases: { email: 'contactEmail' },
    cols: ['company_id', 'name', 'type', 'email', 'phone', 'address', 'status', 'notes',
      'created_at', 'updated_at'],
  },
  support_tickets: {
    table: 'support_tickets',
    cols: ['company_id', 'subject', 'message', 'priority', 'status', 'user_email', 'responses',
      'created_at', 'updated_at'],
  },
  messages: {
    table: 'messages',
    aliases: { timestamp: 'created_at' },
    readAliases: { created_at: 'timestamp' },
    cols: ['company_id', 'conversation_id', 'sender_id', 'sender_email', 'recipient_id',
      'recipient_email', 'sender_name', 'content', 'is_read', 'created_at'],
  },
  project_discussions: {
    table: 'project_discussions',
    aliases: { timestamp: 'created_at' },
    readAliases: { created_at: 'timestamp' },
    cols: ['company_id', 'project_id', 'sender_id', 'sender_name', 'content', 'created_at'],
  },
  order_messages: {
    table: 'order_messages',
    aliases: { timestamp: 'created_at' },
    readAliases: { created_at: 'timestamp' },
    cols: ['company_id', 'order_id', 'sender_id', 'sender_name', 'recipient_id', 'content',
      'is_read', 'created_at'],
  },
  collaborations: {
    table: 'collaborations',
    cols: ['company_id', 'recipient_email', 'type', 'title', 'content', 'reference_id', 'file_url',
      'file_name', 'sender_email', 'read_by', 'created_at'],
  },
  guide_steps: {
    table: 'guide_steps',
    aliases: { order: 'sort_order' },
    readAliases: { sort_order: 'order' },
    cols: ['category', 'title', 'content', 'keywords', 'sort_order', 'created_at', 'updated_at'],
  },
  global_orders: {
    table: 'global_orders',
    cols: ['total', 'cart_total', 'total_delivery_fees', 'delivery_discount', 'status',
      'payment_method', 'payment_status', 'customer_name', 'customer_phone', 'customer_quartier',
      'customer_email', 'sub_order_ids', 'created_at', 'updated_at'],
  },
  interventions: {
    table: 'interventions',
    cols: ['company_id', 'client', 'message', 'status', 'date', 'created_at', 'updated_at'],
  },
  users: {
    table: 'users',
    camel: true,
    cols: ['id', 'uid', 'email', 'displayName', 'createdAt', 'photoURL', 'updatedAt', 'lastLogin',
      'status', 'fid', 'role'],
  },
  resource_movements: {
    table: 'resource_movements',
    cols: ['company_id', 'resource_id', 'resource_name', 'type', 'quantity', 'supplier', 'notes',
      'performed_by', 'date', 'created_at'],
  },
  notification_configs: {
    table: 'notification_configs',
    cols: ['company_id', 'active_channel', 'sender_number', 'cancel_template', 'shipped_template',
      'created_at', 'updated_at'],
  },
  internal_resources: {
    table: 'internal_resources',
    cols: ['company_id', 'name', 'type', 'status', 'assigned_to', 'acquisition_date',
      'purchase_value', 'last_maintenance_date', 'created_at'],
  },
};

function tableDef(name: string): TableDef {
  const def = TABLES[name];
  if (def) return def;
  return { table: name };
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

function fieldToColumn(def: TableDef, field: string): string {
  if (field === '__name__') return 'id';
  if (def.camel) return field;
  if (def.aliases && def.aliases[field]) return def.aliases[field];
  return camelToSnake(field);
}

function columnToField(def: TableDef, column: string): string {
  if (def.camel) return column;
  if (def.readAliases && def.readAliases[column]) return def.readAliases[column];
  return snakeToCamel(column);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

// ----------------------------------------------------------------------------
// Marqueurs spéciaux (serverTimestamp / arrayUnion / increment)
// ----------------------------------------------------------------------------
export function serverTimestamp() {
  return { __nexusTs: true };
}

export function arrayUnion(...values: any[]) {
  return { __nexusArrayUnion: values };
}

export function increment(n: number) {
  return { __nexusIncrement: n };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
function isIsoDateString(v: unknown): v is string {
  return typeof v === 'string' && ISO_DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
}

function toTimestampLike(ms: number) {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1e6,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
}

// Valeur écrite -> valeur DB (résout les marqueurs)
function resolveWriteValue(v: any): any {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    // Les marqueurs arrayUnion / increment restent intacts pour updateDoc/setDoc
    if (v.__nexusTs) return new Date().toISOString();
    // Objet Timestamp-like Firestore passé en écriture
    if (typeof v.seconds === 'number' && typeof v.nanoseconds === 'number') {
      return new Date(v.seconds * 1000 + v.nanoseconds / 1e6).toISOString();
    }
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
  }
  return v;
}

// Résout les marqueurs restants pour une insertion (addDoc)
function resolveInsertMarkers(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [col, v] of Object.entries(row)) {
    if (v && typeof v === 'object') {
      if (Array.isArray(v.__nexusArrayUnion)) out[col] = v.__nexusArrayUnion;
      else if (typeof v.__nexusIncrement === 'number') out[col] = v.__nexusIncrement;
      else out[col] = v;
    } else {
      out[col] = v;
    }
  }
  return out;
}

// Valeur DB -> valeur lue (ISO string -> Timestamp-like)
function resolveReadValue(v: any): any {
  if (typeof v === 'string' && isIsoDateString(v)) {
    return toTimestampLike(Date.parse(v));
  }
  return v;
}

// ----------------------------------------------------------------------------
// Références
// ----------------------------------------------------------------------------
export const db: any = { __isDb: true, path: undefined };

export function collection(a: any, b?: any) {
  const path = b !== undefined ? b : a;
  return { kind: 'collection', name: String(path), path: String(path) };
}

export function doc(a: any, b?: any, c?: any) {
  if (a && a.kind === 'collection') {
    if (b !== undefined) {
      return { kind: 'doc', name: a.name, path: a.name + '/' + b, id: String(b) };
    }
    return { kind: 'doc', name: a.name, path: a.name, id: undefined };
  }
  if (a && a.__isDb) {
    const path = String(b);
    if (c !== undefined) return { kind: 'doc', name: path, path: path + '/' + c, id: String(c) };
    return { kind: 'doc', name: path, path, id: undefined };
  }
  if (b !== undefined) {
    return { kind: 'doc', name: String(a), path: String(a) + '/' + b, id: String(b) };
  }
  return { kind: 'doc', name: String(a), path: String(a), id: undefined };
}

export function query(col: any, ...constraints: any[]) {
  return { kind: 'query', name: col.name, path: col.path, constraints: constraints.filter(Boolean) };
}

export function where(field: string, op: any, value: any) {
  return { kind: 'where', field, op, value };
}

export function or(...constraints: any[]) {
  return { kind: 'or', constraints: constraints.filter(Boolean) };
}

export function and(...constraints: any[]) {
  return { kind: 'and', constraints: constraints.filter(Boolean) };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { kind: 'order', field, direction };
}

export function limit(v: number) {
  return { kind: 'limit', value: v };
}

// ----------------------------------------------------------------------------
// Construction de la requête Supabase
// ----------------------------------------------------------------------------
const OP_MAP: Record<string, string> = {
  '==': 'eq',
  '===': 'eq',
  '!=': 'neq',
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte',
  'in': 'in',
  'not-in': 'not.in',
  'array-contains': 'cs',
  'array-contains-any': 'ov',
};

interface WhereClause { col: string; op: string; value: any; }

function collectWheres(constraints: any[], def: TableDef, out: WhereClause[], orGroups: string[]) {
  for (const c of constraints || []) {
    if (!c) continue;
    if (c.kind === 'where') {
      const col = fieldToColumn(def, c.field);
      const op = OP_MAP[c.op] || c.op;
      out.push({ col, op, value: c.value });
    } else if (c.kind === 'and') {
      collectWheres(c.constraints, def, out, orGroups);
    } else if (c.kind === 'or') {
      orGroups.push(buildOrString(c.constraints, def));
    }
  }
}

function buildOrString(constraints: any[], def: TableDef): string {
  const parts: string[] = [];
  for (const c of constraints || []) {
    if (!c) continue;
    if (c.kind === 'where') {
      const col = fieldToColumn(def, c.field);
      const op = OP_MAP[c.op] || c.op;
      parts.push(`${col}.${op}.${encodeOrValue(c.value)}`);
    } else if (c.kind === 'and') {
      parts.push(`and(${buildOrString(c.constraints, def)})`);
    }
  }
  return parts.join(',');
}

function encodeOrValue(v: any): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

function applyConstraints(q: any, constraints: any[], def: TableDef) {
  const wheres: WhereClause[] = [];
  const orGroups: string[] = [];
  collectWheres(constraints, def, wheres, orGroups);

  for (const w of wheres) {
    if (w.op === 'eq') q = q.eq(w.col, w.value);
    else if (w.op === 'neq') q = q.neq(w.col, w.value);
    else if (w.op === 'in') q = q.in(w.col, w.value);
    else if (w.op === 'not.in') q = q.not(w.col, 'in', w.value);
    else if (w.op === 'cs') q = q.filter(w.col, 'cs', JSON.stringify([w.value]));
    else if (w.op === 'ov') q = q.filter(w.col, 'ov', JSON.stringify(w.value));
    else q = q.filter(w.col, w.op, w.value);
  }
  for (const g of orGroups) q = q.or(g);
  return q;
}

function collectOrders(constraints: any[], def: TableDef): { col: string; asc: boolean }[] {
  const orders: { col: string; asc: boolean }[] = [];
  const walk = (list: any[]) => {
    for (const c of list || []) {
      if (!c) continue;
      if (c.kind === 'order') orders.push({ col: fieldToColumn(def, c.field), asc: c.direction !== 'desc' });
      else if (c.kind === 'and') walk(c.constraints);
    }
  };
  walk(constraints);
  return orders;
}

function collectLimit(constraints: any[]): number | undefined {
  for (const c of constraints || []) {
    if (c && c.kind === 'limit') return c.value;
  }
  return undefined;
}

function buildSupabaseQuery(ref: any) {
  const def = tableDef(ref.name);
  let q = supabase.from(def.table).select('*');
  const constraints = ref.kind === 'query' ? ref.constraints : [];
  q = applyConstraints(q, constraints, def);
  for (const o of collectOrders(constraints, def)) {
    q = q.order(o.col, { ascending: o.asc });
  }
  const lim = collectLimit(constraints);
  if (lim) q = q.limit(lim);
  return q;
}

function buildDocQuery(ref: any) {
  const def = tableDef(ref.name);
  let q = supabase.from(def.table).select('*');
  if (ref.kind === 'doc' && ref.id !== undefined && ref.id !== null) {
    if (def.camel && !isUuid(String(ref.id))) {
      q = q.or(`uid.eq.${encodeOrValue(String(ref.id))},fid.eq.${encodeOrValue(String(ref.id))}`);
    } else {
      q = q.eq('id', String(ref.id));
    }
  }
  return q;
}

// ----------------------------------------------------------------------------
// Snapshots
// ----------------------------------------------------------------------------
function makeDocSnap(ref: any, row: any) {
  const def = tableDef(ref.name);
  const rawId = def.camel ? (row.fid || row.uid || row.id) : row.id;
  const id = rawId !== null && rawId !== undefined ? String(rawId) : generateId();
  const data: any = {};
  for (const [col, v] of Object.entries(row)) {
    if (col === 'id' || col === 'fid') continue;
    const field = columnToField(def, col);
    data[field] = resolveReadValue(v);
  }
  const docRef = { kind: 'doc', name: ref.name, path: ref.name + '/' + id, id, def };
  return {
    id,
    ref: docRef,
    exists: () => true,
    data: () => data,
  };
}

function makeEmptyDocSnap(ref: any) {
  const id = ref.id !== undefined && ref.id !== null ? String(ref.id) : generateId();
  return {
    id,
    ref: { kind: 'doc', name: ref.name, path: ref.name + '/' + id, id, def: tableDef(ref.name) },
    exists: () => false,
    data: () => undefined,
  };
}

// ----------------------------------------------------------------------------
// Lecture
// ----------------------------------------------------------------------------
export async function getDocs(ref: any): Promise<any> {
  try {
    const q = buildSupabaseQuery(ref);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    const docs = rows.map((r: any) => makeDocSnap(ref, r));
    return { docs, empty: rows.length === 0, size: rows.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ref.path || ref.name);
    return { docs: [], empty: true, size: 0 };
  }
}

export async function getDoc(ref: any): Promise<any> {
  try {
    const q = buildDocQuery(ref);
    const { data, error } = await q;
    if (error) throw error;
    const row = data && data[0];
    if (!row) return makeEmptyDocSnap(ref);
    return makeDocSnap(ref, row);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, ref.path || ref.name);
    return makeEmptyDocSnap(ref);
  }
}

// ----------------------------------------------------------------------------
// Écriture
// ----------------------------------------------------------------------------
const KNOWN_COLUMN_ERRS = [
  /column "([^"]+)" does not exist/i,
  /'([a-zA-Z0-9_]+)' column of/i,
  /Could not find the '([^']+)' column/i,
];

function extractUnknownColumns(msg: string): string[] {
  const cols: string[] = [];
  for (const re of KNOWN_COLUMN_ERRS) {
    const m = msg.match(re);
    if (m && m[1]) cols.push(m[1]);
  }
  return cols;
}

// Convertit une erreur PostgREST (objet {code,message,details,...}) en Error exploitable
function toError(err: any): Error {
  const msg = (err && (err.message || err.details)) || 'Erreur de base de données';
  const e = new Error(msg);
  (e as any).code = err && err.code;
  (e as any).details = err && err.details;
  (e as any).hint = err && err.hint;
  return e;
}

function sanitizeRow(def: TableDef, row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [col, v] of Object.entries(row)) {
    if (def.cols && !def.cols.includes(col)) continue;
    out[col] = v;
  }
  return out;
}

async function withColumnRetry(
  row: Record<string, any>,
  operation: (fixed: Record<string, any>) => any,
): Promise<any> {
  const run = async (r: Record<string, any>) => {
    const res = await operation(r);
    // supabase-js résout les erreurs HTTP dans res.error au lieu de rejeter :
    // on les lève pour qu'elles soient traitées (retry colonne + propagation).
    if (res && res.error) throw toError(res.error);
    return res;
  };
  let current = row;
  while (true) {
    try {
      return await run(current);
    } catch (e: any) {
      const msg = (e?.message || e?.details || String(e)) as string;
      const cols = extractUnknownColumns(msg);
      if (cols.length === 0) throw e;
      const fixed: Record<string, any> = {};
      for (const [k, v] of Object.entries(current)) {
        if (cols.includes(k)) continue;
        fixed[k] = v;
      }
      if (Object.keys(fixed).length === Object.keys(current).length) throw e;
      current = fixed;
    }
  }
}

function prepareRow(def: TableDef, data: any): Record<string, any> {
  const row: Record<string, any> = {};
  for (const [field, v] of Object.entries(data || {})) {
    if (field === 'id') continue;
    const col = fieldToColumn(def, field);
    if (col === 'id') continue;
    row[col] = resolveWriteValue(v);
  }
  return sanitizeRow(def, row);
}

export async function addDoc(col: any, data: any): Promise<any> {
  const def = tableDef(col.name);
  const id = generateId();
  try {
    const row = resolveInsertMarkers(prepareRow(def, { ...data, createdAt: serverTimestamp() }));
    const payload: Record<string, any> = def.camel ? { fid: id, ...row } : { id, ...row };
    const result = await withColumnRetry(payload, (fixed) =>
      supabase.from(def.table).insert(fixed).select('id').single(),
    );
    if (!result.data || !result.data.id) {
      throw new Error(
        `addDoc : insertion non confirmée sur ${def.table} (le serveur n'a pas retourné la ligne créée)`,
      );
    }
    return { id: result.data.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, col.path || col.name);
    throw error;
  }
}

async function resolveDocRow(ref: any): Promise<{ exists: boolean; row: any }> {
  const def = tableDef(ref.name);
  if (!ref.id) return { exists: false, row: null };
  let q = buildDocQuery(ref);
  const { data, error } = await q;
  if (error) throw error;
  return { exists: !!(data && data[0]), row: data && data[0] };
}

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  const def = tableDef(docRef.name);
  const merge = !!(options && (options as any).merge);
  try {
    const row = prepareRow(def, { ...data, updatedAt: serverTimestamp() });
    if (docRef.id !== undefined && docRef.id !== null) {
      const existing = await resolveDocRow(docRef);
      if (existing.exists) {
        const mergedRow = merge ? row : row;
        if (!merge) {
          // overwrite : on remplace les champs fournis (les champs absents restent)
        }
        const finalRow = applyMarkers(def, row, existing.row);
        await withColumnRetry(finalRow, (fixed) =>
          supabase.from(def.table).update(fixed).match({ id: existing.row.id }),
        );
        return;
      }
      // Insertion (doc inexistant)
      const finalRow = applyMarkers(def, row, null);
      const payload: Record<string, any> = def.camel
        ? { ...(isUuid(String(docRef.id)) ? { id: String(docRef.id) } : { fid: String(docRef.id) }), ...finalRow }
        : { id: String(docRef.id), ...finalRow };
      const inserted = await withColumnRetry(payload, (fixed) =>
        supabase.from(def.table).insert(fixed).select('id').single(),
      );
      if (!inserted.data || !inserted.data.id) {
        throw new Error(
          `setDoc : insertion non confirmée sur ${def.table} (le serveur n'a pas retourné la ligne créée)`,
        );
      }
      return;
    }
    // doc(db, path) sans id : création auto
    const id = generateId();
    const payload: Record<string, any> = def.camel ? { fid: id, ...row } : { id, ...row };
    const inserted = await withColumnRetry(payload, (fixed) =>
      supabase.from(def.table).insert(fixed).select('id').single(),
    );
    if (!inserted.data || !inserted.data.id) {
      throw new Error(
        `setDoc : insertion non confirmée sur ${def.table} (le serveur n'a pas retourné la ligne créée)`,
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docRef.path);
    throw error;
  }
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  const def = tableDef(docRef.name);
  try {
    const row = prepareRow(def, { ...data, updatedAt: serverTimestamp() });
    if (docRef.id !== undefined && docRef.id !== null) {
      const existing = await resolveDocRow(docRef);
      if (!existing.exists) {
        throw new Error(`updateDoc : document introuvable (${docRef.path})`);
      }
      const finalRow = applyMarkers(def, row, existing.row);
      const match = def.camel && !isUuid(String(docRef.id))
        ? { id: existing.row.id }
        : { id: String(docRef.id) };
      const result = await withColumnRetry(finalRow, (fixed) =>
        supabase.from(def.table).update(fixed).match(match).select('id'),
      );
      if (result.error) throw toError(result.error);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docRef.path);
    throw error;
  }
}

export async function deleteDoc(docRef: any): Promise<void> {
  const def = tableDef(docRef.name);
  try {
    if (docRef.id !== undefined && docRef.id !== null) {
      if (def.camel && !isUuid(String(docRef.id))) {
        const existing = await resolveDocRow(docRef);
        if (!existing.exists) return;
        const res = await supabase.from(def.table).delete().eq('id', existing.row.id);
        if (res.error) throw toError(res.error);
      } else {
        const res = await supabase.from(def.table).delete().eq('id', String(docRef.id));
        if (res.error) throw toError(res.error);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docRef.path);
    throw error;
  }
}

// Applique les marqueurs increment / arrayUnion (lecture-modification-écriture)
function applyMarkers(def: TableDef, row: Record<string, any>, existing: any | null): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [col, v] of Object.entries(row)) {
    if (v && typeof v === 'object' && typeof v.__nexusIncrement === 'number') {
      const current = existing ? Number(existing[col] ?? 0) : 0;
      out[col] = (Number.isNaN(current) ? 0 : current) + v.__nexusIncrement;
    } else if (v && typeof v === 'object' && Array.isArray(v.__nexusArrayUnion)) {
      const current: any[] = existing && existing[col] != null ? existing[col] : [];
      const merged = current.slice();
      for (const item of v.__nexusArrayUnion) {
        if (!merged.some((m) => JSON.stringify(m) === JSON.stringify(item))) merged.push(item);
      }
      out[col] = merged;
    } else {
      out[col] = v;
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Realtime (onSnapshot)
// ----------------------------------------------------------------------------
export function onSnapshot(ref: any, cb: any, errCb?: any) {
  const def = tableDef(ref.name);
  let timer: any;

  const emit = () => {
    try {
      if (ref.kind === 'doc') {
        getDoc(ref).then((snap) => cb(snap)).catch((e) => {
          if (errCb) errCb(e);
          else console.warn('onSnapshot doc error', e);
        });
      } else {
        getDocs(ref).then((res) => cb(res)).catch((e) => {
          if (errCb) errCb(e);
          else console.warn('onSnapshot query error', e);
        });
      }
    } catch (e) {
      if (errCb) errCb(e);
    }
  };

  let channel: any = null;
  if (isSupabaseConfigured) {
    channel = supabase
      .channel(`fs_${def.table}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: def.table }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(emit, 60);
      })
      .subscribe();
  }

  emit();

  return () => {
    if (timer) clearTimeout(timer);
    if (channel) supabase.removeChannel(channel);
  };
}

// ----------------------------------------------------------------------------
// Erreurs & opérations
// ----------------------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = String(error);
    }
  } else {
    errorMessage = String(error);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('companies').select('id').limit(1);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Auth (compat firebase/auth)
// ----------------------------------------------------------------------------
function mapAuthUser(user: any): any {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
    photoURL: user.user_metadata?.avatar_url || null,
    emailVerified: user.email_confirmed_at ? true : false,
    isAnonymous: false,
    tenantId: null,
    providerData: [],
    access_token: (supabaseAuth.getSession()?.access_token as string) || '',
    refresh_token: (supabaseAuth.getSession()?.refresh_token as string) || '',
    expires_at: (supabaseAuth.getSession()?.expires_at as number) || undefined,
  };
}

export const auth: any = {
  get currentUser() {
    return mapAuthUser(supabaseAuth.getSession()?.user || null);
  },
  signOut: async () => {
    await supabaseAuth.signOut();
  },
};

export const secondaryAuth: any = auth;

export function onAuthStateChanged(_auth: any, cb: (user: any) => void) {
  if (!isSupabaseConfigured) {
    cb(null);
    return () => {};
  }
  const { data: { subscription } } = supabaseAuth.onAuthStateChange((_event, session) => {
    cb(mapAuthUser(session?.user || null));
  });
  const initial = mapAuthUser(supabaseAuth.getSession()?.user || null);
  cb(initial);
  return () => subscription.unsubscribe();
}

export async function signInWithEmailAndPassword(_auth: any, email: string, pass: string): Promise<any> {
  const { data, error } = await supabaseAuth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return { user: data.user };
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, pass: string): Promise<any> {
  const { data, error } = await supabaseAuth.signUp({ email, password: pass });
  if (error) throw error;
  return { user: data.user };
}

export async function signOut(_auth: any): Promise<void> {
  await supabaseAuth.signOut();
}

export class GoogleAuthProvider {
  addScope(_scope: string) {}
}

export async function signInWithPopup(_auth: any, _provider: any): Promise<any> {
  const { error } = await supabaseAuth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  const user = mapAuthUser(supabaseAuth.getSession()?.user || null);
  return { user };
}

export const registerUserWithoutLogin = async (email: string, pass: string) => {
  try {
    const { data, error } = await supabaseAuth.signUp({ email, password: pass });
    if (error) throw error;
    await supabaseAuth.signOut();
    return { user: data.user };
  } catch (error) {
    console.error('Secondary auth creation error:', error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const cleanEmail = email.trim().toLowerCase();
    const userData: any = {
      uid: result.user.uid,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      photoURL: null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', result.user.uid), userData, { merge: true });
    return { user: result.user };
  } catch (error) {
    console.error('Email register error:', error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user };
  } catch (error) {
    console.error('Email login error:', error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  try {
    const { error } = await supabaseAuth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
    return { user: mapAuthUser(supabaseAuth.getSession()?.user || null) };
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

export const logout = async () => {
  await supabaseAuth.signOut();
};

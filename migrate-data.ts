import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import firebaseConfig from './firebase-applet-config.json';
import {
  mapCompanies, mapPersonnel, mapClients, mapProducts,
  mapOrders, mapOrderHistory, mapTasks, mapStockHistory, mapNotifications,
} from './migrate-mappers';

// ---------------------------------------------------------------------------
// Clients
// - Supabase : clé anon (lecture/écriture vérifiée). La clé service est invalide.
// - Firestore : API REST (le SDK pose un problème de résolution ESM sous Node),
//   authentifiée avec un compte Firebase (démo par défaut).
// ---------------------------------------------------------------------------
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_ANON_KEY manquants dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FIREBASE_PROJECT = firebaseConfig.projectId;
const FIREBASE_DATABASE = firebaseConfig.firestoreDatabaseId;
const FIREBASE_API_KEY = firebaseConfig.apiKey;
const FIREBASE_EMAIL =
  process.env.FIREBASE_MIGRATION_EMAIL || 'demonstration@nexus.com';
const FIREBASE_PASSWORD =
  process.env.FIREBASE_MIGRATION_PASSWORD || 'nexus2026';

const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/${FIREBASE_DATABASE}/documents`;
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Auth Firebase (obtention d'un ID token)
// ---------------------------------------------------------------------------
async function getFirebaseToken(): Promise<string> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: FIREBASE_EMAIL,
      password: FIREBASE_PASSWORD,
      returnSecureToken: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth Firebase échouée (${res.status}) : ${text}`);
  }
  const data = await res.json();
  console.log(`🔑 Connecté Firestore en tant que ${FIREBASE_EMAIL}`);
  return data.idToken as string;
}

// ---------------------------------------------------------------------------
// Conversion du format REST Firestore → objet JS simple
// ---------------------------------------------------------------------------
function fieldValueToJs(v: any): any {
  if (v === undefined || v === null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('referenceValue' in v) return v.referenceValue;
  if ('bytesValue' in v) return v.bytesValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fieldValueToJs);
  if ('mapValue' in v) return fieldsToObject(v.mapValue.fields || {});
  return null;
}

function fieldsToObject(fields: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fieldValueToJs(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lecture Firestore via runQuery, paginée par curseur sur __name__
// ---------------------------------------------------------------------------
async function listCollection(token: string, collectionId: string): Promise<any[]> {
  const docs: any[] = [];
  let cursor: string | null = null;
  const PAGE_SIZE = 1000;

  for (;;) {
    const structuredQuery: any = {
      from: [{ collectionId }],
      limit: PAGE_SIZE,
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
    };
    if (cursor) {
      structuredQuery.startAfter = { values: [{ referenceValue: cursor }] };
    }

    const res = await fetch(`${FIREBASE_BASE}/:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`runQuery ${collectionId} échoué (${res.status}) : ${text}`);
    }

    const results = await res.json();
    let last: string | null = null;
    let returned = 0;
    for (const r of results || []) {
      if (r.document) {
        const name: string = r.document.name;
        const docId = name.split('/').pop() || '';
        docs.push({ ...fieldsToObject(r.document.fields || {}), id: docId });
        last = name;
        returned += 1;
      }
    }

    if (returned < PAGE_SIZE || !last) break;
    cursor = last;
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Insertion par lots (upsert, onConflict id)
// ---------------------------------------------------------------------------
async function upsertBatch(table: string, records: any[], onConflict: string = 'id') {
  if (DRY_RUN) {
    console.log(`  (dry-run) ${records.length} enregistrements pour ${table} — exemple:`);
    console.log(JSON.stringify(records[0], null, 2));
    return { ok: records.length, failed: 0 };
  }
  const BATCH = 100;
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      failed += chunk.length;
      console.error(`  ❌ ${table} batch ${i / BATCH + 1}:`, error.message);
    } else {
      ok += chunk.length;
    }
  }
  return { ok, failed };
}

// ---------------------------------------------------------------------------
// Migration d'une collection
// ---------------------------------------------------------------------------
async function migrateCollection(
  token: string,
  collectionName: string,
  tableName: string,
  mapper: (d: any) => any,
  fkGuard?: (records: any[]) => any[],
) {
  console.log(`\n--- ${collectionName} → ${tableName} ---`);
  try {
    const docs = await listCollection(token, collectionName);
    if (docs.length === 0) {
      console.log('  (vide)');
      return 0;
    }
    let records = docs.map((d) => mapper(d));
    if (fkGuard) records = fkGuard(records);
    console.log(`  ${records.length} documents`);
    const { ok, failed } = await upsertBatch(tableName, records);
    console.log(`  ✅ ${ok} insérés, ❌ ${failed} en erreur`);
    return records.length;
  } catch (error: any) {
    console.error(`  ❌ Lecture ${collectionName} impossible :`, error?.message || error);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Guards FK : nullify une référence si la cible n'existe pas dans Supabase
// ---------------------------------------------------------------------------
async function existingIds(table: string): Promise<Set<string>> {
  const { data } = await supabase.from(table).select('id');
  return new Set((data || []).map((r) => r.id));
}

const nullifyCompanyId = (records: any[], companyIds: Set<string>) =>
  records.map((r) => (r.company_id && !companyIds.has(r.company_id) ? { ...r, company_id: null } : r));

// ---------------------------------------------------------------------------
// Exécution (ordre dépendances FK)
// ---------------------------------------------------------------------------
async function runMigration() {
  console.log(DRY_RUN
    ? '🚀 Migration Firestore → Supabase — MODE DRY-RUN (aucune écriture)'
    : '🚀 Migration Firestore → Supabase (clé anon)');

  let token: string;
  try {
    token = await getFirebaseToken();
  } catch (e: any) {
    console.error('❌', e.message);
    process.exit(1);
    return;
  }

  await migrateCollection(token, 'companies', 'companies', mapCompanies);

  const companyIds = await existingIds('companies');
  const personnelIds = await existingIds('personnel');
  const productIds = await existingIds('products');
  const orderIds = await existingIds('ecommerce_orders');

  await migrateCollection(token, 'personnel', 'personnel', mapPersonnel, (records) =>
    nullifyCompanyId(records, companyIds),
  );
  await migrateCollection(token, 'clients', 'clients', mapClients, (records) =>
    nullifyCompanyId(records, companyIds),
  );
  await migrateCollection(token, 'products', 'products', mapProducts, (records) =>
    nullifyCompanyId(records, companyIds),
  );
  await migrateCollection(token, 'ecommerce_orders', 'ecommerce_orders', mapOrders, (records) =>
    nullifyCompanyId(records, companyIds),
  );

  await migrateCollection(token, 'order_history', 'order_history', mapOrderHistory, (records) =>
    nullifyCompanyId(
      records.map((r) => (r.order_id && !orderIds.has(r.order_id) ? { ...r, order_id: null } : r)),
      companyIds,
    ),
  );

  await migrateCollection(token, 'tasks', 'tasks', mapTasks, (records) =>
    nullifyCompanyId(
      records.map((r) => (r.assigned_to && !personnelIds.has(r.assigned_to) ? { ...r, assigned_to: null } : r)),
      companyIds,
    ),
  );

  await migrateCollection(token, 'stock_history', 'stock_history', mapStockHistory, (records) =>
    nullifyCompanyId(
      records.map((r) => (r.product_id && !productIds.has(r.product_id) ? { ...r, product_id: null } : r)),
      companyIds,
    ),
  );

  await migrateCollection(token, 'notifications', 'notifications', mapNotifications, (records) =>
    nullifyCompanyId(records, companyIds),
  );

  console.log('\n🎉 Migration terminée.');
  process.exit(0);
}

runMigration();

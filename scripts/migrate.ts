import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';

// Load environment variables
const env = loadEnv('', process.cwd(), '');

// Initialize Supabase
const supabase = createClient(
  env.VITE_SUPABASE_URL || '',
  env.VITE_SUPABASE_ANON_KEY || ''
);

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

// Collection mapping (Firestore -> Supabase)
const collections = [
  'companies',
  'personnel',
  'clients',
  'products',
  'ecommerce_orders',
  'order_history',
  'tasks',
  'stock_history',
  'notifications'
];

function camelToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => camelToSnakeCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      let value = obj[key];
      
      // Handle Firestore Timestamps
      if (value && typeof value.toDate === 'function') {
        value = value.toDate().toISOString();
      }
      
      result[snakeKey] = camelToSnakeCase(value);
      return result;
    }, {} as any);
  }
  return obj;
}

async function runMigration() {
  console.log("🚀 Starting data migration from Firebase to Supabase...");
  fs.writeFileSync('supabase/migrations/migration_data.sql', '-- Data Migration SQL\n\n');
  try {
    try {
      await signInWithEmailAndPassword(auth, 'migrator2026@nexus.com', 'password123');
      console.log("🔓 Successfully authenticated with Firebase as migrator.");
    } catch {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(auth, 'migrator2026@nexus.com', 'password123');
      console.log("🔓 Successfully created and authenticated new migrator user.");
    }
  } catch (err) {
    console.error("Failed to authenticate with Firebase:", err);
  }

  const validCompanyIds = new Set<string>();

  for (const collName of collections) {
    console.log(`\n📦 Migrating collection: ${collName}`);
    try {
      const snapshot = await getDocs(collection(db, collName));
      if (snapshot.empty) {
        console.log(`   └─ Collection is empty. Skipping.`);
        continue;
      }

      let records = snapshot.docs.map(doc => {
        const data = camelToSnakeCase(doc.data());
        
        // Remove undefined fields and fix specific mappings
        if (collName === 'companies') {
          if (data.category !== undefined) {
             data.categories = data.category;
             delete data.category;
          }
          delete data.description;
          delete data.employees;
          delete data.roles;
          delete data.member_emails;
        } else if (collName === 'personnel') {
          delete data.custom_permissions;
        } else if (collName === 'clients') {
          delete data.interactions;
        } else if (collName === 'products') {
          delete data.allow_backorder;
          delete data.config_options;
        } else if (collName === 'ecommerce_orders') {
          delete data.checkout_source;
          delete data.customer_name;
        } else if (collName === 'notifications') {
          delete data.read;
          if (data.is_read === undefined && data.read !== undefined) {
            data.is_read = data.read;
          }
        }
        
        return {
          id: doc.id,
          ...data
        };
      });

      if (collName === 'companies') {
        records.forEach(r => validCompanyIds.add(r.id));
      } else {
        // Filter out orphaned records
        const beforeCount = records.length;
        records = records.filter(r => {
          if (r.company_id && !validCompanyIds.has(r.company_id)) {
            return false;
          }
          return true;
        });
        if (records.length < beforeCount) {
           console.log(`   └─ Skipped ${beforeCount - records.length} orphaned records.`);
        }
      }

      console.log(`   └─ Found ${records.length} records. Inserting...`);


      const MAX_CHUNK_SIZE = 500000; // 500KB per file
      let currentChunk = 0;
      let currentSize = 0;
      let sqlChunk: string[] = [];

      records.forEach((record, index) => {
        const columns = Object.keys(record).join(', ');
        const values = Object.values(record).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return val;
        }).join(', ');
        
        const stmt = `INSERT INTO ${collName} (${columns}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${Object.keys(record).filter(k => k !== 'id').map(k => `${k} = EXCLUDED.${k}`).join(', ')};`;
        
        sqlChunk.push(stmt);
        currentSize += stmt.length;

        if (currentSize >= MAX_CHUNK_SIZE || index === records.length - 1) {
          currentChunk++;
          const fileName = `supabase/migrations/migration_${collName}_part${currentChunk}.sql`;
          fs.writeFileSync(fileName, `-- Migration for ${collName} (Part ${currentChunk})\n\n${sqlChunk.join('\n\n')}\n`);
          console.log(`   ✅ Successfully generated SQL chunk for ${collName}: ${fileName}`);
          sqlChunk = [];
          currentSize = 0;
        }
      });

    } catch (err) {
      console.error(`   ❌ Failed to read from Firestore collection ${collName}:`, err);
    }
  }

  console.log("\n🎉 Migration finished!");
  process.exit(0);
}

runMigration();

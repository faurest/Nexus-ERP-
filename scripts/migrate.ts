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

  for (const collName of collections) {
    console.log(`\n📦 Migrating collection: ${collName}`);
    try {
      const snapshot = await getDocs(collection(db, collName));
      if (snapshot.empty) {
        console.log(`   └─ Collection is empty. Skipping.`);
        continue;
      }

      const records = snapshot.docs.map(doc => {
        const data = camelToSnakeCase(doc.data());
        
        // Remove undefined fields and fix specific mappings
        if (collName === 'companies') {
          if (data.category !== undefined) {
             data.categories = data.category;
             delete data.category;
          }
        }
        
        return {
          id: doc.id,
          ...data
        };
      });

      console.log(`   └─ Found ${records.length} records. Inserting...`);

      // Batch insert into Supabase
      const { error } = await supabase
        .from(collName)
        .upsert(records, { onConflict: 'id' });

      if (error) {
        console.error(`   ❌ Supabase insert error for ${collName}:`, error.message);
      } else {
        console.log(`   ✅ Successfully migrated ${collName}.`);
      }

    } catch (err) {
      console.error(`   ❌ Failed to read from Firestore collection ${collName}:`, err);
    }
  }

  console.log("\n🎉 Migration finished!");
  process.exit(0);
}

runMigration();

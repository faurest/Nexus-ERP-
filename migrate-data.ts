import { db, getDocs, collection } from './src/lib/firebase';
import { supabase } from './src/lib/supabase';

// Helper to map Firestore documents to Supabase records
const mapFirestoreToSupabase = (doc: any) => {
  const data = doc.data();
  // Ensure we map the Firestore ID to the Supabase ID
  return {
    ...data,
    id: doc.id,
    // Convert Firestore timestamps to ISO strings if necessary
    created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
    updated_at: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
  };
};

async function migrateCollection(collectionName: string, supabaseTable: string) {
  console.log(`\n--- Migrating collection: ${collectionName} to table: ${supabaseTable} ---`);
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is empty. Skipping.`);
      return;
    }

    const records = snapshot.docs.map(mapFirestoreToSupabase);
    console.log(`Found ${records.length} records in ${collectionName}.`);

    // We can insert them in batches, but for a simple script, we'll try to insert all at once.
    // Supabase will automatically ignore the 'createdAt' fields if they don't match exactly, 
    // but our schema uses created_at. We need to clean the data to match the SQL schema.
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from(supabaseTable)
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error inserting into ${supabaseTable}:`, error);
    } else {
      console.log(`✅ Successfully migrated ${records.length} records to ${supabaseTable}.`);
    }
  } catch (error) {
    console.error(`❌ Failed to read from Firestore collection ${collectionName}:`, error);
  }
}

async function runMigration() {
  console.log("Starting Data Migration from Firestore to Supabase...");
  
  // Note: For companies, we need owner_id, but users might not be in Supabase Auth yet.
  // We defined 'owner_id' as TEXT in our Supabase schema to support Firebase Auth UIDs.

  // 1. Companies
  await migrateCollection('companies', 'companies');

  // 2. Personnel
  await migrateCollection('personnel', 'personnel');

  // 3. Clients
  await migrateCollection('clients', 'clients');

  // 4. Products
  await migrateCollection('products', 'products');

  // 5. Orders & History
  await migrateCollection('ecommerce_orders', 'ecommerce_orders');
  await migrateCollection('order_history', 'order_history');

  // 6. Tasks
  await migrateCollection('tasks', 'tasks');

  // 7. Stock History
  await migrateCollection('stock_history', 'stock_history');

  // 8. Notifications
  await migrateCollection('notifications', 'notifications');

  console.log("\n🎉 Migration finished!");
  process.exit(0);
}

runMigration();

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Gracefully handle missing Supabase config (avoids crash with empty URL)
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');

export const supabaseAuth = supabase.auth as any;

// Define a test function to verify the connection
export async function testSupabaseConnection() {
  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured — skipping connection test");
    return false;
  }
  try {
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
    
    if (error && error.code !== '42P01') { 
      console.warn("Supabase connection warning:", error.message);
      return false;
    }
    
    console.log("Supabase connection successful");
    return true;
  } catch (err) {
    console.error("Supabase connection failed:", err);
    return false;
  }
}

import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation simple de l'URL
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(isValidUrl(supabaseUrl) && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn("⚠️ NEXUS ERP : Supabase n'est pas encore configuré ou l'URL est invalide. Les données seront perdues au rafraîchissement. Veuillez ajouter une URL valide (https://...) et VITE_SUPABASE_ANON_KEY dans les paramètres.");
}

// Utilisation d'une URL de secours structurellement correcte pour éviter l'erreur "Invalid supabaseUrl"
const safeUrl = isValidUrl(supabaseUrl) ? supabaseUrl! : 'https://placeholder-project.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);

// Test de connexion rapide
export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('companies').select('id').limit(1);
    if (error) throw error;
    console.log("✅ Connexion Supabase établie avec succès.");
    return true;
  } catch (err) {
    console.error("❌ Erreur de connexion Supabase :", err);
    return false;
  }
}

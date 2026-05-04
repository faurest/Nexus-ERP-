import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation plus stricte de l'URL
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const isStandardUrl = url.startsWith('https://') && url.includes('.supabase.co');
    // Si l'utilisateur utilise api.supabase.com, c'est une erreur classique
    if (url.includes('api.supabase.com')) {
      console.error("❌ ERREUR DE CONFIGURATION : Vous utilisez 'api.supabase.com' au lieu de l'URL de votre projet (qui se termine par .supabase.co).");
      return false;
    }
    return isStandardUrl;
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey.length > 20);

if (!isSupabaseConfigured) {
  if (supabaseUrl && supabaseUrl.includes('api.supabase.com')) {
     console.warn("⚠️ NEXUS : L'URL Supabase est incorrecte. Elle doit ressembler à https://xyz.supabase.co");
  } else {
     console.warn("⚠️ NEXUS : Supabase n'est pas encore configuré. Les données seront locales (démo).");
  }
}

// Utilisation d'une URL de secours structurellement correcte pour éviter l'erreur "Invalid supabaseUrl"
const safeUrl = isValidUrl(supabaseUrl) ? supabaseUrl! : 'https://placeholder-project.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);

// Test de connexion rapide
export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) {
    console.warn("NEXUS : Configuration Supabase manquante.");
    return false;
  }
  try {
    const { data, error } = await supabase.from('companies').select('id').limit(1);
    if (error) {
       console.error("❌ Erreur de réponse Supabase (Vérifiez le RLS ou le nom de la table) :", error.message);
       return false;
    }
    console.log("✅ Connexion Supabase établie. Données reçues :", data);
    return true;
  } catch (err) {
    console.error("❌ Erreur fatale de connexion Supabase :", err);
    return false;
  }
}

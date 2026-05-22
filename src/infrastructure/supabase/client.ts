import { getSupabase } from '../../lib/supabase';

// Centralize supabase client config
export const supabaseClient = {
  getClient: () => getSupabase(),
};

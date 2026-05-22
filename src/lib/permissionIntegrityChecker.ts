import { getSupabase } from './supabase';

export const isGlobalAdminAsync = async (email: string | null | undefined): Promise<boolean> => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase().replace(/\s+/g, '');
  
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { data } = await sb.from('global_admins').select('email').eq('email', cleanEmail).maybeSingle();
    return !!data;
  } catch (e) {
    // Fallback locally during transition
    return ['hackeurfaurest@gmail.com', 'dangafelicite@gmail.com', 'yaoubaboubakary43@gmail.com'].includes(cleanEmail);
  }
};

export const resolveMarketplacePermissions = (user: any, activeRole: string | null, isGlobalAdmin: boolean): string[] => {
  if (isGlobalAdmin) {
    return [
      'marketplace.view', 'marketplace.sell', 'marketplace.buy',
      'marketplace.manage_orders', 'marketplace.manage_products',
      'marketplace.admin', 'marketplace.super_admin'
    ];
  }

  const permissions = ['marketplace.view', 'marketplace.buy'];

  if (['owner', 'global_admin', 'Administrateur', 'Directeur'].includes(activeRole || '')) {
    permissions.push('marketplace.sell', 'marketplace.manage_orders', 'marketplace.manage_products', 'marketplace.admin');
  }

  if (['Commercial', 'Personnel'].includes(activeRole || '')) {
    permissions.push('marketplace.sell', 'marketplace.manage_orders', 'marketplace.manage_products');
  }

  return permissions;
};


export const IMMUTABLE_SUPER_ADMINS = [
  'hackeurfaurest@gmail.com',
  'dangafelicite@gmail.com',
  'yaoubaboubakary43@gmail.com'
];

export const isImmutableSuperAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase().replace(/\s+/g, '');
  return IMMUTABLE_SUPER_ADMINS.includes(cleanEmail);
};

export const validateGlobalAdminIntegrity = (user: any) => {
  if (!user) return false;
  return isImmutableSuperAdmin(user.email);
};

export const resolveMarketplacePermissions = (user: any, activeRole: string | null, isGlobalAdmin: boolean): string[] => {
  if (isGlobalAdmin) {
    return [
      'marketplace.view',
      'marketplace.sell',
      'marketplace.buy',
      'marketplace.manage_orders',
      'marketplace.manage_products',
      'marketplace.admin',
      'marketplace.super_admin'
    ];
  }

  // Regular tenant permissions based on role
  const permissions = ['marketplace.view', 'marketplace.buy'];

  if (activeRole === 'owner' || activeRole === 'global_admin' || activeRole === 'Administrateur' || activeRole === 'Directeur') {
    permissions.push('marketplace.sell', 'marketplace.manage_orders', 'marketplace.manage_products', 'marketplace.admin');
  }

  if (activeRole === 'Commercial' || activeRole === 'Personnel') {
    permissions.push('marketplace.sell', 'marketplace.manage_orders', 'marketplace.manage_products');
  }

  return permissions;
};

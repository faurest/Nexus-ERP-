/**
 * Centralized authentication utilities
 * Replace hardcoded email checks with role-based checks
 */

export interface MasterUser {
  uid?: string;
  email?: string | null;
  role?: string;
}

export interface Company {
  id?: string;
  ownerId?: string;
  ownerEmail?: string;
}

/**
 * Check if a user has master/admin privileges
 * Uses role-based checks instead of hardcoded emails
 */
export function isMasterUser(user: MasterUser | null, company?: Company | null): boolean {
  if (!user) return false;
  
  // Check if user has owner role
  if (user.role === 'owner') return true;
  
  // Check if user is the company owner
  if (company && user.uid && company.ownerId === user.uid) return true;
  if (company && user.email && company.ownerEmail?.toLowerCase() === user.email.toLowerCase()) return true;
  
  return false;
}

/**
 * Check if user is a simple admin (not necessarily owner)
 */
export function isAdminUser(user: MasterUser | null, company?: Company | null): boolean {
  if (!user) return false;
  
  // Owner is always admin
  if (isMasterUser(user, company)) return true;
  
  // Check for admin role
  if (user.role === 'Admin' || user.role === 'admin') return true;
  
  return false;
}

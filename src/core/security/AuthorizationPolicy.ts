export class AuthorizationPolicy {
  public static canCreateResource(userRole: string, resourceType: string): boolean {
    const adminRoles = ['admin', 'owner'];
    return adminRoles.includes(userRole);
  }

  public static canDeleteResource(userRole: string): boolean {
    return userRole === 'owner';
  }
}

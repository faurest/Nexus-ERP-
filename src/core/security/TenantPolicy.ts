export class TenantPolicy {
  public static validateTenantAccess(userCompanyId: string, resourceCompanyId: string): boolean {
    if (!userCompanyId || !resourceCompanyId) return false;
    return userCompanyId === resourceCompanyId;
  }

  public static enforceTenantIsolation(query: any, companyId: string): any {
    // Inject companyId constraint into any query
    return { ...query, companyId };
  }
}

import { tenantApi } from '../api/tenant.api';

export const companyRepository = {
  async getMemberships(userId: string) {
    return tenantApi.fetchMemberships(userId);
  },
  async getCompaniesForGlobalAdmin() {
    return tenantApi.fetchAllCompaniesForGlobalAdmin();
  }
};

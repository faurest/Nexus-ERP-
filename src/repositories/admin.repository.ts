import { adminApi } from '../api/admin.api';

export const adminRepository = {
  async getGlobalAdminRole() {
    return adminApi.fetchGlobalAdminRole();
  },
  async injectGlobalAdmin(userId: string, companyId: string, roleId: string) {
    return adminApi.injectGlobalAdmin(userId, companyId, roleId);
  }
};

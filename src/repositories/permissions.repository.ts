import { permissionsApi } from '../api/permissions.api';

export const permissionsRepository = {
  async getRolePermissions(roleId: string) {
    return permissionsApi.fetchRolePermissions(roleId);
  }
};

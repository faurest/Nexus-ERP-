import { authApi } from '../api/auth.api';

export const authRepository = {
  async getProfile(email: string, firebaseUid: string) {
    return authApi.fetchProfile(email, firebaseUid);
  }
};

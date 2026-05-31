export interface UserSession {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthenticatedUser;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
}

export interface AuthCredentials {
  email: string;
  password?: string;
}

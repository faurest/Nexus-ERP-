export interface RuntimeIdentity {
  id: string;
  email: string;
  roles: string[];
}

export interface AuthContract {
  isAuthenticated: () => boolean;
  getIdentity: () => RuntimeIdentity | null;
}

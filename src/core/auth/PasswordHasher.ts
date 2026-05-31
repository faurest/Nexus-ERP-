/**
 * PasswordHasher handles client-side security mechanisms.
 * Currently a stub for migrating away from Firebase Auth.
 * NOTE: Actual password hashing for storage must be performed on the backend.
 */
export class PasswordHasher {
  // Hash function stub - to be implemented with Web Crypto API or similar for client-side pre-hashing if needed,
  // though typically hashing happens via backend standard methods (e.g., bcrypt/argon2).
  async hash(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const computedHash = await this.hash(password);
    return computedHash === hash;
  }
}

export const passwordHasher = new PasswordHasher();

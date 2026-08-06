import { useState } from 'react';
import { useDependencies } from '../../../core/di/DependencyProvider';

export function useLogin() {
  const { facades, health } = useDependencies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'google' | 'email'>('email');
  const [healthStatus, setHealthStatus] = useState<'testing' | 'ok' | 'fail'>('testing');

  const checkHealth = async () => {
    try {
      const status = await health.checkHealth();
      setHealthStatus(status.firebase ? 'ok' : 'fail');
    } catch (e) {
      setHealthStatus('fail');
    }
  };

  const login = async (email: string, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      await facades.session.login(email, password);
      return true;
    } catch (err: any) {
      // Map domain exception / original error string to user-friendly message
      const errorCode = err?.originalError?.code || err.code;
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'invalid_credentials' || errorCode === 'Invalid login credentials') {
        setError('Identifiants incorrects ou compte inexistant.');
      } else if (errorCode === 'auth/wrong-password') {
        setError('Clé d\'accès incorrecte.');
      } else if (errorCode === 'email_not_confirmed' || errorCode === 'Email not confirmed') {
        setError('Votre email n\'a pas encore été confirmé. Vérifiez votre boîte de réception.');
      } else {
        setError('Erreur de connexion : ' + (err.message || 'Serveur indisponible.'));
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await facades.session.loginWithGoogle();
      return true;
    } catch (err: any) {
      console.error('Google login error:', err?.originalError || err);
      setError('Échec de la connexion avec Google. Réessayez.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const registerDemo = async (email: string, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!password) throw new Error("Password required");
      await facades.session.registerDemo(email, password);
      // Wait for the new user to be ready and logged in
      return true;
    } catch (err: any) {
      setError('Échec de la création du compte de démonstration.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await facades.session.resetPassword(email);
      return true;
    } catch (err: any) {
      setError('Erreur lors de l\'envoi : ' + (err?.message || 'serveur indisponible.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    login,
    loginWithGoogle,
    registerDemo,
    resetPassword,
    clearError,
    loading,
    error,
    loginMode,
    setLoginMode,
    healthStatus,
    checkHealth
  };
}

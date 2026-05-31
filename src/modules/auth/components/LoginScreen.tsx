import React, { useState, useEffect } from 'react';
import { ShoppingBag, AlertCircle, Key, User, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { loginWithGoogle } from '../../../lib/firebase';
import { NexusLogo } from '../../../components/NexusLogo';
import { authService } from '../../../core/auth/AuthService';

export function LoginScreen({ onMarketplace }: { onMarketplace: () => void }) {
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'google' | 'email'>('email');

  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    import('../../../lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection().then((ok: boolean) => setConnStatus(ok ? 'ok' : 'fail'));
    });
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError('');
    setLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setAuthError('Échec de la connexion avec Google. Réessayez.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      let user;
      if (isRegistering) {
          user = await authService.registerWithEmail({ email, password });
      } else {
          user = await authService.loginWithEmail({ email, password });
      }
      
      if (!user) {
        setAuthError(isRegistering ? 'Échec de la création du compte. Vérifiez les informations.' : 'Identifiants incorrects ou échec de connexion.');
      } else {
        // Trigger a fake Firebase user event or reload to pick up the local session
        window.location.reload(); 
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setAuthError('Identifiants incorrects ou compte inexistant.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Cette adresse email est déjà utilisée.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
      } else {
        setAuthError('Erreur de connexion : ' + (err.message || 'Serveur indisponible.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans relative">
      <div className="max-w-md w-full bg-white rounded-3xl p-12 shadow-xl border border-slate-200 relative overflow-hidden">
        
        <div className="flex flex-col items-center gap-6 mb-12 justify-center">
          <div>
            <NexusLogo className="w-20 h-20" />
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Nexus<span className="text-blue-600">ERP</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Intelligence Industrielle</p>
          </div>
          
          <div className="mt-2">
            {connStatus === 'testing' && (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">Syncing...</span>
            )}
            {connStatus === 'ok' && (
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-blue-100">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Secured
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {authError && (
            <div className="p-4 bg-red-50 text-red-700 text-[11px] font-bold rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span className="leading-tight">{authError}</span>
            </div>
          )}

          <div className="text-center mb-4 flex gap-4 justify-center">
            <button onClick={() => setLoginMode('email')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 ${loginMode === 'email' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>Standard Access</button>
            <button onClick={() => setLoginMode('google')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 ${loginMode === 'google' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>Google SSO</button>
          </div>

          {loginMode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Identifiant Local</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="votre@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clé d'Accès</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="••••••••" />
                </div>
              </div>
              
              {!isRegistering && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex flex-col gap-1 text-xs text-blue-800">
                  <span className="font-bold">Compte de test disponible :</span>
                  <div className="flex justify-between">
                    <span>Email: <span className="font-mono bg-blue-100 px-1 rounded">demonstration@nexus.com</span></span>
                    <span>Mot de passe: <span className="font-mono bg-blue-100 px-1 rounded">nexus2026</span></span>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-4 shadow-lg shadow-blue-600/10 disabled:opacity-50 mt-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isRegistering ? 'Créer le compte' : 'Connexion Serveur')}
              </button>
              
              <div className="text-center mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-[10px] text-slate-500 hover:text-blue-600 uppercase tracking-widest font-bold"
                >
                  {isRegistering ? 'Déjà un compte ? Se connecter' : 'Créer un nouveau compte local'}
                </button>
              </div>
            </form>
          ) : (
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-200 text-slate-900 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:border-slate-400 transition-all flex items-center justify-center gap-4 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="currentColor" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                </svg>
                <span>Google SSO Access</span>
              </>
            )}
          </button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-slate-300 italic">Ou explorez</span></div>
          </div>

          <button 
            onClick={onMarketplace}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-4 shadow-xl"
          >
            <ArrowLeft size={18} />
            <span>Retourner au Marketplace</span>
          </button>
        </div>
      </div>
    </div>
  );
}

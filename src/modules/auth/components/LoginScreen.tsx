import React, { useState, useEffect } from 'react';
import { AlertCircle, Key, User, ArrowLeft } from 'lucide-react';
import { NexusLogo } from '../../../components/NexusLogo';
import { useLogin } from '../hooks/useLogin';

export function LoginScreen({ onMarketplace }: { onMarketplace: () => void }) {
  const { login, loginWithGoogle, registerDemo, loading, error: authError, loginMode, setLoginMode, checkHealth } = useLogin();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(email, password);
    
    if (!success) {
      if (email.trim().toLowerCase() === 'demonstration@nexus.com') {
        // Create the demo user on the fly if it doesn't exist
        const registered = await registerDemo(email, password);
        if (registered) {
           await login(email, password);
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans relative">
      <div className="max-w-md w-full bg-white rounded-3xl p-12 shadow-xl border border-slate-200 relative overflow-hidden">
        
        <div className="flex flex-col items-center gap-4 mb-8 justify-center">
          <NexusLogo className="w-16 h-16" />
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Nexus<span className="text-blue-600">ERP</span></h1>
        </div>

        <div className="space-y-6">
          {authError && (
            <div className="p-4 bg-red-50 text-red-700 text-[11px] font-bold rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span className="leading-tight">{authError}</span>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <button onClick={() => setLoginMode('email')} className={`flex-1 text-[10px] font-black uppercase tracking-[0.2em] py-3 rounded-xl border-2 transition-all ${loginMode === 'email' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-900'}`}>Standard</button>
            <button onClick={() => setLoginMode('google')} className={`flex-1 text-[10px] font-black uppercase tracking-[0.2em] py-3 rounded-xl border-2 transition-all ${loginMode === 'google' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-900'}`}>Google</button>
          </div>

          {loginMode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Identifiant Local</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 outline-none transition-all text-slate-900" placeholder="votre@email.com" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clé d'Accès</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 outline-none transition-all text-slate-900" placeholder="••••••••" />
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] text-slate-500 flex justify-between font-medium">
                  <span>Demo: <span className="font-mono text-slate-900 font-bold">demonstration@nexus.com</span></span>
                  <span>Clé: <span className="font-mono text-slate-900 font-bold">nexus2026</span></span>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-lg shadow-slate-900/10 disabled:opacity-50 mt-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Connexion'}
              </button>
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
                <span>Google SSO</span>
              </>
            )}
          </button>
          )}

          <button 
            onClick={onMarketplace}
            className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-4"
          >
            <ArrowLeft size={18} />
            <span>Marketplace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
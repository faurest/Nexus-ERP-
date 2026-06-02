import React, { useState, useEffect } from 'react';
import { Building2, ShieldAlert, AlertCircle, ChevronRight, Layers, Users, Plus, ArrowLeft, Building, Store, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { addDoc, collection, db, serverTimestamp } from '../../../lib/firebase';
import { useCompany } from '../../../lib/CompanyContext';

type User = any;

function SkeletonCard() {
  return (
    <div className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-2xl" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded" />
          <div className="h-3 w-16 bg-white/5 rounded" />
        </div>
      </div>
      <div className="w-4 h-4 bg-white/5 rounded" />
    </div>
  );
}

export function WorkspaceSelector({ companies, user, onSelect, onMarketplace, onLogout }: { companies: any[], user: User, onSelect: any, onMarketplace?: () => void, onLogout?: () => void }) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing');
  const { joinCompany, loading: companyLoading } = useCompany();

  const cleanEmail = user?.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
  const isMaster = cleanEmail === 'hackeurfaurest@gmail.com' || cleanEmail === 'dangafelicite@gmail.com' || cleanEmail === 'yaoubaboubakary43@gmail.com';
  
  const ownedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return c.ownerId === user?.uid || (cOwnerEmail && cOwnerEmail === cleanEmail);
  });
  const joinedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return c.ownerId !== user?.uid && cOwnerEmail !== cleanEmail;
  });

  useEffect(() => {
    import('../../../lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection().then((ok: boolean) => setConnStatus(ok ? 'ok' : 'fail'));
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newCompanyName.trim()) return;

    setSubmitting(true);
    try {
      // Logic for 6 uppercase letters/numbers join code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let generatedJoinCode = '';
      for (let i = 0; i < 6; i++) {
        generatedJoinCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const cleanEmail = user.email.trim().toLowerCase().replace(/\s+/g, '');
      const docRef = await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        ownerId: user.uid,
        ownerEmail: cleanEmail,
        memberEmails: [cleanEmail],
        employees: [user.uid],
        joinCode: generatedJoinCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create a personnel record for the owner so they show up in RH module
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'personnel', cleanEmail), {
        companyId: docRef.id,
        uid: user.uid,
        email: cleanEmail,
        name: user.displayName || cleanEmail.split('@')[0],
        role: 'owner',
        status: 'active',
        joinMethod: 'creation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onSelect({ id: docRef.id, name: newCompanyName, ownerId: user.uid, joinCode: generatedJoinCode });
    } catch(err: any) {
      console.error("Create Company Error:", err);
      setErrorMsg(`Erreur : ${err.message || 'Problème de connexion'}`);
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!joinCodeInput.trim()) return;
    
    setSubmitting(true);
    const result = await joinCompany(joinCodeInput);
    setSubmitting(false);

    if (result.success) {
      setSuccessMsg(result.message);
      // Wait a bit to show success before switching to selection mode
      setTimeout(() => {
        setMode('select');
        setSuccessMsg('');
        setJoinCodeInput('');
      }, 2000);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Background gradients for premium feel */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navigation */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center max-w-7xl mx-auto z-50">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black">
             N
           </div>
           <span className="text-white font-black tracking-widest text-xs uppercase opacity-80">NEXUS ERP</span>
        </div>
        <div className="flex items-center gap-4">
          {onMarketplace && (
            <button 
              onClick={onMarketplace}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-sans"
            >
              <Store size={14} /> Marketplace
            </button>
          )}
          {onLogout && (
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-300 transition-all font-sans"
            >
              <LogOut size={14} /> Quitter
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md w-full bg-slate-900/60 rounded-[2.5rem] p-10 shadow-2xl shadow-black/40 border border-white/10 relative overflow-hidden backdrop-blur-xl z-10">
        
        <div className="text-center mb-8 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center mb-6 text-white shadow-xl shadow-blue-500/20 rotate-3">
            <Building2 size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-white mb-2 italic">ESPACE NEXUS</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight">Accédez à votre intelligence industrielle.</p>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-red-100 flex items-center gap-3"
          >
            <ShieldAlert size={18} />
            {errorMsg}
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 text-green-600 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-green-100 flex items-center gap-3"
          >
            <AlertCircle size={18} />
            {successMsg}
          </motion.div>
        )}

        {mode === 'select' && (
          <div className="space-y-8 relative z-10">
            {/* Scénario A: Entreprises existantes */}
            {companyLoading ? (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synchronisation de vos accès...</h3>
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (ownedCompanies.length > 0 || joinedCompanies.length > 0) ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Mes Espaces de Travail</h3>
                  <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{ownedCompanies.length + joinedCompanies.length} actif(s)</span>
                </div>
                <div className="space-y-3">
                  {[...ownedCompanies, ...joinedCompanies].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-black/20 hover:border-blue-500/50 hover:bg-blue-600/10 transition-all group relative overflow-hidden active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-black text-white text-xl group-hover:bg-blue-600 transition-all shadow-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <span className="block font-black text-white text-base tracking-tight group-hover:text-blue-400 transition-colors">{c.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-[0.1em]">{c.joinCode}</span>
                            {c.ownerEmail === cleanEmail && (
                              <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-[0.1em]">Propriétaire</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-500 group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-4 border-2 border-dashed border-white/10 rounded-[2rem] bg-black/20">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto shadow-sm text-blue-400">
                  <Layers size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Bienvenue sur Nexus ERP</h3>
                  <p className="text-xs font-medium text-slate-400 mt-1 max-w-[220px] mx-auto">Vous n'êtes rattaché à aucun espace sécurisé pour le moment.</p>
                </div>
              </div>
            )}

            {/* Scénario B: Rejoindre ou Créer */}
            <div className="pt-4 space-y-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest"><span className="bg-slate-900 px-4 text-slate-400 italic">Actions d'Infrastructure</span></div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setMode('join')}
                  className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-[11px] uppercase tracking-widest hover:from-indigo-500 hover:to-indigo-400 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 border border-indigo-400/20 group"
                >
                  <Users size={18} className="group-hover:scale-110 transition-transform" />
                  Rejoindre un Espace 
                </button>
                <button
                  onClick={() => setMode('create')}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-transparent border border-white/10 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5 transition-all active:scale-95 group"
                >
                  <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                  Créer mon propre espace
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 relative z-10" 
            onSubmit={handleCreate}
          >
            <div>
              <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Nom de l'Entreprise</label>
              <input
                type="text"
                required
                placeholder="Ex: Nexus Corp"
                className="w-full p-4 border border-white/10 bg-black/20 text-white rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-sm font-medium outline-none placeholder:text-slate-600"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || newCompanyName.length < 3}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Building size={16} /> Créer l'Espace
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => { setMode('select'); setErrorMsg(''); }}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest mt-4 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} /> Retour à la sélection
            </button>
          </motion.form>
        )}

        {mode === 'join' && (
          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 relative z-10" 
            onSubmit={handleJoin}
          >
            <div>
              <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Code d'accès Entreprise</label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="EX: JET7-2026"
                className="w-full p-6 border border-white/10 bg-black/40 text-white rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all text-center text-4xl font-mono font-black tracking-widest uppercase outline-none placeholder:text-slate-700 shadow-inner"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              />
              <p className="text-[10px] font-medium text-slate-400 mt-3 text-center">Saisissez le code fourni par l'administrateur de l'espace.</p>
            </div>
            <button
              type="submit"
              disabled={submitting || joinCodeInput.length < 5}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:from-indigo-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Users size={16} /> Rejoindre
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => { setMode('select'); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest mt-4 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} /> Retour à la sélection
            </button>
          </motion.form>
        )}

        {/* Dynamic Background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
      </div>
    </div>
  );
}

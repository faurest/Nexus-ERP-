import React, { useState, useEffect } from 'react';
import { Building2, ShieldAlert, AlertCircle, ChevronRight, Layers, Users, Plus, ArrowLeft, Building } from 'lucide-react';
import { motion } from 'motion/react';
import { addDoc, collection, db, serverTimestamp } from '../../../lib/firebase';
import { useCompany } from '../../../lib/CompanyContext';

type User = any;

function SkeletonCard() {
  return (
    <div className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-100 rounded" />
          <div className="h-3 w-16 bg-slate-50 rounded" />
        </div>
      </div>
      <div className="w-4 h-4 bg-slate-50 rounded" />
    </div>
  );
}

export function WorkspaceSelector({ companies, user, onSelect }: { companies: any[], user: User, onSelect: any }) {
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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans relative">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl border border-slate-200 relative overflow-hidden">
        
        <div className="text-center mb-8 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center mb-6 text-white shadow-xl shadow-blue-500/20 rotate-3">
            <Building2 size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-2 italic">ESPACE NEXUS</h2>
          <p className="text-slate-500 text-sm font-medium tracking-tight">Accédez à votre intelligence industrielle.</p>
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
                  <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{ownedCompanies.length + joinedCompanies.length} actif(s)</span>
                </div>
                <div className="space-y-3">
                  {[...ownedCompanies, ...joinedCompanies].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-600 hover:bg-blue-50/50 transition-all group relative overflow-hidden active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-900 text-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <span className="block font-black text-slate-900 text-base tracking-tight group-hover:text-blue-700 transition-colors">{c.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-[0.1em]">{c.joinCode}</span>
                            {c.ownerEmail === cleanEmail && (
                              <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-[0.1em]">Propriétaire</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-4 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-blue-500">
                  <Layers size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Bienvenue sur Nexus ERP</h3>
                  <p className="text-xs font-medium text-slate-400 mt-1 max-w-[220px] mx-auto">Vous n'êtes rattaché à aucun espace sécurisé pour le moment.</p>
                </div>
              </div>
            )}

            {/* Scénario B: Rejoindre ou Créer */}
            <div className="pt-4 space-y-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-slate-300 italic">Actions d'Infrastructure</span></div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setMode('join')}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Users size={16} />
                  Rejoindre avec un Code
                </button>
                <button
                  onClick={() => setMode('create')}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95"
                >
                  <Plus size={16} />
                  Initialiser un Nouvel Espace
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
              <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Nom de l'Entreprise</label>
              <input
                type="text"
                required
                placeholder="Ex: Nexus Corp"
                className="w-full p-4 border-2 border-slate-100 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-sm font-medium outline-none"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
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
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest mt-4 flex items-center justify-center gap-2"
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
              <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Code d'accès (6 caractères)</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="ABCDEF"
                className="w-full p-4 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all text-center text-2xl font-black tracking-[0.5em] uppercase outline-none"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
              />
              <p className="text-[10px] font-medium text-slate-400 mt-2 text-center">Demandez ce code à l'administrateur de l'espace.</p>
            </div>
            <button
              type="submit"
              disabled={submitting || joinCodeInput.length !== 6}
              className="w-full bg-indigo-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
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
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest mt-4 flex items-center justify-center gap-2"
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

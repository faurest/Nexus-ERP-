import React, { useState, useEffect, useMemo } from 'react';
import { Building2, ShieldAlert, AlertCircle, ChevronRight, Layers, Users, Plus, ArrowLeft, Building, Store, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { addDoc, collection, db, serverTimestamp } from '../../../lib/firebase';
import { useCompany } from '../../../lib/CompanyContext';
import { NexusLogo } from '../../../components/NexusLogo';
import Globe from '../../../components/Globe';
import { isMasterUser } from '../../../lib/auth';

type User = any;

function SkeletonCard() {
  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white animate-pulse">
      <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="h-3 w-24 bg-slate-100 rounded" />
      </div>
      <div className="w-10 h-3 bg-slate-100 rounded" />
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
  const isMaster = isMasterUser(user);
  
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

  const globeProps = useMemo(() => ({
    speed: 1.5,
    smoothing: 8,
    dots: { color: 'rgba(125, 170, 255, 0.55)', size: 3, density: 5, allDots: false },
    fill: 'dots' as const,
    scale: 6,
    stopOnHover: false,
    direction: 'left' as const,
    initialLatitude: 18,
    initialLongitude: -40,
    oceanColor: '#0a1020',
    outlineColor: 'rgba(148, 163, 184, 0.4)',
    showOutline: true,
    outlineWidth: 2,
    graticuleColor: 'rgba(148, 163, 184, 0.15)',
    showGrid: true,
    detail: 4,
    dragSpeed: 3,
  }), []);

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
      await setDoc(doc(db, 'personnel', `${docRef.id}_${cleanEmail}`), {
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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-slate-900 font-sans relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Globe {...globeProps} />
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950/80" />

      <div className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-2xl shadow-black/50 border border-white/50 relative overflow-hidden z-10">
        
        <div className="flex flex-col items-center gap-4 mb-8 justify-center">
          <NexusLogo className="w-16 h-16" />
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Nexus<span className="text-blue-600">ERP</span></h1>
            <p className="text-sm text-slate-500 font-medium mt-1.5">Sélectionnez votre espace de travail</p>
          </div>
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
          <div className="space-y-4 relative z-10">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('join')}
                className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-[10px] uppercase tracking-[0.18em] hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
              >
                <Users size={15} className="text-blue-500 group-hover:scale-110 transition-transform" />
                Rejoindre
              </button>
              <button
                onClick={() => setMode('create')}
                className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-[10px] uppercase tracking-[0.18em] hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
              >
                <Plus size={15} className="text-blue-600 group-hover:rotate-90 transition-transform" />
                Créer un espace
              </button>
            </div>

            {companyLoading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (ownedCompanies.length > 0 || joinedCompanies.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 mt-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Layers size={12} className="text-blue-500" /> Espaces de Travail
                  </h3>
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    {ownedCompanies.length + joinedCompanies.length} actif{ownedCompanies.length + joinedCompanies.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {[...ownedCompanies, ...joinedCompanies].map((c) => {
                    const isOwner = (c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '') || '') === cleanEmail;
                    return (
                      <button
                        key={c.id}
                        onClick={() => onSelect(c)}
                        className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all active:scale-[0.99] text-left"
                      >
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/25 group-hover:from-blue-700 group-hover:to-indigo-700 transition-all">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block font-bold text-slate-900 text-[15px] tracking-tight truncate group-hover:text-blue-600 transition-colors">{c.name}</span>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-widest font-mono">{c.joinCode}</span>
                            {isOwner ? (
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-widest">Propriétaire</span>
                            ) : (
                              <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-widest">Membre</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 shrink-0">
                          Entrer
                          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom de l'Entreprise</label>
              <input
                type="text"
                required
                placeholder="Ex: Nexus Corp"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-sm font-medium focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 outline-none transition-all text-slate-900"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || newCompanyName.length < 3}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-lg shadow-slate-900/10 disabled:opacity-50 mt-2"
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Code d'accès Entreprise</label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="EX: JET7-2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-6 px-4 focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all text-center text-3xl font-mono font-black tracking-widest uppercase outline-none text-slate-900 placeholder:text-slate-300"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || joinCodeInput.length < 5}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-lg shadow-slate-900/10 disabled:opacity-50 mt-2"
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

        {(onMarketplace || onLogout) && (
          <div className="mt-8 space-y-3 relative z-10 w-full pt-6 border-t border-slate-100">
            {onMarketplace && (
              <button 
                onClick={onMarketplace}
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
              >
                <Store size={16} />
                <span>Marketplace</span>
              </button>
            )}
            {onLogout && (
              <button 
                onClick={onLogout}
                className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-3"
              >
                <LogOut size={16} />
                <span>Quitter session</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

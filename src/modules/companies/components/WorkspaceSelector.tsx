import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { ShieldAlert, AlertCircle, ChevronRight, Layers, Users, Plus, ArrowLeft, Building, Store, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { addDoc, collection, db, serverTimestamp } from '../../../lib/firebase';
import { useCompany } from '../../../lib/CompanyContext';
import { NexusLogo } from '../../../components/NexusLogo';

const Globe = lazy(() => import('../../../components/Globe'));

type User = any;

function SkeletonCard() {
  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 animate-pulse">
      <div className="w-12 h-12 bg-slate-700/60 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-slate-700/50 rounded" />
        <div className="h-3 w-24 bg-slate-700/40 rounded" />
      </div>
      <div className="w-10 h-3 bg-slate-700/40 rounded" />
    </div>
  );
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('webgl2'))
    );
  } catch {
    return false;
  }
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

  const webglOk = useMemo(() => isWebGLAvailable(), []);

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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Fond animé (toujours visible, aucun WebGL requis) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/80 to-slate-900 animate-aurora" />
        <div className="absolute -top-48 -left-48 w-[40rem] h-[40rem] rounded-full bg-blue-600/25 blur-[130px] animate-orb-a" />
        <div className="absolute -bottom-48 -right-40 w-[36rem] h-[36rem] rounded-full bg-indigo-600/20 blur-[130px] animate-orb-b" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-cyan-400/15 blur-[110px] animate-orb-c" />
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(148,163,184,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.6)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.7)_100%)]" />
      </div>

      {/* Globe WebGL en amélioration progressive (chargé seulement si WebGL est dispo) */}
      {webglOk && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Suspense fallback={null}>
            <Globe {...globeProps} />
          </Suspense>
        </div>
      )}

      <div className="max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 border border-white/10 bg-slate-950/50 backdrop-blur-2xl relative z-10 max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-hide">

        <div className="flex flex-col items-center gap-4 mb-8 justify-center">
          <NexusLogo className="w-16 h-16" />
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-white">Nexus<span className="text-blue-400">ERP</span></h1>
            <p className="text-sm text-slate-400 font-medium mt-1.5">Sélectionnez votre espace de travail</p>
          </div>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 text-red-300 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-red-500/20 flex items-center gap-3"
          >
            <ShieldAlert size={18} />
            {errorMsg}
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-500/10 text-emerald-300 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-emerald-500/20 flex items-center gap-3"
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
                className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-slate-200 font-black text-[10px] uppercase tracking-[0.18em] hover:border-blue-400/60 hover:text-white hover:bg-blue-500/10 transition-all active:scale-95"
              >
                <Users size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                Rejoindre
              </button>
              <button
                onClick={() => setMode('create')}
                className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-slate-200 font-black text-[10px] uppercase tracking-[0.18em] hover:border-blue-400/60 hover:text-white hover:bg-blue-500/10 transition-all active:scale-95"
              >
                <Plus size={15} className="text-blue-400 group-hover:rotate-90 transition-transform" />
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
                    <Layers size={12} className="text-blue-400" /> Espaces de Travail
                  </h3>
                  <span className="text-[9px] font-black text-blue-300 bg-blue-500/15 px-2.5 py-1 rounded-full border border-blue-400/20">
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
                        className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-blue-400/60 hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all active:scale-[0.99] text-left"
                      >
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30 group-hover:from-blue-600 group-hover:to-indigo-600 transition-all">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block font-bold text-white text-[15px] tracking-tight truncate group-hover:text-blue-300 transition-colors">{c.name}</span>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-black text-slate-300 bg-white/10 px-2 py-0.5 rounded-md uppercase tracking-widest font-mono">{c.joinCode}</span>
                            {isOwner ? (
                              <span className="text-[9px] font-black text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md uppercase tracking-widest border border-indigo-400/20">Propriétaire</span>
                            ) : (
                              <span className="text-[9px] font-black text-slate-300 bg-white/10 px-2 py-0.5 rounded-md uppercase tracking-widest">Membre</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-400 shrink-0">
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
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm font-medium focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/10 outline-none transition-all text-white placeholder:text-slate-500"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || newCompanyName.length < 3}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-4 shadow-lg shadow-blue-600/25 disabled:opacity-50 mt-2"
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Code d'accès Entreprise</label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="EX: JET7-2026"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-4 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/10 transition-all text-center text-3xl font-mono font-black tracking-widest uppercase outline-none text-white placeholder:text-slate-600"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || joinCodeInput.length < 5}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-4 shadow-lg shadow-blue-600/25 disabled:opacity-50 mt-2"
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

        {(onMarketplace || onLogout) && (
          <div className="mt-8 space-y-3 relative z-10 w-full pt-6 border-t border-white/10">
            {onMarketplace && (
              <button
                onClick={onMarketplace}
                className="w-full bg-white/5 text-slate-300 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3"
              >
                <Store size={16} />
                <span>Marketplace</span>
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full bg-red-500/10 text-red-300 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3"
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

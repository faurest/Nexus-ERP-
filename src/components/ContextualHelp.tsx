import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Search, 
  ExternalLink,
  ChevronRight,
  Zap,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

export interface GuideStep {
  id: string;
  category: 'SALES' | 'LOGISTICS' | 'FINANCE' | 'STOCK';
  title: string;
  content: string;
  keywords: string[];
  order: number;
}

const FALLBACK_GUIDE: Record<string, Partial<GuideStep>> = {
  'ANNULATION': {
    title: 'Gestion des Annulations',
    content: "1. Appelez le client 3 fois à 5 min d'intervalle.\n2. Si pas de réponse, cochez 'Client Injoignable'.\n3. Prenez une photo de l'emplacement (si possible).\n4. Cliquez sur 'Confirmer l'échec'.\nLe client recevra automatiquement un message WhatsApp.",
    category: 'SALES'
  },
  'PAYMENT': {
    title: 'Vérification Paiement',
    content: "Pour Mobile Money (MoMo/Orange) : \n1. Attendez la notification 'Succès' sur l'ERP.\n2. Vérifiez le SMS de confirmation sur le téléphone de la boutique.\n3. Ne remettez JAMAIS le colis avant confirmation réelle.",
    category: 'FINANCE'
  },
  'STOCK': {
    title: 'Écart de Stock',
    content: "Si vous constatez un écart entre le dashboard et le rayon :\n1. Allez dans 'Inventaire'.\n2. Créez un 'Mouvement de Stock' de type 'Correction'.\n3. Notez la raison (ex: casse, erreur comptage).",
    category: 'STOCK'
  }
};

interface ContextualHelpProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: string;
}

export default function ContextualHelp({ isOpen, onClose, topic }: ContextualHelpProps) {
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSteps();
    }
  }, [isOpen]);

  const loadSteps = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'guide_steps'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuideStep));
      setSteps(data);
    } catch (err) {
      console.error("Error loading guide steps", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSteps = steps.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase())) ||
    s.content.toLowerCase().includes(search.toLowerCase())
  );

  const activeStep = topic ? (steps.find(s => s.id === topic) || FALLBACK_GUIDE[topic]) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest italic">Nexus Intelligence</h2>
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Centre d'Aide Opérationnel</p>
                  </div>
               </div>
               <button 
                 onClick={onClose}
                 className="p-2 hover:bg-white/10 rounded-xl transition-colors"
               >
                 <X size={20} />
               </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              {/* Contextual Topic Highlight */}
              {activeStep && (
                <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-600 text-white rounded-lg"><Zap size={16} /></div>
                      <h3 className="text-sm font-black uppercase text-blue-900">{activeStep.title}</h3>
                   </div>
                   <div className="text-xs font-bold text-blue-800 leading-relaxed whitespace-pre-wrap">
                      {activeStep.content}
                   </div>
                </div>
              )}

              {/* Search */}
              <div className="space-y-4">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Besoin d'aide ? Taper 'Naira', 'Stock'..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-[11px] font-black outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-900"
                    />
                 </div>
              </div>

              {/* Action Sheets / Guide Steps */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-2 italic">Fiches Actions</h4>
                 <div className="space-y-3">
                    {(search ? filteredSteps : steps).length > 0 ? (search ? filteredSteps : steps).map(step => (
                      <div 
                        key={step.id} 
                        className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
                      >
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className={cn("w-1.5 h-6 rounded-full",
                                 step.category === 'SALES' ? "bg-amber-500" :
                                 step.category === 'LOGISTICS' ? "bg-blue-500" :
                                 step.category === 'FINANCE' ? "bg-violet-500" : "bg-emerald-500"
                               )} />
                               <p className="text-[11px] font-black uppercase text-slate-900">{step.title}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                         </div>
                      </div>
                    )) : !loading && (
                      <div className="py-12 text-center opacity-30">
                        <HelpCircle size={40} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase">Aucun article trouvé</p>
                      </div>
                    )}
                    {loading && (
                      <div className="space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-14 bg-slate-50 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
               <button 
                 onClick={() => {
                   // Navigate to full guide in App
                   onClose();
                   window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: 'guide' }));
                 }}
                 className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-black transition-all"
               >
                 Consulter le Guide Complet <ExternalLink size={16} />
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Global Help Trigger Helper
export function HelpTrigger({ topic, className }: { topic: string, className?: string }) {
  return (
    <span 
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('OPEN_HELP', { detail: topic }));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('OPEN_HELP', { detail: topic }));
        }
      }}
      className={cn("p-1 text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center cursor-pointer", className)}
      title="Besoin d'aide ?"
    >
      <HelpCircle size={14} />
    </span>
  );
}

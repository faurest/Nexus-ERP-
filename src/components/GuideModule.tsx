import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  Smartphone, 
  Truck, 
  Package, 
  AlertTriangle, 
  Clock, 
  ShieldCheck,
  Zap,
  ArrowRight,
  ClipboardCheck,
  MessageSquare,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Target,
  Users,
  Wallet,
  X,
  Calculator
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface GuideStep {
  id: string;
  category: 'SALES' | 'LOGISTICS' | 'FINANCE' | 'STOCK';
  title: string;
  content: string;
  keywords: string[];
  order: number;
}

export default function GuideModule() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SALES' | 'LOGISTICS' | 'FINANCE' | 'STOCK'>('ALL');
  const [dbSteps, setDbSteps] = useState<GuideStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [score, setScore] = useState(0);

  const quizQuestions = [
    { q: "Qu'affiche le marketplace pour un produit en stock limité ?", a: ["Rupture", "Alerte Orange", "Stock Limité"], correct: 2 },
    { q: "Quelle action est obligatoire après avoir accepté une commande ?", a: ["Appeler le patron", "Vérifier le stock réel", "Supprimer le produit"], correct: 1 },
    { q: "Que faire si un client MoMo n'a pas reçu son push de validation ?", a: ["Lui donner le produit gratuitement", "Lui demander de taper son code secret manuellement", "Conseiller d'utiliser les espèces ou réessayer"], correct: 2 }
  ];

  useEffect(() => {
    const q = query(collection(db, 'guide_steps'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuideStep));
      setDbSteps(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const staticSections = [
    {
      id: 'ventes',
      category: 'SALES',
      title: 'Fiche #01 : Ventes Rapides',
      subtitle: 'Cible : Vendeurs',
      icon: Zap,
      color: 'amber',
      items: [
        { text: "Vérifiez la disponibilité réelle en rayon avant toute action.", icon: ClipboardCheck },
        { text: "Cliquez sur 'Accepter' pour réserver le stock immédiatement.", icon: CheckCircle2 },
        { text: "Le client reçoit un WhatsApp automatique de confirmation.", icon: MessageSquare }
      ]
    },
    {
      id: 'logistique',
      category: 'LOGISTICS',
      title: 'Fiche #02 : Logistique Maroua',
      subtitle: 'Cible : Livreurs',
      icon: Truck,
      color: 'blue',
      content: [
        { label: 'En route', desc: 'Passez le statut à "Livraison en cours" dès que le colis quitte l’entrepôt.', type: 'info' },
        { label: 'Échec Livraison', desc: 'Ne supprimez jamais. Sélectionnez un motif : "Client Injoignable" ou "Adresse Introuvable".', type: 'error' }
      ]
    },
    {
      id: 'finance',
      category: 'FINANCE',
      title: 'Fiche #03 : Encaissement FCFA/Naira',
      subtitle: 'Cible : Magasiniers/Vendeurs',
      icon: Wallet,
      color: 'emerald',
      items: [
        { text: "Utilisez le convertisseur intégré pour les clients Nigérians.", icon: Calculator },
        { text: "Encaisser via MoMo ? Attendez toujours le SMS de confirmation Nexus.", icon: Smartphone },
        { text: "Espèces : Remise en main propre contre validation QR-Code.", icon: ShieldCheck }
      ]
    }
  ];

  const filteredDbSteps = dbSteps.filter(s => 
    (activeCategory === 'ALL' || s.category === activeCategory) &&
    (s.title.toLowerCase().includes(search.toLowerCase()) || 
     s.content.toLowerCase().includes(search.toLowerCase()) ||
     s.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Search & Filter Header */}
      <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-6">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une procédure (ex: 'Naira', 'Echec', 'Stock')..."
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-5 pl-16 pr-6 text-sm font-black outline-none focus:bg-white focus:border-blue-600 transition-all shadow-inner"
            />
         </div>
         <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto w-full md:w-auto scrollbar-hide">
            {['ALL', 'SALES', 'LOGISTICS', 'FINANCE', 'STOCK'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                  activeCategory === cat ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {cat}
              </button>
            ))}
         </div>
      </div>

      {/* Hero Header */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                <BookOpen className="text-blue-400" size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Nexus Intelligence Unit</p>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase mt-1 leading-none">Guide de Performance</h1>
              </div>
            </div>
            <p className="max-w-xl text-slate-400 font-medium leading-relaxed text-lg italic">
              "La vitesse de réaction est notre plus grand atout à Maroua."
            </p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
               <p className="text-3xl font-black text-white italic">100%</p>
               <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Opérationnel</p>
            </div>
            <div className="text-center">
               <p className="text-3xl font-black text-blue-500 italic">OFF</p>
               <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Mode Offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Dynamic DB Articles */}
        {filteredDbSteps.map(step => (
          <article 
            key={step.id}
            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full"
          >
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", 
                    step.category === 'SALES' ? "bg-amber-50 text-amber-500" :
                    step.category === 'LOGISTICS' ? "bg-blue-50 text-blue-500" :
                    step.category === 'FINANCE' ? "bg-violet-50 text-violet-500" : "bg-emerald-50 text-emerald-500"
                  )}>
                    {step.category === 'SALES' ? <Zap size={24} /> :
                     step.category === 'LOGISTICS' ? <Truck size={24} /> :
                     step.category === 'FINANCE' ? <Wallet size={24} /> : <Package size={24} />}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase underline decoration-2 decoration-slate-100 underline-offset-8 decoration-dashed">{step.title}</h2>
                </div>
                <div className="px-3 py-1 bg-slate-50 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest">
                   nexus-art-{step.id.slice(0, 4)}
                </div>
             </div>
             <div className="flex-1 space-y-4">
               <div className="p-6 bg-slate-50/50 rounded-2xl border-2 border-slate-50 text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {step.content}
               </div>
             </div>
             <div className="mt-6 flex flex-wrap gap-2">
                {step.keywords?.map(k => (
                  <span key={k} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg">#{k}</span>
                ))}
             </div>
          </article>
        ))}

        {/* Fallback Static Sections if DB is empty or during filtering */}
        {(dbSteps.length === 0 || activeCategory !== 'ALL' || search) && staticSections.filter(s => activeCategory === 'ALL' || s.category === activeCategory).map(section => (
          <section key={section.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm", 
                section.color === 'amber' ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white" : 
                section.color === 'blue' ? "bg-blue-50 text-blue-500 group-hover:bg-blue-600 group-hover:text-white" :
                "bg-emerald-50 text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white"
              )}>
                <section.icon size={28} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">{section.title}</h2>
                {section.subtitle && <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 px-1 bg-blue-50 w-fit rounded leading-tight">{section.subtitle}</p>}
              </div>
            </div>
            <div className="space-y-4 flex-1">
              {section.items ? (
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-4 text-[11px] font-bold text-slate-500 bg-slate-50 p-5 rounded-2xl border border-slate-100 italic transition-all hover:bg-white hover:shadow-md">
                      <item.icon size={18} className="text-slate-400 shrink-0" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3">
                   {section.content?.map((c, i) => (
                     <div key={i} className={cn("p-5 rounded-3xl border transition-all hover:shadow-md", c.type === 'info' ? "bg-blue-50/50 border-blue-100" : "bg-red-50/50 border-red-100")}>
                        <p className={cn("text-[11px] font-black uppercase tracking-widest flex items-center gap-2", c.type === 'info' ? "text-blue-900" : "text-red-900")}>
                          {c.type === 'info' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {c.label}
                        </p>
                        <p className={cn("text-[10px] mt-2 font-medium italic leading-relaxed", c.type === 'info' ? "text-blue-700/80" : "text-red-700/80")}>{c.desc}</p>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Interactive Tool: Exchange Rate Simulator */}
      <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-xl font-black uppercase italic tracking-tight">Outil de Vente : Convertisseur Naira</h3>
               </div>
               <p className="text-slate-400 text-xs font-medium mb-8">
                 Calculez instantanément le prix pour nos clients transfrontaliers selon le taux NexusERP configuré.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Prix CFA</p>
                     <input 
                       type="number"
                       placeholder="Ex: 5000"
                       className="bg-transparent border-none text-2xl font-black w-full outline-none"
                       onChange={(e) => {
                         const val = Number(e.target.value);
                         const res = document.getElementById('naira-result');
                         if (res) res.innerText = (val * 0.012).toLocaleString() + ' ₦';
                       }}
                     />
                  </div>
                  <div className="p-6 bg-blue-600/20 rounded-2xl border border-blue-500/30">
                     <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-2">Equivalent Naira</p>
                     <p id="naira-result" className="text-2xl font-black text-blue-400">0 ₦</p>
                  </div>
               </div>
            </div>
            <div className="w-full md:w-1/3 p-8 bg-blue-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)]">
               <h4 className="text-lg font-black uppercase italic leading-tight mb-4">Rappel Sécurité</h4>
               <ul className="space-y-4">
                  {[
                    "Confirmations SMS obligatoires",
                    "Zéro crédit client autorisé",
                    "Validation terminale par QR-Code"
                  ].map(rule => (
                    <li key={rule} className="flex items-center gap-3">
                       <ShieldCheck size={18} className="text-blue-200" />
                       <span className="text-[11px] font-black uppercase text-white/90">{rule}</span>
                    </li>
                  ))}
               </ul>
            </div>
         </div>
      </div>

      {/* Quiz / Training Section */}
      <section className="bg-white border-4 border-slate-900 rounded-[3rem] p-12 text-center max-w-3xl mx-auto shadow-2xl relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
             Nexus Academy
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-4 tracking-tighter">Prêt pour le terrain ?</h2>
          <p className="text-slate-500 font-medium mb-10 max-w-md mx-auto">Validez vos connaissances logistiques pour devenir un employé certifié "Performance Nexus".</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                <Target className="text-blue-600 mb-3" size={24} />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Étape 01</p>
                <p className="text-xs font-black text-slate-900 mt-1">Quiz Livraison</p>
             </div>
             <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center opacity-40">
                <Users className="text-slate-400 mb-3" size={24} />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Étape 02</p>
                <p className="text-xs font-black text-slate-900 mt-1">Client Nexus</p>
             </div>
             <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center opacity-40">
                <ShieldCheck className="text-slate-400 mb-3" size={24} />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Étape 03</p>
                <p className="text-xs font-black text-slate-900 mt-1">Sécurité Data</p>
             </div>
          </div>
          <button 
            onClick={() => { setShowQuiz(true); setQuizStep(0); setScore(0); }}
            className="mt-12 px-12 py-5 bg-slate-900 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
          >
             Commencer la Certification
          </button>
      </section>

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                   <motion.div 
                     className="h-full bg-blue-600"
                     initial={{ width: 0 }}
                     animate={{ width: `${((quizStep + 1) / quizQuestions.length) * 100}%` }}
                   />
                </div>

                <div className="flex justify-between items-center mb-8 pt-4">
                   <div className="flex items-center gap-2">
                      <Target size={16} className="text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question {quizStep + 1}/{quizQuestions.length}</span>
                   </div>
                   <button onClick={() => setShowQuiz(false)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-8 leading-tight">{quizQuestions[quizStep].q}</h3>

                <div className="space-y-3">
                   {quizQuestions[quizStep].a.map((ans, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                           if (i === quizQuestions[quizStep].correct) setScore(s => s + 1);
                           if (quizStep < quizQuestions.length - 1) {
                              setQuizStep(s => s + 1);
                           } else {
                              setShowQuiz(false);
                              alert(`Certification Terminée ! Votre score : ${score + (i === quizQuestions[quizStep].correct ? 1 : 0)}/${quizQuestions.length}\nFélicitations ! Vous êtes prêt pour le terrain.`);
                           }
                        }}
                        className="w-full text-left p-6 rounded-2xl border border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all group"
                      >
                         <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700">{ans}</span>
                      </button>
                   ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Footer Support */}
      <div className="py-10 text-center space-y-4">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Besoin d'une formation personnalisée ?</p>
         <div className="flex justify-center gap-4">
            <button className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100">
               <Smartphone size={18} /> Support WhatsApp
            </button>
            <button className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest">
               <MessageSquare size={18} /> Chat Interne
            </button>
         </div>
      </div>
    </div>
  );
}


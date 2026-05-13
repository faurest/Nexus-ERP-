import React from 'react';
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
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function GuideModule() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Header */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
              <BookOpen className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Operational Excellence</p>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase">Guide d'Utilisation Nexus</h1>
            </div>
          </div>
          <p className="max-w-2xl text-slate-400 font-medium leading-relaxed">
            Ce guide est conçu pour nos équipes (vendeurs, magasiniers et livreurs) afin de transformer chaque commande en une réussite logistique à Maroua.
          </p>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Step 1: Reception */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
              <Zap size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">1. Réception Commande</h2>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Les commandes Marketplace apparaissent en <span className="font-black text-amber-600">"En attente"</span>.
            </p>
            <ul className="space-y-3">
              {[
                { text: "Vérifiez la disponibilité réelle en rayon avant toute action.", icon: ClipboardCheck },
                { text: "Cliquez sur 'Accepter' pour réserver le stock immédiatement.", icon: CheckCircle2 },
                { text: "Le client reçoit un WhatsApp automatique de confirmation.", icon: MessageSquare }
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-[11px] font-bold text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic transition-all hover:bg-white hover:shadow-md">
                  <item.icon size={16} className="text-slate-400 shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Step 2: Delivery */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Truck size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">2. Suivi & Livraison</h2>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Modes de livraison</h3>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[11px] font-black text-blue-900 uppercase">En route</p>
                  <p className="text-[10px] text-blue-700/70 mt-1 font-medium">Passez le statut à "Livraison en cours" dès que le colis quitte l'entrepôt.</p>
                </div>
                <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                  <p className="text-[11px] font-black text-red-900 uppercase">Échec Livraison</p>
                  <p className="text-[10px] text-red-700/70 mt-1 font-medium italic">Ne supprimez jamais. Sélectionnez un motif : "Client Injoignable" ou "Adresse Introuvable".</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Stock Management */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <Package size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">3. Stocks & Inventaire</h2>
          </div>
          <div className="space-y-4">
             <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-900 uppercase mb-2">💡 Astuce Performance</p>
                <p className="text-[11px] text-emerald-700 font-medium leading-tight italic">
                  "Un inventaire juste = Zéro annulation."
                  Prenez 5 minutes chaque matin pour vérifier les quantités en rayon.
                </p>
             </div>
             <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Motifs d'annulation Nexus</p>
                <div className="grid grid-cols-1 gap-2">
                   {['Erreur de manipulation stock', 'Produit défectueux', 'Prix obsolète'].map(m => (
                     <div key={m} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 border border-slate-100">
                        <ArrowRight size={12} className="text-slate-300" />
                        {m}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </section>

        {/* Step 4: Payments */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-500 group-hover:bg-violet-600 group-hover:text-white transition-all">
              <Smartphone size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">4. Paiements (MoMo/CASH)</h2>
          </div>
          <div className="space-y-4">
             <div className="space-y-3">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="p-2 bg-white rounded-lg shadow-sm"><Zap className="text-amber-500" size={16} /></div>
                   <div>
                     <p className="text-[10px] font-black text-slate-900 uppercase">Paiement Mobile</p>
                     <p className="text-[9px] text-slate-500 mt-0.5 font-bold">Attendez toujours le "Succès" sur le dashboard avant de remettre le colis.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="p-2 bg-white rounded-lg shadow-sm"><Truck className="text-blue-500" size={16} /></div>
                   <div>
                     <p className="text-[10px] font-black text-slate-900 uppercase">Paiement Cash Terrain</p>
                     <p className="text-[9px] text-slate-500 mt-0.5 font-bold">Le livreur doit cliquer sur "Paiement Reçu" dès l'encaissement réel.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-950 rounded-2xl text-white shadow-xl">
                   <div className="p-2 bg-blue-600 rounded-lg"><Smartphone size={16} /></div>
                   <div>
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Naira Mode (₦)</p>
                     <p className="text-[9px] text-slate-400 mt-0.5 font-medium italic">Utilisez le convertisseur intégré pour nos clients transfrontaliers.</p>
                   </div>
                </div>
             </div>
          </div>
        </section>
      </div>

      {/* KPI Section */}
      <div className="bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.3)]">
         <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-[80px] -ml-40 -mb-40" />
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
               <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-6 leading-tight">Nos indicateurs de réussite (KPI)</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Rapidité Validation", val: "Moins de 10 min", icon: Clock },
                    { label: "Annulations Stock", val: "Cible < 2%", icon: AlertTriangle },
                    { label: "Précision Notes", val: "100% des cas", icon: MessageSquare },
                    { label: "Satisfaction Client", val: "Nexus Preferred", icon: ShieldCheck }
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                       <kpi.icon className="text-blue-300 mb-3" size={20} />
                       <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest">{kpi.label}</p>
                       <p className="text-xl font-black mt-1">{kpi.val}</p>
                    </div>
                  ))}
               </div>
            </div>
            <div className="w-full md:w-1/3 bg-slate-900 rounded-[2.5rem] p-8 border border-white/10">
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 text-center">🛡️ Mode Offline Actif</p>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-2 h-12 bg-blue-500 rounded-full" />
                     <p className="text-[11px] font-bold text-slate-400 leading-tight">
                       Si la 4G coupe au marché, saisissez normalement.
                     </p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-2 h-12 bg-emerald-500 rounded-full" />
                     <p className="text-[11px] font-bold text-slate-400 leading-tight">
                       Nexus synchronise tout dès que le réseau revient.
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Driver Checklist Overlay */}
      <div className="bg-white border-2 border-slate-900 rounded-[2.5rem] p-8 max-w-lg mx-auto relative group overflow-hidden">
         <div className="absolute top-0 right-0 p-4">
            <Smartphone className="text-slate-200 group-hover:text-blue-500 transition-colors" size={40} />
         </div>
         <h3 className="text-xl font-black text-slate-900 uppercase mb-6 italic underline decoration-blue-600 decoration-4 underline-offset-8">Check-list Livreur Nexus</h3>
         <div className="space-y-4">
            {[
              "Vérification batterie téléphone (>50%)",
              "Scan du bon de livraison papier/digital",
              "Vérification du stock physique vs Commande",
              "Localisation GPS du quartier validée",
              "WhatsApp envoyé au client à Maroua"
            ].map((check, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer group/item">
                <input type="checkbox" className="w-6 h-6 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-600 cursor-pointer" />
                <span className="text-xs font-black uppercase text-slate-700 group-hover/item:text-blue-900">{check}</span>
              </div>
            ))}
         </div>
         <button 
           className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl"
         >
           <CheckCircle2 size={18} /> Télécharger Check-list (PDF)
         </button>
      </div>

      {/* Contact Admin */}
      <div className="flex flex-col items-center gap-4">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Un blocage technique ?</p>
         <button className="px-8 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:border-blue-600 transition-all shadow-sm">
            <AlertCircle className="text-blue-600" size={18} />
            Support Administrateur
         </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Activity, Printer, PenTool, LayoutDashboard, Search, Plus, Play, CheckCircle2, AlertCircle, ShoppingCart, User, Users, Tags, ArrowRight } from 'lucide-react';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import Table, { TableRow } from './ui/Table';

export default function PrestationsModule() {
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<'pos' | 'tracking' | 'catalog' | 'growth'>('pos');
  
  const [services, setServices] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (!currentCompany) return;
    
    const unsubs: any[] = [];
    
    const qServices = query(collection(db, 'services'), where('companyId', '==', currentCompany.id));
    unsubs.push(onSnapshot(qServices, (snap: any) => {
      setServices(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }));

    const qInterventions = query(collection(db, 'interventions'), where('companyId', '==', currentCompany.id));
    unsubs.push(onSnapshot(qInterventions, (snap: any) => {
      setInterventions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }));
    
    // Quick sales can be loaded from sales table where type is 'service'
    const qSales = query(collection(db, 'sales'), where('companyId', '==', currentCompany.id));
    unsubs.push(onSnapshot(qSales, (snap: any) => {
      setSales(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s:any) => s.type === 'service'));
    }));

    return () => unsubs.forEach(u => u());
  }, [currentCompany]);

  const handleCreateSale = async (serviceName: string, amountStr: string, qty: number) => {
    if (!currentCompany) return;
    await addDoc(collection(db, 'sales'), {
      companyId: currentCompany.id,
      itemName: serviceName,
      type: 'service',
      quantity: qty,
      amount: parseFloat(amountStr) * qty,
      date: Date.now(),
      status: 'paid'
    });
  };

  const handleCreateTask = async (e: React.FormEvent, type: string) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const client = (form.elements.namedItem('client') as HTMLInputElement).value;
    const desc = (form.elements.namedItem('desc') as HTMLInputElement).value;
    
    await addDoc(collection(db, 'interventions'), {
      companyId: currentCompany?.id,
      client: client,
      message: `[${type}] ${desc}`,
      status: 'pending',
      date: new Date().toISOString(),
      createdAt: Date.now()
    });
    form.reset();
  };

  const updateInterventionStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'interventions', id), { status });
  };

  if (!currentCompany) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 border-l-4 border-purple-600 pl-4 mb-2">Centre de Prestations</h2>
          <p className="text-slate-500 font-medium">Gestion du guichet, impressions, créations et formations.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button onClick={() => setActiveTab('pos')} className={cn("px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'pos' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200")}>
          <Printer size={16} /> Guichet / Rapide
        </button>
        <button onClick={() => setActiveTab('tracking')} className={cn("px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'tracking' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200")}>
          <PenTool size={16} /> Créations & Projets
        </button>
        <button onClick={() => setActiveTab('catalog')} className={cn("px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'catalog' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200")}>
          <LayoutDashboard size={16} /> Catalogue de Services
        </button>
        <button onClick={() => setActiveTab('growth')} className={cn("px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all whitespace-nowrap flex items-center gap-2 border border-amber-300", activeTab === 'growth' ? "bg-amber-100 text-amber-800 shadow-md" : "bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 uppercase text-xs")}>
          <Activity size={16} /> Opportunités Rentables
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === 'pos' && (
            <div className="bg-white border text-center border-slate-200 p-8 rounded-2xl shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Terminal de Vente Rapide</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {services.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleCreateSale(s.name, s.price, 1)}
                    className="flex flex-col items-center justify-center p-6 border-2 border-slate-100 hover:border-purple-200 rounded-2xl bg-slate-50 hover:bg-purple-50 transition-all active:scale-95"
                  >
                    <Plus size={24} className="text-purple-600 mb-2" />
                    <span className="font-bold text-slate-800 text-sm mb-1">{s.name}</span>
                    <span className="text-xs font-black text-purple-700">{s.price} F</span>
                  </button>
                ))}
                <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 hover:text-slate-600 transition-all">
                  <span className="font-bold text-sm">Autre Montant</span>
                </button>
              </div>

              <div className="mt-8 text-left border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Dernières ventes guichet</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sales.sort((a,b) => b.date - a.date).slice(0,10).map((sale, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm font-bold text-slate-700">{sale.itemName} <span className="text-slate-400">x{sale.quantity}</span></span>
                      <span className="font-mono text-sm text-green-700 font-bold">+{sale.amount} F</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                 <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><PenTool size={18} className="text-indigo-600" /> Lancer un Design</h3>
                    <form onSubmit={(e) => handleCreateTask(e, 'Design')} className="space-y-3">
                      <input name="client" placeholder="Nom du Client / Téléphone" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400" />
                      <input name="desc" placeholder="Ex: Logo restaurant + charte graphique" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400" />
                      <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm">Ajouter à la file d'attente</button>
                    </form>
                 </div>
                 <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><PenTool size={18} className="text-teal-600" /> Lancer une Correction</h3>
                    <form onSubmit={(e) => handleCreateTask(e, 'Saisie')} className="space-y-3">
                      <input name="client" placeholder="Nom de l'étudiant / Client" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400" />
                      <input name="desc" placeholder="Ex: Rapport de stage de 50 pages" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400" />
                      <button className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl text-sm">Ajouter à la file</button>
                    </form>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Projets & Saisies en cours</h3>
                </div>
                <Table>
                  <thead>
                    <tr>
                      <th className="pb-4 pt-2 px-4 text-left font-bold text-slate-400 text-xs uppercase">Client</th>
                      <th className="pb-4 pt-2 px-4 text-left font-bold text-slate-400 text-xs uppercase">Description</th>
                      <th className="pb-4 pt-2 px-4 text-left font-bold text-slate-400 text-xs uppercase">Statut</th>
                      <th className="pb-4 pt-2 px-4 text-right font-bold text-slate-400 text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interventions.filter(i => i.status !== 'completed').map(i => (
                      <TableRow key={i.id}>
                        <div className="py-2"><span className="font-bold text-slate-800">{i.client}</span></div>
                        <div className="py-2 text-sm text-slate-600">{i.message}</div>
                        <div className="py-2">
                          <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                            i.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {i.status === 'pending' ? 'En attente' : 'En progression'}
                          </span>
                        </div>
                        <div className="py-2 flex justify-end gap-2">
                          {i.status === 'pending' && <button onClick={() => updateInterventionStatus(i.id, 'in_progress')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Play size={16} /></button>}
                          <button onClick={() => updateInterventionStatus(i.id, 'completed')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle2 size={16} /></button>
                        </div>
                      </TableRow>
                    ))}
                    {interventions.filter(i => i.status !== 'completed').length === 0 && (
                       <tr><td colSpan={4} className="p-6 text-center text-slate-400">Aucun projet en attente.</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Catalogue des offres</h3>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-bold"><Plus size={16} /> Ajouter</button>
              </div>
              <div className="grid gap-4">
                {services.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-800">{s.name}</h4>
                      <p className="text-xs text-slate-500">{s.description}</p>
                    </div>
                    <div className="font-mono text-lg font-black text-slate-900">{s.price} F</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-8 rounded-2xl shadow-sm">
                <h3 className="text-2xl font-black text-amber-900 mb-2">Pistes de Monétisation (ZEN CONCEPT)</h3>
                <p className="text-amber-700 mb-6 font-medium">Pour augmenter le revenu récurrent de votre établissement de services informatiques, voici des recommandations et outils à activer directement dans le système :</p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-white/60 p-5 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Tags size={20} /></div>
                      <h4 className="font-bold text-amber-900">Forfaits Étudiants</h4>
                    </div>
                    <p className="text-sm text-amber-800/80 mb-3">Vendez des cartes ou comptes prépayés "100 pages" pour fideliser les étudiants. L'argent rentre en avance.</p>
                    <button className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:text-amber-900">Créer un Forfait <ArrowRight size={14}/></button>
                  </div>
                  <div className="bg-white/60 p-5 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Users size={20} /></div>
                      <h4 className="font-bold text-orange-900">Cohortes de Formations</h4>
                    </div>
                    <p className="text-sm text-orange-800/80 mb-3">Organisez des formations groupées (Bureautique, Photoshop). 10 étudiants à 25.000 F = 250.000 F.</p>
                    <button className="text-xs font-bold text-orange-700 flex items-center gap-1 hover:text-orange-900">Planifier Session <ArrowRight size={14}/></button>
                  </div>
                  <div className="bg-white/60 p-5 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ShoppingCart size={20} /></div>
                      <h4 className="font-bold text-red-900">Upsell Automatique</h4>
                    </div>
                    <p className="text-sm text-red-800/80 mb-3">Lors d'une impression, proposez automatiquement la reliure, ou la plastification. Ajoutez ces services avec +10% de marge.</p>
                  </div>
                  <div className="bg-white/60 p-5 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Activity size={20} /></div>
                      <h4 className="font-bold text-purple-900">Partenariats B2B (Ecoles)</h4>
                    </div>
                    <p className="text-sm text-purple-800/80 mb-3">Passez des contrats directs avec les écoles locales pour imprimer leurs examens et livrets.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / KPIS */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Activity size={100} />
             </div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Aujourd'hui</h3>
             <div className="space-y-4 relative z-10">
               <div>
                 <p className="text-slate-400 text-sm">Ventes Guichet</p>
                 <p className="text-3xl font-black">{sales.reduce((acc, curr) => acc + (curr.amount || 0), 0)} F</p>
               </div>
               <div className="pt-4 border-t border-slate-700">
                 <p className="text-slate-400 text-sm">Travaux en attente</p>
                 <p className="text-xl font-bold flex items-center gap-2">
                    {interventions.filter(i => i.status !== 'completed').length} Dossiers
                 </p>
               </div>
             </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900">
            <h4 className="font-bold mb-2 flex items-center gap-2"><AlertCircle size={18}/> Astuce</h4>
            <p className="text-sm opacity-80 leading-relaxed">
              Le service "Terminal de Vente" (Guichet) permet de fluidifier la prise de commande pour la monnaie et les photocopies rapides sans passer par une facture longue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

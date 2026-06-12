import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Activity, Printer, PenTool, LayoutDashboard, Search, Plus, Play, CheckCircle2, AlertCircle, ShoppingCart, User, Users, Tags, ArrowRight, Trash2 } from 'lucide-react';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import { useSubNavigation } from '../hooks/useSubNavigation';
import Table, { TableRow } from './ui/Table';

export default function PrestationsModule() {
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useSubNavigation<'pos' | 'tracking' | 'catalog' | 'growth'>('services', 'pos');
  const [submitting, setSubmitting] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', description: '', image: '' });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // AI Growth States
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  const generateAI = async (type: 'product_doc' | 'seo' | 'marketing', context: any) => {
    setAiGenerating(true);
    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context })
      });
      if (!resp.ok) throw new Error('AI Engine failed');
      const data = await resp.json();
      setAiSuggestion(data);
      
      // Auto-apply if it's product_doc and we're editing
      if (type === 'product_doc') {
        setServiceForm(prev => ({
          ...prev,
          description: data.longDescription || prev.description
        }));
      }
      return data;
    } catch (err) {
      console.error(err);
      alert("Nexus AI indisponible temporairement.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("L'image est trop volumineuse (max 800 Ko).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setServiceForm(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };
  
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
    if (!currentCompany || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'sales'), {
        companyId: currentCompany.id,
        itemName: serviceName,
        type: 'service',
        quantity: qty,
        amount: parseFloat(amountStr) * qty,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: 'paid'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent, type: string) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;
    
    setSubmitting(true);
    try {
      const form = e.target as HTMLFormElement;
      const client = (form.elements.namedItem('client') as HTMLInputElement).value;
      const desc = (form.elements.namedItem('desc') as HTMLInputElement).value;
      
      await addDoc(collection(db, 'interventions'), {
        companyId: currentCompany?.id,
        client: client,
        message: `[${type}] ${desc}`,
        status: 'pending',
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      form.reset();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateInterventionStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'interventions', id), { 
      status,
      updatedAt: serverTimestamp()
    });
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;
    setSubmitting(true);
    try {
       await addDoc(collection(db, 'services'), {
         companyId: currentCompany.id,
         name: serviceForm.name,
         price: serviceForm.price,
         description: serviceForm.description,
         image: serviceForm.image || null,
         createdAt: serverTimestamp()
       });
       setIsAddingService(false);
       setServiceForm({ name: '', price: '', description: '', image: '' });
       setImagePreview(null);
       alert('Service ajouté avec succès.');
    } catch (err: any) {
       alert("Erreur lors de l'ajout du service : " + (err.message || String(err)));
       console.error(err);
    } finally {
       setSubmitting(false);
    }
  };

  if (!currentCompany) return null;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Services</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Gérez vos guichets, créations graphiques et processus de formation.
            </p>
          </div>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/10 shrink-0 gap-1 overflow-x-auto scrollbar-hide max-w-full">
             {[
               { id: 'pos', label: 'Guichet', icon: Printer },
               { id: 'tracking', label: 'Projets', icon: PenTool },
               { id: 'catalog', label: 'Catalogue', icon: LayoutDashboard },
               { id: 'growth', label: 'Analyse', icon: Activity }
             ].map(item => (
               <button 
                 key={item.id}
                 onClick={() => setActiveTab(item.id as any)}
                 className={cn(
                   "px-6 py-2.5 rounded-lg text-[10px] uppercase font-black tracking-[0.1em] transition-all whitespace-nowrap flex items-center gap-2", 
                   activeTab === item.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                 )}
               >
                 <item.icon size={14} />
                 {item.label}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {isAddingService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Tags size={24} className="text-purple-600" />
              Nouveau Service
            </h3>
            <form onSubmit={handleAddService} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom du service</label>
                <input 
                  type="text" 
                  value={serviceForm.name}
                  onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-purple-400 text-slate-900"
                  placeholder="Ex: Impression Couleur"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prix de vente (F)</label>
                <input 
                  type="number" 
                  value={serviceForm.price}
                  onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-purple-400 font-mono text-slate-900"
                  placeholder="Ex: 50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Description courte</label>
                   <button 
                    type="button"
                    onClick={() => generateAI('product_doc', serviceForm)}
                    disabled={aiGenerating}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    {aiGenerating ? <Activity size={10} className="animate-spin" /> : <PenTool size={10} />}
                    Magie IA
                  </button>
                </div>
                <input 
                  type="text" 
                  value={serviceForm.description}
                  onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-purple-400 text-slate-900"
                  placeholder="Ex: Par page A4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Image / Logo (Depuis Mobile)</label>
                <div className="relative h-24">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden" 
                    id="service-image-upload"
                  />
                  <label 
                    htmlFor="service-image-upload"
                    className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all overflow-hidden"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} className="h-full w-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Plus size={20} className="text-slate-300 mb-1" />
                        <span className="text-[8px] font-black text-slate-400 uppercase">Choisir une image</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsAddingService(false)}
                  className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-purple-200 disabled:opacity-50"
                >
                  {submitting ? 'Création...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'pos' && (
            <div className="bg-white border text-center border-slate-200 p-8 rounded-2xl shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Terminal de Vente Rapide</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {services.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleCreateSale(s.name, s.price, 1)}
                    disabled={submitting}
                    className="flex flex-col items-center justify-center p-6 border-2 border-slate-100 hover:border-purple-200 rounded-2xl bg-slate-50 hover:bg-purple-50 transition-all active:scale-95 disabled:opacity-50"
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
                      <input name="client" placeholder="Nom du Client / Téléphone" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 text-slate-900" />
                      <input name="desc" placeholder="Ex: Logo restaurant + charte graphique" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 text-slate-900" />
                      <button 
                        disabled={submitting}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm disabled:opacity-50"
                      >
                        {submitting ? 'Enregistrement...' : "Ajouter à la file d'attente"}
                      </button>
                    </form>
                 </div>
                 <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><PenTool size={18} className="text-teal-600" /> Lancer une Correction</h3>
                    <form onSubmit={(e) => handleCreateTask(e, 'Saisie')} className="space-y-3">
                      <input name="client" placeholder="Nom de l'étudiant / Client" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 text-slate-900" />
                      <input name="desc" placeholder="Ex: Rapport de stage de 50 pages" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 text-slate-900" />
                      <button 
                        disabled={submitting}
                        className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl text-sm disabled:opacity-50"
                      >
                        {submitting ? 'Enregistrement...' : 'Ajouter à la file'}
                      </button>
                    </form>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Projets & Saisies en cours</h3>
                </div>
                <Table headers={['Client', 'Description', 'Statut', 'Actions']}>
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
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Catalogue des offres</h3>
                <button 
                  onClick={() => setIsAddingService(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  <Plus size={16} /> Ajouter
                </button>
              </div>
              <div className="grid gap-4">
                {services.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-slate-50 group">
                    <div className="flex items-center gap-4">
                      {s.image && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                          <img src={s.image} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-800">{s.name}</h4>
                        <p className="text-xs text-slate-500">{s.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="font-mono text-lg font-black text-slate-900">{s.price} F</div>
                      <button 
                         onClick={async () => {
                           if(confirm('Supprimer ce service ?')) {
                             await deleteDoc(doc(db, 'services', s.id));
                           }
                         }}
                         className="p-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm italic">Aucun service enregistré dans le catalogue.</p>
                  </div>
                )}
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

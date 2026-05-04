import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Plus, Search, Package, ShieldCheck, AlertTriangle, ArrowRightLeft, Edit2, Trash2 } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';
import { createNotification } from '../lib/notifications';

interface Resource {
  id: string;
  name: string;
  type: 'Stock' | 'Material' | 'Software' | 'Human';
  quantity: number;
  status: 'Available' | 'Low' | 'Out' | 'Assigned' | 'Maintenance';
  location: string;
  condition?: string;     // état
  duration?: string;      // durée
  warranty?: string;      // garantie
  price?: number;
}

export default function ResourceModule() {
  const { currentCompany } = useCompany();
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous les actifs');
  const [isAdding, setIsAdding] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<any>({ type: 'Stock', quantity: 0, status: 'Available', condition: '', duration: '', warranty: '', price: 0 });

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(collection(db, 'resources'), where('companyId', '==', currentCompany.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
      setResources(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resources');
    });
    return unsubscribe;
  }, [currentCompany]);

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !formData.name) return;
    try {
      const newQuantity = Number(formData.quantity);
      if (editingResource) {
        await updateDoc(doc(db, 'resources', editingResource.id), {
          ...formData,
          quantity: newQuantity
        });
      } else {
        await addDoc(collection(db, 'resources'), {
          ...formData,
          quantity: newQuantity,
          companyId: currentCompany.id,
          createdAt: serverTimestamp()
        });
      }

      if (newQuantity < 10) {
        // Find owner or managers to notify. We'll simply notify the owner and anyone with dashboard access, 
        // to simplify we notify all current employees, or just the current user testing it.
        // Let's notify owner + employees.
        const recipients = [...(currentCompany.employees || [])];
        if (currentCompany.ownerId && !recipients.includes(currentCompany.ownerId)) recipients.push(currentCompany.ownerId);

        await createNotification(
          currentCompany.id,
          recipients,
          'Alerte de Stock Faible',
          `Le niveau de stock pour "${formData.name}" est faible (${newQuantity} restants).`,
          'alert'
        );
      }

      setIsAdding(false);
      setEditingResource(null);
      setFormData({ type: 'Stock', quantity: 0, status: 'Available', condition: '', duration: '', warranty: '', price: 0 });
    } catch(err) {
      handleFirestoreError(err, editingResource ? OperationType.UPDATE : OperationType.WRITE, 'resources');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Voulez-vous supprimer cet actif ?')) return;
    try {
      await deleteDoc(doc(db, 'resources', id));
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, 'resources');
    }
  };

  const filteredResources = resources.filter(res => 
    (res.name && res.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (res.location && res.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Ressources & Matériel</h2>
          <p className="text-slate-500 text-xs sm:text-sm text-balance">Gestion des actifs, stocks et équipement de l'entreprise.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Action de mouvement de stock en cours de liaison")} className="flex-1 sm:flex-none justify-center bg-white border border-slate-200 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <ArrowRightLeft size={16} /> Mouvement
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus size={16} /> Nouvel Actif
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Tous les actifs', 'Stock Consommable', 'Matériel Bureautique', 'Logiciel', 'Ressource Humaine', 'Véhicules'].map((filter) => (
          <button 
            key={filter} 
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
              activeFilter === filter ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-3 shadow-sm focus-within:border-blue-400 transition-all mb-6">
            <div className="pl-3">
              <Search className="text-slate-400" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Rechercher par nom, type ou emplacement..." 
              className="flex-1 bg-transparent py-2.5 outline-none text-sm text-slate-900 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Table headers={['Identifiant Actif', 'Type / Catégorie', 'Qté / Stock', 'Emplacement', 'État', 'Actions']}>
            {filteredResources.map((res) => (
              <TableRow key={res.id}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded flex items-center justify-center">
                    <Package size={14} className="text-slate-400" />
                  </div>
                  <span className="font-bold text-slate-900">{res.name}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2.5 py-1 rounded">
                  {res.type}
                </span>
                <span className={cn(
                  "font-bold",
                  res.quantity < 10 ? "text-red-500" : "text-slate-900"
                )}>
                  {res.quantity}
                </span>
                <span className="text-slate-500 font-medium">{res.location}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full ring-4 ring-opacity-20",
                    res.status === 'Available' ? "bg-green-500 ring-green-500" :
                    res.status === 'Low' ? "bg-amber-500 ring-amber-500" :
                    res.status === 'Assigned' ? "bg-blue-500 ring-blue-500" :
                    res.status === 'Maintenance' ? "bg-purple-500 ring-purple-500" :
                    "bg-red-500 ring-red-500"
                  )} />
                  <span className="text-[10px] uppercase font-bold text-slate-700 tracking-tight">
                    {res.status === 'Available' ? 'Dispo.' : 
                     res.status === 'Low' ? 'Stock Bas' : 
                     res.status === 'Assigned' ? 'Assigné' :
                     res.status === 'Maintenance' ? 'Maintenance' :
                     'Rupture'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewingResource(res)} className="p-1 text-slate-400 hover:text-green-600"><Search size={14}/></button>
                  <button onClick={() => { setEditingResource(res); setFormData(res); setIsAdding(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                  <button onClick={() => handleDeleteResource(res.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              </TableRow>
            ))}
          </Table>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-900/10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-400" />
              État Global
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>Disponibilité</span>
                  <span className="text-white">92%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[92%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>Taux de Rupture</span>
                  <span className="text-white">4%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[4%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-amber-800">
              <AlertTriangle size={18} />
              Alertes Stock
            </h3>
            <div className="space-y-2.5">
              <div className="p-3 bg-white border border-amber-200/50 rounded-lg flex justify-between items-center shadow-sm">
                <span className="text-xs font-bold text-slate-700">Papier A4 Premium</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded">2 UNITÉS</span>
              </div>
              <div className="p-3 bg-white border border-amber-200/50 rounded-lg flex justify-between items-center shadow-sm">
                <span className="text-xs font-bold text-slate-700">Toner HP Noir</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-600 rounded">5 UNITÉS</span>
              </div>
            </div>
            <button onClick={() => alert("Alerte de réapprovisionnement envoyée au gestionnaire.")} className="w-full text-[10px] font-bold uppercase tracking-widest text-amber-800 hover:text-amber-900 transition-colors">Réapprovisionner</button>
          </div>
        </div>
      </div>
      {viewingResource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl border border-indigo-100">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-none">{viewingResource.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">{viewingResource.type}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Emplacement</span>
                  <span className="text-sm font-bold text-slate-900">{viewingResource.location}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Disponibilité</span>
                  <span className="text-sm font-bold text-slate-900">{viewingResource.status}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Quantité / Heures</span>
                  <span className="text-sm font-bold text-slate-900">{viewingResource.quantity}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">État</span>
                  <span className="text-sm font-bold text-slate-900">{viewingResource.condition || 'Non renseigné'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Durée Prévue</span>
                  <span className="text-sm font-bold text-slate-900">{viewingResource.duration || 'Non renseignée'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Garantie</span>
                  <span className="text-sm font-bold text-slate-900">{viewingResource.warranty || 'Non renseignée'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Prix Unitaire</span>
                  <span className="text-sm font-bold text-slate-900">{viewingResource.price ? `${viewingResource.price} FCFA` : 'Non renseigné'}</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setViewingResource(null)} 
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
           <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
             <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
               <Package size={24} className="text-blue-600" />
               {editingResource ? 'Modifier l\'actif' : 'Nouvel Actif'}
             </h3>
             <form onSubmit={handleSaveResource} className="space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom de l'actif</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required/>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Catégorie</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="Stock">Stock Consommable</option>
                      <option value="Material">Matériel / Équipement</option>
                      <option value="Software">Abonnement / Logiciel</option>
                      <option value="Human">Ressource Humaine / Externe</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Emplacement / Affectation</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} required/>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Quantité / Heures</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.quantity || 0} onChange={e => setFormData({...formData, quantity: e.target.value})} required/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Statut / Disponibilité</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Available">Disponible</option>
                      <option value="Assigned">Assigné</option>
                      <option value="Maintenance">En Maintenance</option>
                      <option value="Low">Bas (Quantité faible)</option>
                      <option value="Out">Rupture / Indisponible</option>
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">État</label>
                    <input type="text" placeholder="Neuf, Usagé..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.condition || ''} onChange={e => setFormData({...formData, condition: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Durée (Mois/Jours)</label>
                    <input type="text" placeholder="Ex: 24 mois" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Garantie</label>
                    <input type="text" placeholder="Ex: 1 an" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.warranty || ''} onChange={e => setFormData({...formData, warranty: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prix Unitaire (FCFA)</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-8">
                 <button type="button" onClick={() => { setIsAdding(false); setEditingResource(null); setFormData({ type: 'Stock', quantity: 0, status: 'Available', condition: '', duration: '', warranty: '', price: 0 }); }} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                 <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono">{editingResource ? 'Mettre à jour' : 'Enregistrer'}</button>
               </div>
             </form>
           </div>
         </div>
      )}
    </div>
  );
}


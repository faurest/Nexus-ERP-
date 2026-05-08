import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, where, doc, updateDoc, deleteDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Plus, Search, Filter, Phone, Mail, Award, TrendingUp, UserPlus, Edit2, Trash2 } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  interactions?: string;
  salesTotal: number;
  loyaltyPoints: number;
}

export default function ClientModule() {
  const { currentCompany } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '', interactions: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(collection(db, 'clients'), where('companyId', '==', currentCompany.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return unsubscribe;
  }, [currentCompany]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;
    setSubmitting(true);
    try {
      const normalizedClient = {
        ...newClient,
        email: newClient.email.trim().toLowerCase()
      };
      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), {
          ...normalizedClient,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'clients'), {
          ...normalizedClient,
          companyId: currentCompany.id,
          salesTotal: 0,
          loyaltyPoints: 0,
          createdAt: serverTimestamp(),
        });
      }
      setNewClient({ name: '', email: '', phone: '', address: '', interactions: '' });
      setIsAdding(false);
      setEditingClient(null);
    } catch (error) {
      handleFirestoreError(error, editingClient ? OperationType.UPDATE : OperationType.CREATE, 'clients');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clients');
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Clients</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Gérez votre portefeuille de partenaires et optimisez la valeur de votre clientèle.
            </p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10 shrink-0"
          >
            <Plus size={18} />
            Nouveau Partenaire
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-2 flex items-center gap-3 shadow-xl shadow-slate-200/50 focus-within:border-blue-400 transition-all">
            <div className="pl-4">
              <Search className="text-slate-300" size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Scanner la base de données clients..." 
              className="flex-1 bg-transparent py-4 outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button onClick={() => alert("Indexation granulée...")} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-400 shadow-sm mr-1">
              <Filter size={18} />
            </button>
          </div>

          <Table headers={['Client', 'Contact', 'Fidélité', 'Volume Ventes', 'Actions']}>
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">{client.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">REF-{client.id.slice(0, 5)}</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail size={12} className="text-slate-400" /> <span>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={12} className="text-slate-400" /> <span>{client.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-700">{client.loyaltyPoints} pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-500" />
                  <span className="text-sm font-bold text-slate-900">{(client.salesTotal || 0).toLocaleString()} FCFA</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewingClient(client)}
                    className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                  >
                    <UserPlus size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingClient(client);
                      setNewClient({ name: client.name, email: client.email, phone: client.phone, address: client.address || '', interactions: client.interactions || '' });
                      setIsAdding(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </TableRow>
            ))}
          </Table>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} /> Performance Mensuelle
            </h3>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20">D</div>
              <div>
                <p className="font-bold text-slate-900">Danga Felicite</p>
                <p className="text-[10px] font-bold text-green-600 uppercase">Top Contributeur</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-900/10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Rétention Client</h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-white leading-none">84%</span>
              <span className="text-xs font-bold text-green-400 mb-1">+5.2%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[84%]" />
            </div>
            <p className="mt-4 text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
              Score de fidélisation global sur 90 jours
            </p>
          </div>
        </div>
      </div>

      {viewingClient && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl border border-indigo-100">
                  {viewingClient.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-none">{viewingClient.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Niveau: {viewingClient.loyaltyPoints} pts</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email</span>
                  <a href={`mailto:${viewingClient.email}`} className="text-sm font-bold text-blue-600 truncate block">{viewingClient.email}</a>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Téléphone</span>
                  <span className="text-sm font-bold text-slate-900">{viewingClient.phone || 'Non renseigné'}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Adresse</span>
                <span className="text-sm font-bold text-slate-900">{viewingClient.address || 'Non renseignée'}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Évolution & Interactions</span>
                <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{viewingClient.interactions || 'Aucune interaction enregistrée.'}</p>
              </div>

            </div>

            <div className="mt-8">
              <button 
                onClick={() => setViewingClient(null)} 
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6">
          <div 
            className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingClient ? 'Modifier Partenaire' : 'Enregistrement Client'}</h3>
                <p className="text-sm text-slate-500">{editingClient ? 'Mettre à jour les informations du client.' : 'Ajouter un nouveau partenaire commercial.'}</p>
              </div>
            </div>

            <form onSubmit={handleAddClient} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Raison Sociale / Nom</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email de Contact</label>
                <input 
                  required
                  type="email" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Numéro Téléphonique</label>
                <input 
                  type="tel" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Adresse</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Historique d'Interactions / Évolution</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none h-24"
                  value={newClient.interactions}
                  onChange={(e) => setNewClient({...newClient, interactions: e.target.value})}
                  placeholder="Notes sur les rendez-vous, appels, intérêts..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingClient(null);
                    setNewClient({ name: '', email: '', phone: '', address: '', interactions: '' });
                  }}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Traitement...' : (editingClient ? 'Mettre à jour' : 'Confirmer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

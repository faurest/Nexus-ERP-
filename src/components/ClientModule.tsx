import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, where, doc, updateDoc, deleteDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Plus, Search, Filter, Phone, Mail, Award, TrendingUp, UserPlus, Edit2, Trash2 } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { motion } from 'motion/react';
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
    if (!currentCompany) return;
    try {
      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), {
          ...newClient,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'clients'), {
          ...newClient,
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Gestion Clientèle</h2>
          <p className="text-slate-500 text-xs sm:text-sm text-balance">Vente, suivi et fidélisation des comptes clients.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto justify-center bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={16} /> Nouveau Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-3 shadow-sm focus-within:border-blue-400 transition-all">
            <div className="pl-3">
              <Search className="text-slate-400" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Rechercher un client..." 
              className="flex-1 bg-transparent py-2.5 outline-none text-sm text-slate-900 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button onClick={() => alert("Fonction de filtrage en développement")} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors mr-1">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
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
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  {editingClient ? 'Mettre à jour' : 'Confirmer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

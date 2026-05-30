import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, Edit2, Trash2, X, Eye, ChevronLeft } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { Client, ClientStatus } from '../types';

type ViewState = 'list' | 'detail' | 'form';

export default function ClientModule() {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const [view, setView] = useState<ViewState>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setView('form');
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setView('detail');
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      deleteClient(id);
      setView('list');
    }
  };

  const getStatusColor = (status: ClientStatus) => {
     switch (status) {
       case 'Actif': return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
       case 'En négociation': return 'text-amber-400 bg-amber-400/10 border-amber-500/20';
       case 'Inactif': return 'text-neutral-400 bg-neutral-400/10 border-neutral-500/20';
       default: return 'text-neutral-400 bg-neutral-400/10 border-neutral-500/20';
     }
  };

  return (
    <div className="p-6 bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-[400px]">
       {view === 'list' && (
         <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              Gestion Client (CRM)
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <button 
                onClick={() => { setSelectedClient(null); setView('form'); }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-cyan-500/20 flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau</span>
              </button>
            </div>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400 min-w-[700px]">
              <thead className="bg-neutral-950/50 text-neutral-300 font-medium border-b border-neutral-800">
                <tr>
                  <th className="p-4">Entreprise</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Dernier Contact</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredClients.length > 0 ? filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="p-4 text-neutral-200 font-medium">{client.name}</td>
                    <td className="p-4">{client.contactEmail}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs border ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="p-4">{client.lastContact}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleView(client)} className="p-1.5 text-neutral-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors" title="Voir détails">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(client)} className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Modifier">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(client.id)} className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                     <td colSpan={5} className="p-8 text-center text-neutral-500">
                        Aucun client trouvé.
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
         </>
       )}

       {view === 'detail' && selectedClient && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <button onClick={() => setView('list')} className="mb-6 flex items-center gap-2 text-neutral-400 hover:text-white text-sm transition-colors w-fit">
                <ChevronLeft className="w-4 h-4" /> Retour à la liste
             </button>
             <div className="flex justify-between items-start mb-6">
               <div>
                 <h2 className="text-2xl font-bold text-white mb-2">{selectedClient.name}</h2>
                 <span className={`px-2.5 py-1 rounded-full text-xs border ${getStatusColor(selectedClient.status)}`}>
                    {selectedClient.status}
                 </span>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => handleEdit(selectedClient)} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm transition-colors flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> Editer
                  </button>
                  <button onClick={() => handleDelete(selectedClient.id)} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-sm transition-colors flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
               </div>
             </div>
             
             <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Email de contact</h3>
                  <p className="text-neutral-200">{selectedClient.contactEmail}</p>
               </div>
               <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Dernier contact</h3>
                  <p className="text-neutral-200">{selectedClient.lastContact}</p>
               </div>
               <div className="md:col-span-2 mt-4 pt-4 border-t border-neutral-800">
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Notes</h3>
                  <p className="text-neutral-300 whitespace-pre-line">{selectedClient.notes || 'Aucune note pour ce client.'}</p>
               </div>
             </div>
          </div>
       )}

       {view === 'form' && (
          <ClientForm 
             client={selectedClient} 
             onSave={(data) => {
               if (selectedClient) updateClient(selectedClient.id, data);
               else addClient(data as Omit<Client, 'id'>);
               setView('list');
             }} 
             onCancel={() => setView('list')}
          />
       )}
    </div>
  );
}

function ClientForm({ client, onSave, onCancel }: { client: Client | null, onSave: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
     name: client?.name || '',
     contactEmail: client?.contactEmail || '',
     status: client?.status || 'Actif',
     lastContact: client?.lastContact || new Date().toLocaleDateString('fr-FR'),
     notes: client?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {client ? 'Modifier le client' : 'Nouveau client'}
        </h2>
        <button onClick={onCancel} className="p-2 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Nom de l'entreprise *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Email Contact *</label>
              <input required type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Statut</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ClientStatus})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 transition-colors">
                <option value="Actif">Actif</option>
                <option value="En négociation">En négociation</option>
                <option value="Inactif">Inactif</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Dernier Contact</label>
              <input type="text" value={formData.lastContact} onChange={e => setFormData({...formData, lastContact: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 transition-colors" />
            </div>
         </div>
         <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Notes (Optionnel)</label>
            <textarea rows={4} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none" />
         </div>

         <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">
               Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded transition-colors shadow-lg shadow-cyan-500/20">
               Enregistrer
            </button>
         </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Client } from '../types';

const INITIAL_CLIENTS: Client[] = [
  { id: '1', name: 'Acme Corp', contactEmail: 'alice@acmecorp.com', status: 'Actif', lastContact: 'Il y a 2 jours', notes: 'Client historique' },
  { id: '2', name: 'Global Tech', contactEmail: 'bob@globaltech.inc', status: 'En négociation', lastContact: 'Aujourd\'hui', notes: 'Intéressés par le plan Enterprise' },
];

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);

  const addClient = (client: Omit<Client, 'id'>) => {
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9) };
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  return { clients, addClient, updateClient, deleteClient };
};

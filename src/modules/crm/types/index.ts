export type ClientStatus = 'Actif' | 'En négociation' | 'Inactif';

export interface Client {
  id: string;
  name: string;
  contactEmail: string;
  status: ClientStatus;
  lastContact: string;
  notes?: string;
}

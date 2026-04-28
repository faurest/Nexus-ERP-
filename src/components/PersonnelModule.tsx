import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Search, Activity, Calendar, User, Mail, Briefcase } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';

interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'on_leave' | 'resigned';
  department: string;
  tasksAssignedCount: number;
}

export default function PersonnelModule() {
  const { currentCompany } = useCompany();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'Collaborateur', department: 'Général', password: 'Password123!' });
  const [creationMessage, setCreationMessage] = useState('');

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(collection(db, 'personnel'), where('companyId', '==', currentCompany.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaffList(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'personnel');
    });
    return unsubscribe;
  }, [currentCompany]);

  const handleCreate = async () => {
    if (!currentCompany || !newStaff.name.trim() || !newStaff.email.trim() || !newStaff.password) return;
    try {
      // Create user account via secondary Auth to prevent logging out admin
      const { createEmployeeAccount, secondaryAuth } = await import('../lib/firebase');
      await createEmployeeAccount(newStaff.email.trim(), newStaff.password);
      await secondaryAuth.signOut(); // Log out in the secondary instance

      await addDoc(collection(db, 'personnel'), {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        department: newStaff.department,
        companyId: currentCompany.id,
        status: 'active',
        tasksAssignedCount: 0
      });
      await updateDoc(doc(db, 'companies', currentCompany.id), {
        memberEmails: arrayUnion(newStaff.email.trim())
      });
      setCreationMessage(`Employé créé avec succès ! Identifiant: ${newStaff.email} | Mot de passe: ${newStaff.password}`);
      setNewStaff({ name: '', email: '', role: 'Collaborateur', department: 'Général', password: 'Password123!' });
      
      // We don't close the modal immediately so they can see the password message
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
          setCreationMessage('Erreur : Cette adresse email est déjà liée à un compte.');
      } else {
          setCreationMessage('Erreur lors de la création du compte.');
      }
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dossier Personnel</h2>
          <p className="text-slate-500 text-sm">Gestion des ressources humaines et affectation des tâches.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={16} /> Recruter
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-3 shadow-sm focus-within:border-blue-400 transition-all">
            <div className="pl-3">
              <Search className="text-slate-400" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Rechercher par nom, rôle ou département..." 
              className="flex-1 bg-transparent py-2.5 outline-none text-sm text-slate-900 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Table headers={['Employé', 'Service', 'Poste', 'Activité', 'Status']}>
            {filteredStaff.map((staff) => (
              <TableRow key={staff.id}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold border border-blue-100">
                    {staff.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{staff.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{staff.email}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase">{staff.department}</span>
                <span className="text-slate-600 font-medium">{staff.role}</span>
                <div className="flex items-center gap-2">
                  <Activity size={14} className={staff.tasksAssignedCount > 5 ? 'text-red-500' : 'text-blue-500'} />
                  <span className="text-xs font-bold text-slate-700">{staff.tasksAssignedCount} tâches</span>
                </div>
                <div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                    staff.status === 'active' ? "bg-green-100 text-green-700" :
                    staff.status === 'on_leave' ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-500"
                  )}>
                    {staff.status === 'active' ? 'Actif' : staff.status === 'on_leave' ? 'Congé' : 'Départ'}
                  </span>
                </div>
              </TableRow>
            ))}
          </Table>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Briefcase size={14} /> Affectation Rapide
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Collaborateur</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 transition-all">
                  <option>Sélectionner...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Libellé Tâche</label>
                <input placeholder="Action requise..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 transition-all" />
              </div>
              <button className="w-full bg-slate-900 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all">
                Assigner
              </button>
            </div>
          </div>

          <div className="bg-blue-900 text-white rounded-xl p-6 shadow-lg shadow-blue-900/20 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-300" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Aujourd'hui</h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-800/50 rounded-lg border border-blue-700/50">
                <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">14:00 - Revue de Projet</p>
                <p className="text-xs font-medium">Marketing & Design Strategists</p>
              </div>
              <div className="p-3 bg-blue-800/30 rounded-lg opacity-60">
                <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">16:30 - Entretien RH</p>
                <p className="text-xs font-medium">Sourcing Nouveaux Talents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for recruiting */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Nouveau Collaborateur</h3>
                <p className="text-sm text-slate-500">Ouverture d'un nouveau dossier RH.</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom Complet</label>
                  <input 
                    value={newStaff.name} 
                    onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Pro</label>
                  <input 
                    type="email"
                    value={newStaff.email} 
                    onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mot de Passe par défaut</label>
                  <input 
                    type="text"
                    value={newStaff.password} 
                    onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" 
                  />
                </div>
              </div>
              {creationMessage && (
                <div className={cn("p-3 rounded-lg border mt-4", creationMessage.includes('Erreur') ? "bg-red-50 text-red-700 border-red-100" : "bg-green-50 text-green-700 border-green-100")}>
                  <p className="text-xs font-medium">
                    {creationMessage}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setIsAdding(false); setCreationMessage(''); }} 
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleCreate}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


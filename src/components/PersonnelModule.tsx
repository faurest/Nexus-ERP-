import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, arrayUnion, deleteDoc, createEmployeeAccount, secondaryAuth } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Plus, Search, Activity, Calendar, User, Mail, Briefcase, Edit2, Trash2, Shield, Settings2, Save } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';
import { DEFAULT_ROLES } from '../App';

interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'on_leave' | 'resigned';
  department: string;
  tasksAssignedCount: number;
}

interface Task {
  id: string;
  title: string;
  assignedTo: string;
  startDate: string;
  endDate: string;
  status: 'todo' | 'in_progress' | 'done';
}

export default function PersonnelModule() {
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: '', startDate: '', endDate: '' });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'Collaborateur', department: 'Général', password: 'Password123!' });
  const [creationMessage, setCreationMessage] = useState('');
  
  const companyRoles = currentCompany?.roles || DEFAULT_ROLES;
  const roleOptions = Object.keys(companyRoles).filter(r => r !== 'owner');

  const [editingRoles, setEditingRoles] = useState<Record<string, string[]>>(companyRoles);

  useEffect(() => {
    setEditingRoles(currentCompany?.roles || DEFAULT_ROLES);
  }, [currentCompany]);

  const handleUpdateRoles = async () => {
    if (!currentCompany) return;
    try {
      await updateDoc(doc(db, 'companies', currentCompany.id), {
        roles: editingRoles
      });
      alert('Rôles et permissions mis à jour avec succès.');
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  const handleCreateNewRole = () => {
    const roleName = prompt("Nom du nouveau rôle :");
    if (roleName && !editingRoles[roleName] && roleName.trim() !== '') {
      setEditingRoles({ ...editingRoles, [roleName.trim()]: ['dashboard'] });
    }
  };

  useEffect(() => {
    if (!currentCompany) return;
    const unsubStaff = onSnapshot(query(collection(db, 'personnel'), where('companyId', '==', currentCompany.id)), (snapshot) => {
      setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    });
    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('companyId', '==', currentCompany.id)), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    return () => { unsubStaff(); unsubTasks(); };
  }, [currentCompany]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !newTask.title || !newTask.assignedTo) return;
    await addDoc(collection(db, 'tasks'), {
      ...newTask,
      companyId: currentCompany.id,
      status: 'todo'
    });
    setNewTask({ title: '', assignedTo: '', startDate: '', endDate: '' });
    setIsAddingTask(false);
  };


  const handleCreate = async () => {
    if (!currentCompany || !newStaff.name.trim() || !newStaff.email.trim()) return;
    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'personnel', editingStaff.id), {
          name: newStaff.name,
          email: newStaff.email,
          role: newStaff.role,
          department: newStaff.department,
        });
        setCreationMessage('Profil mis à jour.');
        setTimeout(() => {
          setIsAdding(false);
          setEditingStaff(null);
          setCreationMessage('');
        }, 1500);
      } else {
        if (!newStaff.password) return;
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
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
          setCreationMessage('Erreur : Cette adresse email est déjà liée à un compte.');
      } else {
          setCreationMessage('Erreur lors de l\'opération.');
      }
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel ?')) return;
    try {
      await deleteDoc(doc(db, 'personnel', staffId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'personnel');
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Espace RH & Permissions</h2>
          <p className="text-slate-500 text-xs sm:text-sm text-balance">Supervision des accès et gestion du personnel.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('employees')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", activeTab === 'employees' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <User size={16} /> Employés
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", activeTab === 'roles' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <Shield size={16} /> Rôles et Permissions
          </button>
        </div>
      </div>

      {activeTab === 'employees' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-3 shadow-sm focus-within:border-blue-400 transition-all flex-1">
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
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full sm:w-auto justify-center bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
              >
                <Plus size={16} /> Recruter
              </button>
            </div>

          <Table headers={['Employé', 'Service', 'Poste', 'Activité', 'Status', 'Actions']}>
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
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingStaff(staff);
                      setNewStaff({ 
                        name: staff.name, 
                        email: staff.email, 
                        role: staff.role, 
                        department: staff.department, 
                        password: '' 
                      });
                      setIsAdding(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteStaff(staff.id)}
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Briefcase size={14} /> Affectation Rapide
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Collaborateur</label>
                <select required value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 transition-all">
                  <option value="">Sélectionner...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Libellé Tâche</label>
                <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="Action requise..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Début</label>
                  <input required type="date" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fin</label>
                  <input required type="date" value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-blue-400" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all disabled:opacity-50">
                Assigner
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tâches Récentes</h4>
            </div>
            <div className="space-y-3">
              {tasks.slice(0, 4).map(t => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-800">{t.title}</span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded uppercase font-bold", t.status === 'done' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{t.status === 'done' ? 'Terminé' : 'En cours'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>{staffList.find(s => s.id === t.assignedTo)?.name || 'Inconnu'}</span>
                    <span>{t.startDate} au {t.endDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Matrice des Rôles
              </h3>
              <p className="text-sm text-slate-500 mt-1">Configurez l'accès aux modules pour chaque rôle de l'entreprise.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCreateNewRole}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-slate-900 transition-all font-mono"
              >
                <Plus size={16} /> Nouveau Rôle
              </button>
              <button 
                onClick={handleUpdateRoles}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
              >
                <Save size={16} /> Sauvegarder
              </button>
            </div>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pb-4 pt-2 px-4 font-bold text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">Modules</th>
                  {Object.keys(editingRoles).filter(r => r !== 'owner').map(role => (
                    <th key={role} className="pb-4 px-4 font-bold text-slate-900 border-b border-slate-100 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-blue-500" />
                        {role}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { id: 'dashboard', label: 'Tableau de bord' },
                  { id: 'sales', label: 'Ventes & Facturation' },
                  { id: 'clients', label: 'CRM & Clients' },
                  { id: 'personnel', label: 'Ressources Humaines' },
                  { id: 'resources', label: 'Stocks & Logistique' },
                  { id: 'projects', label: 'Projets & Tâches' },
                  { id: 'accounting', label: 'Comptabilité' }
                ].map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-sm text-slate-700">
                      {mod.label}
                    </td>
                    {Object.keys(editingRoles).filter(r => r !== 'owner').map(role => {
                      const hasAccess = editingRoles[role].includes(mod.id);
                      return (
                        <td key={`${role}-${mod.id}`} className="py-4 px-4 text-center">
                          <button
                            onClick={() => {
                              const newAccess = hasAccess 
                                ? editingRoles[role].filter(m => m !== mod.id)
                                : [...editingRoles[role], mod.id];
                              setEditingRoles({ ...editingRoles, [role]: newAccess });
                            }}
                            className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center transition-all mx-left",
                              hasAccess 
                                ? "bg-blue-600 border border-blue-600 text-white shadow-sm shadow-blue-600/20" 
                                : "bg-white border border-slate-200 text-transparent hover:border-blue-400"
                            )}
                          >
                            {hasAccess && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for recruiting */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingStaff ? 'Modifier Collaborateur' : 'Nouveau Collaborateur'}</h3>
                <p className="text-sm text-slate-500">{editingStaff ? 'Mettre à jour le dossier RH.' : 'Ouverture d\'un nouveau dossier RH.'}</p>
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Département / Service</label>
                  <input 
                    value={newStaff.department} 
                    onChange={e => setNewStaff({...newStaff, department: e.target.value})}
                    placeholder="e.g. Logistique, Commercial"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Poste / Rôle</label>
                  <select 
                    value={newStaff.role} 
                    onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {!editingStaff && (
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
              )}
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
                onClick={() => { 
                  setIsAdding(false); 
                  setEditingStaff(null);
                  setNewStaff({ name: '', email: '', role: 'Collaborateur', department: 'Général', password: 'Password123!' });
                  setCreationMessage(''); 
                }} 
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
              >
                Annuler
              </button>
              <button 
                onClick={handleCreate}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono"
              >
                {editingStaff ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


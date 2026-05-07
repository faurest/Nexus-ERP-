import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, arrayUnion, deleteDoc, getDocs } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Plus, Search, Activity, Calendar, User, Mail, Briefcase, Edit2, Trash2, Shield, Settings2, Save, Ban } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';
import { DEFAULT_ROLES } from '../App';

import { createNotification } from '../lib/notifications';

interface Staff {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  notes?: string;
  role: string;
  email: string;
  status: 'active' | 'on_leave' | 'resigned' | 'blocked';
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
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: '', startDate: '', endDate: '' });
  const [newStaff, setNewStaff] = useState({ firstName: '', lastName: '', phone: '', notes: '', email: '', role: 'Collaborateur', department: 'Général' });
  const [creationMessage, setCreationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const companyRoles = currentCompany?.roles || DEFAULT_ROLES;
  const roleOptions = Object.keys(companyRoles).filter(r => r !== 'owner');

  const [editingRoles, setEditingRoles] = useState<Record<string, string[]>>(companyRoles);

  useEffect(() => {
    setEditingRoles(currentCompany?.roles || DEFAULT_ROLES);
  }, [currentCompany]);

  const handleUpdateRoles = async () => {
    if (!currentCompany || submitting) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'companies', currentCompany.id), {
        roles: editingRoles
      });
      alert('Rôles et permissions mis à jour avec succès.');
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    } finally {
      setSubmitting(false);
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
    if (!currentCompany || !newTask.title || !newTask.assignedTo || submitting) return;
    setSubmitting(true);
    try {
      const taskDoc = await addDoc(collection(db, 'tasks'), {
        ...newTask,
        companyId: currentCompany.id,
        status: 'todo'
      });

      // Trigger notification for the assigned staff MEMBER
      const assignedStaff = staffList.find(s => s.id === newTask.assignedTo);
      if (assignedStaff) {
        // Need to find the UID of the user with this email
        // For simplicity and matching current patterns, we might not have UID here 
        // unless we join with a users collection. 
        // However, the createNotification expects userIds.
        // Let's assume there is a mapping or we can query users collection.
        const qUser = query(collection(db, 'users'), where('email', '==', assignedStaff.email.toLowerCase()));
        const userSnap = await getDocs(qUser);
        if (!userSnap.empty) {
          const recipientUid = userSnap.docs[0].id;
          await createNotification(
            currentCompany.id,
            [recipientUid],
            'Nouvelle tâche assignée',
            `Vous avez été assigné à la tâche : ${newTask.title}`,
            'task'
          );
        }
      }

      setNewTask({ title: '', assignedTo: '', startDate: '', endDate: '' });
      setIsAddingTask(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tasks');
    } finally {
      setSubmitting(false);
    }
  };


  const handleCreate = async () => {
    if (!currentCompany || (!newStaff.firstName.trim() && !newStaff.lastName.trim()) || !newStaff.email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const fullName = `${newStaff.firstName} ${newStaff.lastName}`.trim();
      if (editingStaff) {
        await updateDoc(doc(db, 'personnel', editingStaff.id), {
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          name: fullName,
          email: newStaff.email.trim().toLowerCase(),
          phone: newStaff.phone,
          notes: newStaff.notes,
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
        await addDoc(collection(db, 'personnel'), {
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          name: fullName,
          email: newStaff.email.trim().toLowerCase(),
          phone: newStaff.phone,
          notes: newStaff.notes,
          role: newStaff.role,
          department: newStaff.department,
          companyId: currentCompany.id,
          status: 'active',
          tasksAssignedCount: 0
        });
        await updateDoc(doc(db, 'companies', currentCompany.id), {
          memberEmails: arrayUnion(newStaff.email.trim().toLowerCase())
        });
        setCreationMessage(`Employé ajouté avec succès ! Il peut désormais se connecter avec Google via l'adresse : ${newStaff.email}`);
        setNewStaff({ firstName: '', lastName: '', phone: '', notes: '', email: '', role: 'Collaborateur', department: 'Général' });
      }
    } catch (err: any) {
      console.error(err);
      setCreationMessage('Erreur lors de l\'opération.');
    } finally {
      setSubmitting(false);
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

  const handleToggleBlockStaff = async (staffId: string, currentStatus: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir ${currentStatus === 'blocked' ? 'débloquer' : 'bloquer'} ce membre du personnel ?`)) return;
    try {
      await updateDoc(doc(db, 'personnel', staffId), {
        status: currentStatus === 'blocked' ? 'active' : 'blocked'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'personnel');
    }
  };

  const filteredStaff = staffList.filter(s => 
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.role && s.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl group">
        <div className="absolute inset-0 z-0 scale-110 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity">
          <img 
             src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1600" 
             className="w-full h-full object-cover" 
             alt="teamwork"
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Talent</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Gérez votre capital humain, définissez des permissions granulaires et orchestrez les talents au sein de votre organisation.
            </p>
          </div>
          <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('employees')}
              className={cn("px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all", activeTab === 'employees' ? "bg-white text-slate-900 shadow-xl shadow-white/10" : "text-white/60 hover:text-white")}
            >
              <User size={16} /> Employés
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={cn("px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all", activeTab === 'roles' ? "bg-white text-slate-900 shadow-xl shadow-white/10" : "text-white/60 hover:text-white")}
            >
              <Shield size={16} /> Rôles
            </button>
          </div>
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
                    staff.status === 'blocked' ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-500"
                  )}>
                    {staff.status === 'active' ? 'Actif' : staff.status === 'on_leave' ? 'Congé' : staff.status === 'blocked' ? 'Bloqué' : 'Départ'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setViewingStaff(staff);
                    }}
                    className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                  >
                    <User size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingStaff(staff);
                      setNewStaff({ 
                        firstName: staff.firstName || '', 
                        lastName: staff.lastName || '', 
                        phone: staff.phone || '',
                        notes: staff.notes || '',
                        email: staff.email, 
                        role: staff.role, 
                        department: staff.department
                      });
                      setIsAdding(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleToggleBlockStaff(staff.id, staff.status)}
                    className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                    title={staff.status === 'blocked' ? 'Débloquer' : 'Bloquer'}
                  >
                    <Ban size={14} className={staff.status === 'blocked' ? "text-red-500" : ""} />
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
              <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all disabled:opacity-50">
                {submitting ? 'Assignation...' : 'Assigner'}
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
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                <Save size={16} /> {submitting ? 'Mise à jour...' : 'Sauvegarder'}
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

      {/* Modal for viewing staff info */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl border border-blue-100">
                  {viewingStaff.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-none">{viewingStaff.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">{viewingStaff.role} • {viewingStaff.department}</p>
                </div>
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                viewingStaff.status === 'active' ? "bg-green-100 text-green-700" :
                viewingStaff.status === 'on_leave' ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-500"
              )}>
                {viewingStaff.status === 'active' ? 'Actif' : viewingStaff.status === 'on_leave' ? 'Congé' : 'Départ'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email</span>
                  <a href={`mailto:${viewingStaff.email}`} className="text-sm font-bold text-blue-600 truncate block">{viewingStaff.email}</a>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Téléphone</span>
                  <span className="text-sm font-bold text-slate-900">{viewingStaff.phone || 'Non renseigné'}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Dossier RH / Notes</span>
                <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{viewingStaff.notes || 'Aucun dossier ou note.'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Activité de tâches</span>
                <div className="flex items-center gap-2">
                  <Activity size={16} className={viewingStaff.tasksAssignedCount > 5 ? 'text-red-500' : 'text-blue-500'} />
                  <span className="text-sm font-bold text-slate-900">{viewingStaff.tasksAssignedCount} tâches assignées</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setViewingStaff(null)} 
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
            </div>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prénom</label>
                  <input 
                    value={newStaff.firstName} 
                    onChange={e => setNewStaff({...newStaff, firstName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom</label>
                  <input 
                    value={newStaff.lastName} 
                    onChange={e => setNewStaff({...newStaff, lastName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Pro</label>
                  <input 
                    type="email"
                    value={newStaff.email} 
                    onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Téléphone</label>
                  <input 
                    type="tel"
                    value={newStaff.phone} 
                    onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Département / Service</label>
                  <input 
                    value={newStaff.department} 
                    onChange={e => setNewStaff({...newStaff, department: e.target.value})}
                    placeholder="e.g. Logistique, Commercial"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Poste / Rôle</label>
                  <select 
                    value={newStaff.role} 
                    onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm appearance-none outline-none focus:border-blue-400"
                  >
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Notes / Dossier Staff</label>
                  <textarea 
                    value={newStaff.notes} 
                    onChange={e => setNewStaff({...newStaff, notes: e.target.value})}
                    placeholder="Informations supplémentaires..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400 resize-none h-20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                onClick={() => { 
                  setIsAdding(false); 
                  setEditingStaff(null);
                  setNewStaff({ firstName: '', lastName: '', phone: '', notes: '', email: '', role: 'Collaborateur', department: 'Général' });
                  setCreationMessage(''); 
                }} 
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
              >
                Annuler
              </button>
              <button 
                onClick={handleCreate}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50"
              >
                {submitting ? 'Traitement...' : (editingStaff ? 'Mettre à jour' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


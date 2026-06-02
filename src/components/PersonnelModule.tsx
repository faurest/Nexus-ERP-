import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, setDoc, updateDoc, doc, arrayUnion, deleteDoc, getDocs, addDoc, serverTimestamp, registerUserWithoutLogin } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Plus, Search, Activity, Calendar, User, Mail, Briefcase, Edit2, Trash2, Shield, Settings2, Save, Ban, Clock, CalendarRange, CheckCircle2, XCircle, Timer, FileText, Key } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';
import { DEFAULT_ROLES } from '../core/permissions/roles';

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
  customPermissions?: string[];
}

interface Task {
  id: string;
  title: string;
  assignedTo: string;
  startDate: string;
  endDate: string;
  status: 'todo' | 'in_progress' | 'done';
}

interface LeaveRequest {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  type: 'leave' | 'absence' | 'medical';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface TimeEntry {
  id: string;
  staffId: string;
  projectId?: string;
  date: string;
  hours: number;
  description: string;
}

interface SalaryAdvance {
  id: string;
  staffId: string;
  amount: number;
  requestDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  deductionMonth: string;
}

export default function PersonnelModule({ user }: { user?: any }) {
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'time' | 'advances'>('employees');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>([]);
  const [activeTimeSubTab, setActiveTimeSubTab] = useState<'leave' | 'timesheet'>('leave');
  const [isAddingLeave, setIsAddingLeave] = useState(false);
  const [newLeave, setNewLeave] = useState({ staffId: '', startDate: '', endDate: '', type: 'leave', reason: '' });
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [newTimeEntry, setNewTimeEntry] = useState({ staffId: '', date: '', hours: 8, description: '', projectId: '' });
  const [isAddingAdvance, setIsAddingAdvance] = useState(false);
  const [newAdvance, setNewAdvance] = useState({ staffId: '', amount: 0, reason: '', deductionMonth: new Date().toISOString().slice(0, 7) });
  const [projectsList, setProjectsList] = useState<{id: string, name: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: '', startDate: '', endDate: '' });
  const [newStaff, setNewStaff] = useState({ firstName: '', lastName: '', phone: '', notes: '', email: '', role: 'Collaborateur', department: 'Général', accessKey: '' });
  const [creationMessage, setCreationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [editingPermissionsStaff, setEditingPermissionsStaff] = useState<Staff | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const handleSaveCustomPermissions = async () => {
    if (!editingPermissionsStaff || !currentCompany || submitting) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'personnel', editingPermissionsStaff.id), {
        customPermissions: selectedPermissions,
        updatedAt: serverTimestamp()
      });
      alert('Permissions spécifiques mises à jour avec succès.');
      setEditingPermissionsStaff(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'personnel');
    } finally {
      setSubmitting(false);
    }
  };

  const companyRoles = currentCompany?.roles || DEFAULT_ROLES;
  const roleOptions = Object.keys(companyRoles).filter(r => r !== 'owner');

  const [editingRoles, setEditingRoles] = useState<Record<string, string[]>>(companyRoles);

  useEffect(() => {
    setEditingRoles(currentCompany?.roles || DEFAULT_ROLES);
  }, [currentCompany]);

  const handleRegenerateJoinCode = async () => {
    if (!currentCompany || submitting) return;
    if (!confirm("Générer un nouveau code d'accès ? L'ancien code ne sera plus valide. Les membres actuels resteront connectés.")) return;
    
    setSubmitting(true);
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let generatedJoinCode = '';
      for (let i = 0; i < 6; i++) {
        generatedJoinCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      await updateDoc(doc(db, 'companies', currentCompany.id), {
        joinCode: generatedJoinCode,
        updatedAt: serverTimestamp()
      });
      alert('Nouveau code généré avec succès : ' + generatedJoinCode);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!currentCompany || submitting) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'companies', currentCompany.id), {
        roles: editingRoles,
        updatedAt: serverTimestamp()
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
    const unsubLeave = onSnapshot(query(collection(db, 'leave_requests'), where('companyId', '==', currentCompany.id)), (snapshot) => {
      setLeaveRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest)));
    });
    const unsubTime = onSnapshot(query(collection(db, 'time_entries'), where('companyId', '==', currentCompany.id)), (snapshot) => {
      setTimeEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry)));
    });
    const unsubAdvances = onSnapshot(query(collection(db, 'salary_advances'), where('companyId', '==', currentCompany.id)), (snapshot) => {
      setSalaryAdvances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance)));
    });
    const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('companyId', '==', currentCompany.id)), (snapshot) => {
      setProjectsList(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return () => { 
      unsubStaff(); 
      unsubTasks(); 
      unsubLeave();
      unsubTime();
      unsubAdvances();
      unsubProjects();
    };
  }, [currentCompany]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !newTask.title || !newTask.assignedTo || submitting) return;
    setSubmitting(true);
    try {
      const taskDoc = await addDoc(collection(db, 'tasks'), {
        ...newTask,
        companyId: currentCompany.id,
        status: 'todo',
        createdAt: serverTimestamp()
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
      const cleanEmail = newStaff.email.trim().toLowerCase().replace(/\s+/g, '');
      
      if (editingStaff) {
        const oldEmail = editingStaff.email.trim().toLowerCase().replace(/\s+/g, '');
        
        // If email changed, we need to update the memberEmails array in the company doc
        if (cleanEmail !== oldEmail) {
          await updateDoc(doc(db, 'companies', currentCompany.id), {
            memberEmails: arrayUnion(cleanEmail),
            updatedAt: serverTimestamp()
          });
          // Note: we don't strictly remove the old email from memberEmails here to avoid accidentally 
          // removing someone who might be sharing an email or if the removal logic is complex,
          // but for strictness we could use arrayRemove.
          // Given the context of fixing the connection for the new email, adding it is the priority.
        }

        await updateDoc(doc(db, 'personnel', editingStaff.id), {
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          name: fullName,
          email: cleanEmail,
          phone: newStaff.phone,
          notes: newStaff.notes,
          role: newStaff.role,
          department: newStaff.department,
          updatedAt: serverTimestamp()
        });
        setCreationMessage('Profil mis à jour.');
        setTimeout(() => {
          setIsAdding(false);
          setEditingStaff(null);
          setCreationMessage('');
        }, 1500);
      } else {
        const cleanEmail = newStaff.email.trim().toLowerCase().replace(/\s+/g, '');
        
        // 1. Create the Auth account
        if (!newStaff.accessKey || newStaff.accessKey.length < 6) {
          setCreationMessage('Erreur : La clé d\'accès initiale doit contenir au moins 6 caractères.');
          setSubmitting(false);
          return;
        }
        
        try {
          await registerUserWithoutLogin(cleanEmail, newStaff.accessKey);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            console.log("Compte Firebase Auth existant. Le compte de connexion est déjà actif.");
          } else {
            console.error("Auth creation failed:", authErr);
            setCreationMessage(`Erreur de création de compte : ${authErr.message || "Impossible de créer le compte de connexion."}`);
            setSubmitting(false);
            return;
          }
        }

        // 2. Create the personnel record
        await setDoc(doc(db, 'personnel', `${currentCompany.id}_${cleanEmail}`), {
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          name: fullName,
          email: cleanEmail,
          phone: newStaff.phone,
          notes: newStaff.notes,
          role: newStaff.role,
          department: newStaff.department,
          companyId: currentCompany.id,
          status: 'active',
          tasksAssignedCount: 0,
          createdAt: serverTimestamp()
        });

        // Create Ghost Profile for global visibility
        try {
          const ghostUserRef = doc(db, 'users', cleanEmail);
          await setDoc(ghostUserRef, {
            email: cleanEmail,
            displayName: fullName,
            status: 'invited',
            invitationDate: serverTimestamp(),
            role: newStaff.role
          }, { merge: true });
        } catch (ghostErr) {
          console.warn("Ghost profile creation skipped:", ghostErr);
        }

        await setDoc(doc(db, 'companies', currentCompany.id), {
          memberEmails: arrayUnion(cleanEmail)
        }, { merge: true });
        setCreationMessage(`Employé ajouté avec succès ! Il peut se connecter avec sa Clé d'Accès Initiale.`);
        setNewStaff({ firstName: '', lastName: '', phone: '', notes: '', email: '', role: 'Collaborateur', department: 'Général', accessKey: '' });
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
        status: currentStatus === 'blocked' ? 'active' : 'blocked',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'personnel');
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !newLeave.staffId || !newLeave.startDate || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'leave_requests'), {
        ...newLeave,
        companyId: currentCompany.id,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsAddingLeave(false);
      setNewLeave({ staffId: '', startDate: '', endDate: '', type: 'leave', reason: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'leave_requests');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLeaveStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leave_requests', requestId), { status, updatedAt: serverTimestamp() });
      
      // If approved, optionally update staff status
      if (status === 'approved') {
        const req = leaveRequests.find(r => r.id === requestId);
        if (req && req.type !== 'medical') {
          // You could set staff status to 'on_leave' if the date is today
          // For now let's just update the request
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'leave_requests');
    }
  };

  const handleCreateTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !newTimeEntry.staffId || !newTimeEntry.date || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'time_entries'), {
        ...newTimeEntry,
        hours: Number(newTimeEntry.hours),
        companyId: currentCompany.id,
        createdAt: serverTimestamp()
      });
      setIsAddingTime(false);
      setNewTimeEntry({ staffId: '', date: '', hours: 8, description: '', projectId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'time_entries');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdvanceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !newAdvance.staffId || newAdvance.amount <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'salary_advances'), {
        ...newAdvance,
        amount: Number(newAdvance.amount),
        companyId: currentCompany.id,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsAddingAdvance(false);
      setNewAdvance({ staffId: '', amount: 0, reason: '', deductionMonth: new Date().toISOString().slice(0, 7) });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'salary_advances');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAdvanceStatus = async (advanceId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'salary_advances', advanceId), { status, updatedAt: serverTimestamp() });
      
      const advance = salaryAdvances.find(a => a.id === advanceId);
      const staff = staffList.find(s => s.id === advance?.staffId);
      
      if (staff) {
        // Notification logic could go here
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'salary_advances');
    }
  };

  const filteredStaff = staffList.filter(s => 
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.role && s.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Talent</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Gérez votre capital humain et orchestrez les talents de votre organisation.
            </p>
          </div>
          <div className="flex bg-slate-950/40 p-1.5 rounded-2xl border border-white/10 overflow-x-auto scrollbar-hide max-w-full">
            {[
              { id: 'employees', label: 'Employés', icon: User },
              { id: 'time', label: 'Temps & Congés', icon: Clock },
              { id: 'advances', label: 'Avances', icon: FileText },
              { id: 'roles', label: 'Rôles & Perms', icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all whitespace-nowrap", 
                  activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
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
            {filteredStaff.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border-t border-slate-100 italic text-slate-400 text-sm">
                Aucun collaborateur référencé pour le moment.
              </div>
            ) : filteredStaff.map((staff) => (
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
                      setEditingPermissionsStaff(staff);
                      setSelectedPermissions(staff.customPermissions || []);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Permissions spécifiques"
                  >
                    <Shield size={14} />
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
                        department: staff.department,
                        accessKey: ''
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
            {filteredStaff.length === 0 && (
              <div className="p-12 text-center">
                <User size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun employé trouvé</p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Partagez le code <span className="font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md mx-1 select-all font-black">{currentCompany?.joinCode}</span> avec vos collaborateurs pour qu'ils rejoignent automatiquement votre espace.
                </p>
              </div>
            )}
          </Table>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-900 border border-slate-800 rounded-xl p-6 shadow-lg text-white">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={14} /> Accès & Invitations
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">Partagez ce code avec vos collaborateurs pour qu'ils rejoignent automatiquement votre espace Nexus :</p>
              
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative group cursor-pointer" onClick={() => {
                if (currentCompany?.joinCode) {
                  navigator.clipboard.writeText(currentCompany.joinCode);
                  alert('Code copié !');
                }
              }}>
                <span className="text-3xl font-black tracking-[0.3em] font-mono text-white group-hover:text-indigo-300 transition-colors">
                  {currentCompany?.joinCode || '------'}
                </span>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest group-hover:text-white transition-colors">Cliquez pour copier</span>
              </div>
              
              <button 
                onClick={handleRegenerateJoinCode}
                disabled={submitting}
                className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Activity size={14} /> Renouveler le code
              </button>
            </div>
          </div>

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
      ) : activeTab === 'time' ? (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button 
                onClick={() => setActiveTimeSubTab('leave')}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                  activeTimeSubTab === 'leave' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <CalendarRange size={16} /> Congés
              </button>
              <button 
                onClick={() => setActiveTimeSubTab('timesheet')}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                  activeTimeSubTab === 'timesheet' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Timer size={16} /> Temps
              </button>
            </div>
            <button 
              onClick={() => activeTimeSubTab === 'leave' ? setIsAddingLeave(true) : setIsAddingTime(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"
            >
              <Plus size={16} /> Nouveau
            </button>
          </div>

          {activeTimeSubTab === 'leave' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-black">
               <Table headers={['Collaborateur', 'Période', 'Type', 'Motif', 'Statut', 'Actions']}>
                 {leaveRequests.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 border-t border-slate-100 italic text-slate-400 text-sm">
                      Aucune demande de congé enregistrée.
                    </div>
                 ) : leaveRequests.map(req => {
                   const staff = staffList.find(s => s.id === req.staffId);
                   return (
                     <TableRow key={req.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {staff?.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-bold text-slate-900 text-sm">{staff?.name}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">Du {req.startDate}</span>
                          <span className="text-[10px] text-slate-400">Au {req.endDate}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                          {req.type === 'leave' ? 'Congé' : req.type === 'absence' ? 'Absence' : 'Médical'}
                        </span>
                        <p className="text-xs text-slate-600 max-w-[200px] truncate">{req.reason}</p>
                        <div>
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                            req.status === 'approved' ? "bg-green-100 text-green-700" :
                            req.status === 'rejected' ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {req.status === 'pending' ? 'En attente' : req.status === 'approved' ? 'Approuvé' : 'Refusé'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => handleUpdateLeaveStatus(req.id, 'approved')} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
                                <CheckCircle2 size={16} />
                              </button>
                              <button onClick={() => handleUpdateLeaveStatus(req.id, 'rejected')} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button onClick={() => deleteDoc(doc(db, 'leave_requests', req.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                     </TableRow>
                   );
                 })}
                 {leaveRequests.length === 0 && (
                   <div className="p-20 text-center space-y-4 col-span-full">
                      <CalendarRange size={48} className="mx-auto text-slate-200" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucune demande de congé enregistrée</p>
                   </div>
                 )}
               </Table>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-black">
               <Table headers={['Collaborateur', 'Date', 'Projet / Description', 'Durée', 'Actions']}>
                  {timeEntries.map(entry => {
                    const staff = staffList.find(s => s.id === entry.staffId);
                    const project = projectsList.find(p => p.id === entry.projectId);
                    return (
                      <TableRow key={entry.id}>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                             {staff?.name.split(' ').map(n => n[0]).join('')}
                           </div>
                           <span className="font-bold text-slate-900 text-sm">{staff?.name}</span>
                         </div>
                         <span className="text-xs font-bold text-slate-700">{entry.date}</span>
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black uppercase text-indigo-600">{project?.name || 'Hors Projet'}</span>
                           <p className="text-xs text-slate-500 max-w-[300px] truncate">{entry.description}</p>
                         </div>
                         <div className="flex items-center gap-2">
                           <Clock size={14} className="text-blue-500" />
                           <span className="text-xs font-black text-slate-900">{entry.hours}h</span>
                         </div>
                         <button onClick={() => deleteDoc(doc(db, 'time_entries', entry.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                            <Trash2 size={16} />
                         </button>
                      </TableRow>
                    );
                  })}
                  {timeEntries.length === 0 && (
                   <div className="p-20 text-center space-y-4 col-span-full">
                      <Timer size={48} className="mx-auto text-slate-200" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucune saisie de temps pour le moment</p>
                   </div>
                 )}
               </Table>
            </div>
          )}
        </div>
      ) : activeTab === 'advances' ? (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Avances & Acomptes</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Prélèvements sur salaire</p>
            </div>
            <button 
              onClick={() => setIsAddingAdvance(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10"
            >
              <Plus size={16} /> Nouvelle Demande
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-black">
             <Table headers={['Collaborateur', 'Date Demande', 'Montant', 'Mois Déduction', 'Motif', 'Statut', 'Actions']}>
                {salaryAdvances.map(advance => {
                  const staff = staffList.find(s => s.id === advance.staffId);
                  return (
                    <TableRow key={advance.id}>
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                           {staff?.name.split(' ').map(n => n[0]).join('')}
                         </div>
                         <span className="font-bold text-slate-900 text-sm">{staff?.name}</span>
                       </div>
                       <span className="text-xs font-bold text-slate-700">{advance.requestDate}</span>
                       <span className="text-xs font-black text-blue-600">{advance.amount.toLocaleString()} FCFA</span>
                       <span className="text-[10px] font-black uppercase text-slate-400">{advance.deductionMonth}</span>
                       <p className="text-xs text-slate-600 max-w-[200px] truncate">{advance.reason}</p>
                       <div>
                         <span className={cn(
                           "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                           advance.status === 'approved' ? "bg-green-100 text-green-700" :
                           advance.status === 'rejected' ? "bg-red-100 text-red-700" :
                           "bg-amber-100 text-amber-700"
                         )}>
                           {advance.status === 'pending' ? 'En attente' : advance.status === 'approved' ? 'Approuvé' : 'Refusé'}
                         </span>
                       </div>
                       <div className="flex items-center gap-2">
                         {advance.status === 'pending' && (
                           <>
                             <button onClick={() => handleUpdateAdvanceStatus(advance.id, 'approved')} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
                               <CheckCircle2 size={16} />
                             </button>
                             <button onClick={() => handleUpdateAdvanceStatus(advance.id, 'rejected')} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                               <XCircle size={16} />
                             </button>
                           </>
                         )}
                         <button onClick={() => deleteDoc(doc(db, 'salary_advances', advance.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </TableRow>
                  );
                })}
                {salaryAdvances.length === 0 && (
                   <div className="p-20 text-center space-y-4 col-span-full">
                      <FileText size={48} className="mx-auto text-slate-200" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun acompte ou avance demandé</p>
                   </div>
                 )}
             </Table>
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
                  { id: 'services', label: 'Services & Prestations' },
                  { id: 'sales', label: 'Ventes & Facturation' },
                  { id: 'ecommerce', label: 'Espace Ecommerce' },
                  { id: 'clients', label: 'Partenaires Clients' },
                  { id: 'personnel', label: 'Ressources Humaines' },
                  { id: 'resources', label: 'Stocks & Logistique' },
                  { id: 'projects', label: 'Projets & Tâches' },
                  { id: 'accounting', label: 'Rapport Comptable' },
                  { id: 'collaboration', label: 'Collaboration & Comm' }
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

      {editingPermissionsStaff && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Permissions Spécifiques</h3>
                <p className="text-sm text-slate-500">Assignez des modules additionnels à {editingPermissionsStaff.name}.</p>
              </div>
            </div>

            <div className="space-y-3 mb-8 h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {[
                { id: 'dashboard', label: 'Tableau de bord' },
                { id: 'services', label: 'Services & Prestations' },
                { id: 'sales', label: 'Ventes & Facturation' },
                { id: 'ecommerce', label: 'Espace Ecommerce' },
                { id: 'clients', label: 'Partenaires Clients' },
                { id: 'personnel', label: 'Ressources Humaines' },
                { id: 'resources', label: 'Stocks & Logistique' },
                { id: 'projects', label: 'Projets & Tâches' },
                { id: 'accounting', label: 'Rapport Comptable' },
                { id: 'collaboration', label: 'Collaboration & Comm' }
              ].map((mod) => (
                <div 
                  key={mod.id}
                  onClick={() => {
                    const exists = selectedPermissions.includes(mod.id);
                    if (exists) {
                      setSelectedPermissions(selectedPermissions.filter(p => p !== mod.id));
                    } else {
                      setSelectedPermissions([...selectedPermissions, mod.id]);
                    }
                  }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                    selectedPermissions.includes(mod.id) 
                      ? "bg-indigo-50 border-indigo-200" 
                      : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    selectedPermissions.includes(mod.id) ? "text-indigo-900" : "text-slate-500"
                  )}>
                    {mod.label}
                  </span>
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center transition-all",
                    selectedPermissions.includes(mod.id) ? "bg-indigo-600 text-white" : "border-2 border-slate-200 group-hover:border-slate-300"
                  )}>
                    {selectedPermissions.includes(mod.id) && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} className="w-3 h-3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button" 
                onClick={() => setEditingPermissionsStaff(null)} 
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveCustomPermissions}
                disabled={submitting} 
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 font-mono disabled:opacity-50"
              >
                {submitting ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Time Management */}
      {isAddingLeave && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <CalendarRange size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Déclarer une absence</h3>
                <p className="text-sm text-slate-500">Enregistrez un congé ou une absence imprévue.</p>
              </div>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Collaborateur</label>
                <select required value={newLeave.staffId} onChange={e => setNewLeave({...newLeave, staffId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none">
                  <option value="">Sélectionner...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date début</label>
                  <input required type="date" value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date fin</label>
                  <input required type="date" value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type d'absence</label>
                <select required value={newLeave.type} onChange={e => setNewLeave({...newLeave, type: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none">
                  <option value="leave">Congé Payé</option>
                  <option value="absence">Absence Injustifiée</option>
                  <option value="medical">Arrêt Maladie</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Motif / Commentaire</label>
                <textarea value={newLeave.reason} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none resize-none h-24" />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <button type="button" onClick={() => setIsAddingLeave(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button type="submit" disabled={submitting} className="px-6 py-3 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 font-mono disabled:opacity-50">Confirmer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingTime && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Timer size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Saisie de temps</h3>
                <p className="text-sm text-slate-500">Facturation au temps passé / Timesheet.</p>
              </div>
            </div>

            <form onSubmit={handleCreateTimeEntry} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Collaborateur</label>
                <select required value={newTimeEntry.staffId} onChange={e => setNewTimeEntry({...newTimeEntry, staffId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none">
                  <option value="">Sélectionner...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                  <input required type="date" value={newTimeEntry.date} onChange={e => setNewTimeEntry({...newTimeEntry, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Heures</label>
                  <input required type="number" step="0.5" value={newTimeEntry.hours} onChange={e => setNewTimeEntry({...newTimeEntry, hours: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Projet</label>
                <select value={newTimeEntry.projectId} onChange={e => setNewTimeEntry({...newTimeEntry, projectId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none">
                  <option value="">Hors Projet</option>
                  {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description du travail</label>
                <textarea required value={newTimeEntry.description} onChange={e => setNewTimeEntry({...newTimeEntry, description: e.target.value})} placeholder="Détaillez les tâches accomplies..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none resize-none h-24" />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <button type="button" onClick={() => setIsAddingTime(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button type="submit" disabled={submitting} className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingAdvance && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Demander une avance</h3>
                <p className="text-sm text-slate-500">Acompte sur salaire ou avance exceptionnelle.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAdvanceRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Collaborateur</label>
                <select required value={newAdvance.staffId} onChange={e => setNewAdvance({...newAdvance, staffId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none">
                  <option value="">Sélectionner...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Montant (FCFA)</label>
                  <input required type="number" value={newAdvance.amount} onChange={e => setNewAdvance({...newAdvance, amount: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mois de déduction</label>
                  <input required type="month" value={newAdvance.deductionMonth} onChange={e => setNewAdvance({...newAdvance, deductionMonth: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Motif de la demande</label>
                <textarea required value={newAdvance.reason} onChange={e => setNewAdvance({...newAdvance, reason: e.target.value})} placeholder="Expliquez brièvement le besoin..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none resize-none h-24" />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <button type="button" onClick={() => setIsAddingAdvance(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button type="submit" disabled={submitting} className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50">Soumettre</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for viewing staff info */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-6">
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
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6">
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
                {!editingStaff && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                      <Key size={12} className="text-blue-500" />
                      Clé d'Accès Initiale
                    </label>
                    <input 
                      type="password"
                      value={newStaff.accessKey} 
                      onChange={e => setNewStaff({...newStaff, accessKey: e.target.value})}
                      placeholder="Mot de passe initial (min. 6 car.)"
                      required
                      minLength={6}
                      className="w-full bg-blue-50/50 border border-blue-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none placeholder:text-blue-300" 
                    />
                  </div>
                )}
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
                  setNewStaff({ firstName: '', lastName: '', phone: '', notes: '', email: '', role: 'Collaborateur', department: 'Général', accessKey: '' });
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


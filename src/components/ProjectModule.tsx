import React, { useState, useEffect } from 'react';
import { useDependencies } from '../core/di/DependencyProvider';

import { FolderKanban, Handshake, Search, Plus, Calendar, DollarSign, ExternalLink, Filter, CreditCard, Receipt, TrendingDown, ArrowUpRight, ArrowDownRight, Edit2, Trash2, MoreVertical, ClipboardList, Activity, AlertTriangle, X } from 'lucide-react';
import { useSubNavigation } from '../hooks/useSubNavigation';
import Table, { TableRow } from './ui/Table';

import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import { createNotification } from '../lib/notifications';
import { auth, collection, db, handleFirestoreError, onSnapshot, OperationType, query, where } from '../lib/firebase';
import { changeTaskStatus, collectTaskRecipients, createTaskWithTracking, taskStatusBadge, taskStatusLabel, TASK_STATUS_ORDER } from '../lib/taskTracking';

// ... interface declarations ...

interface Project {
  id: string;
  name: string;
  description?: string;
  partnerId: string;
  partnerName?: string;
  startDate: any;
  endDate: any;
  status: 'planned' | 'active' | 'completed' | 'on_hold';
  budget: number;
}

interface Partner {
  id: string;
  name: string;
  type: 'Supplier' | 'Partner';
  contactEmail: string;
  activeProjectsCount: number;
}

interface Expense {
  id: string;
  projectId: string;
  amount: number;
  date: any;
  category: string;
  description: string;
}

interface Invoice {
  id: string;
  projectId: string;
  partnerId: string;
  amount: number;
  issueDate: any;
  dueDate: any;
  status: 'pending' | 'paid' | 'overdue';
}

interface Payment {
  id: string;
  projectId: string;
  amount: number;
  date: any;
  type: 'inbound' | 'outbound';
}

export default function ProjectModule() {
  const { facades } = useDependencies();
  const { project: projectFacade, partner: partnerFacade, finance: financeFacade, invoice: invoiceFacade, task: taskFacade, staff: staffFacade } = facades;
  const { currentCompany } = useCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeView, setActiveView] = useSubNavigation<'projects' | 'partners' | 'financials' | 'tasks'>('projects', 'projects');
  const [isAddingFinancial, setIsAddingFinancial] = useState<'expense' | 'invoice' | 'payment' | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [taskUpdates, setTaskUpdates] = useState<any[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<any>({ title: '', description: '', assignedTo: '', projectId: '', priority: 'medium', startDate: '', endDate: '', needs: '', constraints: '' });
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [evolvingTask, setEvolvingTask] = useState<any | null>(null);
  const [evolution, setEvolution] = useState<any>({ status: '', comment: '' });
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | string>('all');
  const [taskProjectFilter, setTaskProjectFilter] = useState<string | null>(null);

  const activeProjects = projects.filter(p => p.status === 'active');
  const taskStats = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: tasks.filter(t => t.status === 'done').length,
  };
  const filteredTasks = (taskFilter === 'all' ? tasks : tasks.filter(t => t.status === taskFilter))
    .filter(t => !taskProjectFilter || t.projectId === taskProjectFilter);

  useEffect(() => {
    if (!currentCompany) return;

    const unsubProjects = projectFacade.observeProjects(currentCompany.id, setProjects);
    const unsubPartners = partnerFacade.observePartners(currentCompany.id, setPartners);
    const unsubExpenses = financeFacade.observeExpenses(currentCompany.id, setExpenses);
    const unsubInvoices = invoiceFacade.observeInvoices(currentCompany.id, setInvoices);
    const unsubPayments = financeFacade.observePayments(currentCompany.id, setPayments);
    const unsubTasks = taskFacade.observe(currentCompany.id, setTasks);
    const unsubPersonnel = staffFacade.observeStaff(currentCompany.id, setPersonnelList);
    const unsubTaskUpdates = onSnapshot(query(collection(db, 'task_updates'), where('companyId', '==', currentCompany.id)), snap => {
      setTaskUpdates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'task_updates'));

    return () => { 
      if (unsubProjects) unsubProjects(); 
      if (unsubPartners) unsubPartners(); 
      if (unsubExpenses) unsubExpenses();
      if (unsubInvoices) unsubInvoices();
      if (unsubPayments) unsubPayments();
      if (unsubTasks) unsubTasks();
      if (unsubPersonnel) unsubPersonnel();
      if (unsubTaskUpdates) unsubTaskUpdates();
    };
  }, [currentCompany, projectFacade, partnerFacade, financeFacade, invoiceFacade, taskFacade, staffFacade]);

  const handleAddFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingFinancial || !currentCompany || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        createdAt: new Date().toISOString()
      };
      
      if (isAddingFinancial === 'expense') {
        await financeFacade.createExpense(currentCompany.id, payload);
      } else if (isAddingFinancial === 'invoice') {
        await invoiceFacade.createInvoice({ ...payload, companyId: currentCompany.id });
      } else if (isAddingFinancial === 'payment') {
        await financeFacade.createPayment(currentCompany.id, payload);
      }

      setIsAddingFinancial(null);
      setFormData({});
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;

    setSubmitting(true);
    try {
      const recipients = [...(currentCompany.employees || [])];
      if (!recipients.includes(currentCompany.ownerId)) recipients.push(currentCompany.ownerId);

      const projectData = {
        ...formData,
        budget: Number(formData.budget || 0)
      };

      if (editingProject) {
        await projectFacade.updateProject(currentCompany.id, editingProject.id, projectData);
        if (editingProject.status !== formData.status) {
          const isAlert = ['completed', 'on_hold', 'active'].includes(formData.status);
          await createNotification(
            currentCompany.id,
            recipients,
            'Mise à jour du Projet',
            `Le statut du projet "${formData.name}" est passé à "${formData.status}".`,
            isAlert ? 'alert' : 'project'
          );
        }
      } else {
        await projectFacade.createProject(currentCompany.id, { ...projectData, status: 'planned' });
        await createNotification(
          currentCompany.id,
          recipients,
          'Nouveau Projet',
          `Le projet "${formData.name}" a été créé.`,
          'project'
        );
      }
      setIsAddingProject(false);
      setEditingProject(null);
      setFormData({});
    } catch(err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'enregistrement du projet.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;
    try {
      await projectFacade.deleteProject(currentCompany.id, projectId);
    } catch(err) {
      console.error(err);
      alert("Une erreur est survenue lors de la suppression du projet.");
    }
  };

  const actorInfo = () => {
    const u = auth?.currentUser;
    return { id: u?.uid || currentCompany?.ownerId, name: u?.displayName || u?.email || currentCompany?.ownerEmail || 'Utilisateur' };
  };

  const recipientsFor = (assignedTo?: string) => {
    const assignee = personnelList.find(p => p.id === assignedTo);
    return collectTaskRecipients({ employees: currentCompany?.employees, ownerId: currentCompany?.ownerId, assigneeUid: assignee?.uid });
  };

  const resetNewTask = () => setNewTask({ title: '', description: '', assignedTo: '', projectId: '', priority: 'medium', startDate: '', endDate: '', needs: '', constraints: '' });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !newTask.title || taskSubmitting) return;
    setTaskSubmitting(true);
    try {
      await createTaskWithTracking({
        companyId: currentCompany.id,
        data: {
          ...newTask,
          startDate: newTask.startDate || null,
          endDate: newTask.endDate || null,
          dueDate: newTask.endDate || null,
          projectId: newTask.projectId || null,
        },
        actor: actorInfo(),
        recipients: recipientsFor(newTask.assignedTo),
      });
      setIsAddingTask(false);
      resetNewTask();
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la création de la tâche.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleTaskEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !evolvingTask || !evolution.status || taskSubmitting) return;
    setTaskSubmitting(true);
    try {
      await changeTaskStatus({
        companyId: currentCompany.id,
        taskId: evolvingTask.id,
        taskTitle: evolvingTask.title,
        fromStatus: evolvingTask.status,
        toStatus: evolution.status,
        comment: evolution.comment,
        actor: actorInfo(),
        recipients: recipientsFor(evolvingTask.assignedTo),
      });
      setEvolvingTask(null);
      setEvolution({ status: '', comment: '' });
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'évolution de la tâche.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    try {
      await taskFacade.delete(taskId);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la suppression de la tâche.");
    }
  };

  return (
    <div className="space-y-6">
      <datalist id="projects-list">
        {projects.map(p => <option key={p.id} value={p.name} />)}
      </datalist>

      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Projects</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Gérez vos projets complexes, collaborez avec vos partenaires et suivez vos engagements financiers.
            </p>
          </div>
          <div className="flex bg-slate-950/40 p-1.5 rounded-2xl border border-white/10 shrink-0 gap-1 overflow-x-auto scrollbar-hide max-w-full">
             {[
               { id: 'projects', label: 'Projets' },
               { id: 'tasks', label: 'Tâches' },
               { id: 'partners', label: 'Annuaires' },
               { id: 'financials', label: 'Flux Finaux' }
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] transition-all whitespace-nowrap flex items-center gap-2", 
                    activeView === item.id 
                     ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                     : "text-slate-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.label}
                  {item.id === 'tasks' && (
                    <>
                      {tasks.filter(t => t.status === 'blocked').length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      )}
                      {tasks.length > 0 && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[8px] font-black",
                          activeView === item.id ? "bg-white/20 text-white" : "bg-blue-600/20 text-blue-300"
                        )}>
                          {tasks.filter(t => t.status !== 'done').length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex gap-4 p-2 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex-1 bg-slate-50/50 rounded-2xl px-4 py-3 flex items-center gap-3 border border-slate-100 transition-all focus-within:border-blue-400 focus-within:bg-white">
              <Search className="text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Scanner les projets ou partenaires..." 
                className="flex-1 bg-transparent outline-none text-xs font-bold text-slate-600 placeholder:text-slate-300"
              />
            </div>
            <button onClick={() => alert("Indexation avancée...")} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-400 shadow-sm">
              <Filter size={18} />
            </button>
            <button 
              onClick={() => {
                if (activeView === 'financials') setIsAddingFinancial('expense');
                if (activeView === 'projects') setIsAddingProject(true);
                if (activeView === 'tasks') { resetNewTask(); setIsAddingTask(true); }
              }}
              className="px-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
            >
              <Plus size={16} /> DATA ENTRY
            </button>
          </div>

          {activeView === 'projects' ? (
            <Table headers={['Identifiant', 'Projet', 'Partenaire', 'Échéance', 'Status', 'Budget', 'Actions']}>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <span className="font-mono text-[10px] text-slate-400">#PRJ-{p.id.slice(0, 4).toUpperCase()}</span>
                  <span className="font-bold text-slate-800">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <Handshake size={14} className="text-slate-300" />
                    <span className="text-slate-600">{partners.find(part => part.id === p.partnerId)?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Calendar size={12} />
                    {p.endDate ? new Date((p.endDate.seconds || p.endDate / 1000) * 1000).toLocaleDateString() : 'En attente'}
                  </div>
                  <div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      p.status === 'active' ? "bg-green-100 text-green-700" :
                      p.status === 'completed' ? "bg-blue-100 text-blue-700" :
                      p.status === 'on_hold' ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-right font-mono text-slate-600 font-bold">
                    {p.budget?.toLocaleString()} FCFA
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingProject(p);
                        setFormData(p);
                        setIsAddingProject(true);
                      }}
                      className="p-1 px-2 border rounded-md hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-all font-bold text-[9px] flex items-center gap-1 uppercase"
                    >
                      <Edit2 size={10} /> Éditer
                    </button>
                    <button 
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-1 px-2 border border-red-50 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-600 transition-all font-bold text-[9px] flex items-center gap-1 uppercase"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </TableRow>
              ))}
              {projects.length === 0 && (
                <div className="p-12 text-center opacity-30 text-slate-400 italic text-xs">
                  Aucun projet actif à afficher.
                </div>
              )}
            </Table>
          ) : activeView === 'partners' ? (
            <Table headers={['Nom Partenaire', 'Type / Secteur', 'Dossiers', 'Contact Email', 'Lien']}>
              {partners.map((pt) => (
                <TableRow key={pt.id}>
                  <span className="font-bold text-slate-800">{pt.name}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded border",
                    pt.type === 'Supplier' ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-indigo-50 border-indigo-100 text-indigo-700"
                  )}>
                    {pt.type === 'Supplier' ? 'FOURNISSEUR' : 'PARTENAIRE'}
                  </span>
                  <div className="font-bold text-slate-500">{projects.filter(p => p.partnerId === pt.id).length}</div>
                  <div className="text-slate-400 font-medium truncate">{pt.contactEmail}</div>
                  <button onClick={() => alert("Redirection vers le profil public partenaire")} className="text-blue-600 hover:text-blue-800">
                    <ExternalLink size={14} />
                  </button>
                </TableRow>
              ))}
            </Table>
          ) : activeView === 'tasks' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={16} className="text-blue-600" />
                  Suivi des Tâches
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tasks.length}</span>
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">{tasks.filter(t => t.status === 'in_progress').length} en cours</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600">{tasks.filter(t => t.status === 'blocked').length} bloquées</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-600">{tasks.filter(t => t.status === 'done').length} terminées</span>
                </div>
              </div>

              {activeProjects.length > 0 && (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <FolderKanban size={13} className="text-blue-600" />
                      Projets en cours
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{activeProjects.length}</span>
                    </h4>
                    {taskProjectFilter && (
                      <button
                        onClick={() => setTaskProjectFilter(null)}
                        className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-all flex items-center gap-1"
                      >
                        <X size={10} /> Tous les projets
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {activeProjects.map(p => {
                      const pTasks = tasks.filter(t => t.projectId === p.id);
                      const pBlocked = pTasks.filter(t => t.status === 'blocked').length;
                      const pDone = pTasks.filter(t => t.status === 'done').length;
                      const pct = pTasks.length ? Math.round((pDone / pTasks.length) * 100) : 0;
                      const isActive = taskProjectFilter === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setTaskProjectFilter(isActive ? null : p.id)}
                          className={cn(
                            "text-left p-4 rounded-2xl border transition-all group",
                            isActive
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 animate-pulse" />
                                {p.name}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                                <Handshake size={10} /> {partners.find(part => part.id === p.partnerId)?.name || 'N/A'}
                              </p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-green-100 text-green-700 shrink-0">En cours</span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                              <Calendar size={10} /> {p.endDate ? new Date((p.endDate.seconds || p.endDate / 1000) * 1000).toLocaleDateString() : '—'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{pTasks.length} tâche{pTasks.length > 1 ? 's' : ''}</span>
                              {pBlocked > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">{pBlocked} bloquée{pBlocked > 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                              <span>Avancement</span>
                              <span className="text-blue-600">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {taskStats.blocked > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-red-100 bg-red-50/60">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-red-600">{taskStats.blocked} tâche{taskStats.blocked > 1 ? 's' : ''} bloquée{taskStats.blocked > 1 ? 's' : ''} nécessitent une action</p>
                    <p className="text-[10px] text-red-500/80 mt-0.5">Cliquez sur « Évoluer » pour changer le statut ou commenter l'avancement.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'all', label: 'Toutes' },
                  { id: 'todo', label: 'À faire' },
                  { id: 'in_progress', label: 'En cours' },
                  { id: 'blocked', label: 'Bloquées' },
                  { id: 'done', label: 'Terminées' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTaskFilter(f.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all",
                      taskFilter === f.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                    )}
                  >
                    {f.label}
                    <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[8px]", taskFilter === f.id ? "bg-white/20" : "bg-slate-100 text-slate-400")}>
                      {taskStats[f.id as keyof typeof taskStats]}
                    </span>
                  </button>
                ))}
              </div>

              <Table headers={['Tâche', 'Projet', 'Assigné', 'Échéance', 'Statut', 'Actions']}>
                {filteredTasks.map(t => {
                  const assignee = personnelList.find(p => p.id === t.assignedTo);
                  const project = projects.find(p => p.id === t.projectId);
                  return (
                    <TableRow key={t.id}>
                      <div className="min-w-[220px] max-w-[280px]">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="truncate">{t.title}</span>
                          {t.priority === 'high' && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                          {t.priority === 'medium' && <Activity size={12} className="text-amber-500 shrink-0" />}
                        </div>
                        {t.description && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{t.description}</p>}
                        {(t.needs || t.constraints) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.needs && <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Besoin : {t.needs}</span>}
                            {t.constraints && <span className="text-[8px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Contrainte : {t.constraints}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs">{project?.name || '—'}</span>
                      <span className="text-slate-600 text-xs">{assignee?.name || 'Non assigné'}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {t.endDate ? new Date(t.endDate.seconds ? t.endDate.seconds * 1000 : t.endDate).toLocaleDateString() : '—'}
                      </span>
                      <div>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", taskStatusBadge(t.status))}>
                          {taskStatusLabel(t.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setEvolvingTask(t); setEvolution({ status: '', comment: '' }); }}
                          className="p-1 px-2 border rounded-md hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-all font-bold text-[9px] flex items-center gap-1 uppercase"
                        >
                          <Activity size={10} /> Évoluer
                        </button>
                        <button
                          onClick={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                          className="p-1 px-2 border rounded-md hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-all font-bold text-[9px] flex items-center gap-1 uppercase"
                        >
                          Suivi
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 px-2 border border-red-50 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-600 transition-all font-bold text-[9px] flex items-center gap-1 uppercase"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </TableRow>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <div className="p-12 text-center opacity-30 text-slate-400 italic text-xs">
                    {taskProjectFilter ? 'Aucune tâche pour ce projet pour le moment.' : 'Aucune tâche à afficher. Cliquez sur « DATA ENTRY » pour en créer une.'}
                  </div>
                )}
              </Table>

              {expandedTask && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Activity size={14} className="text-blue-600" /> Journal des évolutions
                  </h4>
                  <div className="space-y-3">
                    {taskUpdates
                      .filter(u => u.taskId === expandedTask)
                      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
                      .map(u => (
                        <div key={u.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-600">{u.actorName || 'Utilisateur'}</span>
                              {u.fromStatus && u.toStatus && (
                                <span className="text-[9px] font-bold text-slate-400">
                                  {taskStatusLabel(u.fromStatus)} <span className="text-blue-500">→</span> {taskStatusLabel(u.toStatus)}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400">{u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleString() : ''}</span>
                            </div>
                            {u.comment && <p className="text-[10px] text-slate-500 mt-0.5">{u.comment}</p>}
                          </div>
                        </div>
                      ))}
                    {taskUpdates.filter(u => u.taskId === expandedTask).length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">Aucune évolution enregistrée pour l'instant.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Receipt size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">INVOICED</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facturation Totale</p>
                  <h4 className="text-xl font-bold text-slate-900">{invoices.reduce((acc, inv) => acc + inv.amount, 0).toLocaleString()} FCFA</h4>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                      <TrendingDown size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">EXPENSES</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dépenses Projets</p>
                  <h4 className="text-xl font-bold text-slate-900">{expenses.reduce((acc, exp) => acc + exp.amount, 0).toLocaleString()} FCFA</h4>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <CreditCard size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">PAYMENTS</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paiements Reçus</p>
                  <h4 className="text-xl font-bold text-slate-900">{payments.filter(p => p.type === 'inbound').reduce((acc, p) => acc + p.amount, 0).toLocaleString()} FCFA</h4>
                </div>
              </div>

              {/* Invoices Table */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt size={16} className="text-blue-600" />
                  Factures Projets
                </h3>
                <Table headers={['Projet', 'Partenaire', 'Montant', 'Échéance', 'Statut']}>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <span className="font-bold text-slate-700">{projects.find(p => p.id === inv.projectId)?.name || 'PRJ-EXP'}</span>
                      <span className="text-slate-500">{partners.find(p => p.id === inv.partnerId)?.name || 'PART-EXP'}</span>
                      <span className="font-mono font-bold text-slate-900">{inv.amount.toLocaleString()} FCFA</span>
                      <span className="text-[11px] text-slate-400">
                        {inv.dueDate ? new Date(inv.dueDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                        inv.status === 'paid' ? "bg-green-100 text-green-700" :
                        inv.status === 'overdue' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {inv.status}
                      </span>
                    </TableRow>
                  ))}
                </Table>
              </section>

              {/* Expenses & Payments Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <TrendingDown size={16} className="text-red-500" />
                    Dépenses Récentes
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-50">
                    {expenses.slice(0, 5).map(exp => (
                      <div key={exp.id} className="p-3 hover:bg-slate-50 transition-all flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{exp.description}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-medium">{exp.category} • {projects.find(p => p.id === exp.projectId)?.name}</p>
                        </div>
                        <span className="text-xs font-bold text-red-600">-{exp.amount.toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard size={16} className="text-green-500" />
                    Flux de Trésorerie
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-50">
                    {payments.slice(0, 5).map(pay => (
                      <div key={pay.id} className="p-3 hover:bg-slate-50 transition-all flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            pay.type === 'inbound' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          )}>
                            {pay.type === 'inbound' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{pay.type === 'inbound' ? 'Recette' : 'Décaissement'}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-medium">{projects.find(p => p.id === pay.projectId)?.name}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-bold",
                          pay.type === 'inbound' ? "text-green-600" : "text-red-600"
                        )}>
                          {pay.type === 'inbound' ? '+' : '-'}{pay.amount.toLocaleString()} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Résumé Budgétaire Projets</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Engagement Annuel</p>
                  <p className="text-3xl font-bold text-slate-900 tracking-tight">128,400 FCFA</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-green-600 uppercase">+12% vs LY</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>RÉPARTITION PAR STATUS</span>
                  <span className="text-blue-600">6 ACTIVE</span>
                </div>
                <div className="flex h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-[60%]" />
                  <div className="h-full bg-amber-500 w-[25%]" />
                  <div className="h-full bg-slate-300 w-[15%]" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Actif (60%)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pause (25%)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Autre (15%)</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-indigo-600 text-white p-5 rounded-lg relative overflow-hidden shadow-xl shadow-indigo-100">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-80">Audit Stratégique</h3>
            <p className="text-sm font-medium mb-6 leading-relaxed relative z-10 opacity-90">
              "La revue trimestrielle avec les partenaires clés est prévue pour la semaine prochaine."
            </p>
            <button onClick={() => alert("Ouverture du rapport d'audit...")} className="w-full bg-white text-indigo-600 py-2.5 rounded-lg text-xs font-bold shadow-sm relative z-10 hover:bg-slate-50 transition-all">
              OUVRIR LE DOSSIER
            </button>
            <FolderKanban className="absolute -bottom-6 -right-6 opacity-10 rotate-12" size={100} />
          </section>
        </div>
      </div>
      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FolderKanban size={24} className="text-blue-600" />
              {editingProject ? 'Modifier le Projet' : 'Nouveau Projet'}
            </h3>
            
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom du Projet</label>
                <input 
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description et détails</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 h-20"
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Partenaire</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={formData.partnerId || ''}
                    onChange={e => setFormData({...formData, partnerId: e.target.value})}
                  >
                    <option value="">(Optionnel) Choisir...</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Budget (FCFA)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={formData.budget || ''}
                    onChange={e => setFormData({...formData, budget: e.target.value})}
                  />
                </div>
              </div>

              {editingProject && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Status</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  value={formData.status || ''}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="planned">Planifié</option>
                  <option value="active">Actif</option>
                  <option value="completed">Terminé</option>
                  <option value="on_hold">En pause</option>
                </select>
              </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date de début</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={formData.startDate || ''}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date de fin</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={formData.endDate || ''}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAddingProject(false);
                    setEditingProject(null);
                    setFormData({});
                  }}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50"
                >
                  {submitting ? 'Traitement...' : (editingProject ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for adding financials */}
      {isAddingFinancial && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <DollarSign size={24} className="text-blue-600" />
              Nouveau {isAddingFinancial === 'expense' ? 'Achat / Dépense' : isAddingFinancial === 'invoice' ? 'Facturation' : 'Flux Paiement'}
            </h3>
            
            <form onSubmit={handleAddFinancial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Projet Concerné</label>
                <select 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  value={formData.projectId || ''}
                  onChange={e => setFormData({...formData, projectId: e.target.value})}
                >
                  <option value="">Sélectionner un projet...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Montant (FCFA)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={formData.amount || ''}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                {isAddingFinancial === 'invoice' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Statut</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                      value={formData.status || 'pending'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="pending">En attente</option>
                      <option value="paid">Payée</option>
                      <option value="overdue">En retard</option>
                    </select>
                  </div>
                ) : isAddingFinancial === 'payment' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type Flux</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                      value={formData.type || 'inbound'}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="inbound">Entrée (Recette)</option>
                      <option value="outbound">Sortie (Dépense)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Catégorie</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                      placeholder="e.g. Matériel, Transport"
                      value={formData.category || ''}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    />
                  </div>
                )}
              </div>

              {isAddingFinancial === 'invoice' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Partenaire</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={formData.partnerId || ''}
                    onChange={e => setFormData({...formData, partnerId: e.target.value})}
                  >
                    <option value="">Sélectionner le partenaire...</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 h-20"
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsAddingFinancial(null)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Tâche */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ClipboardList size={24} className="text-blue-600" />
              Nouvelle Tâche
            </h3>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Titre de la tâche *</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 h-16"
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Projet lié</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={newTask.projectId}
                    onChange={e => setNewTask({...newTask, projectId: e.target.value})}
                  >
                    <option value="">(Optionnel) Choisir...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Assigné à</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                  >
                    <option value="">Non assigné</option>
                    {personnelList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Priorité</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value})}
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Début</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={newTask.startDate}
                    onChange={e => setNewTask({...newTask, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Échéance</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                    value={newTask.endDate}
                    onChange={e => setNewTask({...newTask, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Besoins (ressources, matériel...)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  placeholder="e.g. 2 ouvriers, camion, 500 000 FCFA"
                  value={newTask.needs}
                  onChange={e => setNewTask({...newTask, needs: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contraintes (limites, dépendances...)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  placeholder="e.g. dépend du fournisseur X, budget plafonné"
                  value={newTask.constraints}
                  onChange={e => setNewTask({...newTask, constraints: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => { setIsAddingTask(false); resetNewTask(); }}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50"
                >
                  {taskSubmitting ? 'Traitement...' : 'Créer la Tâche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Évolution de tâche */}
      {evolvingTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity size={24} className="text-blue-600" />
              Évolution de la tâche
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              <span className="font-bold text-slate-700">{evolvingTask.title}</span>
              <span className="ml-2 text-[10px] font-bold uppercase">({taskStatusLabel(evolvingTask.status)})</span>
            </p>

            <form onSubmit={handleTaskEvolution} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nouveau statut</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  value={evolution.status}
                  onChange={e => setEvolution({...evolution, status: e.target.value})}
                >
                  <option value="">Choisir...</option>
                  {TASK_STATUS_ORDER.map(s => <option key={s} value={s}>{taskStatusLabel(s)}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Commentaire / Alerte</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 h-20"
                  placeholder="Précisez l'évolution, le blocage, la contrainte rencontrée..."
                  value={evolution.comment}
                  onChange={e => setEvolution({...evolution, comment: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setEvolvingTask(null)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50"
                >
                  {taskSubmitting ? 'Enregistrement...' : "Enregistrer l'évolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


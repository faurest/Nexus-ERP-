import React, { useState, useEffect } from 'react';
import { useDependencies } from '../core/di/DependencyProvider';

import { FolderKanban, Handshake, Search, Plus, Calendar, DollarSign, ExternalLink, Filter, CreditCard, Receipt, TrendingDown, ArrowUpRight, ArrowDownRight, Edit2, Trash2, MoreVertical } from 'lucide-react';
import Table, { TableRow } from './ui/Table';

import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import { createNotification } from '../lib/notifications';

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
  const { project: projectFacade, partner: partnerFacade, finance: financeFacade, invoice: invoiceFacade } = facades;
  const { currentCompany } = useCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeView, setActiveView] = useState<'projects' | 'partners' | 'financials'>('projects');
  const [isAddingFinancial, setIsAddingFinancial] = useState<'expense' | 'invoice' | 'payment' | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentCompany) return;

    const unsubProjects = projectFacade.observeProjects(currentCompany.id, setProjects);
    const unsubPartners = partnerFacade.observePartners(currentCompany.id, setPartners);
    const unsubExpenses = financeFacade.observeExpenses(currentCompany.id, setExpenses);
    const unsubInvoices = invoiceFacade.observeInvoices(currentCompany.id, setInvoices);
    const unsubPayments = financeFacade.observePayments(currentCompany.id, setPayments);

    return () => { 
      if (unsubProjects) unsubProjects(); 
      if (unsubPartners) unsubPartners(); 
      if (unsubExpenses) unsubExpenses();
      if (unsubInvoices) unsubInvoices();
      if (unsubPayments) unsubPayments();
    };
  }, [currentCompany, projectFacade, partnerFacade, financeFacade, invoiceFacade]);

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
               { id: 'partners', label: 'Annuaires' },
               { id: 'financials', label: 'Flux Finaux' }
             ].map(item => (
               <button 
                 key={item.id}
                 onClick={() => setActiveView(item.id as any)}
                 className={cn(
                   "px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] transition-all whitespace-nowrap", 
                   activeView === item.id 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                 )}
               >
                 {item.label}
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
    </div>
  );
}


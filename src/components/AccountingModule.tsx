import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, deleteDoc, doc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  PieChart as PieChartIcon, 
  DollarSign, 
  ArrowDownCircle, 
  ArrowUpCircle,
  FileText,
  Activity,
  Download,
  Sparkles,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import Table, { TableRow } from './ui/Table';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import { useSubNavigation } from '../hooks/useSubNavigation';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { getFinancialSuggestions } from '../lib/gemini';
import Markdown from 'react-markdown';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: any;
}

interface Sale {
  id: string;
  total: number;
  date: any;
  status: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function AccountingModule() {
  const { currentCompany } = useCompany();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: 0, category: 'Autres' });
  const [activeTab, setActiveTab] = useSubNavigation<'report' | 'expenses'>('accounting', 'report');
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const categories = ['Loyers', 'Salaires', 'Fournitures', 'Marketing', 'Logistique', 'Taxes', 'Autres'];

  useEffect(() => {
    if (!currentCompany) return;

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('companyId', '==', currentCompany.id)), snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('companyId', '==', currentCompany.id)), snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'sales'));

    return () => { unsubExpenses(); unsubSales(); };
  }, [currentCompany]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !newExpense.description || newExpense.amount <= 0) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        ...newExpense,
        amount: Number(newExpense.amount),
        companyId: currentCompany.id,
        date: serverTimestamp()
      });
      setIsAddingExpense(false);
      setNewExpense({ description: '', amount: 0, category: 'Autres' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'expenses');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'expenses');
    }
  };

  const totalRevenue = sales.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.total || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netIncome = totalRevenue - totalExpenses;
  const margeProfit = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0';
  
  const isRentable = netIncome > 0;

  // Real data processing for charts
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const data: Record<string, { name: string, revenue: number, expenses: number }> = {};

    // Current year months up to current month
    const now = new Date();
    for (let i = 0; i <= now.getMonth(); i++) {
        data[months[i]] = { name: months[i], revenue: 0, expenses: 0 };
    }

    sales.filter(s => s.status === 'completed').forEach(s => {
      if (!s.date) return;
      const d = new Date((s.date.seconds || s.date/1000) * 1000);
      const m = months[d.getMonth()];
      if (data[m]) data[m].revenue += s.total;
    });

    expenses.forEach(e => {
      if (!e.date) return;
      const d = new Date((e.date.seconds || e.date/1000) * 1000);
      const m = months[d.getMonth()];
      if (data[m]) data[m].expenses += e.amount;
    });

    return Object.values(data);
  }, [sales, expenses]);

  const pieData = categories.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((acc, e) => acc + e.amount, 0)
  })).filter(d => d.value > 0);

  const fetchAiSuggestions = async () => {
    setIsAnalyzing(true);
    const result = await getFinancialSuggestions({
      totalRevenue,
      totalExpenses,
      transactions: [
        ...sales.slice(0, 5).map(s => ({ type: 'revenue', amount: s.total, date: s.date })),
        ...expenses.slice(0, 5).map(e => ({ type: 'expense', amount: e.amount, date: e.date, desc: e.description }))
      ]
    });
    setAiSuggestions(result);
    setIsAnalyzing(false);
  };

  const exportToCSV = () => {
    const headers = ["Type", "Date", "Catégorie/Client", "Description", "Montant"];
    const rows = [
      ...sales.filter(s => s.status === 'completed').map(s => [
        "RECETTE",
        s.date ? new Date((s.date.seconds || s.date/1000) * 1000).toLocaleDateString() : 'N/A',
        "Client Direct",
        "Vente Produit/Service",
        s.total
      ]),
      ...expenses.map(e => [
        "DÉPENSE",
        e.date ? new Date((e.date.seconds || e.date/1000) * 1000).toLocaleDateString() : 'N/A',
        e.category,
        e.description,
        e.amount
      ])
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rapport_financier_${currentCompany?.name || 'nexus'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Finance</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Analysez la santé financière de votre organisation.
            </p>
          </div>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/10 shrink-0 gap-1">
            <button 
              onClick={() => setActiveTab('report')}
              className={cn("px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'report' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
            >
              Analyse
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              className={cn("px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'expenses' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
            >
              Journal
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'report' && (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={14} /> Exporter en CSV
            </button>
            <button 
              onClick={fetchAiSuggestions}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-400" />}
              {isAnalyzing ? "Analyse en cours..." : "Générer Conseils IA"}
            </button>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recettes (Entrées)</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{totalRevenue.toLocaleString()} FCFA</h3>
                <div className="flex items-center gap-1 text-green-500 mt-1">
                  <ArrowUpCircle size={14} />
                  <span className="text-[10px] font-bold">Flux entrant total</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                <TrendingUp size={28} />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dépenses (Sorties)</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{totalExpenses.toLocaleString()} FCFA</h3>
                <div className="flex items-center gap-1 text-red-500 mt-1">
                  <ArrowDownCircle size={14} />
                  <span className="text-[10px] font-bold">Charges opérationnelles</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                <TrendingDown size={28} />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "p-6 rounded-[2rem] border shadow-xl flex items-center justify-between",
                netIncome >= 0 ? "bg-blue-600 border-blue-500 text-white shadow-blue-200/50" : "bg-slate-900 border-slate-800 text-white shadow-slate-200/50"
              )}
            >
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Marge Nette ({margeProfit}%)</p>
                <h3 className="text-3xl font-black tracking-tighter">{netIncome.toLocaleString()} FCFA</h3>
                <p className="text-[10px] font-bold mt-1 opacity-80">
                  {isRentable ? "Rentabilité positive garantie" : "Déficit d'exploitation détecté"}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                <DollarSign size={28} />
              </div>
            </motion.div>
          </div>

          {/* AI Suggestions Block */}
          <AnimatePresence>
            {(aiSuggestions || isAnalyzing) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden text-white"
              >
                <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                      <Sparkles size={12} /> Analyse par Intelligence Artificielle
                    </div>
                  </div>
                  
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="animate-spin text-amber-400" size={40} />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Le Nexus Core analyse vos flux financiers...</p>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none prose-sm">
                      <Markdown>{aiSuggestions || ''}</Markdown>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!aiSuggestions && !isAnalyzing && (
            <div className="bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden text-white flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase", isRentable ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                    Diagnostic Statistique
                  </div>
                </div>
                <h3 className="text-xl font-black tracking-tight mb-2">Recommandation Opérationnelle</h3>
                <p className="text-sm font-medium text-slate-300 leading-relaxed max-w-3xl">
                  {isRentable 
                    ? `L'entreprise affiche une marge nette de ${margeProfit}%. Son modèle d'affaires dégage un bénéfice consistant. Songez à réinvestir ces marges directement dans les ressources ou le marketing pour augmenter le volume d'activité.`
                    : `L'entreprise ne couvre actuellement pas l'ensemble de ses charges (Marge Nette: ${margeProfit}%). Il est prioritaire de réduire les dépenses fixes non essentielles ou d'ajuster vos tarifs.`}
                </p>
                <div className="mt-4">
                  <button 
                    onClick={fetchAiSuggestions}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 hover:text-white transition-colors"
                  >
                    Obtenir une analyse IA détaillée →
                  </button>
                </div>
              </div>
              <div className="shrink-0 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/5 flex items-center justify-center">
                  <Activity className={isRentable ? "text-emerald-400" : "text-red-400"} size={32} />
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 h-[400px]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Évolution Réelle</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Comparatif entrées / sorties par mois</p>
                </div>
                <BarChartIcon className="text-slate-200" size={24} />
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Recettes" />
                  <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 h-[400px]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Structure des Coûts</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Répartition des charges par catégorie</p>
                </div>
                <PieChartIcon className="text-slate-200" size={24} />
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Performance Trend */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40"
          >
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tendance de Profitabilité</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Évolution linéaire de la performance</p>
                </div>
                <TrendingUp className="text-slate-200" size={24} />
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} name="Recettes" />
                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={4} dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }} name="Dépenses" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
            <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Journal des Sorties</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Registre chronologique des charges</p>
              </div>
              <button 
                onClick={() => setIsAddingExpense(true)}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                <Plus size={16} /> Enregistrer Charge
              </button>
            </div>

            <Table headers={['Date', 'Catégorie', 'Description', 'Montant', 'Actions']}>
              {expenses.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).map(expense => (
                <TableRow key={expense.id} className="hover:bg-slate-50 transition-colors">
                  <span className="text-[10px] font-bold text-slate-400">
                    {expense.date ? new Date((expense.date.seconds || expense.date/1000) * 1000).toLocaleDateString() : 'Auj.'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase border border-slate-200">
                    {expense.category}
                  </span>
                  <span className="font-bold text-slate-900">{expense.description}</span>
                  <span className="font-black text-red-600 font-mono tracking-tighter">
                    -{expense.amount.toLocaleString()} FCFA
                  </span>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableRow>
              ))}
            </Table>
          </div>
        </div>
      )}

      {/* Modal - Register Expense */}
      {isAddingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Plus size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Nouvelle Charge</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Enregistrement d'un flux de sortie</p>
              </div>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Libellé / Description</label>
                <input 
                  type="text" 
                  required
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="Ex: Facture d'électricité"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 font-bold text-sm transition-all text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-bold text-sm appearance-none cursor-pointer text-slate-900"
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Montant (FCFA)</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    value={newExpense.amount || ''}
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 font-mono font-bold text-sm transition-all text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddingExpense(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                >
                   Valider l'Écriture
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

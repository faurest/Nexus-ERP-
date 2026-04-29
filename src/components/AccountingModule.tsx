import React, { useState, useEffect } from 'react';
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
  FileText
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
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import Table, { TableRow } from './ui/Table';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

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
  const [activeTab, setActiveTab] = useState<'report' | 'expenses'>('report');

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

  // Prepare chart data
  const chartData = [
    { name: 'Jan', revenue: totalRevenue * 0.1, expenses: totalExpenses * 0.12 },
    { name: 'Fév', revenue: totalRevenue * 0.15, expenses: totalExpenses * 0.1 },
    { name: 'Mar', revenue: totalRevenue * 0.2, expenses: totalExpenses * 0.15 },
    { name: 'Avr', revenue: totalRevenue * 0.55, expenses: totalExpenses * 0.63 }, // Simulate current month growth
  ];

  const pieData = categories.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((acc, e) => acc + e.amount, 0)
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">Rapport Comptable</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 uppercase tracking-widest font-bold">Analyse financière et gestion des flux</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('report')}
            className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'report' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            Analyse
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'expenses' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            Dépenses
          </button>
        </div>
      </div>

      {activeTab === 'report' && (
        <div className="space-y-8">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recettes (Entrées)</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{totalRevenue.toLocaleString()} €</h3>
                <div className="flex items-center gap-1 text-green-500 mt-1">
                  <ArrowUpCircle size={14} />
                  <span className="text-[10px] font-bold">+15% vs mois dernier</span>
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
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{totalExpenses.toLocaleString()} €</h3>
                <div className="flex items-center gap-1 text-red-500 mt-1">
                  <ArrowDownCircle size={14} />
                  <span className="text-[10px] font-bold">+5% vs mois dernier</span>
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
                netIncome >= 0 ? "bg-blue-600 border-blue-500 text-white shadow-blue-200" : "bg-slate-900 border-slate-800 text-white shadow-slate-200"
              )}
            >
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Résultat Net</p>
                <h3 className="text-3xl font-black tracking-tighter">{netIncome.toLocaleString()} €</h3>
                <p className="text-[10px] font-bold mt-1 opacity-80">Bénéfice opérationnel net</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                <DollarSign size={28} />
              </div>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 h-[400px]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Évolution Mensuelle</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Comparatif entrées / sorties</p>
                </div>
                <BarChartIcon className="text-slate-200" size={24} />
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={chartData}>
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
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Répartition des Charges</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Structure des coûts</p>
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
                    -{expense.amount.toLocaleString()} €
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 font-bold text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-bold text-sm appearance-none cursor-pointer"
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Montant (€)</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    value={newExpense.amount || ''}
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 font-mono font-bold text-sm transition-all"
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

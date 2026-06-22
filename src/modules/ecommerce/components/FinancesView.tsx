import React from 'react';
import { Order } from '../types';
import { Activity, DollarSign, ShieldCheck, TrendingUp } from 'lucide-react';

interface FinancesViewProps {
  orders: Order[];
  currentCompany: any;
  isAdmin: boolean;
}

export default function FinancesView({ orders, currentCompany, isAdmin }: FinancesViewProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Facturation Nexus ERP</h2>
          <p className="text-slate-500 font-medium mt-1">Gérez vos frais d'utilisation progressifs basés sur vos ventes réelles (Abonnement Évolutif).</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-200">
            Plan Maroua (Performance)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Chiffre d'Affaire */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-8">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Activity size={24} />
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Total Ventes (Converties)</h3>
          <p className="text-4xl font-black text-slate-900 tracking-tight">
            {orders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + (o.subtotal || o.total || 0), 0).toLocaleString()} <span className="text-xl text-slate-400">FCFA</span>
          </p>
        </div>

        {/* Commissions Nexus */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl shadow-slate-900/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <DollarSign size={24} />
            </div>
          </div>
          <h3 className="text-sm font-black text-white/50 uppercase tracking-widest mb-1">Total Commissions Nexus (4%)</h3>
          <p className="text-4xl font-black text-white tracking-tight">
            {orders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + (o.nexusCommission || Math.round((o.subtotal || o.total || 0) * 0.04)), 0).toLocaleString()} <span className="text-xl text-indigo-400">FCFA</span>
          </p>
        </div>

        {/* Status Actuel */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-8">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Modèle de facturation</h3>
          <p className="text-lg font-black text-slate-900 tracking-tight mb-2">Pas de fixe menseul (Évolutif)</p>
          <p className="text-xs text-slate-500 font-medium">Vous ne payez que les 4% lorsque vous vendez.</p>
        </div>
      </div>

      {/* Liste des ventes avec commissions */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Historique des Commissions</h3>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">Sur vos ventes finalisées</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Commande</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Montant Vente</th>
                <th className="py-4 px-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100">Part Nexus</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => o.status === 'DELIVERED').sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).map((order) => {
                const commission = order.nexusCommission || Math.round((order.subtotal || order.total || 0) * 0.04);
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6 text-sm font-bold text-slate-900 border-b border-slate-50">
                      {order.date ? new Date(order.date.seconds * 1000).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="py-4 px-6 border-b border-slate-50">
                      <div className="text-sm font-black text-slate-900">{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.items?.length || 0} article(s)</div>
                    </td>
                    <td className="py-4 px-6 border-b border-slate-50">
                      <div className="text-sm font-black text-slate-900">{(order.subtotal || order.total || 0).toLocaleString()} FCFA</div>
                    </td>
                    <td className="py-4 px-6 border-b border-slate-50">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-xs font-black">
                        +{commission.toLocaleString()} FCFA
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.filter(o => o.status === 'DELIVERED').length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Aucune vente finalisée pour générer des commissions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

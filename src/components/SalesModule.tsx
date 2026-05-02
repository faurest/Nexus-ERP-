import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Search, Plus, TrendingUp, Filter, ShoppingCart, Receipt, CreditCard, DollarSign, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';

interface Sale {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
  clientId: string;
  clientName?: string;
  status: 'completed' | 'pending_payment';
  date: any;
  type: 'product' | 'service';
}

interface Invoice {
  id: string;
  saleId: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'unpaid';
  date: any;
}

export default function SalesModule() {
  const { currentCompany } = useCompany();
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'invoices' | 'reports' | 'pos'>('sales');
  const [isAdding, setIsAdding] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<any>({ type: 'product', quantity: 1, price: 0 });

  useEffect(() => {
    if (!currentCompany) return;

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('companyId', '==', currentCompany.id)), snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'sales'));

    const unsubInvoices = onSnapshot(query(collection(db, 'sales_invoices'), where('companyId', '==', currentCompany.id)), snap => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'sales_invoices'));

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('companyId', '==', currentCompany.id)), snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubResources = onSnapshot(query(collection(db, 'resources'), where('companyId', '==', currentCompany.id)), snap => {
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'resources'));

    return () => { unsubSales(); unsubInvoices(); unsubExpenses(); unsubResources(); };
  }, [currentCompany]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    
    try {
      const total = Number(formData.quantity) * Number(formData.price);
      if (editingSale) {
        await updateDoc(doc(db, 'sales', editingSale.id), {
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
          total,
          updatedAt: serverTimestamp()
        });
      } else {
        const saleRef = await addDoc(collection(db, 'sales'), {
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
          total,
          companyId: currentCompany.id,
          status: 'pending_payment',
          date: serverTimestamp()
        });

        // Automatically create an invoice for this sale
        const invoiceNumber = `FA-${Date.now().toString().slice(-6)}`;
        await addDoc(collection(db, 'sales_invoices'), {
          saleId: saleRef.id,
          invoiceNumber,
          amount: total,
          status: 'unpaid',
          companyId: currentCompany.id,
          date: serverTimestamp()
        });
      }

      setIsAdding(false);
      setEditingSale(null);
      setFormData({ type: 'product', quantity: 1, price: 0 });
    } catch(err) {
      handleFirestoreError(err, editingSale ? OperationType.UPDATE : OperationType.WRITE, 'sales');
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Supprimez cette vente ? Cela ne supprimera pas la facture associée.')) return;
    try {
      await deleteDoc(doc(db, 'sales', saleId));
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, 'sales');
    }
  };

  const calculateTotalRevenue = () => sales.filter(s => s.status === 'completed').reduce((acc, sum) => acc + sum.total, 0);
  const calculatePendingRevenue = () => invoices.filter(s => s.status === 'unpaid').reduce((acc, sum) => acc + sum.amount, 0);
  const calculateTotalExpenses = () => expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider">Ventes & Facturation</h2>
          <p className="text-xs text-slate-500 font-medium">Gérez la vente de vos produits, services et factures associées.</p>
        </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
           <button 
              onClick={() => setActiveTab('pos')}
              className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'pos' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200")}
           >
              Caisse (POS)
           </button>
           <button 
              onClick={() => setActiveTab('sales')}
              className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'sales' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200")}
           >
              Ventes
           </button>
           <button 
              onClick={() => setActiveTab('invoices')}
              className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'invoices' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200")}
           >
              Factures
           </button>
           <button 
              onClick={() => setActiveTab('reports')}
              className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'reports' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200")}
           >
              Bilan
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
           <div className="flex justify-between items-center mb-2"><div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={18}/></div></div>
           <p className="text-xs font-bold text-slate-400 uppercase">Chiffre d'Affaires Encaissé</p>
           <p className="text-2xl font-black text-slate-900">{calculateTotalRevenue().toLocaleString()} FCFA</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
           <div className="flex justify-between items-center mb-2"><div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Receipt size={18}/></div></div>
           <p className="text-xs font-bold text-slate-400 uppercase">Facturation en attente</p>
           <p className="text-2xl font-black text-slate-900">{calculatePendingRevenue().toLocaleString()} FCFA</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
             <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Search size={14} className="text-slate-400"/>
                <input type="text" placeholder="Recherche..." className="bg-transparent outline-none text-xs w-48"/>
             </div>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100">
             <Plus size={14} /> Nouvelle Vente
          </button>
        </div>

        {activeTab === 'sales' && (
          <Table headers={['Date', 'Type', 'Article/Service', 'Qté', 'Prix U.', 'Total', 'Statut', 'Actions']}>
            {sales.map(sale => (
              <TableRow key={sale.id}>
                <span className="text-[10px] font-bold text-slate-400">{sale.date ? new Date((sale.date.seconds || sale.date / 1000) * 1000).toLocaleDateString() : 'Auj'}</span>
                <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold", sale.type === 'product' ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700")}>{sale.type === 'product' ? 'Produit' : 'Service'}</span>
                <span className="font-bold text-slate-800">{sale.itemName}</span>
                <span className="text-slate-600 font-mono">{sale.quantity}</span>
                <span className="text-slate-600 font-mono">{sale.price.toLocaleString()} FCFA</span>
                <span className="font-black text-slate-900 font-mono">{sale.total.toLocaleString()} FCFA</span>
                <span className={cn("px-2 py-0.5 rounded text-[9px] uppercase font-bold border", sale.status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                  {sale.status === 'completed' ? 'PAYÉ' : 'EN ATTENTE'}
                </span>
                <div className="flex items-center gap-2">
                   {sale.status !== 'completed' && (
                     <button 
                       onClick={async () => {
                         try {
                           await updateDoc(doc(db, 'sales', sale.id), { status: 'completed' });
                         } catch (err) {
                           handleFirestoreError(err, OperationType.UPDATE, 'sales');
                         }
                       }}
                       className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                       title="Marquer comme payé"
                     >
                       <CheckCircle2 size={14} />
                     </button>
                   )}
                   <button onClick={() => { setEditingSale(sale); setFormData(sale); setIsAdding(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                   <button onClick={() => handleDeleteSale(sale.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              </TableRow>
            ))}
          </Table>
        )}

        {activeTab === 'pos' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 border-t border-slate-200">
            <div className="lg:col-span-2 space-y-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Catalogue (Produits & Boissons)</h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                 {resources.filter(r => r.type === 'Stock').map(r => (
                   <button 
                     key={r.id} 
                     onClick={() => {
                        const existing = cart.find(c => c.id === r.id);
                        if (existing) {
                           setCart(cart.map(c => c.id === r.id ? { ...c, quantity: c.quantity + 1 } : c));
                        } else {
                           setCart([...cart, { id: r.id, name: r.name, price: 5, quantity: 1 }]); // Default price 5 if none
                        }
                     }}
                     className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col justify-between h-24 relative overflow-hidden group"
                   >
                     <span className="text-xs font-bold text-slate-700 break-words line-clamp-2">{r.name}</span>
                     <div className="mt-auto flex justify-between items-end">
                       <span className="text-[10px] font-bold text-slate-400">Stock: {r.quantity}</span>
                     </div>
                     <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </button>
                 ))}
                 {resources.length === 0 && <p className="text-xs text-slate-400">Aucun produit en stock.</p>}
               </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-[500px]">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <ShoppingCart size={16} /> Panier Courant
               </h3>
               
               <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                 {cart.length === 0 ? (
                   <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                     Panier vide
                   </div>
                 ) : (
                   cart.map(item => (
                     <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div className="flex-1 min-w-0 pr-2">
                         <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                         <div className="flex items-center gap-2 mt-1">
                           <button onClick={() => {
                              if (item.quantity > 1) {
                                setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity - 1 } : c));
                              } else {
                                setCart(cart.filter(c => c.id !== item.id));
                              }
                           }} className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-xs hover:bg-slate-100">-</button>
                           <span className="text-[10px] font-bold w-4 text-center">{item.quantity}</span>
                           <button onClick={() => {
                              setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
                           }} className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-xs hover:bg-slate-100">+</button>
                         </div>
                       </div>
                       <div className="text-right shrink-0">
                         <div className="text-xs font-black text-slate-900 border-b border-transparent group-hover:border-slate-200 focus-within:border-blue-400 pb-0.5">
                           <input type="number" className="w-12 text-right bg-transparent outline-none" value={item.price} onChange={(e) => {
                             setCart(cart.map(c => c.id === item.id ? { ...c, price: Number(e.target.value) } : c));
                           }} /> FCFA
                         </div>
                         <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-[9px] text-red-500 hover:underline mt-1 font-bold">Retirer</button>
                       </div>
                     </div>
                   ))
                 )}
               </div>

               <div className="mt-4 pt-4 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-xs font-bold uppercase text-slate-500">Total à encaisser</span>
                   <span className="text-2xl font-black text-slate-900">{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} FCFA</span>
                 </div>
                 <button 
                   disabled={cart.length === 0}
                   onClick={async () => {
                     try {
                        const batchSales = cart.map(item => ({
                          itemName: item.name,
                          quantity: item.quantity,
                          price: item.price,
                          total: item.quantity * item.price,
                          type: 'product',
                          status: 'completed',
                          companyId: currentCompany.id,
                          date: serverTimestamp()
                        }));
                        for (let s of batchSales) {
                           const res = await addDoc(collection(db, 'sales'), s);
                           await addDoc(collection(db, 'sales_invoices'), {
                              saleId: res.id,
                              invoiceNumber: `FA-POS-${Date.now().toString().slice(-6)}`,
                              amount: s.total,
                              status: 'paid',
                              companyId: currentCompany.id,
                              date: serverTimestamp()
                           });
                        }
                        setCart([]);
                        alert('Encaissement réussi !');
                     } catch(e) {
                        alert('Erreur lors de l\'encaissement');
                        console.error(e);
                     }
                   }}
                   className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-95 flex justify-center items-center gap-2"
                 >
                   <CheckCircle2 size={16} /> Valider l'Encaissement
                 </button>
                 <button onClick={() => setCart([])} disabled={cart.length === 0} className="w-full mt-2 text-center text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 disabled:opacity-50 py-2">
                   Vider le panier
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <Table headers={['N° Facture', 'Vente Liée', 'Date', 'Montant', 'Statut']}>
            {invoices.map(inv => (
              <TableRow key={inv.id}>
                <span className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</span>
                <span className="text-slate-600 text-xs">{sales.find(s => s.id === inv.saleId)?.itemName || 'Inconnu'}</span>
                <span className="text-[10px] font-bold text-slate-400">{inv.date ? new Date(inv.date.seconds * 1000).toLocaleDateString() : 'Auj'}</span>
                <span className="font-black text-slate-900 font-mono">{inv.amount.toLocaleString()} FCFA</span>
                <span className={cn("px-2 py-0.5 rounded text-[9px] uppercase font-bold border", inv.status === 'paid' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                  {inv.status === 'paid' ? 'RÉGLÉE' : 'IMPAYÉE'}
                </span>
              </TableRow>
            ))}
          </Table>
        )}

        {activeTab === 'reports' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border-t border-slate-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <TrendingUp size={32} className="text-green-500 mb-4" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Entrées</h3>
              <p className="text-4xl font-black text-slate-900 mt-2">{calculateTotalRevenue().toLocaleString()} FCFA</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <TrendingUp size={32} className="text-red-500 mb-4 rotate-180" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Sorties (Dépenses)</h3>
              <p className="text-4xl font-black text-slate-900 mt-2">{calculateTotalExpenses().toLocaleString()} FCFA</p>
            </div>

            <div className="md:col-span-2 bg-slate-900 p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rapport Global (Balance)</h3>
                <p className="text-5xl font-black text-white">{(calculateTotalRevenue() - calculateTotalExpenses()).toLocaleString()} FCFA</p>
              </div>
              <div className="text-right">
                <span className={cn("px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest", (calculateTotalRevenue() - calculateTotalExpenses()) >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                  {(calculateTotalRevenue() - calculateTotalExpenses()) >= 0 ? 'Balance Positive' : 'Balance Négative'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingCart size={24} className="text-blue-600" />
              {editingSale ? 'Modifier la vente' : 'Enregistrer une vente'}
            </h3>
            <form onSubmit={handleCreateSale} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type de Vente</label>
                   <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                     <option value="product">Produit Matériel</option>
                     <option value="service">Service (Prestation)</option>
                   </select>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Client/Partenaire</label>
                   <input type="text" placeholder="Nom du client" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} required/>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom de l'article / service</label>
                 <input type="text" placeholder="Design Web, Ordinateur, etc." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={formData.itemName || ''} onChange={e => setFormData({...formData, itemName: e.target.value})} required/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Quantité</label>
                   <input type="number" step="0.5" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: e.target.value})} required/>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prix Unitaire (FCFA)</label>
                   <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} required/>
                 </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-slate-800">
                 <span className="text-xs font-bold uppercase text-slate-400">Total</span>
                 <span className="text-xl font-black">{(Number(formData.quantity || 0) * Number(formData.price || 0)).toLocaleString()} FCFA</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button type="button" onClick={() => { setIsAdding(false); setEditingSale(null); setFormData({ type: 'product', quantity: 1, price: 0 }); }} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono">{editingSale ? 'Mettre à jour' : 'Facturer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

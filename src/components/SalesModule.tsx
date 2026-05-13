import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, setDoc, serverTimestamp, doc, updateDoc, deleteDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Search, Plus, TrendingUp, Filter, ShoppingCart, Receipt, CreditCard, DollarSign, Edit2, Trash2, CheckCircle2, ArrowRight, HelpCircle } from 'lucide-react';
import { HelpTrigger } from './ContextualHelp';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/firebase';
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
  saleId?: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'unpaid';
  date: any;
  clientName?: string;
  tableNumber?: string;
  items?: any[];
}

export default function SalesModule() {
  const { currentCompany } = useCompany();
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]); // Current new cart if no active order is selected
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [newOrderName, setNewOrderName] = useState('');
  const [newOrderTable, setNewOrderTable] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'invoices' | 'reports' | 'pos' | 'orders' | 'payments' | 'catalog'>('pos');
  const [payments, setPayments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<any>({ type: 'product', quantity: 1, price: 0 });
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Espèces', reference: '' });
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [catalogType, setCatalogType] = useState<'product' | 'service'>('product');
  const [isAddingCatalogItem, setIsAddingCatalogItem] = useState(false);
  const [catalogFormData, setCatalogFormData] = useState<any>({ name: '', price: 0, quantity: 0, type: 'Stock' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentCompany) return;

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('companyId', '==', currentCompany.id)), snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'sales'));

    const unsubInvoices = onSnapshot(query(collection(db, 'sales_invoices'), where('companyId', '==', currentCompany.id)), snap => {
      setInvoices(snap.docs.map(d => {
        const data = d.data();
        let items = data.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items) } catch(e) { items = [] }
        }
        return { id: d.id, ...data, items } as Invoice;
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'sales_invoices'));

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('companyId', '==', currentCompany.id)), snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubResources = onSnapshot(query(collection(db, 'resources'), where('companyId', '==', currentCompany.id)), snap => {
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'resources'));

    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('companyId', '==', currentCompany.id)), snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'clients'));

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('companyId', '==', currentCompany.id)), snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'payments'));

    const unsubServices = onSnapshot(query(collection(db, 'services'), where('companyId', '==', currentCompany.id)), snap => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'services'));

    const unsubOpenOrders = onSnapshot(query(collection(db, 'open_orders'), where('companyId', '==', currentCompany.id)), snap => {
      // Need to ensure items is parsed correctly if it's coming from standard firebase mock or sqlite
      setOpenOrders(snap.docs.map(d => {
        const data = d.data();
        let items = data.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items) } catch(e) { items = [] }
        }
        return { id: d.id, ...data, items };
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'open_orders'));

    return () => { unsubSales(); unsubInvoices(); unsubExpenses(); unsubResources(); unsubClients(); unsubOpenOrders(); unsubPayments(); unsubServices(); };
  }, [currentCompany]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !selectedInvoice || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'payments'), {
        companyId: currentCompany.id,
        invoiceId: selectedInvoice.id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference,
        date: serverTimestamp()
      });

      // Update invoice status if fully paid (simple check for now)
      const totalPaid = payments.filter(p => p.invoiceId === selectedInvoice.id).reduce((sum, p) => sum + p.amount, 0) + Number(paymentForm.amount);
      if (totalPaid >= selectedInvoice.amount) {
        await updateDoc(doc(db, 'sales_invoices', selectedInvoice.id), { 
          status: 'paid',
          updatedAt: serverTimestamp()
        });
      }

      setIsAddingPayment(false);
      setSelectedInvoice(null);
      setPaymentForm({ amount: 0, method: 'Espèces', reference: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'payments');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;
    setSubmitting(true);
    try {
      if (catalogType === 'product') {
        if (catalogFormData.id) {
          await updateDoc(doc(db, 'resources', catalogFormData.id), {
             ...catalogFormData,
             price: Number(catalogFormData.price),
             quantity: Number(catalogFormData.quantity),
             updatedAt: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, 'resources'), {
            ...catalogFormData,
            companyId: currentCompany.id,
            price: Number(catalogFormData.price),
            quantity: Number(catalogFormData.quantity),
            type: 'Stock',
            createdAt: serverTimestamp()
          });
        }
      } else {
        if (catalogFormData.id) {
          await updateDoc(doc(db, 'services', catalogFormData.id), {
            ...catalogFormData,
            price: Number(catalogFormData.price),
            updatedAt: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, 'services'), {
            ...catalogFormData,
            companyId: currentCompany.id,
            price: Number(catalogFormData.price),
            createdAt: serverTimestamp()
          });
        }
      }
      setIsAddingCatalogItem(false);
      setCatalogFormData({ name: '', price: 0, quantity: 0, type: 'Stock' });
    } catch (err) {
       console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;
    
    setSubmitting(true);
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

        const invoiceNumber = `FA-${Date.now().toString().slice(-6)}`;
        await addDoc(collection(db, 'sales_invoices'), {
          saleId: saleRef.id,
          invoiceNumber,
          amount: total,
          status: 'unpaid',
          companyId: currentCompany.id,
          date: serverTimestamp(),
          clientName: formData.clientName || '',
          items: JSON.stringify([{
            name: formData.itemName,
            quantity: Number(formData.quantity),
            price: Number(formData.price),
            total
          }])
        });

        if (formData.clientName) {
           const existingClient = clients.find(c => c.name.toLowerCase().trim() === formData.clientName.toLowerCase().trim());
           if (!existingClient) {
              const cleanName = formData.clientName.trim();
              const tempId = `client_guest_${Date.now()}`;
              await setDoc(doc(db, 'clients', tempId), {
                 companyId: currentCompany.id,
                 name: cleanName,
                 email: '',
                 phone: '',
                 address: '',
                 salesTotal: total,
                 loyaltyPoints: Math.floor(total / 1000),
                 createdAt: serverTimestamp()
              });
           }
        }
      }

      setIsAdding(false);
      setEditingSale(null);
      setFormData({ type: 'product', quantity: 1, price: 0 });
    } catch(err) {
      handleFirestoreError(err, editingSale ? OperationType.UPDATE : OperationType.WRITE, 'sales');
    } finally {
      setSubmitting(false);
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

  const activeOrder = activeOrderId ? openOrders.find(o => o.id === activeOrderId) : null;
  const currentCart = activeOrder ? activeOrder.items : cart;

  const handleUpdateCart = async (newCart: any[]) => {
    if (activeOrderId) {
      try {
        await updateDoc(doc(db, 'open_orders', activeOrderId), {
          items: newCart,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'open_orders');
      }
    } else {
      setCart(newCart);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || (!newOrderName && !newOrderTable) || submitting) return;
    setSubmitting(true);
    try {
      const res = await addDoc(collection(db, 'open_orders'), {
        companyId: currentCompany.id,
        clientName: newOrderName,
        tableNumber: newOrderTable,
        items: [],
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      if (newOrderName) {
         const existingClient = clients.find(c => c.name.toLowerCase().trim() === newOrderName.toLowerCase().trim());
         if (!existingClient) {
            const cleanName = newOrderName.trim();
            const tempId = `client_order_${Date.now()}`;
            await setDoc(doc(db, 'clients', tempId), {
               companyId: currentCompany.id,
               name: cleanName,
               email: '',
               phone: '',
               address: '',
               salesTotal: 0,
               loyaltyPoints: 0,
               createdAt: serverTimestamp()
            });
         }
      }

      setActiveOrderId(res.id);
      setIsAddingOrder(false);
      setNewOrderName('');
      setNewOrderTable('');
    } catch(err) {
      handleFirestoreError(err, OperationType.WRITE, 'open_orders');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette commande en cours ?')) return;
    try {
      if (activeOrderId === id) setActiveOrderId(null);
      await deleteDoc(doc(db, 'open_orders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'open_orders');
    }
  };

  return (
    <div className="space-y-6">
      <datalist id="clients-list">
        {clients.slice().sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name} />)}
      </datalist>

      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Growth</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Supervisez vos cycles de vente, gérez les factures et analysez vos performances.
            </p>
          </div>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/10 shrink-0 gap-1 overflow-x-auto scrollbar-hide max-w-full">
             {[
               { id: 'pos', label: 'POS' },
               { id: 'orders', label: 'Commandes' },
               { id: 'invoices', label: 'Facturation' },
               { id: 'payments', label: 'Paiements' },
               { id: 'catalog', label: 'Catalogue' },
               { id: 'reports', label: 'Bilan' }
             ].map(item => (
               <button 
                 key={item.id}
                 onClick={() => setActiveTab(item.id as any)}
                 className={cn(
                   "px-6 py-2.5 rounded-lg text-[10px] uppercase font-black tracking-[0.1em] transition-all whitespace-nowrap", 
                   activeTab === item.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                 )}
               >
                 {item.label}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
             <HelpTrigger topic="SALES" className="text-white/60 hover:text-white" />
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50">
            {openOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{order.clientName || 'Client Inconnu'}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.tableNumber ? `Table ${order.tableNumber}` : 'Sans table'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-tighter">En cours</span>
                    <button onClick={(e) => handleDeleteOrder(order.id, e)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-medium">{item.quantity}x {item.name}</span>
                      <span className="text-slate-900 font-bold">{((item.price || 0) * item.quantity).toLocaleString()} F</span>
                    </div>
                  ))}
                  {(!order.items || order.items.length === 0) && <p className="text-[10px] text-slate-400 italic">Aucun article dans cette commande.</p>}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</div>
                  <div className="text-lg font-black text-slate-900">{order.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0).toLocaleString()} FCFA</div>
                </div>

                <button 
                  onClick={() => { setActiveOrderId(order.id); setActiveTab('pos'); }}
                  className="w-full mt-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                >
                  Ouvrir dans POS
                </button>
              </div>
            ))}
            <button 
              onClick={() => setIsAddingOrder(true)}
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all group"
            >
              <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><Plus size={24} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Nouvelle Commande</span>
            </button>
          </div>
        )}

        {activeTab === 'sales' && (
          <Table headers={['Date', 'Type', 'Article/Service', 'Qté', 'Prix U.', 'Total', 'Statut', 'Actions']}>
            {sales.map(sale => (
              <TableRow key={sale.id}>
                <span className="text-[10px] font-bold text-slate-400">{sale.date ? new Date((sale.date.seconds || sale.date / 1000) * 1000).toLocaleDateString() : 'Auj'}</span>
                <div className="flex flex-col">
                  <button 
                    onClick={() => setSelectedClientName(sale.clientName || null)}
                    className="font-bold text-slate-800 text-left hover:text-blue-600 hover:underline outline-none"
                  >
                    {sale.itemName}
                  </button>
                  {sale.clientName && <span className="text-[8px] text-slate-400 font-bold uppercase">{sale.clientName}</span>}
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold", sale.type === 'product' ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700")}>{sale.type === 'product' ? 'Produit' : 'Service'}</span>
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
                           await updateDoc(doc(db, 'sales', sale.id), { 
                             status: 'completed',
                             updatedAt: serverTimestamp()
                           });
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
          <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 bg-slate-50 border-t border-slate-200">
            {/* Commandes en Cours Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-[500px]">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Commandes</h3>
                 <button 
                   onClick={() => setIsAddingOrder(true)}
                   className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-all"
                 >
                   <Plus size={16} />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                 <button 
                   onClick={() => setActiveOrderId(null)}
                   className={cn(
                     "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between",
                     activeOrderId === null ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800"
                   )}
                 >
                   <div>
                     <span className="text-xs font-bold block">Vente Rapide</span>
                     <span className={cn("text-[10px]", activeOrderId === null ? "text-slate-300" : "text-slate-500")}>Client de passage</span>
                   </div>
                 </button>

                 {openOrders.map(order => (
                   <button 
                     key={order.id}
                     onClick={() => setActiveOrderId(order.id)}
                     className={cn(
                       "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group",
                       activeOrderId === order.id ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 hover:border-blue-300 text-slate-800"
                     )}
                   >
                     <div>
                       <span className="text-xs font-bold block">{order.clientName || 'Client'} {order.tableNumber ? `- Table ${order.tableNumber}` : ''}</span>
                       <span className={cn("text-[10px]", activeOrderId === order.id ? "text-blue-200" : "text-slate-500")}>
                         {order.items?.length || 0} article(s)
                       </span>
                     </div>
                     <div 
                       onClick={(e) => handleDeleteOrder(order.id, e)}
                       className={cn(
                         "p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100",
                         activeOrderId === order.id ? "text-white hover:bg-white/20" : "text-red-500 hover:bg-red-50"
                       )}
                     >
                       <Trash2 size={14} />
                     </div>
                   </button>
                 ))}
               </div>
            </div>

            {/* Main Catalogue */}
            <div className="lg:col-span-2 space-y-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Catalogue (Produits & Boissons)</h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
                 {resources.filter(r => r.type === 'Stock').map(r => (
                   <button 
                     key={r.id} 
                     onClick={() => {
                        const existing = currentCart.find((c: any) => c.id === r.id);
                        let newCart;
                        if (existing) {
                           newCart = currentCart.map((c: any) => c.id === r.id ? { ...c, quantity: c.quantity + 1 } : c);
                        } else {
                           newCart = [...currentCart, { id: r.id, name: r.name, price: r.price || 0, quantity: 1 }];
                        }
                        handleUpdateCart(newCart);
                     }}
                     className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col justify-between h-24 relative overflow-hidden group"
                   >
                     <span className="text-xs font-bold text-slate-700 break-words line-clamp-2">{r.name}</span>
                     <div className="mt-auto flex justify-between items-end">
                       <span className="text-[10px] font-bold text-slate-400">Stock: {r.quantity}</span>
                       <span className="text-[10px] font-bold text-slate-900">{r.price ? `${r.price} FCFA` : ''}</span>
                     </div>
                     <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </button>
                 ))}
                 {resources.length === 0 && <p className="text-xs text-slate-400">Aucun produit en stock.</p>}
               </div>
            </div>
            
            {/* Cart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-[500px]">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <ShoppingCart size={16} /> Panier {activeOrder ? `(${activeOrder.clientName})` : ''}
               </h3>
               
               <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                 {currentCart.length === 0 ? (
                   <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                     Panier vide
                   </div>
                 ) : (
                   currentCart.map((item: any) => (
                     <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div className="flex-1 min-w-0 pr-2">
                         <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                         <div className="flex items-center gap-2 mt-1">
                           <button onClick={() => {
                              if (item.quantity > 1) {
                                handleUpdateCart(currentCart.map((c: any) => c.id === item.id ? { ...c, quantity: c.quantity - 1 } : c));
                              } else {
                                handleUpdateCart(currentCart.filter((c: any) => c.id !== item.id));
                              }
                           }} className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-xs hover:bg-slate-100">-</button>
                           <span className="text-[10px] font-bold w-4 text-center">{item.quantity}</span>
                           <button onClick={() => {
                              handleUpdateCart(currentCart.map((c: any) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
                           }} className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-xs hover:bg-slate-100">+</button>
                         </div>
                       </div>
                       <div className="text-right shrink-0">
                         <div className="text-xs font-black text-slate-900 border-b border-transparent group-hover:border-slate-200 focus-within:border-blue-400 pb-0.5">
                           <input type="number" className="w-12 text-right bg-transparent outline-none" value={item.price} onChange={(e) => {
                             handleUpdateCart(currentCart.map((c: any) => c.id === item.id ? { ...c, price: Number(e.target.value) } : c));
                           }} /> FCFA
                         </div>
                         <button onClick={() => handleUpdateCart(currentCart.filter((c: any) => c.id !== item.id))} className="text-[9px] text-red-500 hover:underline mt-1 font-bold">Retirer</button>
                       </div>
                     </div>
                   ))
                 )}
               </div>

               <div className="mt-4 pt-4 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-xs font-bold uppercase text-slate-500">Total à encaisser</span>
                   <span className="text-2xl font-black text-slate-900">{currentCart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toLocaleString()} FCFA</span>
                 </div>
                 <button 
                   disabled={currentCart.length === 0}
                   onClick={async () => {
                     try {
                        const batchSales = currentCart.map((item: any) => ({
                          resourceId: item.id,
                          itemName: item.name,
                          quantity: item.quantity,
                          price: item.price,
                          total: item.quantity * item.price,
                          type: 'product',
                          status: 'completed',
                          companyId: currentCompany.id,
                          clientName: activeOrder ? activeOrder.clientName : '',
                          date: serverTimestamp()
                        }));

                        let totalAmount = 0;
                        const itemsForInvoice = [];

                        for (let s of batchSales) {
                           const sData = { ...s };
                           delete sData.resourceId; // optional, to not clutter sales table, but let's keep it or remove it
                           
                           const res = await addDoc(collection(db, 'sales'), sData);
                           
                           // Décrémenter le stock
                           if (s.resourceId) {
                               const resource = resources.find(r => r.id === s.resourceId);
                               if (resource && typeof resource.quantity === 'number') {
                                  await updateDoc(doc(db, 'resources', s.resourceId), {
                                     quantity: Math.max(0, resource.quantity - s.quantity)
                                  });
                               }
                           }
                           
                           totalAmount += s.total;
                           itemsForInvoice.push({
                             name: s.itemName,
                             quantity: s.quantity,
                             price: s.price,
                             total: s.total
                           });
                        }

                        // Create a single invoice for the entire order
                        await addDoc(collection(db, 'sales_invoices'), {
                           saleId: activeOrderId || `direct-${Date.now()}`,
                           clientName: activeOrder ? activeOrder.clientName : '',
                           tableNumber: activeOrder ? activeOrder.tableNumber : '',
                           invoiceNumber: `FA-POS-${Date.now().toString().slice(-6)}`,
                           amount: totalAmount,
                           status: 'paid',
                           companyId: currentCompany.id,
                           date: serverTimestamp(),
                           items: JSON.stringify(itemsForInvoice)
                        });

                        if (activeOrderId) {
                          await deleteDoc(doc(db, 'open_orders', activeOrderId));
                          setActiveOrderId(null);
                        } else {
                          setCart([]);
                        }

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
                 <button onClick={() => handleUpdateCart([])} disabled={currentCart.length === 0} className="w-full mt-2 text-center text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 disabled:opacity-50 py-2">
                   Vider le panier
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <Table headers={['N° Facture', 'Client / Table', 'Articles', 'Date', 'Montant', 'Statut', 'Actions']}>
            {invoices.map(inv => {
              const paidAmount = payments.filter(p => p.invoiceId === inv.id).reduce((sum, p) => sum + p.amount, 0);
              const remaining = inv.amount - paidAmount;
              
              return (
                <TableRow key={inv.id}>
                  <span className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</span>
                  <div className="flex flex-col">
                     <button 
                       onClick={() => setSelectedClientName(inv.clientName || null)}
                       className="font-bold text-slate-800 text-xs hover:text-blue-600 hover:underline text-left outline-none"
                     >
                       {inv.clientName || 'Générique'}
                     </button>
                     {inv.tableNumber && <span className="text-[10px] text-slate-500 font-bold uppercase">Table: {inv.tableNumber}</span>}
                  </div>
                  <div className="text-[10px] text-slate-600 max-w-[200px] truncate" title={inv.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')}>
                     {inv.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', ') || 'Détails non dispo'}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {inv.date ? new Date(inv.date.seconds * 1000).toLocaleString() : 'Auj'}
                  </span>
                  <span className="font-black text-slate-900 font-mono">{inv.amount.toLocaleString()} F</span>
                  <span className={cn("px-2 py-0.5 rounded text-[9px] uppercase font-black border", inv.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                    {inv.status === 'paid' ? 'Payée' : `À payer (${remaining.toLocaleString()} F)`}
                  </span>
                  <div className="flex items-center gap-2">
                    {inv.status !== 'paid' && (
                      <button 
                        onClick={() => { setSelectedInvoice(inv); setPaymentForm({...paymentForm, amount: remaining}); setIsAddingPayment(true); }}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                      >
                        Encaisser
                      </button>
                    )}
                  </div>
                </TableRow>
              );
            })}
          </Table>
        )}

        {activeTab === 'payments' && (
          <Table headers={['Référence', 'Facture', 'Méthode', 'Date', 'Montant']}>
            {payments.map(pay => (
              <TableRow key={pay.id}>
                  <span className="font-mono font-bold text-blue-600">{pay.reference || 'Aucune réf.'}</span>
                <button 
                  onClick={() => setSelectedClientName(invoices.find(i => i.id === pay.invoiceId)?.clientName || null)}
                  className="font-mono font-bold text-blue-600 hover:underline text-left"
                >
                  {invoices.find(i => i.id === pay.invoiceId)?.invoiceNumber || 'Facture indisp.'}
                </button>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] uppercase font-black">{pay.method}</span>
                <span className="text-[10px] font-bold text-slate-500">
                  {pay.date ? new Date(pay.date.seconds * 1000).toLocaleString() : 'Auj'}
                </span>
                <span className="font-black text-emerald-600 font-mono">+{pay.amount.toLocaleString()} FCFA</span>
              </TableRow>
            ))}
          </Table>
        )}

        {activeTab === 'catalog' && (
          <div className="p-6 space-y-8 bg-slate-50">
            <div className="flex gap-4 border-b border-slate-200">
              <button 
                onClick={() => setCatalogType('product')}
                className={cn("pb-4 text-xs font-black uppercase tracking-widest transition-all", catalogType === 'product' ? "text-slate-900 border-b-2 border-slate-900" : "text-slate-400")}
              >
                Stock (Produits)
              </button>
              <button 
                onClick={() => setCatalogType('service')}
                className={cn("pb-4 text-xs font-black uppercase tracking-widest transition-all", catalogType === 'service' ? "text-slate-900 border-b-2 border-slate-900" : "text-slate-400")}
              >
                Services (Prestations)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={() => { setCatalogFormData({ name: '', price: 0, quantity: 0, type: 'Stock' }); setIsAddingCatalogItem(true); }}
                className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all"
              >
                <Plus size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Nouveau {catalogType === 'product' ? 'Produit' : 'Service'}</span>
              </button>

              {(catalogType === 'product' ? resources : services).map((item: any) => (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                    <button onClick={() => { setCatalogFormData(item); setIsAddingCatalogItem(true); }} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-900 hover:text-white transition-all"><Edit2 size={12} /></button>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">{item.name}</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Prix</p>
                      <p className="text-sm font-black text-slate-900">{item.price ? `${item.price.toLocaleString()} F` : '0 F'}</p>
                    </div>
                    {catalogType === 'product' && (
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Quantité</p>
                        <p className={cn("text-sm font-black", (item.quantity < 5) ? "text-red-500" : "text-slate-900")}>{item.quantity}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      {selectedClientName && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center font-black text-2xl border border-blue-100">
                  {selectedClientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-none">{selectedClientName}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Historique des transactions & Paiements</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClientName(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            {(() => {
              const clientInvoices = invoices.filter(inv => inv.clientName?.toLowerCase().trim() === selectedClientName.toLowerCase().trim());
              const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
              const clientPayments = payments.filter(p => clientInvoices.some(inv => inv.id === p.invoiceId));
              const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
              const balance = totalInvoiced - totalPaid;

              return (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Facturé</p>
                      <p className="text-lg font-black text-slate-900">{totalInvoiced.toLocaleString()} F</p>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
                      <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Total Encaissé</p>
                      <p className="text-lg font-black text-emerald-900">{totalPaid.toLocaleString()} F</p>
                    </div>
                    <div className={cn("p-5 rounded-3xl border", balance > 0 ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100")}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Solde Dû</p>
                      <p className="text-lg font-black text-slate-900">{balance.toLocaleString()} F</p>
                    </div>
                  </div>

                  {/* Combined Timeline */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chronologie des évènements</h4>
                    <div className="space-y-4">
                      {[...clientInvoices.map(i => ({...i, type: 'invoice'})), ...clientPayments.map(p => ({...p, type: 'payment'}))]
                        .sort((a, b) => {
                          const dateA = a.date?.seconds || (a.date instanceof Date ? (a.date as any).getTime() / 1000 : 0);
                          const dateB = b.date?.seconds || (b.date instanceof Date ? (b.date as any).getTime() / 1000 : 0);
                          return dateB - dateA;
                        })
                        .map((item: any, idx) => (
                          <div key={idx} className="flex gap-4 items-start relative pb-4 last:pb-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                              item.type === 'invoice' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                            )}>
                              {item.type === 'invoice' ? <Receipt size={14} /> : <CreditCard size={14} />}
                            </div>
                            <div className="flex-1 bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", item.type === 'invoice' ? "text-blue-600" : "text-emerald-600")}>
                                  {item.type === 'invoice' ? 'Nouvelle Facture' : 'Règlement Reçu'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 underline decoration-slate-200 underline-offset-2">
                                  {item.date ? new Date(item.date.seconds * 1000).toLocaleString() : 'Date indisp.'}
                                </span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    {item.type === 'invoice' ? `Facture ${item.invoiceNumber}` : `Paiement ${item.method}`}
                                  </p>
                                  {item.reference && <p className="text-[10px] text-slate-400 italic">Réf: {item.reference}</p>}
                                  {item.items && (
                                    <p className="text-[9px] text-slate-500 mt-1 truncate max-w-[300px]">
                                      {typeof item.items === 'string' ? JSON.parse(item.items).map((i: any) => `${i.quantity}x ${i.name}`).join(', ') : item.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                                    </p>
                                  )}
                                </div>
                                <p className={cn("font-black text-sm font-mono", item.type === 'invoice' ? "text-slate-900" : "text-emerald-600")}>
                                  {item.type === 'invoice' ? '-' : '+'}{item.amount.toLocaleString()} F
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                      {clientInvoices.length === 0 && (
                        <div className="text-center py-10">
                          <p className="text-sm text-slate-400 italic">Aucune transaction trouvée pour ce client.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button 
              onClick={() => setSelectedClientName(null)}
              className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
            >
              Fermer l'historique
            </button>
          </div>
        </div>
      )}

      {isAddingCatalogItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <Plus className="text-blue-600" />
              {catalogFormData.id ? 'Modifier' : 'Ajouter'} {catalogType === 'product' ? 'un produit' : 'un service'}
            </h3>
            <form onSubmit={handleUpdateCatalogItem} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Désignation</label>
                <input 
                  type="text" 
                  value={catalogFormData.name} 
                  onChange={e => setCatalogFormData({...catalogFormData, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prix Unitaire (F)</label>
                  <input 
                    type="number" 
                    value={catalogFormData.price} 
                    onChange={e => setCatalogFormData({...catalogFormData, price: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm" 
                    required 
                  />
                </div>
                {catalogType === 'product' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité en Stock</label>
                    <input 
                      type="number" 
                      value={catalogFormData.quantity} 
                      onChange={e => setCatalogFormData({...catalogFormData, quantity: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm" 
                      required 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button type="button" onClick={() => setIsAddingCatalogItem(false)} className="py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Annuler</button>
                <button type="submit" disabled={submitting} className="py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                  {submitting ? 'Traitement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingPayment && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <CreditCard className="text-emerald-600" />
              Règlement Client
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Paiement pour la facture {selectedInvoice.invoiceNumber}</p>
            
            <form onSubmit={handleCreatePayment} className="space-y-6">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex justify-between items-center mb-6">
                <div>
                   <p className="text-[9px] font-black text-emerald-700/60 uppercase tracking-widest mb-1">Total Facturé</p>
                   <p className="text-lg font-black text-emerald-900">{selectedInvoice.amount.toLocaleString()} F</p>
                </div>
                <ArrowRight className="text-emerald-300" />
                <div className="text-right">
                   <p className="text-[9px] font-black text-emerald-700/60 uppercase tracking-widest mb-1">Reste à payer</p>
                   <p className="text-lg font-black text-emerald-900">{(selectedInvoice.amount - payments.filter(p => p.invoiceId === selectedInvoice.id).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()} F</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode de Paiement</label>
                  <select 
                    value={paymentForm.method} 
                    onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-sm"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Mobile Money">Mtn Money</option>
                    <option value="Virement">Virement</option>
                    <option value="Chèque">Chèque</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant perçu (F)</label>
                  <input 
                    type="number" 
                    value={paymentForm.amount} 
                    onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-sm" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Référence / Notes</label>
                <input 
                  type="text" 
                  placeholder="Ex: Ref Orange Money #12345" 
                  value={paymentForm.reference} 
                  onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-sm" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button type="button" onClick={() => { setIsAddingPayment(false); setSelectedInvoice(null); }} className="py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Annuler</button>
                <button type="submit" disabled={submitting} className="py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50">
                  {submitting ? 'Traitement...' : 'Enregistrer Paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                   <input type="text" list="clients-list" placeholder="Nom du client" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} />
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
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50"
                >
                  {submitting ? 'Traitement...' : (editingSale ? 'Mettre à jour' : 'Facturer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Nouvelle Commande</h3>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom du client</label>
                <input type="text" list="clients-list" placeholder="Ex: Jean" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={newOrderName} onChange={e => setNewOrderName(e.target.value)} required/>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Numéro de table</label>
                <input type="text" placeholder="Ex: 3" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900" value={newOrderTable} onChange={e => setNewOrderTable(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button type="button" onClick={() => setIsAddingOrder(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-mono disabled:opacity-50"
                >
                  {submitting ? 'Traitement...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

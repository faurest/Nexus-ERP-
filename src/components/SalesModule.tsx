import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where, addDoc, setDoc, serverTimestamp, doc, updateDoc, deleteDoc, auth } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Search, Plus, TrendingUp, Filter, ShoppingCart, Receipt, CreditCard, DollarSign, Edit2, Trash2, CheckCircle2, ArrowRight, HelpCircle, FileText, Package, Sparkles, Wand2, RefreshCw } from 'lucide-react';
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

export default function SalesModule({ user }: { user: any }) {
  const { currentCompany } = useCompany();
  
  const userRole = useMemo(() => {
    if (!user || user.role === 'admin') return 'admin';
    const role = user.role || 'Personnel';
    if (['owner', 'Directeur', 'Administrateur'].includes(role)) return 'admin';
    if (['Comptable', 'Gérant'].includes(role)) return 'manager';
    if (['Agent Commercial', 'Personnel'].includes(role)) return 'staff';
    return 'staff';
  }, [user]);

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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');

  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const matchesSearch = res.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Tous' || res.category === activeCategory;
      return res.type === 'Stock' && matchesSearch && matchesCategory;
    });
  }, [resources, searchTerm, activeCategory]);

  const resourceCategories = useMemo(() => {
    const cats = new Set(resources.filter(r => r.type === 'Stock' && r.category).map(r => r.category));
    return ['Tous', ...Array.from(cats)].sort();
  }, [resources]);

  const activeOrder = useMemo(() => openOrders.find(o => o.id === activeOrderId), [openOrders, activeOrderId]);
  const currentCart = useMemo(() => activeOrder ? activeOrder.items || [] : cart, [activeOrder, cart]);

  const handleUpdateCart = async (newItems: any[]) => {
    if (activeOrderId) {
      try {
        await updateDoc(doc(db, 'open_orders', activeOrderId), { 
          items: newItems,
          updatedAt: serverTimestamp()
        });
      } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'open_orders'); }
    } else {
      setCart(newItems);
    }
  };

  const generateSalesAnalysis = async () => {
    setAiLoading(true);
    try {
      const topClients = clients.sort((a,b) => (b.salesTotal||0) - (a.salesTotal||0)).slice(0, 3).map(c => c.name);
      const pendingTotal = calculatePendingRevenue();
      
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'product_doc', 
          context: { 
            module: 'Sales', 
            topClients, 
            pendingTotal, 
            totalSales: sales.length 
          } 
        })
      });
      const data = await resp.json();
      setAiAnalysis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (sales.length > 5 && !aiAnalysis && !aiLoading) {
      generateSalesAnalysis();
    }
  }, [sales.length]);

  const availableTabs = useMemo(() => {
    const allTabs = [
      { id: 'pos', label: 'Caisse/POS', icon: ShoppingCart },
      { id: 'orders', label: 'Commandes', icon: Receipt },
      { id: 'sales', label: 'Historique', icon: DollarSign },
      { id: 'invoices', label: 'Facturation', icon: FileText },
      { id: 'payments', label: 'Paiements', icon: CreditCard },
      { id: 'catalog', label: 'Services/Produits', icon: Package },
      { id: 'reports', label: 'Analyses', icon: TrendingUp },
    ];
    
    if (userRole === 'admin') return allTabs;
    if (userRole === 'manager') return allTabs;
    if (userRole === 'staff') return allTabs.filter(t => ['pos', 'orders', 'sales', 'invoices'].includes(t.id));
    return [allTabs[0]]; // Fallback to POS
  }, [userRole]);

  useEffect(() => {
    // If current tab is not allowed, switch to the first allowed one
    if (!availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id as any || 'pos');
    }
  }, [availableTabs, activeTab]);

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

      <div className="relative overflow-hidden bg-nexus-surface rounded-[2rem] p-8 sm:p-12 text-nexus-text shadow-2xl border border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-nexus-bg to-nexus-bg z-0 opacity-80" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nexus-accent/5 rounded-full blur-[120px] -mr-48 -mt-48 transition-transform duration-1000 group-hover:scale-110" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6">
                <div className="w-2 h-2 bg-nexus-success rounded-full shadow-[0_0_8px_rgba(0,200,150,0.4)] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-nexus-success">Nexus OS • Growth Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                Nexus <span className="nexus-gradient-text">Growth</span>
              </h1>
              <p className="text-nexus-text-muted text-sm font-medium leading-relaxed max-w-lg">
                Supervisez vos cycles de vente, gérez les factures et analysez vos performances financières avec précision.
              </p>
            </motion.div>
          </div>
          <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/10 shrink-0 gap-1 overflow-x-auto scrollbar-hide max-w-full">
             {availableTabs.map(item => (
               <button 
                 key={item.id}
                 onClick={() => setActiveTab(item.id as any)}
                 className={cn(
                   "px-6 py-3 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] transition-all whitespace-nowrap", 
                   activeTab === item.id ? "bg-nexus-accent text-white shadow-[0_10px_20px_rgba(91,140,255,0.2)]" : "text-nexus-text-muted hover:text-nexus-text hover:bg-white/5"
                 )}
               >
                 {item.label}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-nexus-surface p-6 border border-white/5 rounded-[2rem] shadow-2xl group hover:border-nexus-success/30 transition-all"
        >
           <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-nexus-success/10 text-nexus-success rounded-2xl group-hover:scale-110 transition-transform">
                <DollarSign size={20}/>
              </div>
              <div className="text-[10px] font-black text-nexus-success bg-nexus-success/10 px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">Live</div>
           </div>
           <p className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1">Impact Encaissé</p>
           <p className="text-2xl font-black text-nexus-text">{calculateTotalRevenue().toLocaleString()} FCFA</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-nexus-surface p-6 border border-white/5 rounded-[2rem] shadow-2xl group hover:border-nexus-warning/30 transition-all"
        >
           <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-nexus-warning/10 text-nexus-warning rounded-2xl group-hover:scale-110 transition-transform">
                <Receipt size={20}/>
              </div>
           </div>
           <p className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1">Encours Facturation</p>
           <p className="text-2xl font-black text-nexus-text">{calculatePendingRevenue().toLocaleString()} FCFA</p>
        </motion.div>

        <AnimatePresence>
          {aiAnalysis && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 bg-nexus-surface border border-blue-500/10 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group flex items-start gap-4"
            >
               <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" />
               <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20 shadow-lg">
                 <Sparkles size={24} className="animate-pulse" />
               </div>
               <div className="flex-1 space-y-2 relative z-10">
                 <div className="flex items-center gap-2">
                   <h3 className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Nexus Intelligence • Sales Focus</h3>
                   <motion.button 
                     onClick={generateSalesAnalysis}
                     disabled={aiLoading}
                     whileTap={{ rotate: 180 }}
                     className="p-1 hover:bg-white/5 rounded-full transition-colors"
                   >
                     <RefreshCw size={10} className={cn("text-slate-500", aiLoading && "animate-spin")} />
                   </motion.button>
                 </div>
                 <p className="text-xs font-medium text-slate-300 leading-relaxed italic pr-4">
                   "{aiAnalysis.shortDescription}"
                 </p>
                 <div className="flex gap-2">
                   {aiAnalysis.benefits?.slice(0, 2).map((tip: string, i: number) => (
                     <span key={i} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/10 rounded-md text-[7px] font-black text-blue-300 uppercase tracking-widest">{tip}</span>
                   ))}
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-nexus-surface border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center bg-white/5 backdrop-blur-sm gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="bg-nexus-bg border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 w-full sm:w-64 focus-within:border-nexus-accent transition-colors group">
                <Search size={16} className="text-nexus-text-muted group-focus-within:text-nexus-accent"/>
                <input type="text" placeholder="Filtre ID, Client..." className="bg-transparent outline-none text-[11px] font-bold text-nexus-text w-full placeholder:text-nexus-text-muted/50"/>
             </div>
          </div>
          <button 
            onClick={() => setIsAdding(true)} 
            className="w-full sm:w-auto bg-nexus-accent text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(91,140,255,0.2)] hover:bg-blue-500 transition-all active:scale-95 group"
          >
             <Plus size={16} className="group-hover:rotate-90 transition-transform" /> 
             Action Vente
             <HelpTrigger topic="SALES" className="text-white/40 hover:text-white" />
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white/5">
            {openOrders.map(order => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-nexus-surface p-7 rounded-[2.5rem] border border-white/5 shadow-2xl hover:border-nexus-accent/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-accent/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-black text-nexus-text text-lg italic tracking-tight">{order.clientName || 'Anonyme'}</h4>
                    <p className="text-[10px] text-nexus-text-muted font-black uppercase tracking-[0.2em] mt-1">{order.tableNumber ? `Poste ${order.tableNumber}` : 'Flux Direct'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-nexus-warning/10 text-nexus-warning rounded-xl text-[8px] font-black uppercase tracking-widest border border-nexus-warning/20">Protocole Ouvert</span>
                    <button onClick={(e) => handleDeleteOrder(order.id, e)} className="p-2 text-nexus-text-muted hover:text-nexus-danger hover:bg-nexus-danger/10 rounded-xl transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
                
                <div className="relative z-10 space-y-3 mb-8 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[11px] group/item">
                      <span className="text-nexus-text-muted font-bold flex items-center gap-2">
                        <span className="w-5 h-5 bg-white/5 rounded-lg flex items-center justify-center text-[9px] font-black text-nexus-accent">{item.quantity}</span>
                        {item.name}
                      </span>
                      <span className="text-nexus-text font-black tracking-tight">{((item.price || 0) * item.quantity).toLocaleString()} F</span>
                    </div>
                  ))}
                  {(!order.items || order.items.length === 0) && (
                    <div className="py-4 flex flex-col items-center gap-2 opacity-30 italic">
                      <ShoppingCart size={24} />
                      <p className="text-[10px] font-bold text-nexus-text-muted tracking-widest">VIDE</p>
                    </div>
                  )}
                </div>

                <div className="relative z-10 pt-6 border-t border-white/5 flex justify-between items-center mb-6">
                  <div className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">Valence Totale</div>
                  <div className="text-xl font-black text-nexus-text nexus-gradient-text">{order.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0).toLocaleString()} FCFA</div>
                </div>

                <button 
                  onClick={() => { setActiveOrderId(order.id); setActiveTab('pos'); }}
                  className="relative z-10 w-full py-4 bg-white/5 hover:bg-nexus-accent text-nexus-text hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 hover:border-nexus-accent shadow-xl active:scale-95 flex items-center justify-center gap-2 group-hover:bg-nexus-accent group-hover:text-white"
                >
                  <ArrowRight size={14} />
                  Injecter dans POS
                </button>
              </motion.div>
            ))}
            <button 
              onClick={() => setIsAddingOrder(true)}
              className="bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 text-nexus-text-muted hover:text-nexus-accent hover:border-nexus-accent/50 transition-all group"
            >
              <div className="p-4 bg-nexus-surface rounded-3xl shadow-2xl group-hover:scale-110 transition-transform border border-white/5"><Plus size={32} /></div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Initialiser Flux</span>
            </button>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <Table headers={['Date', 'Type', 'Désignation', 'Qté', 'Prix U.', 'Total', 'Statut', 'Actions']}>
                {sales.map(sale => (
                  <TableRow key={sale.id}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-nexus-text tracking-tight italic">
                        {sale.date ? new Date((sale.date.seconds || sale.date / 1000) * 1000).toLocaleDateString() : 'Auj'}
                      </span>
                      <span className="text-[8px] font-bold text-nexus-text-muted uppercase tracking-widest mt-1">
                        {sale.date ? new Date((sale.date.seconds || sale.date / 1000) * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <button 
                        onClick={() => setSelectedClientName(sale.clientName || null)}
                        className="font-black text-nexus-text text-left hover:text-nexus-accent hover:underline outline-none uppercase italic tracking-tight"
                      >
                        {sale.itemName}
                      </button>
                      {sale.clientName && <span className="text-[8px] text-nexus-text-muted font-bold uppercase tracking-widest mt-1">{sale.clientName}</span>}
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-xl text-[9px] uppercase font-black tracking-widest border", sale.type === 'product' ? "bg-nexus-warning/10 text-nexus-warning border-nexus-warning/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20")}>{sale.type === 'product' ? 'Stock' : 'Service'}</span>
                    <span className="text-nexus-text font-black italic">{sale.quantity}</span>
                    <span className="text-nexus-text-muted font-black tracking-tighter">{sale.price.toLocaleString()} F</span>
                    <span className="font-black text-nexus-accent nexus-gradient-text italic tracking-tighter">{sale.total.toLocaleString()} F</span>
                    <span className={cn("px-2.5 py-1 rounded-xl text-[8px] uppercase font-black border", sale.status === 'completed' ? "bg-nexus-success/10 text-nexus-success border-nexus-success/20" : "bg-white/5 text-nexus-text-muted border-white/10")}>
                      {sale.status === 'completed' ? 'VALIDÉ' : 'ATTENTE'}
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
                           className="p-2 text-nexus-success hover:bg-nexus-success/10 rounded-xl transition-all"
                           title="Valider"
                         >
                           <CheckCircle2 size={16} />
                         </button>
                       )}
                       <button onClick={() => { setEditingSale(sale); setFormData(sale); setIsAdding(true); }} className="p-2 text-nexus-text-muted hover:text-nexus-accent hover:bg-nexus-accent/10 rounded-xl transition-all"><Edit2 size={16}/></button>
                       {userRole === 'admin' && (
                         <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-nexus-text-muted hover:text-nexus-danger hover:bg-nexus-danger/10 rounded-xl transition-all"><Trash2 size={16}/></button>
                       )}
                    </div>
                  </TableRow>
                ))}
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {sales.map(sale => (
                <motion.div 
                  key={sale.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-nexus-bg/50 border border-white/5 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-nexus-text tracking-tight italic">
                        {sale.date ? new Date((sale.date.seconds || sale.date / 1000) * 1000).toLocaleDateString() : 'Auj'}
                      </span>
                      <button 
                        onClick={() => setSelectedClientName(sale.clientName || null)}
                        className="font-black text-nexus-text text-sm hover:text-nexus-accent text-left mt-1 uppercase italic tracking-tight"
                      >
                        {sale.itemName}
                      </button>
                      {sale.clientName && <span className="text-[9px] text-nexus-text-muted font-black uppercase tracking-widest mt-1">{sale.clientName}</span>}
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-xl text-[8px] uppercase font-black border", sale.status === 'completed' ? "bg-nexus-success/10 text-nexus-success border-nexus-success/20" : "bg-white/10 text-nexus-text-muted border-white/10")}>
                      {sale.status === 'completed' ? 'VALIDÉ' : 'ATTENTE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/5">
                    <div>
                      <p className="text-[8px] font-black text-nexus-text-muted uppercase tracking-widest mb-1">Qté</p>
                      <p className="text-xs font-black text-nexus-text">{sale.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-nexus-text-muted uppercase tracking-widest mb-1">Prix U.</p>
                      <p className="text-xs font-black text-nexus-text">{sale.price.toLocaleString()} F</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-nexus-text-muted uppercase tracking-widest mb-1">Total</p>
                      <p className="text-sm font-black text-nexus-accent italic">{sale.total.toLocaleString()} F</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={cn("px-2 py-0.5 rounded-lg text-[8px] uppercase font-black tracking-widest", sale.type === 'product' ? "text-nexus-warning bg-nexus-warning/10" : "text-purple-400 bg-purple-500/10")}>
                      {sale.type === 'product' ? 'STOCK' : 'SERVICE'}
                    </span>
                    <div className="flex gap-2">
                       {sale.status !== 'completed' && (
                         <button 
                           onClick={async () => {
                             try {
                               await updateDoc(doc(db, 'sales', sale.id), { status: 'completed', updatedAt: serverTimestamp() });
                             } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'sales'); }
                           }}
                           className="p-2 text-nexus-success bg-nexus-success/10 rounded-xl"
                         >
                           <CheckCircle2 size={16} />
                         </button>
                       )}
                       <button onClick={() => { setEditingSale(sale); setFormData(sale); setIsAdding(true); }} className="p-2 text-nexus-text-muted bg-white/5 rounded-xl"><Edit2 size={16}/></button>
                       {userRole === 'admin' && (
                         <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-nexus-text-muted bg-nexus-danger/10 rounded-xl"><Trash2 size={16}/></button>
                       )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-nexus-bg/20 p-4 sm:p-6 lg:p-8">
            {/* Commandes en Cours Sidebar */}
            <div className="lg:col-span-1 bg-nexus-surface rounded-3xl border border-white/5 shadow-2xl p-6 flex flex-col h-[600px]">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1">Files Attente</h3>
                   <h2 className="text-sm font-black text-nexus-text uppercase tracking-widest">Protocoles</h2>
                 </div>
                 <button 
                   onClick={() => setIsAddingOrder(true)}
                   className="bg-white/5 hover:bg-nexus-accent text-nexus-text hover:text-white p-2 rounded-xl transition-all border border-white/10"
                 >
                   <Plus size={18} />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                 <button 
                   onClick={() => setActiveOrderId(null)}
                   className={cn(
                     "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group",
                     activeOrderId === null ? "bg-nexus-accent border-nexus-accent text-white shadow-lg shadow-nexus-accent/20" : "bg-white/5 border-white/5 hover:border-white/20 text-nexus-text-muted"
                   )}
                 >
                   <div>
                     <span className="text-xs font-black block uppercase tracking-tight italic">Flux Direct</span>
                     <span className={cn("text-[9px] font-bold", activeOrderId === null ? "text-white/70" : "text-nexus-text-muted/50")}>Client de passage</span>
                   </div>
                 </button>

                 {openOrders.map(order => (
                   <button 
                     key={order.id}
                     onClick={() => setActiveOrderId(order.id)}
                     className={cn(
                       "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group",
                       activeOrderId === order.id ? "bg-nexus-accent border-nexus-accent text-white shadow-lg shadow-nexus-accent/20" : "bg-white/5 border-white/5 hover:border-nexus-accent/50 text-nexus-text"
                     )}
                   >
                     <div className="flex-1 mr-2 truncate">
                       <span className="text-xs font-black block uppercase tracking-tight italic truncate">
                         {order.clientName || 'Flux Alpha'} {order.tableNumber ? `• P${order.tableNumber}` : ''}
                       </span>
                       <span className={cn("text-[9px] font-bold", activeOrderId === order.id ? "text-white/70" : "text-nexus-text-muted/70")}>
                         {order.items?.length || 0} Segment(s)
                       </span>
                     </div>
                     <div 
                       onClick={(e) => handleDeleteOrder(order.id, e)}
                       className={cn(
                         "p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0",
                         activeOrderId === order.id ? "text-white hover:bg-white/20" : "text-nexus-danger hover:bg-nexus-danger/10"
                       )}
                     >
                       <Trash2 size={14} />
                     </div>
                   </button>
                 ))}

                 {openOrders.length === 0 && (
                   <div className="py-10 text-center opacity-20 italic">
                     <p className="text-[10px] font-bold text-nexus-text-muted uppercase tracking-[0.2em]">Aucun protocole ouvert</p>
                   </div>
                 )}
               </div>
            </div>

            {/* Main Catalogue */}
            <div className="lg:col-span-2 space-y-6 flex flex-col h-[600px]">
               <div className="space-y-4 shrink-0">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 focus-within:border-nexus-accent transition-all group">
                       <Search size={16} className="text-nexus-text-muted group-focus-within:text-nexus-accent"/>
                       <input 
                        type="text" 
                        placeholder="Scanner ou Rechercher Actif..." 
                        className="bg-transparent outline-none text-[11px] font-black text-nexus-text w-full placeholder:text-nexus-text-muted/40 uppercase italic"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                       />
                    </div>
                    {resourceCategories.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0 max-w-[250px]">
                        {resourceCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                              activeCategory === cat ? "bg-nexus-accent text-white border-nexus-accent shadow-lg shadow-nexus-accent/10" : "bg-white/5 text-nexus-text-muted border-white/5 hover:border-white/20"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredResources.map(r => (
                      <motion.button 
                        key={r.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
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
                        className="bg-nexus-surface p-5 rounded-3xl border border-white/5 hover:border-nexus-accent/50 hover:shadow-2xl hover:shadow-nexus-accent/5 transition-all text-left flex flex-col justify-between h-40 relative overflow-hidden group active:scale-95 shadow-xl"
                      >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                          <Plus size={20} className="text-nexus-accent" />
                        </div>
                        <div className="relative z-10">
                          <span className="text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1 block">{r.category || 'Vecteur Stock'}</span>
                          <span className="text-xs font-black text-nexus-text break-words line-clamp-3 uppercase italic tracking-tighter leading-tight">{r.name}</span>
                        </div>
                        <div className="mt-auto flex justify-between items-end relative z-10 border-t border-white/5 pt-3">
                          <span className={cn("text-[10px] font-black", r.quantity <= 0 ? "text-nexus-danger" : "text-nexus-text-muted")}>S: {r.quantity}</span>
                          <span className="text-sm font-black text-nexus-accent italic">{r.price ? `${r.price.toLocaleString()} F` : '---'}</span>
                        </div>
                        <div className="absolute inset-0 bg-nexus-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.button>
                    ))}
                    {filteredResources.length === 0 && (
                      <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                        <Package size={48} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Aucun actif localisé dans cette zone</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
            
            {/* Cart */}
            <div className="lg:col-span-1 bg-nexus-surface rounded-[2.5rem] border border-white/5 shadow-2xl p-7 flex flex-col h-[600px] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-accent/5 rounded-full blur-2xl -mr-16 -mt-16" />
               
               <div className="flex justify-between items-center mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-nexus-accent/10 border border-nexus-accent/20 rounded-xl flex items-center justify-center text-nexus-accent">
                      <ShoppingCart size={20} />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1">Panier Flux</h3>
                      <h2 className="text-sm font-black text-nexus-text uppercase tracking-widest">{activeOrder ? activeOrder.clientName : 'Injection Directe'}</h2>
                    </div>
                  </div>
                  {currentCart.length > 0 && (
                    <button onClick={() => handleUpdateCart([])} className="p-2 text-nexus-text-muted hover:text-nexus-danger transition-colors">
                      <RefreshCw size={16} />
                    </button>
                  )}
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 relative z-10 custom-scrollbar">
                 {currentCart.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-nexus-text-muted/30 text-center gap-4 py-10 italic">
                      <Package size={40} className="opacity-20" />
                      <p className="text-[9px] font-black uppercase tracking-[0.3em]">Cargaison Vide</p>
                   </div>
                 ) : (
                   currentCart.map((item: any) => (
                     <motion.div 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group/cart-item flex flex-col bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-nexus-accent/30 transition-all hover:bg-white/10"
                    >
                       <div className="flex justify-between items-start mb-3 gap-2">
                         <div className="text-[11px] font-black text-nexus-text uppercase italic leading-tight truncate flex-1">{item.name}</div>
                         <button onClick={() => handleUpdateCart(currentCart.filter((c: any) => c.id !== item.id))} className="text-nexus-text-muted hover:text-nexus-danger opacity-0 group-hover/cart-item:opacity-100 transition-all">
                           <Trash2 size={12} />
                         </button>
                       </div>
                       
                       <div className="flex justify-between items-center">
                         <div className="flex items-center gap-3 bg-nexus-bg rounded-xl p-1.5 border border-white/10">
                           <button onClick={() => {
                               if (item.quantity > 1) {
                                 handleUpdateCart(currentCart.map((c: any) => c.id === item.id ? { ...c, quantity: c.quantity - 1 } : c));
                               } else {
                                 handleUpdateCart(currentCart.filter((c: any) => c.id !== item.id));
                               }
                           }} className="w-7 h-7 bg-white/5 hover:bg-nexus-accent hover:text-white rounded-lg flex items-center justify-center font-black text-nexus-text/50 transition-all">-</button>
                           <span className="text-xs font-black text-nexus-text w-5 text-center italic">{item.quantity}</span>
                           <button onClick={() => {
                               handleUpdateCart(currentCart.map((c: any) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
                           }} className="w-7 h-7 bg-white/5 hover:bg-nexus-accent hover:text-white rounded-lg flex items-center justify-center font-black text-nexus-text/50 transition-all">+</button>
                         </div>
                         <div className="text-right">
                           <div className="flex items-center gap-1">
                             <input 
                              type="number" 
                              className="w-20 text-right bg-transparent outline-none font-black text-nexus-accent text-sm italic" 
                              value={item.price} 
                              onChange={(e) => {
                                handleUpdateCart(currentCart.map((c: any) => c.id === item.id ? { ...c, price: Number(e.target.value) } : c));
                              }} 
                             />
                             <span className="text-[10px] font-black text-nexus-text-muted tracking-tight">F</span>
                           </div>
                           <p className="text-[8px] font-bold text-nexus-text-muted uppercase tracking-widest mt-0.5">PV U.</p>
                         </div>
                       </div>
                     </motion.div>
                   ))
                 )}
               </div>

               <div className="mt-8 pt-6 border-t border-white/10 relative z-10 shrink-0">
                 <div className="flex justify-between items-end mb-8">
                   <div>
                     <span className="text-[10px] font-black uppercase text-nexus-text-muted tracking-[0.2em] block mb-1">Total à Encaisser</span>
                     <span className="text-3xl font-black text-nexus-text italic tracking-tighter nexus-gradient-text">{currentCart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toLocaleString()} F</span>
                   </div>
                 </div>
                 
                 <button 
                   disabled={currentCart.length === 0 || submitting}
                   onClick={async () => {
                      if (submitting) return;
                      setSubmitting(true);
                      try {
                         const batchSales = currentCart.map((item: any) => ({
                           resourceId: item.id,
                           itemName: item.name,
                           quantity: item.quantity,
                           price: item.price,
                           total: item.quantity * item.price,
                           type: 'product',
                           status: 'completed',
                           companyId: currentCompany?.id,
                           clientName: activeOrder ? activeOrder.clientName : '',
                           date: serverTimestamp()
                         }));

                         let totalAmount = 0;
                         const itemsForInvoice = [];

                         for (let s of batchSales) {
                            const { resourceId, ...sData } = s;
                            await addDoc(collection(db, 'sales'), sData);
                            
                            if (resourceId) {
                                const resource = resources.find(r => r.id === resourceId);
                                if (resource && typeof resource.quantity === 'number') {
                                   await updateDoc(doc(db, 'resources', resourceId), {
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

                         await addDoc(collection(db, 'sales_invoices'), {
                            saleId: activeOrderId || `direct-${Date.now()}`,
                            clientName: activeOrder ? activeOrder.clientName : '',
                            tableNumber: activeOrder ? activeOrder.tableNumber : '',
                            invoiceNumber: `FA-POS-${Date.now().toString().slice(-6)}`,
                            amount: totalAmount,
                            status: 'paid',
                            companyId: currentCompany?.id,
                            date: serverTimestamp(),
                            items: JSON.stringify(itemsForInvoice)
                         });

                         if (activeOrderId) {
                           await deleteDoc(doc(db, 'open_orders', activeOrderId));
                           setActiveOrderId(null);
                         } else {
                           setCart([]);
                         }
                         alert('ENCAISSEMENT VECTEUR VALIDÉ');
                      } catch(e) {
                         alert('ÉCHEC DU PROTOCOLE D\'ENCAISSEMENT');
                         console.error(e);
                      } finally {
                        setSubmitting(false);
                      }
                   }}
                   className="w-full bg-nexus-accent text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-blue-500 disabled:opacity-50 transition-all shadow-[0_20px_40px_rgba(91,140,255,0.3)] active:scale-95 flex justify-center items-center gap-3 italic"
                 >
                   {submitting ? 'Validation...' : <><CheckCircle2 size={18} /> Valider Encaissement</>}
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="hidden lg:block">
              <Table headers={['N° Facture', 'Entité / Source', 'Contenu Vecteur', 'Date', 'Valence', 'Statut', 'Actions']}>
                {invoices.map(inv => {
                  const paidAmount = payments.filter(p => p.invoiceId === inv.id).reduce((sum, p) => sum + p.amount, 0);
                  const remaining = inv.amount - paidAmount;
                  
                  return (
                    <TableRow key={inv.id}>
                      <span className="font-black text-nexus-accent italic tracking-tight">{inv.invoiceNumber}</span>
                      <div className="flex flex-col">
                         <button 
                           onClick={() => setSelectedClientName(inv.clientName || null)}
                           className="font-black text-nexus-text text-xs hover:text-nexus-accent hover:underline text-left outline-none uppercase italic"
                         >
                           {inv.clientName || 'Flux Direct'}
                         </button>
                         {inv.tableNumber && <span className="text-[9px] text-nexus-text-muted font-black uppercase tracking-widest mt-1">Poste: {inv.tableNumber}</span>}
                      </div>
                      <div className="text-[10px] text-nexus-text-muted max-w-[200px] truncate italic" title={inv.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')}>
                         {inv.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', ') || 'Injection directe'}
                      </div>
                      <span className="text-[10px] font-black text-nexus-text tracking-tighter">
                        {inv.date ? new Date(inv.date.seconds * 1000).toLocaleDateString() : 'Auj'}
                      </span>
                      <span className="font-black text-nexus-text italic tracking-tighter">{inv.amount.toLocaleString()} F</span>
                      <span className={cn("px-2.5 py-1 rounded-xl text-[8px] uppercase font-black border tracking-widest", inv.status === 'paid' ? "bg-nexus-success/10 text-nexus-success border-nexus-success/20" : "bg-nexus-danger/10 text-nexus-danger border-nexus-danger/20")}>
                        {inv.status === 'paid' ? 'Soldée' : `Reliquat: ${remaining.toLocaleString()} F`}
                      </span>
                      <div className="flex items-center gap-2">
                        {inv.status !== 'paid' && (
                          <button 
                            onClick={() => { setSelectedInvoice(inv); setPaymentForm({...paymentForm, amount: remaining}); setIsAddingPayment(true); }}
                            className="px-4 py-2 bg-nexus-success text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-[0_10px_20px_rgba(0,200,150,0.2)] active:scale-95"
                          >
                            Encaisser
                          </button>
                        )}
                      </div>
                    </TableRow>
                  );
                })}
              </Table>
            </div>

            <div className="lg:hidden space-y-4">
              {invoices.map(inv => {
                const paidAmount = payments.filter(p => p.invoiceId === inv.id).reduce((sum, p) => sum + p.amount, 0);
                const remaining = inv.amount - paidAmount;
                return (
                  <motion.div 
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-nexus-bg/50 border border-white/5 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-nexus-accent font-black italic text-sm tracking-tight">{inv.invoiceNumber}</span>
                        <p className="text-[10px] font-black text-nexus-text-muted mt-1 uppercase tracking-widest">
                          {inv.date ? new Date(inv.date.seconds * 1000).toLocaleDateString() : 'Auj'}
                        </p>
                      </div>
                      <span className={cn("px-2.5 py-1 rounded-xl text-[8px] uppercase font-black border", inv.status === 'paid' ? "bg-nexus-success/10 text-nexus-success border-nexus-success/20" : "bg-nexus-danger/10 text-nexus-danger border-nexus-danger/20")}>
                        {inv.status === 'paid' ? 'SOLDÉE' : 'IMPAYÉE'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-nexus-text-muted uppercase tracking-widest">Client / Source</p>
                      <p className="text-xs font-black text-nexus-text uppercase italic tracking-tight">{inv.clientName || 'Flux Direct'}</p>
                    </div>

                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                      <div>
                         <p className="text-[8px] font-black text-nexus-text-muted uppercase tracking-widest mb-1">Total</p>
                         <p className="text-lg font-black text-nexus-text italic tracking-tighter">{inv.amount.toLocaleString()} F</p>
                      </div>
                      {inv.status !== 'paid' && (
                        <button 
                          onClick={() => { setSelectedInvoice(inv); setPaymentForm({...paymentForm, amount: remaining}); setIsAddingPayment(true); }}
                          className="px-4 py-2 bg-nexus-success text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg active:scale-95"
                        >
                          Encaisser
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="hidden lg:block">
              <Table headers={['Référence Flux', 'Vecteur Source', 'Protocole', 'Date', 'Valence Apportée']}>
                {payments.map(pay => (
                  <TableRow key={pay.id}>
                    <span className="font-black text-nexus-accent italic tracking-tight">{pay.reference || 'REF_AUTO'}</span>
                    <button 
                      onClick={() => setSelectedClientName(invoices.find(i => i.id === pay.invoiceId)?.clientName || null)}
                      className="font-black text-nexus-text hover:text-nexus-accent hover:underline text-left italic border-b border-white/10"
                    >
                      {invoices.find(i => i.id === pay.invoiceId)?.invoiceNumber || 'FLUX_EXT'}
                    </button>
                    <span className="px-2.5 py-1 bg-white/5 text-nexus-text-muted rounded-xl text-[9px] uppercase font-black tracking-widest border border-white/10">{pay.method}</span>
                    <span className="text-[10px] font-black text-nexus-text tracking-tighter">
                      {pay.date ? new Date(pay.date.seconds * 1000).toLocaleDateString() : 'Auj'}
                    </span>
                    <span className="font-black text-nexus-success italic">+{pay.amount.toLocaleString()} FCFA</span>
                  </TableRow>
                ))}
              </Table>
            </div>

            <div className="lg:hidden space-y-4">
              {payments.map(pay => (
                <motion.div 
                  key={pay.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-nexus-bg/50 border border-white/5 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-nexus-accent italic text-xs tracking-tight">{pay.reference || 'REF_AUTO'}</span>
                    <span className="text-[9px] font-black text-nexus-text-muted uppercase tracking-widest">
                      {pay.date ? new Date(pay.date.seconds * 1000).toLocaleDateString() : 'Auj'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black text-nexus-text-muted uppercase tracking-widest mb-1">Source Facture</p>
                      <p className="text-xs font-black text-nexus-text italic">{invoices.find(i => i.id === pay.invoiceId)?.invoiceNumber || 'FLUX_EXT'}</p>
                      <span className="mt-2 inline-block px-2 py-0.5 bg-white/5 text-nexus-text-muted rounded-lg text-[8px] uppercase font-black border border-white/10">
                        {pay.method}
                      </span>
                    </div>
                    <p className="font-black text-lg text-nexus-success italic tracking-tighter">+{pay.amount.toLocaleString()} F</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="p-8 space-y-8 bg-white/5">
            <div className="flex gap-8 border-b border-white/5">
              <button 
                onClick={() => setCatalogType('product')}
                className={cn("pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group", catalogType === 'product' ? "text-nexus-accent" : "text-nexus-text-muted hover:text-nexus-text")}
              >
                Stock (Actifs Physiques)
                {catalogType === 'product' && <motion.div layoutId="activeCat" className="absolute bottom-0 left-0 right-0 h-1 bg-nexus-accent rounded-full shadow-[0_0_10px_rgba(91,140,255,0.5)]" />}
              </button>
              <button 
                onClick={() => setCatalogType('service')}
                className={cn("pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group", catalogType === 'service' ? "text-nexus-accent" : "text-nexus-text-muted hover:text-nexus-text")}
              >
                Services (Immatériels)
                {catalogType === 'service' && <motion.div layoutId="activeCat" className="absolute bottom-0 left-0 right-0 h-1 bg-nexus-accent rounded-full shadow-[0_0_10px_rgba(91,140,255,0.5)]" />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <button 
                onClick={() => { setCatalogFormData({ name: '', price: 0, quantity: 0, type: 'Stock' }); setIsAddingCatalogItem(true); }}
                className="bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 text-nexus-text-muted hover:text-nexus-accent hover:border-nexus-accent/50 transition-all group"
              >
                <div className="p-4 bg-nexus-surface rounded-3xl shadow-xl group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inspirer {catalogType === 'product' ? 'Produit' : 'Service'}</span>
              </button>

              {(catalogType === 'product' ? resources : services).map((item: any) => (
                <motion.div 
                  key={item.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-nexus-surface p-7 rounded-[2.5rem] border border-white/5 shadow-2xl group relative overflow-hidden hover:border-nexus-accent/30 transition-all"
                >
                  {userRole === 'admin' && (
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-20">
                      <button onClick={() => { setCatalogFormData(item); setIsAddingCatalogItem(true); }} className="p-2.5 bg-white/5 text-nexus-text hover:bg-nexus-accent hover:text-white rounded-xl transition-all backdrop-blur-sm border border-white/10 shadow-xl"><Edit2 size={14} /></button>
                    </div>
                  )}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-nexus-accent/5 rounded-full blur-2xl -ml-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  
                  <h4 className="font-black text-nexus-text text-lg italic tracking-tight mb-6 line-clamp-2 relative z-10">{item.name}</h4>
                  <div className="flex justify-between items-end relative z-10">
                    <div>
                      <p className="text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1">Valence Unitaire</p>
                      <p className="text-xl font-black text-nexus-text nexus-gradient-text italic tracking-tighter">{item.price ? `${item.price.toLocaleString()} F` : '0 F'}</p>
                    </div>
                    {catalogType === 'product' && (
                      <div className="text-right">
                        <p className="text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1">Entropie Stock</p>
                        <p className={cn("text-xl font-black italic tracking-tighter", (item.quantity < 5) ? "text-nexus-danger animate-pulse" : "text-nexus-text")}>{item.quantity}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 border-t border-white/5">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-nexus-surface p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center text-center group hover:border-nexus-success/30 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-nexus-success/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <TrendingUp size={48} className="text-nexus-success mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.3em]">Afflux Entrant (Gains)</h3>
              <p className="text-5xl font-black text-nexus-text mt-4 tracking-tighter italic nexus-gradient-text">{calculateTotalRevenue().toLocaleString()} FCFA</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-nexus-surface p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center text-center group hover:border-nexus-danger/30 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-nexus-danger/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <TrendingUp size={48} className="text-nexus-danger mb-6 rotate-180 group-hover:scale-110 transition-transform" />
              <h3 className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.3em]">Sortie Entropy (Pertes)</h3>
              <p className="text-5xl font-black text-nexus-text mt-4 tracking-tighter italic">{calculateTotalExpenses().toLocaleString()} FCFA</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 bg-nexus-surface border border-white/5 p-12 rounded-[3.5rem] shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-8 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-nexus-accent/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.4em] mb-4">Balance de Croissance Nexus</h3>
                <p className="text-7xl font-black text-nexus-text tracking-tighter italic nexus-gradient-text">{(calculateTotalRevenue() - calculateTotalExpenses()).toLocaleString()} FCFA</p>
              </div>
              <div className="relative z-10 text-right">
                <span className={cn(
                  "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border shadow-2xl", 
                  (calculateTotalRevenue() - calculateTotalExpenses()) >= 0 
                  ? "bg-nexus-success/10 text-nexus-success border-nexus-success/30 shadow-nexus-success/10" 
                  : "bg-nexus-danger/10 text-nexus-danger border-nexus-danger/30 shadow-nexus-danger/10"
                )}>
                  {(calculateTotalRevenue() - calculateTotalExpenses()) >= 0 ? 'Expansion Positive' : 'Contraction Risquée'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {selectedClientName && (
        <div className="fixed inset-0 bg-nexus-bg/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-nexus-surface rounded-[3.5rem] p-12 max-w-3xl w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/5 max-h-[90vh] overflow-y-auto custom-scrollbar relative"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-nexus-accent/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-transform duration-1000" />

            <div className="relative z-10 flex justify-between items-start mb-12">
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 bg-gradient-to-br from-nexus-accent to-blue-600 text-white rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-[0_20px_40px_rgba(91,140,255,0.3)] italic">
                  {selectedClientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-4xl font-black text-nexus-text leading-none italic tracking-tighter nexus-gradient-text">{selectedClientName}</h3>
                  <p className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-nexus-success rounded-full animate-pulse" />
                    Historique Vectoriel & Flux de Valeur
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClientName(null)}
                className="p-4 hover:bg-white/5 rounded-2xl text-nexus-text-muted hover:text-white transition-all border border-transparent hover:border-white/10 shadow-2xl"
              >
                <Plus className="rotate-45" size={32} />
              </button>
            </div>

            {(() => {
              const clientInvoices = invoices.filter(inv => inv.clientName?.toLowerCase().trim() === selectedClientName.toLowerCase().trim());
              const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
              const clientPayments = payments.filter(p => clientInvoices.some(inv => inv.id === p.invoiceId));
              const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
              const balance = totalInvoiced - totalPaid;

              return (
                <div className="space-y-12 relative z-10">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 group hover:border-nexus-accent/30 transition-all">
                      <p className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-2">Total Injecté</p>
                      <p className="text-2xl font-black text-nexus-text italic tracking-tighter">{totalInvoiced.toLocaleString()} F</p>
                    </div>
                    <div className="bg-nexus-success/5 p-8 rounded-[2.5rem] border border-nexus-success/20 group hover:border-nexus-success/50 transition-all">
                      <p className="text-[10px] font-black text-nexus-success uppercase tracking-[0.2em] mb-2">Total Recouvré</p>
                      <p className="text-2xl font-black text-nexus-success italic tracking-tighter">{totalPaid.toLocaleString()} F</p>
                    </div>
                    <div className={cn("p-8 rounded-[2.5rem] border transition-all", balance > 0 ? "bg-nexus-danger/5 border-nexus-danger/20 hover:border-nexus-danger/50" : "bg-nexus-accent/5 border-nexus-accent/20 hover:border-nexus-accent/50")}>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Indice de Dette</p>
                      <p className="text-2xl font-black text-nexus-text italic tracking-tighter">{balance.toLocaleString()} F</p>
                    </div>
                  </div>

                  {/* Combined Timeline */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                       <h4 className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.4em] ml-1">Ligne Temporelle Nexus</h4>
                       <div className="flex-1 h-px bg-white/5" />
                    </div>
                    <div className="space-y-6">
                      {[...clientInvoices.map(i => ({...i, type: 'invoice'})), ...clientPayments.map(p => ({...p, type: 'payment'}))]
                        .sort((a, b) => {
                          const dateA = a.date?.seconds || (a.date instanceof Date ? (a.date as any).getTime() / 1000 : 0);
                          const dateB = b.date?.seconds || (b.date instanceof Date ? (b.date as any).getTime() / 1000 : 0);
                          return dateB - dateA;
                        })
                        .map((item: any, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex gap-6 items-start relative group/item"
                          >
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 border transition-all shadow-2xl group-hover/item:scale-110",
                              item.type === 'invoice' ? "bg-nexus-accent/10 text-nexus-accent border-nexus-accent/20" : "bg-nexus-success/10 text-nexus-success border-nexus-success/20"
                            )}>
                              {item.type === 'invoice' ? <Receipt size={20} /> : <CreditCard size={20} />}
                            </div>
                            <div className="flex-1 bg-white/5 border border-white/5 p-6 rounded-[2rem] shadow-2xl hover:border-white/20 transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", item.type === 'invoice' ? "text-nexus-accent" : "text-nexus-success")}>
                                  {item.type === 'invoice' ? 'Émission Facture' : 'Validation Flux'}
                                </span>
                                <span className="text-[10px] font-black text-nexus-text-muted tracking-widest italic">
                                  {item.date ? new Date(item.date.seconds * 1000).toLocaleString() : 'INSTANT_SYNC'}
                                </span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-lg font-black text-nexus-text italic tracking-tighter">
                                    {item.type === 'invoice' ? `Protocol ${item.invoiceNumber}` : `Transfert ${item.method}`}
                                  </p>
                                  {item.reference && <p className="text-[10px] text-nexus-text-muted italic mt-1 uppercase tracking-widest">Réf: {item.reference}</p>}
                                  {item.items && (
                                    <p className="text-[10px] text-nexus-text-muted mt-2 truncate max-w-[400px] italic">
                                      {typeof item.items === 'string' ? JSON.parse(item.items).map((i: any) => `${i.quantity}x ${i.name}`).join(', ') : item.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                                    </p>
                                  )}
                                </div>
                                <p className={cn("font-black text-2xl italic tracking-tighter", item.type === 'invoice' ? "text-nexus-text" : "text-nexus-success nexus-gradient-text")}>
                                  {item.type === 'invoice' ? '-' : '+'}{item.amount.toLocaleString()} F
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      }
                      {clientInvoices.length === 0 && (
                        <div className="text-center py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 opacity-30 italic">
                          <p className="text-sm font-black uppercase tracking-widest">Aucune donnée vectorielle détectée.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button 
              onClick={() => setSelectedClientName(null)}
              className="w-full mt-12 py-5 bg-nexus-accent text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-[0_20px_50px_rgba(91,140,255,0.3)] active:scale-95"
            >
              Fermer l'Analyse Client
            </button>
          </motion.div>
        </div>
      )}

      {isAddingCatalogItem && (
        <div className="fixed inset-0 bg-nexus-bg/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-nexus-surface rounded-[3.5rem] p-12 max-w-xl w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            
            <h3 className="text-3xl font-black text-nexus-text mb-10 flex items-center gap-4 italic tracking-tighter">
              <div className="p-3 bg-nexus-accent/10 rounded-2xl text-nexus-accent"><Plus size={32} /></div>
              {catalogFormData.id ? 'Refactoring' : 'Injection'} {catalogType === 'product' ? 'Produit' : 'Service'}
            </h3>
            
            <form onSubmit={handleUpdateCatalogItem} className="space-y-8 relative z-10">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Désignation du Vecteur</label>
                <input 
                  type="text" 
                  value={catalogFormData.name} 
                  onChange={e => setCatalogFormData({...catalogFormData, name: e.target.value})} 
                  placeholder="Ex: Architecture IA ..."
                  className="w-full bg-white/5 border border-white/10 rounded-2x p-6 outline-none focus:ring-2 focus:ring-nexus-accent font-black text-nexus-text placeholder:text-nexus-text-muted/30 transition-all italic text-lg tracking-tight" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Valence (F)</label>
                  <input 
                    type="number" 
                    value={catalogFormData.price} 
                    onChange={e => setCatalogFormData({...catalogFormData, price: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-nexus-accent font-black text-nexus-text transition-all italic text-lg" 
                    required 
                  />
                </div>
                {catalogType === 'product' && (
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Stock (Unités)</label>
                    <input 
                      type="number" 
                      value={catalogFormData.quantity} 
                      onChange={e => setCatalogFormData({...catalogFormData, quantity: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-nexus-accent font-black text-nexus-text transition-all italic text-lg" 
                      required 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 mt-12 pt-8 border-t border-white/5">
                <button type="button" onClick={() => setIsAddingCatalogItem(false)} className="py-5 bg-white/5 text-nexus-text-muted font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-white/10 transition-all border border-white/10 italic">Annuler</button>
                <button type="submit" disabled={submitting} className="py-5 bg-nexus-accent text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-[0_20px_40px_rgba(91,140,255,0.3)] disabled:opacity-50 active:scale-95 italic">
                  {submitting ? 'Traitement...' : 'Synchroniser'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isAddingPayment && selectedInvoice && (
        <div className="fixed inset-0 bg-nexus-bg/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-nexus-surface rounded-[3.5rem] p-12 max-w-lg w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-success/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            
            <h3 className="text-3xl font-black text-nexus-text mb-2 flex items-center gap-4 italic tracking-tighter">
              <div className="p-3 bg-nexus-success/10 rounded-2xl text-nexus-success"><CreditCard size={32} /></div>
              Règlement Entrant
            </h3>
            <p className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] mb-10 italic">Validation du flux pour {selectedInvoice.invoiceNumber}</p>
            
            <form onSubmit={handleCreatePayment} className="space-y-8 relative z-10">
              <div className="bg-nexus-success/5 p-8 rounded-[2.5rem] border border-nexus-success/20 flex justify-between items-center mb-6 shadow-2xl">
                <div>
                   <p className="text-[10px] font-black text-nexus-success/60 uppercase tracking-[0.2em] mb-2">Valence Facturée</p>
                   <p className="text-xl font-black text-nexus-text italic tracking-tighter">{selectedInvoice.amount.toLocaleString()} F</p>
                </div>
                <div className="p-2 bg-nexus-success/20 rounded-full animate-pulse"><ArrowRight className="text-nexus-success" size={20} /></div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-nexus-success/60 uppercase tracking-[0.2em] mb-2">Reliquat Actif</p>
                   <p className="text-xl font-black text-nexus-success italic tracking-tighter">{(selectedInvoice.amount - payments.filter(p => p.invoiceId === selectedInvoice.id).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()} F</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Protocole</label>
                  <select 
                    value={paymentForm.method} 
                    onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-nexus-success font-black text-nexus-text transition-all italic text-lg"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Orange Money">OM</option>
                    <option value="Mobile Money">Momo</option>
                    <option value="Virement">Bank</option>
                    <option value="Chèque">Check</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Valence Reçue</label>
                  <input 
                    type="number" 
                    value={paymentForm.amount} 
                    onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-nexus-success font-black text-nexus-text transition-all italic text-lg" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Référence Systémique</label>
                <input 
                  type="text" 
                  placeholder="ID Transaction, Ref Mobile..." 
                  value={paymentForm.reference} 
                  onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-nexus-success font-black text-nexus-text placeholder:text-nexus-text-muted/30 transition-all italic" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6 mt-12 pt-8 border-t border-white/5">
                <button type="button" onClick={() => { setIsAddingPayment(false); setSelectedInvoice(null); }} className="py-5 bg-white/5 text-nexus-text-muted font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-white/10 transition-all border border-white/10 italic">Annuler</button>
                <button type="submit" disabled={submitting} className="py-5 bg-nexus-success text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-500 transition-all shadow-[0_20px_40px_rgba(0,200,150,0.3)] disabled:opacity-50 active:scale-95 italic">
                  {submitting ? 'Traitement...' : 'Valider Flux'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isAdding && (
        <div className="fixed inset-0 bg-nexus-bg/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-nexus-surface rounded-[3.5rem] p-12 max-w-lg w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            
            <h3 className="text-3xl font-black text-nexus-text mb-10 flex items-center gap-4 italic tracking-tighter">
              <div className="p-3 bg-nexus-accent/10 rounded-2xl text-nexus-accent"><ShoppingCart size={32} /></div>
              {editingSale ? 'Refactor Sale' : 'Injection Directe'}
            </h3>
            
            <form onSubmit={handleCreateSale} className="space-y-6 relative z-10">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Nature Flux</label>
                   <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[13px] font-black text-nexus-text outline-none focus:ring-2 focus:ring-nexus-accent transition-all italic" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                     <option value="product">Stock</option>
                     <option value="service">Service</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Cible Client</label>
                   <input type="text" list="clients-list" placeholder="Anonyme..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[13px] font-black text-nexus-text outline-none focus:ring-2 focus:ring-nexus-accent transition-all italic" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Désignation Actif</label>
                 <input type="text" placeholder="Design Web, Ordinateur..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg font-black text-nexus-text outline-none focus:ring-2 focus:ring-nexus-accent transition-all italic tracking-tight" value={formData.itemName || ''} onChange={e => setFormData({...formData, itemName: e.target.value})} required/>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Fréquence/Qté</label>
                   <input type="number" step="0.5" className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg font-black text-nexus-text outline-none focus:ring-2 focus:ring-nexus-accent transition-all italic" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: e.target.value})} required/>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Valence Unit. (F)</label>
                   <input type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg font-black text-nexus-text outline-none focus:ring-2 focus:ring-nexus-accent transition-all italic text-nexus-accent" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} required/>
                 </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex justify-between items-center text-nexus-text">
                 <span className="text-[11px] font-black uppercase tracking-[0.3em] text-nexus-text-muted italic">Total Valence</span>
                 <span className="text-3xl font-black italic nexus-gradient-text tracking-tighter">{(Number(formData.quantity || 0) * Number(formData.price || 0)).toLocaleString()} FCFA</span>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-10">
                <button type="button" onClick={() => { setIsAdding(false); setEditingSale(null); setFormData({ type: 'product', quantity: 1, price: 0 }); }} className="py-5 bg-white/5 text-nexus-text-muted font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-white/10 border border-white/10 italic">Annuler</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="py-5 bg-nexus-accent text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-[0_20px_40px_rgba(91,140,255,0.3)] disabled:opacity-50 active:scale-95 italic"
                >
                  {submitting ? 'Traitement...' : (editingSale ? 'Update' : 'Facturer')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isAddingOrder && (
        <div className="fixed inset-0 bg-nexus-bg/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-nexus-surface rounded-[3.5rem] p-12 max-w-sm w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-nexus-accent/5 rounded-full blur-[60px] -mr-24 -mt-24" />
            
            <h3 className="text-2xl font-black text-nexus-text mb-10 italic tracking-tighter uppercase flex items-center gap-3">
              <div className="p-2 bg-nexus-accent/10 rounded-xl text-nexus-accent"><Plus size={24} /></div>
              Nouveau Flux
            </h3>
            
            <form onSubmit={handleCreateOrder} className="space-y-8 relative z-10">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Cible Client/Poste</label>
                <input type="text" list="clients-list" placeholder="Nom ou ID..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg font-black text-nexus-text outline-none focus:ring-2 focus:ring-nexus-accent transition-all italic tracking-tight" value={newOrderName} onChange={e => setNewOrderName(e.target.value)} required/>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-nexus-text-muted uppercase tracking-[0.3em] ml-2 italic">Ancrage Physique (Table)</label>
                <input type="text" placeholder="Ex: Poste 7 ..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg font-black text-nexus-text outline-none focus:ring-2 focus:ring-nexus-accent transition-all italic" value={newOrderTable} onChange={e => setNewOrderTable(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-6 mt-12 pt-8 border-t border-white/5">
                <button type="button" onClick={() => setIsAddingOrder(false)} className="py-5 bg-white/5 text-nexus-text-muted font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-white/10 border border-white/10 italic">Annuler</button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="py-5 bg-nexus-accent text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-[0_20px_40px_rgba(91,140,255,0.3)] disabled:opacity-50 active:scale-95 italic"
                >
                  {submitting ? 'Traitement...' : 'Déployer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

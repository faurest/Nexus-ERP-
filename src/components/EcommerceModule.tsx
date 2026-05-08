import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Package, 
  Truck, 
  Award, 
  Search, 
  Plus, 
  Minus, 
  X, 
  ChevronRight, 
  CreditCard, 
  Smartphone, 
  History,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '../lib/utils';
import Table, { TableRow } from './ui/Table';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  points: number;
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface Order {
  id: string;
  items: any[];
  total: number;
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  date: any;
  paymentMethod: string;
}

export default function EcommerceModule({ user }: { user: any }) {
  const { currentCompany } = useCompany();
  const [activeView, setActiveView] = useState<'catalog' | 'cart' | 'tracking' | 'loyalty' | 'admin'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MOBILE' | 'CASH'>('MOBILE');
  const [clientId, setClientId] = useState<string | null>(null);

  const isAdmin = user?.role !== 'Client';

  useEffect(() => {
    if (!currentCompany || !user) return;

    // Fetch Client info if applicable
    if (user.role === 'Client') {
      const qClient = query(collection(db, 'clients'), where('companyId', '==', currentCompany.id), where('email', '==', user.email));
      const unsubscribeClient = onSnapshot(qClient, (snap) => {
        if (!snap.empty) {
          const cData = snap.docs[0].data();
          setLoyaltyPoints(cData.loyaltyPoints || 0);
          setClientId(snap.docs[0].id);
        }
      });
      return () => unsubscribeClient();
    }
  }, [currentCompany, user]);

  useEffect(() => {
    if (!currentCompany) return;

    // Fetch products from Firestore
    const prodQ = query(collection(db, 'products'), where('companyId', '==', currentCompany.id));
    const unsubscribeProd = onSnapshot(prodQ, (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      // If empty, we can bootstrap some demo products for this company
      if (prodData.length === 0) {
        const demos = [
          { name: 'Ordinateur Portable Pro', description: 'Haute performance pour les entreprises.', price: 1250000, category: 'Hardware', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=600', stock: 15, points: 150 },
          { name: 'Pack Office Suite', description: 'Licence annuelle pour 5 utilisateurs.', price: 450000, category: 'Software', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600', stock: 100, points: 50 },
        ];
        demos.forEach(d => {
          addDoc(collection(db, 'products'), { ...d, companyId: currentCompany.id, createdAt: serverTimestamp() });
        });
      }
      setProducts(prodData);
    });

    // Fetch orders - filter for clients
    let orderQ = query(collection(db, 'ecommerce_orders'), where('companyId', '==', currentCompany.id));
    if (user?.role === 'Client') {
      orderQ = query(
        collection(db, 'ecommerce_orders'), 
        where('companyId', '==', currentCompany.id),
        where('customerEmail', '==', user.email)
      );
    }

    const unsubscribeOrders = onSnapshot(orderQ, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData.sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'ecommerce_orders'));

    return () => {
      unsubscribeProd();
      unsubscribeOrders();
    };
  }, [currentCompany, user]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || cart.length === 0) return;

    try {
      await addDoc(collection(db, 'ecommerce_orders'), {
        companyId: currentCompany.id,
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.cartQuantity })),
        total: cartTotal,
        paymentMethod,
        status: 'PENDING',
        date: serverTimestamp(),
        customerEmail: auth.currentUser?.email || 'Guest'
      });

      // Update loyalty points in Firestore if client
      if (clientId) {
        const earnedPoints = cart.reduce((acc, item) => acc + (item.points * item.cartQuantity), 0);
        await updateDoc(doc(db, 'clients', clientId), {
          loyaltyPoints: (loyaltyPoints || 0) + earnedPoints
        });
      }

      setCart([]);
      setCheckoutModalOpen(false);
      setActiveView('tracking');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ecommerce_orders');
    }
  };

  const categories = ['Tous', 'Hardware', 'Software', 'Office', 'Services'];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header with Background */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Shop</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Simplifiez vos achats professionnels. Catalogue intelligent, paiement sécurisé et programme de fidélité intégré.
            </p>
          </div>
          <div className="flex bg-slate-950/40 p-1.5 rounded-2xl border border-white/10 shrink-0 overflow-x-auto scrollbar-hide max-w-full">
            {[
              { id: 'catalog', label: 'Catalogue', icon: Package },
              { id: 'cart', label: `Panier (${cart.length})`, icon: ShoppingCart },
              { id: 'tracking', label: 'Suivi', icon: Truck },
              { id: 'loyalty', label: 'Fidélité', icon: Award },
              ...(isAdmin ? [{ id: 'admin', label: 'Gestion', icon: Smartphone }] : [])
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all whitespace-nowrap", 
                  activeView === item.id 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={14} /> {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeView === 'catalog' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    activeCategory === cat ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{product.name}</h3>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-black text-slate-900 tracking-tight">
                      {product.price.toLocaleString()} <span className="text-xs text-slate-400 font-bold uppercase ml-1">FCFA</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <Award size={14} />
                      <span className="text-[10px] font-black">{product.points} pts</span>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full py-3 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Ajouter au panier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-blue-600" />
                  Votre Panier
                </h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cart.length} articles</span>
              </div>
              
              {cart.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <ShoppingBag size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Le panier est vide</p>
                  <button onClick={() => setActiveView('catalog')} className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">Découvrir le catalogue</button>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {cart.map(item => (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row items-center gap-6">
                      <img src={item.image} alt={item.name} className="w-24 h-24 rounded-2xl object-cover border border-slate-100" />
                      <div className="flex-1 space-y-1 text-center sm:text-left">
                        <h4 className="font-bold text-slate-900">{item.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{item.category}</p>
                        <p className="text-sm font-black text-blue-600">{item.price.toLocaleString()} FCFA</p>
                      </div>
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus size={16} /></button>
                        <span className="text-sm font-black w-8 text-center">{item.cartQuantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus size={16} /></button>
                      </div>
                      <div className="text-right flex flex-col items-center sm:items-end gap-2">
                        <span className="font-black text-slate-900">{(item.price * item.cartQuantity).toLocaleString()} FCFA</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Retirer</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
              <h3 className="font-bold text-lg mb-6 uppercase tracking-widest">Résumé</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Sous-total</span>
                  <span className="text-white font-bold">{cartTotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Livraison</span>
                  <span className="text-green-400 font-bold uppercase text-[10px] tracking-widest">Gratuite</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="font-bold uppercase tracking-widest text-xs">Total</span>
                  <span className="text-2xl font-black">{cartTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => setCheckoutModalOpen(true)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                Passer la commande <ChevronRight size={18} />
              </button>
            </div>

            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm">
                <Award size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Points à gagner</p>
                <p className="text-lg font-black text-blue-900">
                  +{cart.reduce((acc, item) => acc + (item.points * item.cartQuantity), 0)} pts
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'tracking' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-slate-50">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <History size={24} className="text-blue-600" />
              Historique des commandes
            </h2>
          </div>
          <Table headers={['Référence', 'Date', 'Total', 'Paiement', 'Statut']}>
            {orders.map(order => (
              <TableRow key={order.id}>
                <td className="py-5 px-6 font-black text-xs text-blue-600">CMD-{order.id.slice(0, 6).toUpperCase()}</td>
                <td className="py-5 px-6 text-sm text-slate-500">{order.date?.toDate().toLocaleDateString('fr-FR')}</td>
                <td className="py-5 px-6 text-sm font-bold text-slate-900">{order.total.toLocaleString()} FCFA</td>
                <td className="py-5 px-6">
                  <div className="flex items-center gap-2">
                    {order.paymentMethod === 'MOBILE' ? <Smartphone size={14} className="text-green-500" /> : <CreditCard size={14} className="text-blue-500" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{order.paymentMethod}</span>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    order.status === 'PENDING' ? "bg-amber-100 text-amber-600" :
                    order.status === 'SHIPPED' ? "bg-blue-100 text-blue-600" :
                    "bg-green-100 text-green-600"
                  )}>
                    {order.status === 'PENDING' ? 'En attente' : order.status === 'SHIPPED' ? 'Expédié' : 'Livré'}
                  </span>
                </td>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <div className="p-20 text-center">
                <Truck size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-tighter">Aucune commande en cours</p>
              </div>
            )}
          </Table>
        </div>
      )}

      {activeView === 'loyalty' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
                  <Award size={32} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight leading-none">Nexus Premium</h3>
                  <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">Membre Gold</p>
                </div>
              </div>
              <div className="pt-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-4xl font-black tabular-nums">{loyaltyPoints.toLocaleString()}</span>
                  <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Points cumulés</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]" style={{ width: '65%' }} />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-4">Plus que 750 points pour le palier Platinum</p>
              </div>
            </div>
            {/* Geometric Decors */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]" />
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Vitesse de commande</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">Vous gagnez +10% de points sur les commandes mobiles.</p>
              </div>
            </div>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline text-left">Explorer les bonus</button>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Package size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Retrait Prioritaire</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">Accès exclusif au guichet express Nexus Pro.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
              <CheckCircle2 size={12} /> Activé
            </span>
          </div>
        </div>
      )}

      {activeView === 'admin' && isAdmin && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xl font-bold text-slate-900">Ajouter un Produit</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!currentCompany) return;
                    const formData = new FormData(e.currentTarget);
                    try {
                      await addDoc(collection(db, 'products'), {
                        companyId: currentCompany.id,
                        name: formData.get('name'),
                        description: formData.get('description'),
                        price: Number(formData.get('price')),
                        category: formData.get('category'),
                        stock: Number(formData.get('stock')),
                        points: Number(formData.get('points')),
                        image: formData.get('image') || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
                        createdAt: serverTimestamp()
                      });
                      (e.target as HTMLFormElement).reset();
                    } catch(err) {
                      handleFirestoreError(err, OperationType.CREATE, 'products');
                    }
                  }}
                  className="space-y-4"
                >
                  <input name="name" placeholder="Nom du produit" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" required />
                  <textarea name="description" placeholder="Description" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none h-24" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="price" type="number" placeholder="Prix (FCFA)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" required />
                    <input name="stock" type="number" placeholder="Stock" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select name="category" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none">
                      {['Hardware', 'Software', 'Office', 'Services'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input name="points" type="number" placeholder="Points" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" required />
                  </div>
                  <input name="image" placeholder="URL de l'image (optionnel)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                  <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                    <Plus size={18} /> Créer le produit
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">Gestion du Catalogue</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{products.length} produits</span>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {products.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                                <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase">{p.category}</td>
                            <td className="px-6 py-4 text-sm font-black text-slate-900">{p.price.toLocaleString()}</td>
                            <td className="px-6 py-4">
                               <span className={cn(
                                 "px-2 py-0.5 rounded text-[10px] font-bold",
                                 p.stock > 10 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                               )}>{p.stock} en stock</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={async () => {
                                  if (confirm('Supprimer ce produit ?')) {
                                    await deleteDoc(doc(db, 'products', p.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, 'products'));
                                  }
                                }}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-900">Finaliser la commande</h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mode de Paiement</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MOBILE')}
                    className={cn(
                      "p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3",
                      paymentMethod === 'MOBILE' ? "border-blue-600 bg-blue-50/50" : "border-slate-100 hover:border-blue-200"
                    )}
                  >
                    <Smartphone size={24} className={paymentMethod === 'MOBILE' ? "text-blue-600" : "text-slate-400"} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Paiement Mobile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={cn(
                      "p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3",
                      paymentMethod === 'CARD' ? "border-blue-600 bg-blue-50/50" : "border-slate-100 hover:border-blue-200"
                    )}
                  >
                    <CreditCard size={24} className={paymentMethod === 'CARD' ? "text-blue-600" : "text-slate-400"} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Carte Bancaire</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Total à payer</span>
                  <span className="text-slate-900 text-lg font-black">{cartTotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  <span>Points fidélité gagnés</span>
                  <span>+{cart.reduce((acc, item) => acc + (item.points * item.cartQuantity), 0)} pts</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.3em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                Confirmer le paiement <CheckCircle2 size={20} />
              </button>
              <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest italic">Paiement sécurisé par Nexus Cryptoguard v2</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, getDocs, query, where, onSnapshot } from '../lib/firebase';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Search, 
  ChevronRight, 
  MessageCircle, 
  Filter,
  X,
  Plus,
  Minus,
  Store,
  Info,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  companyId: string;
  location?: string;
}

interface Company {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  whatsappNumber?: string;
  category?: string;
  nairaRate?: number;
}

interface CartItem extends Product {
  cartQuantity: number;
  companyName: string;
}

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('nexus_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [showTransportCalc, setShowTransportCalc] = useState(false);
  const [nairaEnabled, setNairaEnabled] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', quartier: '' });

  useEffect(() => {
    localStorage.setItem('nexus_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setLoading(true);
    // Fetch companies
    const unsubscribeCompanies = onSnapshot(collection(db, 'companies'), (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
    });

    // Fetch all products
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    });

    return () => {
      unsubscribeCompanies();
      unsubscribeProducts();
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = activeCompanyId === 'all' || p.companyId === activeCompanyId;
      return matchesSearch && matchesCompany;
    });
  }, [products, searchTerm, activeCompanyId]);

  const addToCart = (product: Product) => {
    const company = companies.find(c => c.id === product.companyId);
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1, companyName: company?.name || 'Nexus Partner' }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }).filter(item => item.cartQuantity > 0));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);
  
  // Default Naira rate for Maroua context if not set per company
  const GLOBAL_NAIRA_RATE = 1.2; 

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: 'Sur commande', color: 'bg-amber-50 text-amber-600 border-amber-100' };
    if (stock <= 5) return { label: 'Stock Limité', color: 'bg-red-50 text-red-600 border-red-100' };
    return { label: 'Disponible', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  };

  const checkoutWhatsApp = (product?: Product) => {
    const targetProduct = product || cart[0];
    const company = companies.find(c => c.id === targetProduct?.companyId);
    const phone = company?.whatsappNumber || '237690000000';
    
    let message = '';
    if (product) {
       message = `Bonjour, je suis intéressé par le produit *${product.name}* (${product.price.toLocaleString()} FCFA) vu sur l'application Nexus Marketplace. Est-il toujours disponible ?`;
    } else {
       message = `*Nouvelle Commande Nexus ERP*\n\n` + 
        cart.map(item => `- ${item.name} (x${item.cartQuantity}) : ${(item.price * item.cartQuantity).toLocaleString()} FCFA`).join('\n') +
        `\n\n*Total : ${cartTotal.toLocaleString()} FCFA*` +
        `\n\nClient: ${checkoutData.name}\nTél: ${checkoutData.phone}\nQuartier: ${checkoutData.quartier}`;
    }
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleQuickCheckout = (e: React.FormEvent) => {
     e.preventDefault();
     checkoutWhatsApp();
     setShowCheckoutForm(false);
     setShowCart(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Chargement du Nexus Marketplace...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-24">
      {/* Search & Navigation Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <Store size={22} />
             </div>
             <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none italic">NEXUS MARKETPLACE</h1>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1 italic">Commerce Ouvert d'Excellence</p>
             </div>
          </div>

          <div className="flex-1 w-full relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Riz, ciment, IT..."
              className="w-full bg-slate-100/50 border-transparent rounded-2xl py-3 pl-12 pr-12 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
               <MessageCircle size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
             <button 
               onClick={() => setNairaEnabled(!nairaEnabled)}
               className={cn(
                 "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                 nairaEnabled ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-white text-slate-400 border-slate-100"
               )}
             >
               {nairaEnabled ? 'Naira (₦)' : 'FCFA'}
             </button>
             <button 
               onClick={() => setShowCart(true)}
               className="relative p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
             >
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                    {cart.reduce((a, b) => a + b.cartQuantity, 0)}
                  </span>
                )}
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* "Mall" Section */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Le "Mall" Virtuel de Maroua</h2>
              <div className="flex items-center gap-4">
                 <button onClick={() => setShowTransportCalc(true)} className="text-[9px] font-black text-blue-600 uppercase underline decoration-2 underline-offset-4">Estimer Livraison</button>
                 <button className="text-[9px] font-black text-slate-400 uppercase">Catalogue Offline</button>
              </div>
           </div>
           
           <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4">
              <div 
                onClick={() => setActiveCompanyId('all')}
                className={cn(
                  "aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-2",
                  activeCompanyId === 'all' ? "bg-slate-900 border-slate-900 shadow-xl shadow-slate-200" : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
                )}
              >
                 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", activeCompanyId === 'all' ? "bg-white text-slate-900" : "bg-slate-50 text-slate-400")}>
                    <Store size={20} />
                 </div>
                 <span className={cn("text-[8px] font-black uppercase tracking-tighter", activeCompanyId === 'all' ? "text-white" : "text-slate-400")}>Global</span>
              </div>

              {companies.map(company => (
                <div 
                  key={company.id}
                  onClick={() => setActiveCompanyId(company.id)}
                  className={cn(
                    "aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-2 group",
                    activeCompanyId === company.id ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-100" : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
                  )}
                >
                   <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner group-hover:scale-110 transition-transform">
                      {company.logo ? (
                        <img src={company.logo} className="w-full h-full object-cover" alt={company.name} />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300 font-black text-lg">
                           {company.name.charAt(0)}
                        </div>
                      )}
                   </div>
                   <span className={cn("text-[8px] font-black uppercase tracking-tighter truncate w-full px-2 text-center", activeCompanyId === company.id ? "text-white" : "text-slate-400")}>
                      {company.name}
                   </span>
                </div>
              ))}

              <div 
                onClick={() => { window.location.href = '#login'; }} 
                className="aspect-square rounded-3xl bg-blue-50 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-all"
              >
                  <Plus size={20} className="text-blue-600" />
                  <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter text-center">Vendre ici</span>
              </div>
           </div>
        </div>

        {/* Sectors / Filters */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
           {['Tous', 'Matériaux', 'Alimentation', 'Prestations', 'Services', 'Pièces'].map(cat => (
             <button 
               key={cat}
               className="px-6 py-3 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-white hover:shadow-md transition-all border border-transparent"
             >
               {cat}
             </button>
           ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
           <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 flex flex-col"
              >
                <div 
                  className="aspect-square overflow-hidden relative cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <img 
                    src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60'} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95 group-hover:brightness-100" 
                  />
                  <div className="absolute top-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                     <div className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-blue-600 shadow-xl">
                        <Info size={16} />
                     </div>
                  </div>
                  <div className="absolute bottom-4 left-4">
                     <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm border border-slate-100">
                        {companies.find(c => c.id === product.companyId)?.name || 'Nexus'}
                     </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                   <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 tracking-tight line-clamp-1">{product.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.category}</p>
                   </div>
                   
                   <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-col">
                         <span className="text-base font-black text-slate-900 leading-none">
                            {nairaEnabled 
                              ? `₦ ${(product.price * GLOBAL_NAIRA_RATE).toLocaleString()}`
                              : `${product.price.toLocaleString()} FCFA`
                            }
                         </span>
                         {nairaEnabled && (
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">
                              {product.price.toLocaleString()} FCFA
                           </span>
                         )}
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); checkoutWhatsApp(product); }}
                           className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                         >
                            <MessageCircle size={18} />
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                           className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90 shadow-lg shadow-slate-200 group-hover:shadow-blue-600/20"
                         >
                            <Plus size={18} />
                         </button>
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
           </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-20 text-center space-y-6">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search size={32} />
             </div>
             <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase">Aucun résultat</h3>
                <p className="text-xs font-medium text-slate-400">Essayez une autre recherche ou un autre partenaire.</p>
             </div>
             <button 
               onClick={() => {setSearchTerm(''); setActiveCompanyId('all');}}
               className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-600 hover:text-blue-600 transition-all"
             >
                Réinitialiser les filtres
             </button>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                     <ShoppingCart size={20} className="text-blue-600" />
                     <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Votre Panier</h2>
                  </div>
                  <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400">
                     <X size={20} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                       <ShoppingBag size={48} />
                       <p className="text-xs font-black uppercase tracking-[0.2em]">Panier Vide</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex gap-4 group">
                         <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 shrink-0">
                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                               <h4 className="text-sm font-black text-slate-900 truncate pr-4 italic">{item.name}</h4>
                               <span className="text-xs font-black text-slate-900 whitespace-nowrap">{(item.price * item.cartQuantity).toLocaleString()} FCFA</span>
                            </div>
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 opacity-60">{item.companyName}</p>
                            <div className="flex items-center gap-3">
                               <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 px-2 border border-slate-100">
                                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-blue-600 transition-colors"><Minus size={12} /></button>
                                  <span className="text-xs font-black min-w-[20px] text-center">{item.cartQuantity}</span>
                                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-blue-600 transition-colors"><Plus size={12} /></button>
                               </div>
                               <button 
                                 onClick={() => { setSelectedProduct(item); setShowCart(false); }}
                                 className="text-[9px] font-black text-blue-600 uppercase tracking-widest"
                               >
                                  Détails
                               </button>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>

               {cart.length > 0 && !showCheckoutForm && (
                 <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Estimate</span>
                        <div className="flex flex-col items-end">
                           <span className="text-2xl font-black text-slate-900 tracking-tighter">{cartTotal.toLocaleString()} FCFA</span>
                           {nairaEnabled && <span className="text-[10px] font-black text-amber-600 italic">₦ {(cartTotal * GLOBAL_NAIRA_RATE).toLocaleString()}</span>}
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowCheckoutForm(true)}
                       className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                     >
                        Acheter maintenant <ArrowRight size={18} />
                     </button>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                        Sans compte, par WhatsApp. Simple, rapide, Maroua.
                     </p>
                 </div>
               )}

               {showCheckoutForm && (
                 <motion.div 
                   initial={{ y: 50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   className="p-6 border-t border-slate-100 bg-white space-y-6"
                 >
                    <div className="space-y-1">
                       <h3 className="text-sm font-black text-slate-900 uppercase italic">Finaliser ma commande</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Infos de livraison rapides</p>
                    </div>
                    <form onSubmit={handleQuickCheckout} className="space-y-4">
                       <input 
                         required
                         type="text" 
                         placeholder="Votre Nom Complet"
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600"
                         value={checkoutData.name}
                         onChange={e => setCheckoutData({...checkoutData, name: e.target.value})}
                       />
                       <input 
                         required
                         type="text" 
                         placeholder="Téléphone (WhatsApp)"
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600"
                         value={checkoutData.phone}
                         onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})}
                       />
                       <input 
                         required
                         type="text" 
                         placeholder="Quartier de livraison (ex: Dewe, Harde)"
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600"
                         value={checkoutData.quartier}
                         onChange={e => setCheckoutData({...checkoutData, quartier: e.target.value})}
                       />
                       <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setShowCheckoutForm(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                             Retour
                          </button>
                          <button 
                            type="submit"
                            className="flex-[2] py-4 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                          >
                             Commander via WhatsApp
                          </button>
                       </div>
                    </form>
                 </motion.div>
               )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white z-[90] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
               <div className="md:w-1/2 bg-slate-100">
                  <img 
                    src={selectedProduct.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60'} 
                    className="w-full h-full object-cover" 
                    alt="" 
                  />
               </div>
               <div className="flex-1 p-8 md:p-10 flex flex-col justify-between">
                  <div className="space-y-6">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{selectedProduct.category}</p>
                           <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">{selectedProduct.name}</h2>
                        </div>
                        <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                     </div>
                     <p className="text-sm font-medium text-slate-500 leading-relaxed italic">{selectedProduct.description}</p>
                     
                     <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                           <TrendingUp size={20} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Partenaire Nexus</p>
                           <p className="text-xs font-black text-slate-900">{companies.find(c => c.id === selectedProduct.companyId)?.name}</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-10 space-y-6">
                     <div className="flex items-end justify-between">
                        <div className="space-y-1">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Prix Global</span>
                           <div className="flex flex-col">
                              <div className="flex items-baseline gap-1">
                                 <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                    {nairaEnabled ? (selectedProduct.price * GLOBAL_NAIRA_RATE).toLocaleString() : selectedProduct.price.toLocaleString()}
                                 </span>
                                 <span className="text-xs font-black text-slate-400 uppercase">{nairaEnabled ? '₦' : 'FCFA'}</span>
                              </div>
                              {nairaEnabled && <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedProduct.price.toLocaleString()} FCFA</span>}
                           </div>
                        </div>
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          getStockStatus(selectedProduct.stock).color
                        )}>
                           <Tag size={12} /> {getStockStatus(selectedProduct.stock).label}
                        </div>
                     </div>

                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Localisation: <span className="text-slate-700 font-black italic">{selectedProduct.location || 'Dewe / Hardé'}</span>
                     </p>

                     <div className="grid grid-cols-1 gap-3">
                       <button 
                         onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); setShowCart(true); }}
                         className="w-full py-5 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95"
                       >
                          <ShoppingCart size={18} /> Ajouter au Panier
                       </button>
                       <button 
                         onClick={() => checkoutWhatsApp(selectedProduct)}
                         className="w-full py-4 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                       >
                          <MessageCircle size={18} /> Négocier via WhatsApp
                       </button>
                     </div>
                  </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

     {/* Floating Cart for Mobile */}
     {cart.length > 0 && !showCart && (
        <motion.button 
          initial={{ scale: 0, y: 100 }}
          animate={{ scale: 1, y: 0 }}
          onClick={() => setShowCart(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-50 active:scale-90"
        >
           <ShoppingBag size={28} />
           <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              {cart.reduce((a, b) => a + b.cartQuantity, 0)}
           </span>
        </motion.button>
     )}

     {/* Transport Calculator Modal */}
     <AnimatePresence>
        {showTransportCalc && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowTransportCalc(false)}
               className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-2xl z-[110]"
            >
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Estimer Livraison</h3>
                  <button onClick={() => setShowTransportCalc(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={18} /></button>
               </div>
               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                     <p className="text-[9px] font-bold text-slate-400 uppercase">Moto-Taxi (Petit colis)</p>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">Centre-ville & Proximité</span>
                        <span className="text-xs font-black text-blue-600">500 FCFA</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">Zones éloignées (Dewe, Harde)</span>
                        <span className="text-xs font-black text-blue-600">1,000 FCFA</span>
                     </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                     <p className="text-[9px] font-bold text-slate-400 uppercase">Tricycle (Matériaux/Lourd)</p>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">Forfait Standard Maroua</span>
                        <span className="text-xs font-black text-blue-600">2,500 FCFA</span>
                     </div>
                  </div>
               </div>
               <button 
                 onClick={() => setShowTransportCalc(false)}
                 className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mt-6"
               >
                 Compris
               </button>
            </motion.div>
          </>
        )}
     </AnimatePresence>
    </div>
  );
}

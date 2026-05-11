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
}

interface Company {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  whatsappNumber?: string;
  category?: string;
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const checkoutWhatsApp = () => {
    const message = `*Nouvelle Commande Nexus ERP*\n\n` + 
      cart.map(item => `- ${item.name} (x${item.cartQuantity}) : ${(item.price * item.cartQuantity).toLocaleString()} FCFA`).join('\n') +
      `\n\n*Total : ${cartTotal.toLocaleString()} FCFA*`;
    
    // In a real app, we might group by company and send to each company or a coordinator. 
    // Here we'll just open a generic WhatsApp link (Maroua Coordinator) or use the first company's number.
    const firstCompany = companies.find(c => c.id === cart[0].companyId);
    const phone = firstCompany?.whatsappNumber || '237600000000'; // Fallback
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
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
              placeholder="Chercher un produit (riz, ciment, IT...)"
              className="w-full bg-slate-100/50 border-transparent rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
        {/* Company Filters */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Partenaires de Confiance</h2>
              <Filter size={16} className="text-slate-300" />
           </div>
           <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              <button 
                onClick={() => setActiveCompanyId('all')}
                className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border",
                  activeCompanyId === 'all' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-100 hover:border-blue-200"
                )}
              >
                TOUT LE CATALOGUE
              </button>
              {companies.map(company => (
                <button 
                  key={company.id}
                  onClick={() => setActiveCompanyId(company.id)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border flex items-center gap-3",
                    activeCompanyId === company.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-100 hover:border-blue-200"
                  )}
                >
                  {company.logo && <img src={company.logo} className="w-4 h-4 rounded-full object-cover" alt="" />}
                  {company.name}
                </button>
              ))}
           </div>
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
                            {product.price.toLocaleString()}
                         </span>
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">FCFA</span>
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90 shadow-lg shadow-slate-200 group-hover:shadow-blue-600/20"
                      >
                         <Plus size={18} />
                      </button>
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
                                 onClick={() => updateQuantity(item.id, -item.cartQuantity)}
                                 className="text-[9px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                  Supprimer
                               </button>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>

               {cart.length > 0 && (
                 <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Estimate</span>
                       <span className="text-2xl font-black text-slate-900 tracking-tighter">{cartTotal.toLocaleString()} FCFA</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                         onClick={checkoutWhatsApp}
                         className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                       >
                          <MessageCircle size={18} /> WhatsApp
                       </button>
                       <button 
                         onClick={() => {alert('Connectez-vous pour valider officiellement cette commande.'); setShowCart(false);}}
                         className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                       >
                          Nexus Official <ArrowRight size={18} />
                       </button>
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                       La commande via WhatsApp ne nécessite pas de compte.<br/>
                       L'historique officiel nécessite une connexion Nexus.
                    </p>
                 </div>
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
                           <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-slate-900 tracking-tighter">{selectedProduct.price.toLocaleString()}</span>
                              <span className="text-xs font-black text-slate-400 uppercase">FCFA</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                           <Tag size={12} /> Stock Disponible
                        </div>
                     </div>
                     <button 
                       onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); setShowCart(true); }}
                       className="w-full py-5 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95"
                     >
                        <ShoppingCart size={18} /> Ajouter au Panier
                     </button>
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
    </div>
  );
}

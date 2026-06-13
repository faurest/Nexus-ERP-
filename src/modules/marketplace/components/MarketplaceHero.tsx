import React from 'react';
import { Search, Store, MessageCircle, Truck, ShoppingCart, TrendingUp, Sparkles, Filter, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  SUPPORT_NUMBER: string;
  activeOrderCount: number;
  setShowTracking: (show: boolean) => void;
  setShowCart: (show: boolean) => void;
  cartCount: number;
  nairaEnabled: boolean;
  setNairaEnabled: (enabled: boolean) => void;
}

export function MarketplaceHero({
  searchTerm,
  setSearchTerm,
  SUPPORT_NUMBER,
  activeOrderCount,
  setShowTracking,
  setShowCart,
  cartCount,
  nairaEnabled,
  setNairaEnabled
}: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <Sparkles size={14} />
            <span>Nexus Operational</span>
          </div>
          
          <div className="flex items-center bg-slate-800/50 rounded-full p-1 backdrop-blur-sm border border-slate-700/50 shadow-inner">
            <button
              onClick={() => setNairaEnabled(false)}
              className={cn(
                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center",
                !nairaEnabled ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              FCFA
            </button>
            <button
              onClick={() => setNairaEnabled(true)}
              className={cn(
                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center",
                nairaEnabled ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-slate-400 hover:text-white"
              )}
            >
              ₦ NGN
            </button>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
          Trouvez tout ce dont <br className="hidden md:block" /> vous avez besoin.
        </h1>

        {/* Search Bar */}
        <div className="w-full max-w-3xl relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition-opacity"></div>
          <div className="relative flex items-center bg-white rounded-2xl shadow-2xl p-2 gap-2">
            <div className="pl-4 text-slate-400">
              <Search size={22} />
            </div>
            <input
              type="text"
              placeholder="Rechercher un produit, une marque, une catégorie..."
              className="flex-1 bg-transparent py-4 px-2 text-slate-900 font-bold outline-none placeholder:text-slate-400 placeholder:font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="hidden sm:flex px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all items-center gap-2">
              Rechercher <TrendingUp size={14} />
            </button>
          </div>
        </div>

        {/* Quick actions for mobile */}
        <div className="flex items-center gap-4 mt-8 sm:hidden">
          <button onClick={() => setShowTracking(true)} className="flex flex-col items-center gap-2 text-slate-300 hover:text-white transition-colors relative">
            <Truck size={24} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Suivi</span>
            {activeOrderCount > 0 && <span className="absolute -top-1 -right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 text-[8px] flex items-center justify-center font-black animate-pulse">{activeOrderCount}</span>}
          </button>
          <button onClick={() => setShowCart(true)} className="flex flex-col items-center gap-2 text-slate-300 hover:text-white transition-colors relative">
            <ShoppingCart size={24} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Panier</span>
            {cartCount > 0 && <span className="absolute -top-1 -right-2 w-4 h-4 bg-blue-600 rounded-full border-2 border-slate-900 text-[8px] flex items-center justify-center font-black animate-bounce">{cartCount}</span>}
          </button>
          <button 
             onClick={() => {
               const message = "Bonjour, j'ai une question sur Nexus Marketplace.";
               window.open(`https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
             }}
             className="flex flex-col items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <MessageCircle size={24} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Aide</span>
          </button>
        </div>
      </div>
    </div>
  );
}

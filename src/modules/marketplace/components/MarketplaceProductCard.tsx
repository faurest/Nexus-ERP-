import React from 'react';
import { ShoppingCart, Heart, Package, ShieldCheck, MapPin, Building2, Eye, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { CATEGORY_ICONS } from './MarketplaceCategories';

interface ProductCardProps {
  product: any; // Using any for simpler integration, should match Product
  company?: any;
  nairaEnabled: boolean;
  nairaRate: number;
  isFavorite?: boolean;
  onAddToCart: (product: any) => void;
  onViewDetails: (product: any) => void;
  onToggleFavorite?: (companyId: string) => void;
  viewMode?: 'grid' | 'list';
}

export function MarketplaceProductCard({
  product,
  company,
  nairaEnabled,
  nairaRate,
  isFavorite,
  onAddToCart,
  onViewDetails,
  onToggleFavorite,
  viewMode = 'grid'
}: ProductCardProps) {
  
  const displayPrice = nairaEnabled 
    ? `₦ ${Math.round(product.price * nairaRate).toLocaleString()}`
    : `${product.price.toLocaleString()} FCFA`;

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: "Rupture", color: "text-red-600 bg-red-50 border-red-100" };
    if (stock <= 5) return { label: `Stock Faible (${stock})`, color: "text-amber-600 bg-amber-50 border-amber-100" };
    return { label: "En Stock", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
  };

  const stockStatus = getStockStatus(product.stock);
  const CategoryIcon = CATEGORY_ICONS[product.category || 'Divers'] || Package;

  if (viewMode === 'list') {
    return (
      <div className="flex gap-4 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
        <div 
          className="w-28 h-28 rounded-xl bg-slate-50 cursor-pointer overflow-hidden relative shrink-0" 
          onClick={() => onViewDetails(product)}
        >
          {product.image ? (
            <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-300">
               <CategoryIcon size={24} />
             </div>
          )}
          <div className="absolute top-2 left-2">
             <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-md", stockStatus.color)}>
               {stockStatus.label}
             </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col py-1">
           <div className="flex items-start justify-between gap-4">
             <div>
               <div className="flex items-center gap-1.5 mb-1.5">
                 <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                   <Building2 size={10} /> {company?.name || "Nexus Partner"}
                 </div>
                 {company?.location && (
                   <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
                     • <MapPin size={10} /> {company.location}
                   </div>
                 )}
               </div>
               <h3 className="text-sm font-bold text-slate-900 leading-tight mb-1 cursor-pointer hover:text-blue-600 transition-colors line-clamp-1" onClick={() => onViewDetails(product)}>
                 {product.name}
               </h3>
               <p className="text-xs text-slate-500 line-clamp-1 max-w-md mb-2">
                 {product.description}
               </p>
             </div>
             <div className="text-right shrink-0">
               <div className={cn("text-base font-black transition-colors", nairaEnabled ? "text-emerald-600" : "text-slate-900")}>{displayPrice}</div>
               {product.originalPrice && <div className="text-[10px] text-slate-400 line-through">{(product.originalPrice).toLocaleString()} FCFA</div>}
             </div>
          </div>
          <div className="mt-auto flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
              disabled={product.stock <= 0 && !product.allowBackorder}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all",
                product.stock <= 0 && !product.allowBackorder
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-nexus-accent text-white hover:bg-nexus-accent text-white hover:bg-nexus-accent/80 shadow-sm hover:shadow-blue-600/20 active:scale-95"
              )}
            >
              <ShoppingCart size={12} /> Ajouter
            </button>
            <button 
              onClick={() => onViewDetails(product)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all font-sans"
            >
              Détails
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (Default)
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group overflow-hidden h-full">
      <div 
        className="w-full aspect-square bg-slate-50 cursor-pointer overflow-hidden relative"
        onClick={() => onViewDetails(product)}
      >
        {product.image ? (
          <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} />
        ) : (
           <div className="w-full h-full flex items-center justify-center text-slate-300 bg-gradient-to-tr from-slate-100 to-slate-50">
             <CategoryIcon size={32} className="opacity-50" />
           </div>
        )}
        
        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-md", stockStatus.color)}>
            {stockStatus.label}
          </span>
        </div>
        
        {onToggleFavorite && (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.companyId); }}
            className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-md hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-all shadow-sm z-10"
          >
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "text-red-500" : ""} />
          </button>
        )}

        {/* Quick View Overlay on Hover */}
        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
           <div className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all">
             <Eye size={12} /> Voir
           </div>
        </div>
      </div>
      
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-400">
           <Building2 size={10} /> 
           <span className="truncate">{company?.name || "Nexus Partner"}</span>
        </div>
        
        <h3 
          className="text-xs font-bold text-slate-900 leading-tight mb-2 cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
          onClick={() => onViewDetails(product)}
        >
          {product.name}
        </h3>
        
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div>
            <div className={cn("text-sm font-black tracking-tight transition-colors", nairaEnabled ? "text-emerald-600" : "text-slate-900")}>{displayPrice}</div>
            {product.originalPrice && <div className="text-[9px] text-slate-400 line-through">{(product.originalPrice).toLocaleString()} FCFA</div>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            disabled={product.stock <= 0 && !product.allowBackorder}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              product.stock <= 0 && !product.allowBackorder
                ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                : "bg-nexus-accent text-white hover:bg-nexus-accent text-white hover:bg-nexus-accent/80 shadow-sm hover:shadow-blue-600/20 active:scale-95"
            )}
          >
            <ShoppingCart size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

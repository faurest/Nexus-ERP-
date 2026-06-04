import React from 'react';
import { motion } from 'motion/react';
import { X, ShoppingCart, ShoppingBag, MapPin, Building2, ShieldCheck, Share2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CATEGORY_ICONS } from './MarketplaceCategories';

interface ProductDetailProps {
  product: any;
  company: any;
  onClose: () => void;
  onAddToCart: (p: any) => void;
  nairaEnabled: boolean;
  nairaRate: number;
}

export function MarketplaceProductDetail({
  product,
  company,
  onClose,
  onAddToCart,
  nairaEnabled,
  nairaRate
}: ProductDetailProps) {
  if (!product) return null;

  const isGrouped = product.isGrouped && product.offers?.length > 1;
  const displayPrice = nairaEnabled 
    ? `₦ ${Math.round(product.price * nairaRate).toLocaleString()}`
    : `${product.price.toLocaleString()} FCFA`;

  const CategoryIcon = CATEGORY_ICONS[product.category || 'Divers'] || ShoppingBag;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
      />
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        className="fixed inset-x-4 top-[10%] bottom-[10%] max-w-4xl mx-auto bg-white rounded-[2rem] shadow-2xl z-[110] overflow-hidden flex flex-col md:flex-row"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 shadow-sm border border-slate-200 hover:bg-slate-100 transition-all"
        >
          <X size={20} />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-1/2 h-64 md:h-full bg-slate-50 relative flex items-center justify-center">
          {product.image ? (
            <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
          ) : (
            <CategoryIcon size={80} className="text-slate-200" />
          )}
          {isGrouped && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-indigo-600 text-white text-[10px] uppercase font-black tracking-widest rounded-full shadow-lg">
              Meilleur Prix Garanti
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 h-full overflow-y-auto p-6 md:p-10 flex flex-col">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
               <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{product.category || 'Non classé'}</span>
               {company && <span>• {company.name}</span>}
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
              {product.name}
            </h2>

            <div className="flex items-center gap-4">
              <div className={cn("text-3xl font-black transition-colors", nairaEnabled ? "text-emerald-600" : "text-slate-900")}>{displayPrice}</div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {product.description || "Aucune description longue n'a été fournie pour ce produit."}
            </p>

            {isGrouped ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mt-6">
                <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-3">Disponible chez {product.offers.length} vendeurs</h4>
                <div className="space-y-2">
                  {product.offers.map((offer: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-50">
                       <span className={cn("text-xs font-bold transition-colors", nairaEnabled ? "text-emerald-600" : "text-slate-700")}>
                         {nairaEnabled ? `₦ ${Math.round(offer.price * nairaRate).toLocaleString()}` : `${offer.price.toLocaleString()} FCFA`}
                       </span>
                       <button onClick={() => onAddToCart(offer)} className="px-3 py-1.5 bg-nexus-accent text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">
                         Acheter
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-2 mt-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <ShieldCheck size={16} className="text-emerald-500" /> Vendeur vérifié
                </div>
                {company?.location && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <MapPin size={16} className="text-blue-500" /> Expédié depuis: {company.location}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
            {!isGrouped && (
              <button
                disabled={product.stock <= 0 && !product.allowBackorder}
                onClick={() => onAddToCart(product)}
                className={cn(
                  "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl",
                  product.stock <= 0 && !product.allowBackorder
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-nexus-accent text-white hover:bg-nexus-accent text-white hover:bg-nexus-accent/80 hover:shadow-blue-600/20 active:scale-95"
                )}
              >
                <ShoppingCart size={16} /> 
                {product.stock > 0 || product.allowBackorder ? "Ajouter au Panier" : "En Rupture"}
              </button>
            )}
            <button className="w-14 h-14 bg-white border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shrink-0 shadow-sm">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

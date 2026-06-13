import React from 'react';
import { Store, Heart, MapPin, ChevronRight, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';

interface CompanyListProps {
  companies: any[];
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
}

export function MarketplaceCompanyList({
  companies,
  activeCompanyId,
  setActiveCompanyId,
  favorites,
  toggleFavorite
}: CompanyListProps) {
  return (
    <div className="bg-slate-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Vitrines Partenaires</h2>
          </div>
          <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:text-slate-900 transition-colors">
            Voir tout <ChevronRight size={12} />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 mask-linear-gradient-x">
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => setActiveCompanyId("all")}
            className={cn(
              "w-[120px] p-3 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-2 shrink-0",
              activeCompanyId === "all"
                ? "bg-slate-900 border-slate-900 shadow-xl shadow-slate-900/20"
                : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              activeCompanyId === "all" ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400"
            )}>
              <Store size={18} />
            </div>
            <div className="text-center">
              <div className={cn(
                "text-[10px] font-black uppercase tracking-widest mb-0.5",
                activeCompanyId === "all" ? "text-white" : "text-slate-900"
              )}>Tous</div>
              <div className={cn(
                "text-[8px] font-bold uppercase tracking-widest",
                activeCompanyId === "all" ? "text-slate-400" : "text-slate-400"
              )}>Catalogue</div>
            </div>
          </motion.div>

          {companies.map((company) => {
            const isFavorite = favorites.includes(company.id);
            const isActive = activeCompanyId === company.id;

            return (
              <motion.div
                key={company.id}
                whileHover={{ y: -3 }}
                onClick={() => setActiveCompanyId(company.id)}
                className={cn(
                  "w-[140px] p-3 rounded-2xl flex flex-col cursor-pointer transition-all border-2 shrink-0 relative group",
                  isActive
                    ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-600/20"
                    : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100/50 flex items-center justify-center shadow-inner">
                    {company.logo ? (
                      <img src={company.logo} className="w-full h-full object-cover" alt={company.name} />
                    ) : (
                      <Store size={16} className="text-slate-300" />
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(company.id); }}
                    className={cn(
                      "p-1.5 rounded-full transition-all",
                      isFavorite 
                        ? (isActive ? "bg-white/20 text-white" : "bg-red-50 text-red-500") 
                        : (isActive ? "bg-white/10 text-white/50 hover:text-white" : "bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50")
                    )}
                  >
                    <Heart size={12} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
                
                <h3 className={cn(
                  "text-xs font-black truncate uppercase tracking-tight mb-0.5 mt-1",
                  isActive ? "text-white" : "text-slate-900"
                )}>
                  {company.name}
                </h3>
                
                <div className={cn(
                  "flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest truncate",
                  isActive ? "text-blue-100" : "text-slate-400"
                )}>
                  <MapPin size={8} className="shrink-0" /> <span className="truncate">{company.location || "Localisation..."}</span>
                </div>
                
                <div className="mt-2 pt-2 border-t border-slate-100/10 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star size={8} className={isActive ? "text-amber-300" : "text-amber-400"} fill="currentColor" />
                    <span className={cn(
                      "text-[9px] font-black",
                      isActive ? "text-white" : "text-slate-700"
                    )}>4.8</span>
                  </div>
                  <div className={cn(
                     "text-[8px] font-bold uppercase",
                     isActive ? "text-blue-200" : "text-slate-400"
                  )}>
                     Voir <ChevronRight size={8} className="inline" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

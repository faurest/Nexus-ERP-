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
    <div className="py-8 bg-slate-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Vitrines Partenaires</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Découvrez les meilleures boutiques</p>
          </div>
          <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:text-slate-900 transition-colors">
            Voir tout <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2 mask-linear-gradient-x">
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => setActiveCompanyId("all")}
            className={cn(
              "w-[160px] p-5 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all border-2 shrink-0",
              activeCompanyId === "all"
                ? "bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/20"
                : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all",
              activeCompanyId === "all" ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400"
            )}>
              <Store size={28} />
            </div>
            <div className="text-center">
              <div className={cn(
                "text-xs font-black uppercase tracking-widest mb-1",
                activeCompanyId === "all" ? "text-white" : "text-slate-900"
              )}>Tous les shops</div>
              <div className={cn(
                "text-[9px] font-bold uppercase",
                activeCompanyId === "all" ? "text-slate-400" : "text-slate-400"
              )}>Catalogue Global</div>
            </div>
          </motion.div>

          {companies.map((company) => {
            const isFavorite = favorites.includes(company.id);
            const isActive = activeCompanyId === company.id;

            return (
              <motion.div
                key={company.id}
                whileHover={{ y: -5 }}
                onClick={() => setActiveCompanyId(company.id)}
                className={cn(
                  "w-[200px] p-5 rounded-[2rem] flex flex-col cursor-pointer transition-all border-2 shrink-0 relative group",
                  isActive
                    ? "bg-blue-600 border-blue-600 shadow-2xl shadow-blue-600/20"
                    : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/50 flex items-center justify-center shadow-inner">
                    {company.logo ? (
                      <img src={company.logo} className="w-full h-full object-cover" alt={company.name} />
                    ) : (
                      <Store size={24} className="text-slate-300" />
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(company.id); }}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      isFavorite 
                        ? (isActive ? "bg-white/20 text-white" : "bg-red-50 text-red-500") 
                        : (isActive ? "bg-white/10 text-white/50 hover:text-white" : "bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50")
                    )}
                  >
                    <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
                
                <h3 className={cn(
                  "text-sm font-black truncate uppercase tracking-tight mb-1",
                  isActive ? "text-white" : "text-slate-900"
                )}>
                  {company.name}
                </h3>
                
                <div className={cn(
                  "flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest",
                  isActive ? "text-blue-100" : "text-slate-400"
                )}>
                  <MapPin size={10} /> {company.location || "Localisation en attente"}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100/10 flex items-center justify-between">
                  {/* Fake rating for premium look, can be wired to actual data later */}
                  <div className="flex items-center gap-1">
                    <Star size={10} className={isActive ? "text-amber-300" : "text-amber-400"} fill="currentColor" />
                    <span className={cn(
                      "text-[10px] font-black",
                      isActive ? "text-white" : "text-slate-700"
                    )}>4.8</span>
                  </div>
                  <div className={cn(
                     "text-[9px] font-bold uppercase",
                     isActive ? "text-blue-200" : "text-slate-400"
                  )}>
                     Visiter <ChevronRight size={10} className="inline" />
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

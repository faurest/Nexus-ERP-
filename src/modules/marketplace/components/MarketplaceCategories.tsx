import React from 'react';
import { LayoutGrid, Package, Settings, HardHat, Zap, Monitor, Hammer, Wheat } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const CATEGORY_ICONS: Record<string, any> = {
  "Tous": LayoutGrid,
  "Construction": HardHat,
  "Ciment": HardHat,
  "Céréales": Wheat,
  "Pièces détachées": Settings,
  "Bricolage": Hammer,
  "Informatique": Monitor,
  "Électroménager": Zap,
  "Divers": Package
};

export const CATEGORY_LIST = ["Tous", "Construction", "Ciment", "Céréales", "Pièces détachées", "Bricolage", "Informatique", "Électroménager", "Divers"];

interface CategoriesProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
}

export function MarketplaceCategories({ activeCategory, setActiveCategory }: CategoriesProps) {
  return (
    <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-4 overflow-x-auto py-4 scrollbar-hide -mx-2 px-2 mask-linear-gradient-x items-center">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-nexus-text-muted mr-2 shrink-0">
            Rayons :
          </div>
          {CATEGORY_LIST.map((cat) => {
            const isActive = activeCategory === cat;
            const Icon = CATEGORY_ICONS[cat] || Package;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 flex items-center gap-2",
                  isActive
                    ? "bg-nexus-accent border-slate-900 text-white shadow-xl shadow-slate-900/10"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:bg-white"
                )}
              >
                <Icon size={14} className={isActive ? "text-white" : "opacity-70"} />
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

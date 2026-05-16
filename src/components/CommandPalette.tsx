import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, X, LayoutDashboard, Users, Briefcase, Package, FolderKanban, TrendingUp, Calculator, Shield, BookOpen, Layers, ShoppingBag, Store, Handshake, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  user: any;
}

export default function CommandPalette({ isOpen, onClose, onNavigate, user }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, category: 'Navigation', shortcut: 'D' },
    { id: 'sales', label: 'Ventes & Facturation', icon: TrendingUp, category: 'Navigation', shortcut: 'V' },
    { id: 'ecommerce', label: 'E-commerce', icon: ShoppingBag, category: 'Navigation', shortcut: 'E' },
    { id: 'clients', label: 'CRM / Clients', icon: Users, category: 'Navigation', shortcut: 'C' },
    { id: 'personnel', label: 'Ressources Humaines', icon: Briefcase, category: 'Navigation', shortcut: 'R' },
    { id: 'resources', label: 'Stocks & Logistique', icon: Package, category: 'Navigation', shortcut: 'S' },
    { id: 'projects', label: 'Projets & Tâches', icon: FolderKanban, category: 'Navigation', shortcut: 'P' },
    { id: 'accounting', label: 'Comptabilité & Finance', icon: Calculator, category: 'Navigation', shortcut: 'F' },
    { id: 'collaboration', label: 'Collaboration', icon: Handshake, category: 'Navigation', shortcut: 'L' },
    { id: 'marketplace', label: 'Marketplace Public', icon: Store, category: 'Navigation', shortcut: 'M' },
    { id: 'guide', label: 'Guide & Aide', icon: BookOpen, category: 'Assistance', shortcut: 'H' },
    { id: 'admin', label: 'Console Maître', icon: Shield, category: 'Système', shortcut: 'A', adminOnly: true },
  ];

  const filteredActions = actions.filter(action => {
    if (action.adminOnly && !['hackeurfaurest@gmail.com', 'dangafelicite@gmail.com', 'yaoubaboubakary43@gmail.com'].includes(user?.email)) return false;
    return action.label.toLowerCase().includes(query.toLowerCase()) || 
           action.category.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-nexus-bg/80 backdrop-blur-md"
        />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-nexus-surface border border-white/10 rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center gap-4">
            <Search className="text-nexus-accent" size={24} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une commande, un module ou une action..."
              className="flex-1 bg-transparent border-none outline-none text-nexus-text text-lg font-medium placeholder:text-nexus-text-muted"
            />
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
              <span className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">ESC</span>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 max-h-[60vh] overflow-y-auto p-4 scrollbar-hide">
            {filteredActions.length > 0 ? (
              <div className="space-y-6">
                {/* Group by category */}
                {Array.from(new Set(filteredActions.map(a => a.category))).map(category => (
                  <div key={category} className="space-y-2">
                    <h3 className="px-4 text-[10px] font-black text-nexus-accent uppercase tracking-[0.3em] opacity-80">{category}</h3>
                    <div className="space-y-1">
                      {filteredActions.filter(a => a.category === category).map(action => (
                        <button
                          key={action.id}
                          onClick={() => {
                            onNavigate(action.id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl group-hover:bg-nexus-accent group-hover:text-white transition-all">
                              <action.icon size={20} />
                            </div>
                            <span className="text-sm font-bold text-nexus-text group-hover:translate-x-1 transition-transform">{action.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">Alt + {action.shortcut}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <X className="text-nexus-text-muted" size={32} />
                </div>
                <p className="text-nexus-text-muted text-sm font-medium">Aucun résultat pour "{query}"</p>
                <p className="text-[10px] text-nexus-accent font-black uppercase tracking-widest mt-2">Essayez une autre commande Nexus</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/40 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[9px] font-black text-nexus-text-muted uppercase tracking-widest">
                <div className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10">↑↓</div>
                Naviguer
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black text-nexus-text-muted uppercase tracking-widest">
                <div className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10">ENTER</div>
                Sélectionner
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Command size={14} className="text-nexus-accent" />
              <span className="text-[9px] font-bold text-nexus-text-muted uppercase tracking-widest">Cockpit Command v5.0</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

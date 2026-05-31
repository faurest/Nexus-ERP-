import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export default function Table({ headers, children, className }: TableProps) {
  return (
    <div className={cn("bg-nexus-surface border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden", className)}>
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[800px] md:min-w-full">
          <div className="flex items-center bg-white/5 border-b border-white/5">
            {headers.map((header, i) => (
              <div key={i} className="flex-1 px-8 py-5 text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.25em] text-left">
                {header}
              </div>
            ))}
          </div>
          <div className="divide-y divide-white/5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  key?: string | number;
}

export function TableRow({ children, onClick, className }: TableRowProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center transition-all cursor-pointer hover:bg-white/5 group bg-transparent",
        className
      )}
    >
      {React.Children.map(children, (child, i) => (
        <div key={i} className="flex-1 px-8 py-5 text-[11px] font-bold text-nexus-text">
          {child}
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export default function Table({ headers, children, className }: TableProps) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm", className)}>
      <div className="flex items-center bg-slate-50 border-b border-slate-100 min-w-full">
        {headers.map((header, i) => (
          <div key={i} className="flex-1 px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
            {header}
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-50">
        {children}
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
        "flex items-center transition-all cursor-pointer hover:bg-slate-50/80 group",
        className
      )}
    >
      {React.Children.map(children, (child, i) => (
        <div key={i} className="flex-1 px-6 py-4 text-xs font-medium text-slate-700">
          {child}
        </div>
      ))}
    </div>
  );
}

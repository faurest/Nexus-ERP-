import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Package, MapPin, CheckCircle2, Clock, ShieldCheck, QrCode, Smartphone, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

interface TrackingStep {
  status: string;
  location: string;
  time: string;
  done: boolean;
  active?: boolean;
}

export default function LogisticsTracker({ orderId, customerName }: { orderId: string, customerName?: string }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const steps: TrackingStep[] = [
    { status: 'Commande Reçue', location: 'Nexus Hub Maroua', time: '10:30', done: true },
    { status: 'Préparation du Colis', location: 'Nexus Hub Maroua', time: '11:15', done: true },
    { status: 'En cours de Livraison', location: 'Quartier Domayo', time: '12:00', done: true, active: true },
    { status: 'Livré', location: 'Client', time: '--:--', done: false },
  ];

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scan progression
    const timer = setInterval(() => {
      setScanStep(prev => {
        if (prev >= 3) {
          clearInterval(timer);
          setTimeout(() => setIsScanning(false), 1000);
          return 3;
        }
        return prev + 1;
      });
    }, 800);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
      <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Truck size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest italic">Nexus Logistics Pro</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Commande #{orderId.slice(-6)}</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">En transit</span>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Tracking Timeline */}
        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                  step.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-300"
                )}>
                  {step.done ? <CheckCircle2 size={16} /> : <div className="w-2 h-2 bg-current rounded-full" />}
                </div>
                {idx !== steps.length - 1 && (
                  <div className={cn(
                    "w-0.5 grow my-1",
                    step.done ? "bg-emerald-500" : "bg-slate-100"
                  )} />
                )}
              </div>
              <div className="pb-4">
                 <h4 className={cn(
                   "text-xs font-black uppercase tracking-widest mb-1 transition-all",
                   step.active ? "text-blue-600" : step.done ? "text-slate-900" : "text-slate-300"
                 )}>
                   {step.status}
                 </h4>
                 <div className="flex items-center gap-4">
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <MapPin size={10} /> {step.location}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 border-l pl-4 border-slate-100">
                      <Clock size={10} /> {step.time}
                    </p>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action area: Scan to Deliver */}
        <div className="pt-8 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opération Coursier</p>
              <h4 className="text-xs font-black text-slate-900 uppercase italic mt-1">Validation à la livraison</h4>
            </div>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className={cn(
                "px-6 py-3 rounded-2xl flex items-center gap-3 transition-all active:scale-95",
                isScanning ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-blue-200"
              )}
            >
              {isScanning ? <Smartphone className="animate-bounce" size={18} /> : <QrCode size={18} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{isScanning ? 'Scan en cours...' : 'Scanner pour Livrer'}</span>
            </button>
          </div>

          <AnimatePresence>
            {isScanning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4"
              >
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(scanStep / 3) * 100}%` }}
                    className="h-full bg-blue-600"
                  />
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] animate-pulse">
                  <ShieldCheck size={16} /> Authentification de livraison...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Trust Factor */}
        <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-center gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
             <BrainCircuit size={80} />
          </div>
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 relative z-10 shrink-0">
             <ShieldCheck size={28} />
          </div>
          <div className="relative z-10">
             <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">Indice de Confiance Nexus AI</p>
             <h3 className="text-xl font-black text-slate-900 tracking-tight italic">Fiabilité 98.4%</h3>
             <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase leading-relaxed">
               Basé sur l'historique de {customerName || 'ce client'} et la régularité du partenaire logistique.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

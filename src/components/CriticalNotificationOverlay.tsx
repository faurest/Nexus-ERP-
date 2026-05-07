import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Bell, ExternalLink, TriangleAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, onSnapshot, updateDoc, doc } from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';

export default function CriticalNotificationOverlay({ user }: { user: any }) {
  const [criticalNotif, setCriticalNotif] = useState<any | null>(null);
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (!currentCompany || !user) return;

    // Listen for critical notifications (type 'alert') that are unread
    const q = query(
      collection(db, 'notifications'),
      where('companyId', '==', currentCompany.id),
      where('userId', '==', user.uid),
      where('type', '==', 'alert'),
      where('isRead', '==', 0)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const unreadAlerts = snapshot.docs.map((d: any) => ({
        id: d.id,
        ...d.data()
      }));
      
      if (unreadAlerts.length > 0) {
        // Show the most recent one
        unreadAlerts.sort((a, b) => (b.date || 0) - (a.date || 0));
        setCriticalNotif(unreadAlerts[0]);
      } else {
        setCriticalNotif(null);
      }
    });

    return () => unsubscribe();
  }, [currentCompany, user]);

  const dismiss = async () => {
    if (!criticalNotif) return;
    try {
      await updateDoc(doc(db, 'notifications', criticalNotif.id), {
        isRead: 1
      });
      setCriticalNotif(null);
    } catch (err) {
      console.error("Nexus Overlay: Failed to dismiss alert", err);
    }
  };

  return (
    <AnimatePresence>
      {criticalNotif && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden text-center"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 bg-red-500" />
            <div className="absolute top-0 right-0 p-32 opacity-5 -mr-16 -mt-16 pointer-events-none">
                <TriangleAlert size={200} className="text-red-600" />
            </div>

            <div className="relative z-10">
              <div className="w-20 h-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center text-red-600 mx-auto mb-8 shadow-xl shadow-red-100 border border-red-100">
                <AlertCircle size={40} strokeWidth={2.5} />
              </div>

              <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-4">
                Alerte <span className="text-red-600 uppercase">Système Critique</span>
              </h2>
              
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl mb-8">
                <h3 className="font-bold text-slate-900 text-lg mb-2">{criticalNotif.title}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed italic">
                  "{criticalNotif.message}"
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={dismiss}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-slate-200"
                >
                  J'ai pris connaissance
                </button>
                <button 
                  onClick={dismiss}
                  className="w-full bg-white text-slate-400 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Fermer
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
                <Bell size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Nexus Notification Engine v2</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

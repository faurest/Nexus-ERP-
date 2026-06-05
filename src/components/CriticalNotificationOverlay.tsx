import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
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
    <>
      {criticalNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60">
          <div className="w-full max-w-lg bg-white rounded-2xl p-10 shadow-2xl relative overflow-hidden text-center">
            {/* Background Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 bg-red-500" />

            <div className="relative z-10">
              <div className="w-20 h-20 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mx-auto mb-8 border border-red-100">
                <AlertCircle size={40} strokeWidth={2.5} />
              </div>

              <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight mb-4">
                Alerte <span className="text-red-600 uppercase">Critique</span>
              </h2>
              
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl mb-8">
                <h3 className="font-bold text-slate-900 text-lg mb-2">{criticalNotif.title}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed italic">
                  "{criticalNotif.message}"
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={dismiss}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all font-mono"
                >
                  J'ai pris connaissance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Box, FileText, CheckCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, onSnapshot, doc, updateDoc, setDoc } from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';
import { requestNotificationPermission, showSystemNotification } from '../lib/notifications';

export default function NotificationBell({ user }: { user: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const lastNotifId = useRef<string | null>(null);
  const { currentCompany } = useCompany();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Request permission on mount
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!currentCompany || !user) return;

    // Fetch notifications for the user + specific company
    const q = query(
      collection(db, 'notifications'),
      where('companyId', '==', currentCompany.id),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const notifs = snapshot.docs.map((d: any) => ({
        id: d.id,
        ...d.data()
      }));
      // Sort by date descending
      notifs.sort((a, b) => (b.date || 0) - (a.date || 0));
      
      // Check for new unread notifications to trigger system alert
      const latest = notifs[0];
      if (latest && !latest.isRead && latest.id !== lastNotifId.current) {
        // Avoid double trigger if it's just a state refresh
        if (lastNotifId.current !== null) {
          showSystemNotification(latest.title, latest.message);
        }
        lastNotifId.current = latest.id;
      } else if (latest && lastNotifId.current === null) {
        // First load, don't notify but set the ref
        lastNotifId.current = latest.id;
      }
      
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentCompany, user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'notifications', id), {
        isRead: 1
      });
    } catch (err) {
      console.error("Error marking read", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), {
          isRead: 1
        });
      } catch (err) {
        console.error("Error marking all read", err);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-slate-500 hover:text-white bg-white hover:bg-blue-600 rounded-2xl relative transition-all group shadow-sm hover:shadow-blue-200 border border-slate-100 hover:border-blue-500"
      >
        <Bell size={20} className="transition-transform group-hover:rotate-12" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-black shadow-lg animate-bounce lg:animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 z-50 overflow-hidden flex flex-col max-h-96"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Aucune notification</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id}
                    className={`p-3 rounded-xl flex gap-3 group transition-colors cursor-default ${
                      notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50 relative'
                    }`}
                  >
                    {!notif.isRead && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                    <div className="pl-2">
                       {notif.type === 'task' ? <CheckCircle size={16} className="text-blue-500 mt-0.5" /> :
                        notif.type === 'project' ? <FileText size={16} className="text-purple-500 mt-0.5" /> :
                        notif.type === 'collab' ? <Box size={16} className="text-amber-500 mt-0.5" /> :
                        notif.type === 'general' ? <MessageSquare size={16} className="text-emerald-500 mt-0.5" /> :
                        notif.type === 'alert' ? <Box size={16} className="text-red-500 mt-0.5" /> :
                        <Bell size={16} className="text-slate-400 mt-0.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                        {new Date(notif.date || Date.now()).toLocaleString()}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <button 
                        onClick={(e) => markAsRead(notif.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white rounded-lg text-blue-600 transition-all self-start shadow-sm mix-blend-multiply"
                        title="Marquer comme lu"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Nexus System Alerts</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

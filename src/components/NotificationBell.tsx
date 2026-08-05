import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, Check, ShoppingCart, FileText, CheckCircle, MessageSquare, ClipboardList, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, onSnapshot, doc, updateDoc } from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';
import { requestNotificationPermission, showSystemNotification } from '../lib/notifications';
import { taskStatusLabel } from '../lib/taskTracking';

type FeedItem = {
  id: string;
  kind: 'notification' | 'order' | 'message' | 'task';
  title: string;
  message: string;
  date: number;
  isRead: boolean;
  payload: any;
};

function toMs(ts: any): number {
  if (ts === null || ts === undefined || ts === '') return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export default function NotificationBell({ user }: { user: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const lastNotifId = useRef<string | null>(null);
  const { currentCompany } = useCompany();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!currentCompany || !user) return;

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
      notifs.sort((a, b) => (toMs(b.date) || toMs(b.createdAt)) - (toMs(a.date) || toMs(a.createdAt)));

      const latest = notifs[0];
      if (latest && !latest.isRead && latest.id !== lastNotifId.current) {
        if (lastNotifId.current !== null) {
          showSystemNotification(latest.title, latest.message);
        }
        lastNotifId.current = latest.id;
      } else if (latest && lastNotifId.current === null) {
        lastNotifId.current = latest.id;
      }

      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentCompany, user]);

  useEffect(() => {
    if (!currentCompany) return;

    const unsubOrders = onSnapshot(
      query(collection(db, 'ecommerce_orders'), where('companyId', '==', currentCompany.id)),
      snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Erreur notifications commandes', err),
    );

    return () => unsubOrders();
  }, [currentCompany]);

  useEffect(() => {
    if (!currentCompany || !user) return;

    const myEmail = user.email?.toLowerCase().trim() || '';
    if (!myEmail) return;

    const unsubMessages = onSnapshot(
      query(
        collection(db, 'messages'),
        where('companyId', '==', currentCompany.id),
        where('recipientEmail', '==', myEmail),
      ),
      snap => {
        const unread = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => !m.isRead);
        unread.sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
        setUnreadMessages(unread);
      },
      err => console.error('Erreur notifications messages', err),
    );

    return () => unsubMessages();
  }, [currentCompany, user]);

  useEffect(() => {
    if (!currentCompany) return;

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('companyId', '==', currentCompany.id)),
      snap => {
        const mine = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.assigneeUid === user?.uid && t.status && t.status !== 'done');
        mine.sort((a, b) => (toMs(b.endDate) || toMs(b.updatedAt)) - (toMs(a.endDate) || toMs(a.updatedAt)));
        setMyTasks(mine);
      },
      err => console.error('Erreur notifications tâches', err),
    );

    return () => unsubTasks();
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

  const items: FeedItem[] = useMemo(() => {
    const feed: FeedItem[] = [];

    notifications.forEach(n => {
      feed.push({
        id: `n_${n.id}`,
        kind: 'notification',
        title: n.title,
        message: n.message,
        date: toMs(n.date) || toMs(n.createdAt),
        isRead: !!n.isRead,
        payload: n,
      });
    });

    orders
      .filter(o => o.status === 'PENDING' || o.status === 'PROCESSING')
      .forEach(o => {
        const pending = o.status === 'PENDING';
        const total = o.total || o.subtotal || 0;
        feed.push({
          id: `order_${o.id}`,
          kind: 'order',
          title: pending ? 'Commande à traiter' : 'Commande en cours',
          message: `#${o.globalOrderId || o.id.slice(-6).toUpperCase()} — ${o.customerName || 'Client'} — ${Number(total).toLocaleString()} FCFA`,
          date: toMs(o.date) || toMs(o.createdAt),
          isRead: pending ? !!o.alertSeen : true,
          payload: o,
        });
      });

    unreadMessages.forEach(m => {
      feed.push({
        id: `msg_${m.id}`,
        kind: 'message',
        title: m.senderName || m.senderEmail || 'Nouveau message',
        message: m.content || '',
        date: toMs(m.timestamp),
        isRead: false,
        payload: m,
      });
    });

    myTasks.forEach(t => {
      const dueMs = toMs(t.endDate);
      const overdue = dueMs > 0 && dueMs < Date.now();
      const blocked = t.status === 'blocked';
      const prefix = overdue ? 'Tâche en retard' : blocked ? 'Tâche bloquée' : 'Tâche en cours';
      const deadline = dueMs > 0 ? ` • échéance ${new Date(dueMs).toLocaleDateString()}` : '';
      feed.push({
        id: `task_${t.id}`,
        kind: 'task',
        title: `${prefix} — ${t.title || ''}`,
        message: `${taskStatusLabel(t.status)}${deadline}`,
        date: dueMs || toMs(t.updatedAt),
        isRead: !(blocked || overdue),
        payload: t,
      });
    });

    feed.sort((a, b) => b.date - a.date);
    return feed.slice(0, 40);
  }, [notifications, orders, unreadMessages, myTasks]);

  const unreadCount = items.filter(i => !i.isRead).length;

  const navigate = (tab: string) => {
    window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: tab }));
    setIsOpen(false);
  };

  const markAsRead = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (item.kind === 'notification') {
        await updateDoc(doc(db, 'notifications', item.payload.id), { isRead: 1 });
      } else if (item.kind === 'message') {
        await updateDoc(doc(db, 'messages', item.payload.id), { isRead: true });
      } else if (item.kind === 'order') {
        await updateDoc(doc(db, 'ecommerce_orders', item.payload.id), { alertSeen: true });
      }
    } catch (err) {
      console.error("Erreur lors du marquage lu", err);
    }
  };

  const handleItemClick = (item: FeedItem) => {
    if (item.kind === 'order') {
      navigate('ecommerce');
    } else if (item.kind === 'message') {
      markAsRead(item);
      navigate('collaboration');
    } else if (item.kind === 'task') {
      window.location.hash = '#projects/tasks';
      navigate('projects');
    } else {
      markAsRead(item);
    }
  };

  const markAllAsRead = async () => {
    const unread = items.filter(i => !i.isRead && (i.kind === 'notification' || i.kind === 'message'));
    for (const item of unread) {
      try {
        if (item.kind === 'notification') {
          await updateDoc(doc(db, 'notifications', item.payload.id), { isRead: 1 });
        } else if (item.kind === 'message') {
          await updateDoc(doc(db, 'messages', item.payload.id), { isRead: true });
        }
      } catch (err) {
        console.error("Erreur lors du marquage tout lu", err);
      }
    }
  };

  const iconFor = (item: FeedItem) => {
    if (item.kind === 'order') return <ShoppingCart size={16} className="text-amber-500 mt-0.5" />;
    if (item.kind === 'message') return <MessageSquare size={16} className="text-emerald-500 mt-0.5" />;
    if (item.kind === 'task') return <ClipboardList size={16} className="text-blue-500 mt-0.5" />;
    const type = item.payload?.type;
    if (type === 'task') return <CheckCircle size={16} className="text-blue-500 mt-0.5" />;
    if (type === 'project') return <FileText size={16} className="text-purple-500 mt-0.5" />;
    if (type === 'collab') return <Box size={16} className="text-amber-500 mt-0.5" />;
    if (type === 'general') return <MessageSquare size={16} className="text-emerald-500 mt-0.5" />;
    if (type === 'alert') return <Box size={16} className="text-red-500 mt-0.5" />;
    return <Bell size={16} className="text-slate-400 mt-0.5" />;
  };

  const kindLabel = (item: FeedItem) =>
    item.kind === 'order' ? 'Commande' :
    item.kind === 'message' ? 'Message' :
    item.kind === 'task' ? 'Tâche' : '';

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
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Aucune notification</p>
                </div>
              ) : (
                items.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3 rounded-xl flex gap-3 group transition-colors cursor-pointer ${
                      item.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50 relative'
                    }`}
                  >
                    {!item.isRead && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                    <div className="pl-2">
                      {iconFor(item)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                        {item.message}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                        {kindLabel(item)}{kindLabel(item) ? ' • ' : ''}{new Date(item.date || Date.now()).toLocaleString()}
                      </p>
                    </div>
                    {!item.isRead && (item.kind === 'notification' || item.kind === 'message') && (
                      <button 
                        onClick={(e) => markAsRead(item, e)}
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
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Commandes • Messages • Tâches</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

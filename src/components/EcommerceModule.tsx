import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, serverTimestamp, handleFirestoreError, OperationType, orderBy } from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Package, 
  Truck, 
  Award, 
  Search, 
  Plus, 
  Minus, 
  X, 
  ChevronRight, 
  CreditCard, 
  Smartphone, 
  History,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  MessageCircle,
  Bell,
  Star,
  Send,
  Edit2,
  LayoutDashboard,
  Database,
  AlertCircle,
  AlertTriangle,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Table, { TableRow } from './ui/Table';
import { createNotification } from '../lib/notifications';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  points: number;
  stockThreshold?: number;
  allowBackorder?: boolean;
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface Order {
  id: string;
  items: any[];
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'CANCELLED_BY_SELLER';
  date: any;
  paymentMethod?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerQuartier?: string;
  companyId: string;
  checkoutSource?: string;
  deliveryFee?: number;
  deliveryLocation?: string;
  cancellationReason?: string;
}

interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: any;
  isRead: boolean;
}

export default function EcommerceModule({ user }: { user: any }) {
  const { currentCompany } = useCompany();
  const [activeView, setActiveView] = useState<'catalog' | 'cart' | 'tracking' | 'loyalty' | 'admin' | 'settings' | 'commando'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MOBILE' | 'CASH'>('MOBILE');
  const [clientId, setClientId] = useState<string | null>(null);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
  const [orderMessages, setOrderMessages] = useState<OrderMessage[]>([]);
  const [newOrderMessage, setNewOrderMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>({});
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeliverySettings, setShowDeliverySettings] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newFee, setNewFee] = useState('');
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  const [lowStockAlerts, setLowStockAlerts] = useState<Product[]>([]);
  const [connStatus, setConnStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [notificationConfig, setNotificationConfig] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingStatusOrder, setUpdatingStatusOrder] = useState<{order: Order, nextStatus: string} | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const canManage = ['owner', 'Administrateur', 'Directeur', 'Personnel', 'Collaborateur', 'Agent Commercial'].includes(user?.role) || user?.customPermissions?.includes('ecommerce');
  const isAdmin = canManage;
  const isSuperAdmin = ['owner', 'Administrateur', 'Directeur'].includes(user?.role) || user?.customPermissions?.includes('ecommerce');

  // Hardware back button support
  useEffect(() => {
    const handlePushState = () => {
      if (isCheckoutModalOpen || activeChatOrder || editingProduct) {
        setCheckoutModalOpen(false);
        setActiveChatOrder(null);
        setEditingProduct(null);
      }
    };

    if (isCheckoutModalOpen || activeChatOrder || editingProduct) {
      window.history.pushState({ modal: true }, "");
      window.addEventListener("popstate", handlePushState);
    }

    return () => window.removeEventListener("popstate", handlePushState);
  }, [isCheckoutModalOpen, activeChatOrder, editingProduct]);

  // Connection check
  useEffect(() => {
    const checkConn = async () => {
      try {
        const { testFirestoreConnection } = await import('../lib/firebase');
        const ok = await testFirestoreConnection();
        setConnStatus(ok ? 'ok' : 'fail');
      } catch (e) {
        setConnStatus('fail');
      }
    };
    checkConn();
  }, []);

  // Fetch unread messages count for all orders
  useEffect(() => {
    if (!currentCompany || !auth.currentUser) return;

    const cleanEmail = auth.currentUser.email?.trim().toLowerCase() || '';
    const q = isAdmin 
      ? query(
          collection(db, 'order_messages'),
          where('companyId', '==', currentCompany.id),
          where('recipientId', '==', 'MANAGEMENT'),
          where('isRead', '==', false)
        )
      : query(
          collection(db, 'order_messages'),
          where('companyId', '==', currentCompany.id),
          where('recipientId', '==', auth.currentUser.uid),
          where('isRead', '==', false)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: { [key: string]: number } = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        counts[data.orderId] = (counts[data.orderId] || 0) + 1;
      });
      setUnreadMessages(counts);
    });

    return () => unsubscribe();
  }, [currentCompany]);

  // Mark as read when chat opens
  useEffect(() => {
    if (!activeChatOrder || !auth.currentUser) return;

    const markAsRead = async () => {
      const q = isAdmin 
        ? query(
            collection(db, 'order_messages'),
            where('orderId', '==', activeChatOrder.id),
            where('recipientId', '==', 'MANAGEMENT'),
            where('isRead', '==', false)
          )
        : query(
            collection(db, 'order_messages'),
            where('orderId', '==', activeChatOrder.id),
            where('recipientId', '==', auth.currentUser?.uid),
            where('isRead', '==', false)
          );

      const snap = await getDocs(q);
      snap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'order_messages', d.id), { isRead: true });
      });
    };

    markAsRead();
  }, [activeChatOrder, orderMessages]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChatOrder) return;

    const q = query(
      collection(db, 'order_messages'),
      where('orderId', '==', activeChatOrder.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrderMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderMessage)));
      // Scroll to bottom
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [activeChatOrder]);

  const sendOrderMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatOrder || !newOrderMessage.trim() || !auth.currentUser || sendingMessage) return;

    setSendingMessage(true);
    try {
      const isClientSending = user?.role === 'Client';
      let recipientId = '';

      if (isClientSending) {
        recipientId = 'MANAGEMENT';
      } else if (activeChatOrder.customerEmail) {
        const q = query(collection(db, 'users'), where('email', '==', activeChatOrder.customerEmail.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) recipientId = snap.docs[0].id;
      }

      await addDoc(collection(db, 'order_messages'), {
        orderId: activeChatOrder.id,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Utilisateur',
        recipientId,
        content: newOrderMessage.trim(),
        timestamp: serverTimestamp(),
        companyId: currentCompany?.id,
        isRead: false
      });

      // Notify the recipient
      const targetUids = recipientId ? [recipientId] : [];

      if (targetUids.length > 0 && currentCompany) {
        await createNotification(
          currentCompany.id,
          targetUids,
          'Nouveau message sur commande',
          `${auth.currentUser.displayName || 'Nexus'} : ${newOrderMessage.slice(0, 30)}...`,
          'general'
        );
      }

      setNewOrderMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'order_messages');
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    if (!currentCompany || !user) return;

    // Fetch Client info if applicable
    if (user.role === 'Client') {
      const cleanEmail = user.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
      const qClient = query(collection(db, 'clients'), where('companyId', '==', currentCompany.id), where('email', '==', cleanEmail));
      const unsubscribeClient = onSnapshot(qClient, (snap) => {
        if (!snap.empty) {
          const cData = snap.docs[0].data();
          setLoyaltyPoints(cData.loyaltyPoints || 0);
          setClientId(snap.docs[0].id);
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'clients'));
      return () => unsubscribeClient();
    }
  }, [currentCompany, user]);

  useEffect(() => {
    if (!currentCompany) return;

    // Fetch products from Firestore
    const prodQ = query(collection(db, 'products'), where('companyId', '==', currentCompany.id));
    const unsubscribeProd = onSnapshot(prodQ, (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      // Update low stock alerts
      const problematic = prodData.filter(p => p.stock <= (p.stockThreshold || 5));
      setLowStockAlerts(problematic);

      // If empty, we can bootstrap some demo products for this company (Admins only)
      if (prodData.length === 0 && isAdmin) {
        const demos = [
          { name: 'Ordinateur Portable Pro', description: 'Haute performance pour les entreprises.', price: 1250000, category: 'Hardware', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=600', stock: 15, points: 150 },
          { name: 'Pack Office Suite', description: 'Licence annuelle pour 5 utilisateurs.', price: 450000, category: 'Software', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600', stock: 100, points: 50 },
        ];
        demos.forEach(d => {
          addDoc(collection(db, 'products'), { ...d, companyId: currentCompany.id, createdAt: serverTimestamp() });
        });
      }
      setProducts(prodData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    // Fetch orders - filter for clients
    let orderQ = query(collection(db, 'ecommerce_orders'), where('companyId', '==', currentCompany.id));
    const guestOrderIds = JSON.parse(localStorage.getItem('nexus_guest_orders') || '[]');

    if (user?.role === 'Client') {
      const cleanEmail = user.email?.trim().toLowerCase() || '';
      // We combine logged in orders and guest orders
      setOrders([]); // Reset
      
      const unsubscribeLoggedIn = onSnapshot(query(
        collection(db, 'ecommerce_orders'), 
        where('companyId', '==', currentCompany.id),
        where('customerEmail', '==', cleanEmail)
      ), (snapshot) => {
        const loggedInOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(prev => {
          const others = prev.filter(o => !loggedInOrders.find(l => l.id === o.id));
          return [...others, ...loggedInOrders].sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'ecommerce_orders_loggedin'));

      // If we have guest orders, listen to them too
      let unsubscribeGuest = () => {};
      if (guestOrderIds.length > 0) {
        // Firestore 'in' matches max 10/30 items depending on version, but 10 is safest
        const chunks = [];
        for (let i = 0; i < guestOrderIds.length; i += 10) {
          chunks.push(guestOrderIds.slice(i, i + 10));
        }

        const unsubscribes = chunks.map(chunk => {
          return onSnapshot(query(
            collection(db, 'ecommerce_orders'),
            where('companyId', '==', currentCompany.id),
            where('__name__', 'in', chunk)
          ), (snapshot) => {
            const guestOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
             setOrders(prev => {
              const others = prev.filter(o => !guestOrders.find(g => g.id === o.id));
              return [...others, ...guestOrders].sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          }, (error) => handleFirestoreError(error, OperationType.GET, 'ecommerce_orders_guest'));
        });
        unsubscribeGuest = () => unsubscribes.forEach(u => u());
      }

      return () => {
        unsubscribeProd();
        unsubscribeLoggedIn();
        unsubscribeGuest();
      };
    }

    const unsubscribeOrders = onSnapshot(orderQ, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData.sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'ecommerce_orders'));

    return () => {
      unsubscribeProd();
      unsubscribeOrders();
    };
  }, [currentCompany, user]);

  // Fetch Notification Config
  useEffect(() => {
    if (!currentCompany || !isAdmin) return;

    const q = query(collection(db, 'notification_configs'), where('companyId', '==', currentCompany.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setNotificationConfig({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        // Default config
        setNotificationConfig({
          activeChannel: 'whatsapp',
          senderNumber: currentCompany.whatsappNumber || '',
          cancelTemplate: 'Bonjour {customerName}, votre commande {orderId} a été annulée car : {reason}.',
          shippedTemplate: 'Bonjour {customerName}, votre commande {orderId} est en cours d\'expédition !'
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notification_configs'));

    return () => unsubscribe();
  }, [currentCompany, isAdmin]);

  const saveNotificationSettings = async () => {
    if (!currentCompany || !notificationConfig) return;
    setSavingSettings(true);
    try {
      if (notificationConfig.id) {
        await updateDoc(doc(db, 'notification_configs', notificationConfig.id), {
          ...notificationConfig,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'notification_configs'), {
          ...notificationConfig,
          companyId: currentCompany.id,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notification_configs');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCancelOrder = async (order: Order, reason: string) => {
    if (!currentCompany) return;
    setSubmitting(true);
    try {
      // 1. Update Order Status
      await updateDoc(doc(db, 'ecommerce_orders', order.id), {
        status: 'CANCELLED_BY_SELLER',
        cancellationReason: reason,
        updatedAt: serverTimestamp()
      });

      // 2. Restore Stock
      const stockPromises = order.items.map(async (item) => {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDocs(query(collection(db, 'products'), where('__name__', '==', item.id)));
        if (!productSnap.empty) {
          const currentStock = productSnap.docs[0].data().stock || 0;
          await updateDoc(productRef, {
            stock: currentStock + item.quantity,
            updatedAt: serverTimestamp()
          });
        }
      });
      await Promise.all(stockPromises);

      // 3. Trigger Notification (Simulation)
      if (notificationConfig && notificationConfig.activeChannel !== 'none') {
        const template = notificationConfig.cancelTemplate || 'Votre commande {orderId} a été annulée: {reason}';
        const message = template
          .replace('{customerName}', order.customerName || 'Client')
          .replace('{orderId}', `CMD-${order.id.slice(0, 6).toUpperCase()}`)
          .replace('{reason}', reason);

        console.log(`[NOTIFICATION SIMULATION] Channel: ${notificationConfig.activeChannel.toUpperCase()}`);
        console.log(`[TO] ${order.customerPhone || order.customerEmail}`);
        console.log(`[MESSAGE] ${message}`);
        
        // Also create an in-app notification if we can find the user UID
        if (order.customerEmail) {
           const q = query(collection(db, 'users'), where('email', '==', order.customerEmail.toLowerCase()));
           const snap = await getDocs(q);
           if (!snap.empty) {
             await createNotification(
               currentCompany.id,
               [snap.docs[0].id],
               'Commande Annulée',
               `L'entreprise a annulé votre commande : ${reason}`,
               'general'
             );
           }
        }
      }

      setCancellingOrder(null);
      setCancellationReason('');
      setOtherReason('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'ecommerce_orders');
    } finally {
      setSubmitting(false);
    }
  };

  const recordOrderHistory = async (orderId: string, prevStatus: string, newStatus: string, reason: string, comment: string) => {
    if (!currentCompany) return;
    try {
      await addDoc(collection(db, 'order_history'), {
        companyId: currentCompany.id,
        orderId,
        previousStatus: prevStatus,
        newStatus,
        reason,
        comment,
        authorName: user?.name || 'Système',
        authorRole: user?.role || 'Admin',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("History log failed:", err);
    }
  };

  const handleStatusUpdate = async (order: Order, nextStatus: string, reason: string, comment: string) => {
    if (!currentCompany) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'ecommerce_orders', order.id), {
        status: nextStatus as any,
        internalNotes: internalNotes.trim() ? internalNotes : (order as any).internalNotes || '',
        updatedAt: serverTimestamp()
      });

      await recordOrderHistory(order.id, order.status, nextStatus, reason, comment);

      // Handle stock if cancelled
      if (nextStatus === 'CANCELLED' || nextStatus === 'CANCELLED_BY_SELLER') {
        const stockPromises = order.items.map(async (item) => {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await getDocs(query(collection(db, 'products'), where('__name__', '==', item.id)));
          if (!productSnap.empty) {
            const currentStock = productSnap.docs[0].data().stock || 0;
            await updateDoc(productRef, {
              stock: currentStock + item.quantity,
              updatedAt: serverTimestamp()
            });
          }
        });
        await Promise.all(stockPromises);
      }

      // Trigger notification
      if (notificationConfig && notificationConfig.activeChannel !== 'none') {
        let template = notificationConfig.shippedTemplate;
        if (nextStatus.includes('CANCELLED')) template = notificationConfig.cancelTemplate;
        
        // Custom templates for failure
        if (nextStatus === 'DELIVERY_FAILED') {
          template = "Bonjour {customerName}, notre livreur n'a pas pu vous livrer (Motif: {reason}). Nous retenterons bientôt.";
        }

        const message = (template || 'Mise à jour de commande {orderId}: {nextStatus}')
          .replace('{customerName}', order.customerName || 'Client')
          .replace('{orderId}', `CMD-${order.id.slice(0, 6).toUpperCase()}`)
          .replace('{reason}', reason || comment || 'Non spécifié')
          .replace('{nextStatus}', nextStatus);

        console.log(`[NOTIF] ${nextStatus} -> ${order.customerPhone || order.customerEmail}: ${message}`);
        
        // App notification
        if (order.customerEmail) {
           const uSnap = await getDocs(query(collection(db, 'users'), where('email', '==', order.customerEmail.toLowerCase())));
           if (!uSnap.empty) {
             await createNotification(currentCompany.id, [uSnap.docs[0].id], 'Ma Commande', message, 'general');
           }
        }
      }

      setUpdatingStatusOrder(null);
      setStatusReason('');
      setStatusComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'ecommerce_orders');
    } finally {
      setSubmitting(false);
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'products');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || cart.length === 0) return;

    try {
      const deliveryFee = (currentCompany.deliveryFees && selectedLocation) ? currentCompany.deliveryFees[selectedLocation] : 0;
      const totalWithDelivery = cartTotal + deliveryFee;

      const orderRef = await addDoc(collection(db, 'ecommerce_orders'), {
        companyId: currentCompany.id,
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.cartQuantity })),
        total: totalWithDelivery,
        deliveryFee,
        deliveryLocation: selectedLocation,
        paymentMethod,
        status: 'PENDING',
        date: serverTimestamp(),
        customerEmail: auth.currentUser?.email || 'Guest',
        customerName: auth.currentUser?.displayName || 'Client'
      });

      // Notify Admin/Owner
      if (currentCompany.ownerId) {
        await createNotification(
          currentCompany.id,
          [currentCompany.ownerId],
          'Nouvelle Commande !',
          `${auth.currentUser?.displayName || 'Un client'} a passé une commande de ${cartTotal.toLocaleString()} FCFA.`,
          'general'
        );
      }

      // Update loyalty points in Firestore if client
      if (clientId) {
        const earnedPoints = cart.reduce((acc, item) => acc + (item.points * item.cartQuantity), 0);
        await updateDoc(doc(db, 'clients', clientId), {
          loyaltyPoints: (loyaltyPoints || 0) + earnedPoints,
          updatedAt: serverTimestamp()
        });
      }

      setCart([]);
      setCheckoutModalOpen(false);
      setActiveView('tracking');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ecommerce_orders');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED', customerEmail?: string) => {
    try {
      await updateDoc(doc(db, 'ecommerce_orders', orderId), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Notify client if update is from admin
      if (isAdmin && (customerEmail || auth.currentUser?.email) && currentCompany) {
        const targetEmail = customerEmail || '';
        // We find the client UID by email
        const q = query(collection(db, 'users'), where('email', '==', targetEmail.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const clientUid = snap.docs[0].id;
          const statusLabels = {
            'PROCESSING': 'est en cours de préparation',
            'SHIPPED': 'est en cours d\'expédition',
            'DELIVERED': 'a été livrée',
            'CANCELLED': 'a été annulée',
            'PENDING': 'est en attente'
          };
          const statusLabel = statusLabels[newStatus] || 'a été mise à jour';
          
          await createNotification(
            currentCompany.id,
            [clientUid],
            'Mise à jour de votre commande',
            `Votre commande CMD-${orderId.slice(0,6).toUpperCase()} ${statusLabel}.`,
            'general'
          );
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'ecommerce_orders');
    }
  };

  const categories = ['Tous', 'Hardware', 'Software', 'Office', 'Services'];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header with Background */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Shop</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Simplifiez vos achats professionnels. Catalogue intelligent, paiement sécurisé et programme de fidélité intégré.
            </p>
          </div>
          <div className="flex bg-slate-950/40 p-1.5 rounded-2xl border border-white/10 shrink-0 overflow-x-auto scrollbar-hide max-w-full">
            {[
              { id: 'catalog', label: 'Catalogue', icon: Package },
              { id: 'cart', label: `Panier (${cart.length})`, icon: ShoppingCart },
              { id: 'tracking', label: 'Suivi', icon: Truck, unread: Object.values(unreadMessages).reduce((a,b) => a+b, 0) },
              ...(isAdmin ? [
                { id: 'admin', label: 'Gestion', icon: LayoutDashboard },
                { id: 'commando', label: 'Commando', icon: Smartphone },
                { id: 'settings', label: 'Livraison', icon: Truck }
              ] : []),
              { id: 'loyalty', label: 'Fidélité', icon: Award }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all whitespace-nowrap relative", 
                  activeView === item.id 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={14} /> 
                {item.label}
                {item.unread && item.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg animate-bounce">
                    {item.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Urgent Order Alerts for Admin */}
      <AnimatePresence>
        {isAdmin && orders.filter(o => o.status === 'PENDING').length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-500 text-white p-4 rounded-3xl shadow-xl shadow-red-200 border border-red-400 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-2xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5">Urgent: Nouvelles Commandes</p>
                  <p className="text-sm font-bold opacity-90">Il y a {orders.filter(o => o.status === 'PENDING').length} commande(s) en attente de traitement.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveView('admin')}
                className="w-full sm:w-auto px-6 py-2.5 bg-white text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg active:scale-95"
              >
                Gérer les Commandes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Low Stock Alerts for Admin */}
      <AnimatePresence>
        {isAdmin && lowStockAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-900 uppercase italic">Alerte Réapprovisionnement</h3>
                  <p className="text-xs font-bold text-amber-600/80 uppercase tracking-widest mt-1">
                    {lowStockAlerts.length} produit(s) ont atteint le seuil critique.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-hide">
                {lowStockAlerts.slice(0, 3).map(p => (
                  <div key={p.id} className="px-4 py-2 bg-white rounded-xl border border-amber-100 flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-700 uppercase">{p.name}</span>
                    <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-md">{p.stock}</span>
                  </div>
                ))}
                {lowStockAlerts.length > 3 && <span className="text-[10px] font-black text-amber-400 self-center">+{lowStockAlerts.length - 3}</span>}
              </div>
              <button 
                onClick={() => setActiveView('admin')}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-200 active:scale-95 whitespace-nowrap"
              >
                Gérer le Stock <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeView === 'catalog' && (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Enhanced Client Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                <LayoutDashboard size={12} />
                Nexus Solutions Globales
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                Solutions & <span className="text-blue-600">Performance</span>
              </h2>
              <p className="text-slate-500 font-medium max-w-xl text-sm leading-relaxed">
                Accédez à nos équipements industriels et solutions logicielles de pointe. 
                Gagnez des points Nexus à chaque commande pour débloquer des avantages exclusifs.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-80 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher une solution..."
                  className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-1 flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 max-w-full">
                <div className="flex gap-1 min-w-max">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        activeCategory === cat ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={product.id} 
                  className="group bg-white rounded-[2.5rem] border border-slate-50 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 flex flex-col h-full relative"
                >
                  <div className="aspect-[5/4] overflow-hidden relative">
                    <img 
                      src={product.image || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800"} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-[0.95]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                      <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-xl">
                        {product.category}
                      </span>
                    </div>
                    
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center gap-1.5 text-white/90">
                        <Award size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">+{product.points} PTS NEXUS</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="font-black text-slate-900 text-xl tracking-tight leading-tight group-hover:text-blue-610 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-slate-400 text-xs font-medium line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                    
                    <div className="mt-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Tarif Operational</span>
                          <div className="text-2xl font-black text-slate-900 tracking-tighter">
                            {product.price.toLocaleString()} <span className="text-xs text-slate-400 font-bold ml-0.5">FCFA</span>
                          </div>
                        </div>
                        {product.stock < 10 && (
                          <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100 animate-pulse">
                            Stock Limité
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        {product.stock > 0 ? (
                          <button
                            onClick={() => addToCart(product)}
                            className="flex-1 py-4 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 group-hover:shadow-blue-600/20"
                          >
                            <ShoppingCart size={18} /> Acheter
                          </button>
                        ) : (
                          <div className="flex-1 py-4 bg-slate-50 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                            Rupture
                          </div>
                        )}
                        <button
                          title="Assistance technique"
                          className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-2xl transition-all active:scale-95"
                          onClick={() => {
                             setActiveView('tracking'); // Redirect to orders to start a chat if needed or general support
                          }}
                        >
                          <MessageCircle size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Special Loyalty Banner for Clients */}
          {user.role === 'Client' && (
            <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest">
                    <Award size={16} />
                    Programme privilège Nexus
                  </div>
                  <h3 className="text-4xl font-black tracking-tight">Votre Hub de Performance</h3>
                  <p className="text-blue-100 font-medium max-w-lg">
                    Vous avez actuellement <span className="text-white font-black underline decoration-2 underline-offset-4">{loyaltyPoints || 0} Points Fidélité</span>. 
                    Chaque point vous rapproche de solutions premium gratuites et de remises exclusives.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveView('loyalty')}
                    className="px-8 py-5 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xl"
                  >
                    Voir mes récompenses
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-blue-600" />
                  Votre Panier
                </h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cart.length} articles</span>
              </div>
              
              {cart.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <ShoppingBag size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Le panier est vide</p>
                  <button onClick={() => setActiveView('catalog')} className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">Découvrir le catalogue</button>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {cart.map(item => (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row items-center gap-6">
                      <img src={item.image} alt={item.name} className="w-24 h-24 rounded-2xl object-cover border border-slate-100" />
                      <div className="flex-1 space-y-1 text-center sm:text-left">
                        <h4 className="font-bold text-slate-900">{item.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{item.category}</p>
                        <p className="text-sm font-black text-blue-600">{item.price.toLocaleString()} FCFA</p>
                      </div>
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus size={16} /></button>
                        <span className="text-sm font-black w-8 text-center">{item.cartQuantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus size={16} /></button>
                      </div>
                      <div className="text-right flex flex-col items-center sm:items-end gap-2">
                        <span className="font-black text-slate-900">{(item.price * item.cartQuantity).toLocaleString()} FCFA</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Retirer</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
              <h3 className="font-bold text-lg mb-6 uppercase tracking-widest">Résumé</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Sous-total</span>
                  <span className="text-white font-bold">{cartTotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Livraison</span>
                  <span className="text-green-400 font-bold uppercase text-[10px] tracking-widest">Gratuite</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="font-bold uppercase tracking-widest text-xs">Total</span>
                  <span className="text-2xl font-black">{cartTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => setCheckoutModalOpen(true)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                Passer la commande <ChevronRight size={18} />
              </button>
            </div>

            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm">
                <Award size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Points à gagner</p>
                <p className="text-lg font-black text-blue-900">
                  +{cart.reduce((acc, item) => acc + (item.points * item.cartQuantity), 0)} pts
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'tracking' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Connection Status & Hub */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500",
                    connStatus === 'ok' ? "bg-green-500 text-white shadow-green-500/20" : "bg-red-500 text-white shadow-red-500/20 animate-pulse"
                  )}>
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 tracking-tight">Nexus Database Engine</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {connStatus === 'ok' ? 'Flux de données synchronisé par fibre' : 'Restauration de la connexion en cours...'}
                    </p>
                  </div>
               </div>
               <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                  <div className={cn("w-2 h-2 rounded-full", connStatus === 'ok' ? "bg-green-500" : "bg-red-500")} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{connStatus === 'ok' ? 'LATENCY: 24MS' : 'OFFLINE'}</span>
               </div>
            </div>

            <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-600/20 flex flex-col justify-center">
               <div className="flex items-center gap-3 mb-2">
                  <Bell size={18} className="text-blue-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Alerte ProActive</span>
               </div>
               <p className="text-xs font-medium text-blue-100">
                  {orders.some(o => o.status === 'PENDING') 
                    ? "Vos acquisitions sont en cours d'approbation par le département logistique." 
                    : "Toutes vos opérations sont à jour. Aucune action immédiate requise."}
               </p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <History size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Suivi des Flux</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Historique et statut de vos acquisitionsnexus</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {orders.map((order, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={order.id} 
                  className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500 group"
                >
                  <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Commande Nexus</p>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight">CMD-{order.id.slice(0, 6).toUpperCase()}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.date?.toDate().toLocaleDateString('fr-FR')}</p>
                          <p className="text-lg font-black text-slate-900">{order.total.toLocaleString()} FCFA</p>
                        </div>
                      </div>

                      {/* Visual Timeline */}
                      <div className="relative pt-8 pb-4 px-2">
                        <div className="absolute top-[41px] left-4 right-4 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                            style={{ width: order.status === 'PENDING' ? '10%' : order.status === 'PROCESSING' ? '40%' : order.status === 'SHIPPED' ? '70%' : '100%' }}
                          />
                        </div>
                        <div className="flex justify-between relative">
                          {[
                            { id: 'PENDING', label: 'En attente', desc: 'Reçue', icon: <Clock size={16} /> },
                            { id: 'PROCESSING', label: 'Traitement', desc: 'Préparation', icon: <Package size={16} /> },
                            { id: 'SHIPPED', label: 'Expédiée', desc: 'En route', icon: <Truck size={16} /> },
                            { id: 'DELIVERED', label: 'Livrée', desc: 'Terminée', icon: <CheckCircle2 size={16} /> }
                          ].map((step, sIdx) => {
                            const statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
                            const currentIdx = statuses.indexOf(order.status);
                            const isPast = sIdx <= currentIdx;
                            const isActive = order.status === step.id;
                            
                            return (
                              <div key={step.id} className="flex flex-col items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 border-4 border-slate-50 shadow-sm",
                                  isPast ? "bg-blue-600 text-white" : "bg-white text-slate-300",
                                  isActive && "ring-4 ring-blue-100 scale-110"
                                )}>
                                  {step.icon}
                                </div>
                                <div className="text-center w-24">
                                  <p className={cn("text-[9px] font-black uppercase tracking-widest", isPast ? "text-slate-900" : "text-slate-400")}>{step.label}</p>
                                  <p className="text-[8px] font-medium text-slate-400 mt-0.5">{step.desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-48 w-full flex flex-row lg:flex-col gap-3">
                      <button 
                        onClick={() => setActiveView('loyalty')}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Award size={14} /> Facture
                      </button>
                      <button 
                        onClick={() => setActiveChatOrder(order)}
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 relative group-hover:border-blue-200"
                      >
                        <MessageCircle size={14} /> Support
                        {unreadMessages[order.id] > 0 && (
                          <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg border-2 border-white animate-pulse">
                            {unreadMessages[order.id]}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {orders.length === 0 && (
                <div className="p-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Truck size={48} className="mx-auto text-slate-200 mb-6" strokeWidth={1} />
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Flux Initial Inactif</h3>
                  <p className="text-xs font-medium text-slate-400 mt-2 max-w-[240px] mx-auto leading-relaxed">
                    Vous n'avez pas encore d'acquisitions actives. Explorez le catalogue pour initialiser votre premier flux.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === 'commando' && isAdmin && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
           <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
              <h2 className="text-xl font-black italic uppercase">Le Mode Commando</h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Focus Livraison Pro • Nexus Logistics</p>
           </div>
           
           <div className="space-y-4">
              {orders.filter(o => ['PROCESSING', 'SHIPPED', 'DELIVERY_FAILED'].includes(o.status)).map(order => (
                <div key={`commando-${order.id}`} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col gap-4">
                   <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">CMD-{order.id.slice(0, 8)}</span>
                        <h4 className="text-lg font-black text-slate-900 uppercase mt-1">{order.customerQuartier || 'Centre'}</h4>
                      </div>
                      <div className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight", 
                        order.status === 'SHIPPED' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {order.status}
                      </div>
                   </div>
                   
                   <div className="p-4 bg-slate-50 rounded-2xl grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Contact</p>
                        <p className="text-[11px] font-black text-slate-900">{order.customerPhone}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Client</p>
                        <p className="text-[11px] font-black text-slate-900">{order.customerName}</p>
                      </div>
                   </div>

                   <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          const message = `Bonjour ${order.customerName}, c'est votre livreur Nexus. Je suis en route pour votre livraison à ${order.customerQuartier}.`;
                          window.open(`https://wa.me/${order.customerPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, "_blank");
                        }}
                        className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                      >
                        <Smartphone size={16} /> Appeler Client
                      </button>
                      <button 
                         onClick={() => setUpdatingStatusOrder({ order, nextStatus: 'DELIVERED' })}
                         className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Livré !
                      </button>
                      <button 
                        onClick={() => setUpdatingStatusOrder({ order, nextStatus: 'DELIVERY_FAILED' })}
                        className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:text-red-500 transition-colors"
                      >
                        <AlertTriangle size={20} />
                      </button>
                   </div>
                </div>
              ))}
              {orders.filter(o => ['PROCESSING', 'SHIPPED', 'DELIVERY_FAILED'].includes(o.status)).length === 0 && (
                <div className="py-20 text-center opacity-30">
                   <Truck size={48} className="mx-auto mb-4" />
                   <p className="text-xs font-black uppercase">Aucune livraison active pour le moment.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeView === 'settings' && isAdmin && currentCompany && (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Paramètres de Livraison</h2>
              <p className="text-slate-500 font-medium mt-1">Gérez vos zones de chalandise et frais d'expédition au Cameroun.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-4 bg-blue-50 rounded-2xl flex items-center gap-3">
                <Truck className="text-blue-600" size={24} />
                <div className="text-left">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Couverture Nexus</p>
                  <p className="text-xs font-bold text-slate-900">{Object.keys(currentCompany.deliveryFees || {}).length} zones actives</p>
                </div>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl flex items-center gap-3 text-white">
                <Smartphone className="text-blue-400" size={24} />
                <div className="text-left">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest underline underline-offset-4 decoration-2">Taux Naira (₦)</p>
                  <input 
                    type="number" 
                    step="0.01"
                    defaultValue={currentCompany.nairaRate || 0.012}
                    onBlur={async (e) => {
                      const val = Number(e.target.value);
                      if (val > 0) {
                        setSavingSettings(true);
                        await updateDoc(doc(db, 'companies', currentCompany.id), { nairaRate: val });
                        setSavingSettings(false);
                      }
                    }}
                    className="bg-transparent border-none text-xs font-black w-14 outline-none tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Plus size={16} className="text-blue-600" /> Ajouter une Zone
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Définissez un nouveau tarif local</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Ville ou Quartier</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Yaoundé (Omnisport)"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl py-4 px-4 text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tarif de Livraison (FCFA)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl py-4 px-4 pr-12 text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                        value={newFee}
                        onChange={e => setNewFee(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase">FCFA</span>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!newLocation || !newFee) return;
                      const fees = currentCompany.deliveryFees || {};
                      await updateDoc(doc(db, 'companies', currentCompany.id), {
                        deliveryFees: { ...fees, [newLocation]: Number(newFee) }
                      });
                      setNewLocation('');
                      setNewFee('');
                    }}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    Confirmer la Zone <CheckCircle2 size={14} />
                  </button>
                </div>
              </div>

              {/* Notification Config Panel */}
              <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl space-y-8">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Bell size={16} className="text-blue-400" /> Notifications Auto
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">WhatsApp & SMS Pro</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canal Actif</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['none', 'whatsapp', 'sms'].map(channel => (
                        <button
                          key={channel}
                          onClick={() => setNotificationConfig({ ...notificationConfig, activeChannel: channel })}
                          className={cn(
                            "py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            notificationConfig?.activeChannel === channel ? "bg-blue-600 border-blue-600 text-white" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          )}
                        >
                          {channel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Numéro Expéditeur / ID</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:bg-white/10 focus:border-blue-500 outline-none transition-all"
                        placeholder="+237 ..."
                        value={notificationConfig?.senderNumber || ''}
                        onChange={e => setNotificationConfig({ ...notificationConfig, senderNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Template Annulation</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-medium text-white focus:bg-white/10 focus:border-blue-500 outline-none transition-all h-24"
                        placeholder="Utilisez {customerName}, {orderId} et {reason}"
                        value={notificationConfig?.cancelTemplate || ''}
                        onChange={e => setNotificationConfig({ ...notificationConfig, cancelTemplate: e.target.value })}
                      />
                    </div>
                  </div>

                  <button 
                    disabled={savingSettings}
                    onClick={saveNotificationSettings}
                    className="w-full py-4 bg-blue-600 hover:bg-white hover:text-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95"
                  >
                    {savingSettings ? "Synchronisation..." : "Sauvegarder Logic"}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Zones & Tarifs Actuels</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Liste des points de distribution configurés</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(currentCompany.deliveryFees || {}).map(([loc, price]) => (
                    <div key={loc} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">{loc}</p>
                          <p className="text-[10px] text-blue-600 font-black tracking-widest">{price.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          const fees = { ...currentCompany.deliveryFees };
                          delete fees[loc];
                          await updateDoc(doc(db, 'companies', currentCompany.id), {
                            deliveryFees: fees
                          });
                        }}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {(!currentCompany.deliveryFees || Object.keys(currentCompany.deliveryFees).length === 0) && (
                    <div className="col-span-full py-16 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-100">
                        <Truck size={24} className="text-slate-200" />
                      </div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Aucune Zone Définie</h4>
                      <p className="text-[10px] text-slate-300 mt-2 font-medium">Commencez par ajouter une zone pour proposer la livraison payante.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'admin' && isAdmin && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestion des Commandes</h2>
              <p className="text-slate-500 font-medium mt-1">Supervisez et traitez les commandes entrantes en temps réel.</p>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl">
                 <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                 <span className="text-[10px] font-black uppercase">Live Nexus Engine</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'En Attente', count: orders.filter(o => o.status === 'PENDING').length, color: 'bg-amber-500' },
              { label: 'En Traitement', count: orders.filter(o => o.status === 'PROCESSING').length, color: 'bg-blue-500' },
              { label: 'Marketplace', count: orders.filter(o => o.checkoutSource === 'MARKETPLACE').length, color: 'bg-emerald-500' },
              { label: 'Revenus Est.', count: orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'CANCELLED_BY_SELLER').reduce((a,b) => a+b.total, 0).toLocaleString() + ' F', color: 'bg-slate-900' }
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-black text-slate-900">{stat.count}</span>
                  <div className={`w-10 h-1 bg-slate-100 rounded-full overflow-hidden`}>
                    <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: '60%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 overflow-x-auto">
            <h3 className="text-sm font-black uppercase italic mb-4 px-2">Top Performance Produits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {products.sort((a,b) => ((b as any).soldCount || 0) - ((a as any).soldCount || 0)).slice(0, 3).map(p => (
                 <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <img src={p.image} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 truncate max-w-[120px]">{p.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Ventes: {(p as any).soldCount || 0}</span>
                        <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Vues: {(p as any).views || 0}</span>
                      </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className={cn(
                "bg-white rounded-[2.5rem] p-8 border hover:shadow-2xl transition-all duration-500 group relative overflow-hidden",
                order.status === 'PENDING' ? "border-amber-200 shadow-lg shadow-amber-50" : "border-slate-100 shadow-sm"
              )}>
                {order.status === 'PENDING' && (
                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Urgent: Nouveau Flux</span>
                  </div>
                )}
                {order.checkoutSource === 'MARKETPLACE' && (
                  <div className="absolute top-0 right-0 px-6 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">
                    Source: Marketplace
                  </div>
                )}
                
                <div className="flex flex-col lg:flex-row gap-10">
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">CMD-{order.id.slice(0, 8)}</h3>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            order.status === 'PENDING' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            order.status === 'PROCESSING' ? "bg-slate-50 text-slate-600 border-slate-100" :
                            order.status === 'SHIPPED' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            order.status === 'DELIVERED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {order.status === 'PENDING' ? 'Reçue' : 
                             order.status === 'SHIPPED' ? 'En route' :
                             order.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          Passée le {order.date?.toDate().toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{order.total.toLocaleString()} FCFA</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Transaction</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <ShoppingBag size={12} /> Articles ({order.items.length})
                        </h4>
                        <div className="space-y-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">{item.name} <span className="text-slate-400 font-medium">x{item.quantity}</span></span>
                              <span className="font-black text-slate-900">{item.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={12} /> Client & Livraison
                        </h4>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                          <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
                          <div className="flex flex-col gap-1">
                            {order.customerPhone && (
                              <p className="text-xs text-slate-500 flex items-center gap-2">
                                <Smartphone size={12} /> {order.customerPhone}
                              </p>
                            )}
                            {order.customerQuartier && (
                              <p className="text-xs text-slate-500 flex items-center gap-2">
                                <Truck size={12} /> {order.customerQuartier}
                              </p>
                            )}
                            {order.deliveryLocation && (
                              <div className="mt-2 p-2 bg-blue-100/50 rounded-lg">
                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Livraison: {order.deliveryLocation}</p>
                                <p className="text-[10px] font-black text-slate-900">{order.deliveryFee?.toLocaleString() || 0} FCFA</p>
                              </div>
                            )}
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                               <Bell size={12} /> {order.customerEmail}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-64 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Actions Opérationnelles</h4>
                    <div className="flex flex-col gap-2">
                       <button 
                         onClick={() => {
                           if (order.status === 'PENDING') {
                             handleStatusUpdate(order, 'PROCESSING', '', 'Prise en charge de la commande');
                           }
                         }}
                         disabled={order.status !== 'PENDING'}
                         className={cn(
                           "w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                           order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED' ? "bg-blue-600 text-white" : "bg-slate-900 text-white hover:bg-blue-600 disabled:opacity-30"
                         )}
                       >
                         {order.status === 'PENDING' ? 'Prise en charge' : 'En traitement'}
                       </button>
                       <button 
                         onClick={() => setUpdatingStatusOrder({ order, nextStatus: 'SHIPPED' })}
                         disabled={['SHIPPED', 'DELIVERED', 'CANCELLED', 'CANCELLED_BY_SELLER'].includes(order.status)}
                         className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                       >
                         <Truck size={14} /> Expédition
                       </button>
                       <button 
                         onClick={() => setUpdatingStatusOrder({ order, nextStatus: 'DELIVERED' })}
                         disabled={['DELIVERED', 'CANCELLED', 'CANCELLED_BY_SELLER'].includes(order.status)}
                         className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                       >
                         <CheckCircle2 size={14} /> Terminer
                       </button>
                       <button 
                         onClick={() => setUpdatingStatusOrder({ order, nextStatus: 'DELIVERY_FAILED' })}
                         disabled={['DELIVERED', 'CANCELLED', 'CANCELLED_BY_SELLER'].includes(order.status) || order.status === 'PENDING'}
                         className="w-full py-4 bg-amber-50 text-amber-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                       >
                         <AlertTriangle size={14} /> Échec Livraison
                       </button>
                       <button 
                         onClick={() => setCancellingOrder(order)}
                         disabled={['DELIVERED', 'CANCELLED', 'CANCELLED_BY_SELLER'].includes(order.status)}
                         className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                       >
                         <X size={14} /> Annuler / Refuser
                       </button>
                    </div>
                    <button 
                      onClick={() => setActiveChatOrder(order)}
                      className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 relative mt-4"
                    >
                      <MessageCircle size={14} /> Chat & Support
                      {unreadMessages[order.id] > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">
                          {unreadMessages[order.id]}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                <ShoppingBag size={48} className="mx-auto text-slate-200 mb-6" strokeWidth={1} />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Aucune Commande Nexus</h3>
                <p className="text-xs font-medium text-slate-400 mt-2">Votre flux commercial est actuellement vide.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'loyalty' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
                  <Award size={32} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight leading-none">Nexus Premium</h3>
                  <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">Membre Gold</p>
                </div>
              </div>
              <div className="pt-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-4xl font-black tabular-nums">{loyaltyPoints.toLocaleString()}</span>
                  <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Points cumulés</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]" style={{ width: '65%' }} />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-4">Plus que 750 points pour le palier Platinum</p>
              </div>
            </div>
            {/* Geometric Decors */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]" />
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Vitesse de commande</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">Vous gagnez +10% de points sur les commandes mobiles.</p>
              </div>
            </div>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline text-left">Explorer les bonus</button>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Package size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Retrait Prioritaire</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">Accès exclusif au guichet express Nexus Pro.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
              <CheckCircle2 size={12} /> Activé
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-10 md:p-14 max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col gap-10 relative overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <ShoppingBag size={240} />
            </div>

            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 leading-none italic">Nexus Secure Checkout</p>
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic">Finaliser l'achat</h3>
              </div>
              <button onClick={() => setCheckoutModalOpen(false)} className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-10 relative z-10">
              <div className="space-y-6">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Veuillez choisir votre mode de paiement</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MOBILE')}
                    className={cn(
                      "p-8 rounded-[2rem] border-2 transition-all flex items-center gap-6 group text-left",
                      paymentMethod === 'MOBILE' ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-50" : "border-slate-100 hover:border-blue-200 bg-white"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                      paymentMethod === 'MOBILE' ? "bg-blue-600 text-white scale-110" : "bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                    )}>
                      <Smartphone size={28} />
                    </div>
                    <div>
                      <span className={cn("text-[11px] font-black uppercase tracking-widest block", paymentMethod === 'MOBILE' ? "text-blue-600" : "text-slate-400")}>Mobile Money</span>
                      <p className={cn("text-[9px] font-bold mt-1 uppercase opacity-60", paymentMethod === 'MOBILE' ? "text-blue-400" : "text-slate-300")}>OM / MoMo</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={cn(
                      "p-8 rounded-[2rem] border-2 transition-all flex items-center gap-6 group text-left",
                      paymentMethod === 'CARD' ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-50" : "border-slate-100 hover:border-blue-200 bg-white"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                      paymentMethod === 'CARD' ? "bg-blue-600 text-white scale-110" : "bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                    )}>
                      <CreditCard size={28} />
                    </div>
                    <div>
                      <span className={cn("text-[11px] font-black uppercase tracking-widest block", paymentMethod === 'CARD' ? "text-blue-600" : "text-slate-400")}>Carte Bancaire</span>
                      <p className={cn("text-[9px] font-bold mt-1 uppercase opacity-60", paymentMethod === 'CARD' ? "text-blue-400" : "text-slate-300")}>Visa / Master</p>
                    </div>
                  </button>
                </div>
              </div>

              {currentCompany?.deliveryFees && Object.keys(currentCompany.deliveryFees).length > 0 && (
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Lieu de Livraison (Cameroun)</label>
                  <div className="relative group">
                    <select 
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-6 px-8 text-sm font-black appearance-none outline-none focus:bg-white focus:border-blue-500 focus:ring-8 focus:ring-blue-50 transition-all shadow-sm"
                      required
                    >
                      <option value="">Sélectionnez votre ville / zone...</option>
                      {Object.entries(currentCompany.deliveryFees).map(([loc, fee]) => (
                        <option key={loc} value={loc}>{loc} (+{fee.toLocaleString()} FCFA)</option>
                      ))}
                      <option value="Autre / En agence">Autre / En agence (Retrait Gratuit)</option>
                    </select>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Truck size={24} />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 opacity-50" />
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <span>Total Articles ({cart.length})</span>
                  <span className="text-white text-sm">{cartTotal.toLocaleString()} FCFA</span>
                </div>
                {selectedLocation && (
                   <div className="flex justify-between items-center text-[11px] font-black text-blue-400 uppercase tracking-widest pt-2 border-t border-white/5">
                    <span className="italic">Expédition Nexus</span>
                    <span>{(currentCompany?.deliveryFees?.[selectedLocation] || 0).toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase tracking-[0.2em] opacity-60">Montant Final</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-emerald-400 tracking-tighter shadow-emerald-500/20">
                      {(cartTotal + (currentCompany?.deliveryFees?.[selectedLocation] || 0)).toLocaleString()} <span className="text-sm">FCFA</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 mt-2">
                   <Award size={20} className="text-blue-400 shrink-0" />
                   <div>
                     <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Bonus Nexus Loyalty</p>
                     <p className="text-[9px] font-bold text-blue-300 uppercase mt-1 leading-none italic">+{cart.reduce((acc, item) => acc + (item.points * item.cartQuantity), 0)} pts activés</p>
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-7 bg-blue-600 hover:bg-white hover:text-blue-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 transition-all flex items-center justify-center gap-4 active:scale-95 border-4 border-transparent hover:border-blue-600 group"
                >
                  {submitting ? "Traitement Nexus ERP..." : (
                    <>
                      Confirmer le paiement <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest italic opacity-60">Paiement 100% sécurisé • Protocole Nexus Shield activé</p>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Status Update Details Modal */}
      {updatingStatusOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[160] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
          >
            <div className={cn("absolute top-0 left-0 w-full h-1.5", 
              updatingStatusOrder.nextStatus === 'DELIVERY_FAILED' ? "bg-amber-500" : "bg-blue-600"
            )} />
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Mettre à jour le statut</h3>
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Nouveau: {updatingStatusOrder.nextStatus}</p>
              </div>
              <button 
                onClick={() => setUpdatingStatusOrder(null)}
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Motif / Détail opérationnel</label>
                <div className="grid grid-cols-1 gap-2">
                  {(updatingStatusOrder.nextStatus === 'DELIVERY_FAILED' ? [
                    "Client absent / Injoignable",
                    "Adresse introuvable",
                    "Zone dangereuse / Barrage",
                    "Autre (préciser)"
                  ] : [
                    "Livraison standard",
                    "Remis en main propre",
                    "Dépôt sécurisé",
                    "Autre (préciser)"
                  ]).map(reason => (
                    <button
                      key={reason}
                      onClick={() => setStatusReason(reason)}
                      className={cn(
                        "w-full p-4 rounded-xl text-[11px] font-black uppercase text-left transition-all border-2",
                        statusReason === reason ? "bg-blue-50 border-blue-600 text-blue-600 shadow-lg shadow-blue-100" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <textarea 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-bold outline-none focus:bg-white focus:border-blue-600 transition-all h-24"
                placeholder="Commentaire public pour le client..."
                value={statusComment}
                onChange={e => setStatusComment(e.target.value)}
              />

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 italic">Notes Internes (Privé Nexus)</label>
                <textarea 
                  className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl p-4 text-[11px] font-black outline-none focus:bg-white transition-all h-20"
                  placeholder="Notes de coordination, détails livreur..."
                  defaultValue={(updatingStatusOrder.order as any).internalNotes || ''}
                  onChange={e => setInternalNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setUpdatingStatusOrder(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  disabled={submitting || !statusReason}
                  onClick={() => handleStatusUpdate(updatingStatusOrder.order, updatingStatusOrder.nextStatus, statusReason, statusComment)}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-30"
                >
                  {submitting ? "Mise à jour..." : "Confirmer le Statut"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600" />
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Refus de Commande</h3>
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">ID: CMD-{cancellingOrder.id.slice(0, 8)}</p>
              </div>
              <button 
                onClick={() => setCancellingOrder(null)}
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {cancellingOrder.paymentMethod !== 'CASH' && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
                  <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                    <AlertCircle size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-red-600 uppercase tracking-tight">Attention: Commande Prépayée</p>
                    <p className="text-[10px] font-bold text-red-400 leading-relaxed uppercase">
                      L'annulation déclenchera une procédure de remboursement Mobile Money. Assurez-vous de traiter le flux financier.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Motif de l'annulation (Obligatoire)</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    "Rupture de stock inattendue",
                    "Zone de livraison hors de notre portée",
                    "Client injoignable",
                    "Autre (préciser ci-dessous)"
                  ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setCancellationReason(reason)}
                      className={cn(
                        "w-full p-4 rounded-xl text-[11px] font-black uppercase text-left transition-all border-2",
                        cancellationReason === reason ? "bg-red-50 border-red-600 text-red-600 shadow-lg shadow-red-100" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {cancellationReason.includes('Autre') && (
                <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-bold outline-none focus:bg-white focus:border-red-600 transition-all h-20"
                  placeholder="Détails du motif..."
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                />
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setCancellingOrder(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Garder
                </button>
                <button 
                  disabled={submitting || !cancellationReason || (cancellationReason.includes('Autre') && !otherReason)}
                  onClick={() => handleCancelOrder(cancellingOrder, cancellationReason.includes('Autre') ? otherReason : cancellationReason)}
                  className="flex-[2] py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-red-200 active:scale-95 disabled:opacity-30"
                >
                  {submitting ? "Traitement ERP..." : "Confirmer l'Annulation"}
                </button>
              </div>
              <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest italic mt-2">
                * Une notification automatique sear envoyée au client via {notificationConfig?.activeChannel || 'WhatsApp'}.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Modifier la Solution</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {editingProduct.id.slice(0,8)}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><X size={20} /></button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateProduct(editingProduct.id, {
                  name: formData.get('name') as string,
                  price: Number(formData.get('price')),
                  stock: Number(formData.get('stock')),
                  stockThreshold: Number(formData.get('stockThreshold')),
                  allowBackorder: formData.get('allowBackorder') === 'on',
                  description: formData.get('description') as string,
                  category: formData.get('category') as string,
                  points: Number(formData.get('points'))
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nom de la solution</label>
                <input name="name" defaultValue={editingProduct.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Description opérationnelle</label>
                <textarea name="description" defaultValue={editingProduct.description} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none h-24" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Tarificaton (FCFA)</label>
                  <input name="price" type="number" defaultValue={editingProduct.price} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Inventaire / Stock</label>
                    <input name="stock" type="number" defaultValue={editingProduct.stock} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Seuil d'Alerte</label>
                    <input name="stockThreshold" type="number" defaultValue={editingProduct.stockThreshold || 5} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none" required />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input name="allowBackorder" type="checkbox" defaultChecked={editingProduct.allowBackorder} className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-tight">Permettre la surcommande</label>
                    <p className="text-[9px] font-medium text-slate-500 uppercase">Le produit restera disponible même si le stock est à zéro.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Classification</label>
                  <select name="category" defaultValue={editingProduct.category} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none">
                    {['Hardware', 'Software', 'Office', 'Services'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Allocation Points</label>
                  <input name="points" type="number" defaultValue={editingProduct.points} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none" required />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Annuler</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-blue-100 transition-all">Mettre à jour Nexus</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Order Chat Slide-over / Modal */}
      <AnimatePresence>
        {activeChatOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveChatOrder(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col"
            >
              {/* Chat Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Assistance Nexus</h3>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Sujet: CMD-{activeChatOrder.id.slice(0,6).toUpperCase()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveChatOrder(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Chat Content */}
              <div 
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 scroll-smooth"
              >
                <div className="text-center py-4">
                  <div className="inline-block px-4 py-1.5 bg-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Début de la conversation sécurisée
                  </div>
                  <p className="text-xs text-slate-500 font-medium px-8 leading-relaxed">
                    Vous êtes en contact avec le centre opérationnel Nexus pour votre commande.
                  </p>
                </div>

                {orderMessages.map((msg, idx) => {
                  const isMe = msg.senderId === auth.currentUser?.uid;
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "flex flex-col max-w-[85%] gap-2",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "px-6 py-4 rounded-[1.5rem] shadow-sm text-sm font-medium leading-relaxed",
                        isMe 
                          ? "bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-200" 
                          : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 px-2 opacity-40">
                        <span className="text-[9px] font-black uppercase tracking-widest">{msg.senderName}</span>
                        <span className="text-[8px] font-medium">—</span>
                        <span className="text-[9px] font-bold">
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Chat Input */}
              <div className="p-8 border-t border-slate-100 bg-white">
                <form onSubmit={sendOrderMessage} className="flex gap-4">
                  <input 
                    type="text" 
                    value={newOrderMessage}
                    onChange={(e) => setNewOrderMessage(e.target.value)}
                    placeholder="Message opérationnel..."
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-200 transition-all text-sm font-medium"
                  />
                  <button 
                    disabled={!newOrderMessage.trim() || sendingMessage}
                    className="w-14 h-14 flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                  >
                    <Send size={24} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

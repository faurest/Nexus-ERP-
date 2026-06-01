import React, { useState, useEffect, useMemo } from "react";
import {
  db,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  handleFirestoreError,
  OperationType,
} from "../lib/firebase";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  ChevronRight,
  MessageCircle,
  Filter,
  X,
  Plus,
  Minus,
  Store,
  Info,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Tag,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Truck,
  Clock,
  Package,
  Heart,
  History,
  Sparkles,
  Smartphone,
  HardHat,
  Wheat,
  Settings,
  Hammer,
  Monitor,
  Zap,
  LayoutGrid,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HelpTrigger } from "./ContextualHelp";
import { cn } from "../lib/utils";
import { createNotification } from "../lib/notifications";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  companyId: string;
  location?: string;
  allowBackorder?: boolean;
}

interface Company {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  whatsappNumber?: string;
  category?: string;
  nairaRate?: number;
  ownerId?: string;
  deliveryFees?: Record<string, number>;
}

interface CartItem extends Product {
  cartQuantity: number;
  companyName: string;
}

export default function Marketplace({ onBack }: { onBack?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_recent");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [showTransportCalc, setShowTransportCalc] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [guestOrders, setGuestOrders] = useState<any[]>([]);
  const [globalOrderId, setGlobalOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState<string>("Tous");
  const [submitting, setSubmitting] = useState(false);
  const [nairaEnabled, setNairaEnabled] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    name: "",
    phone: "",
    quartier: "",
  });
  const [paymentStep, setPaymentStep] = useState<'INFO' | 'PAYING' | 'SUCCESS'>('INFO');
  const [paymentOperator, setPaymentOperator] = useState<'MTN' | 'ORANGE' | 'CASH' | 'UNKNOWN'>('UNKNOWN');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'MOMO' | 'CASH'>('CASH');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Detect Operator for Mobile Money
  useEffect(() => {
    if (selectedPaymentMethod === 'CASH') {
      setPaymentOperator('CASH');
      return;
    }
    const num = checkoutData.phone.replace(/\s/g, "");
    if (num.startsWith("67") || num.startsWith("68") || num.startsWith("650") || num.startsWith("651") || num.startsWith("652") || num.startsWith("653") || num.startsWith("654")) {
      setPaymentOperator('MTN');
    } else if (num.startsWith("69") || num.startsWith("655") || num.startsWith("656") || num.startsWith("657") || num.startsWith("658") || num.startsWith("659")) {
      setPaymentOperator('ORANGE');
    } else {
      setPaymentOperator('UNKNOWN');
    }
  }, [checkoutData.phone, selectedPaymentMethod]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  useEffect(() => {
    const handlePushState = () => {
      // Logic to handle hardware back button
      if (showCart || showTracking || showCatalogue || showTransportCalc || selectedProduct) {
        setShowCart(false);
        setShowTracking(false);
        setShowCatalogue(false);
        setShowTransportCalc(false);
        setSelectedProduct(null);
      }
    };

    if (showCart || showTracking || showCatalogue || showTransportCalc || selectedProduct) {
      window.history.pushState({ modal: true }, "");
      window.addEventListener("popstate", handlePushState);
    }

    return () => window.removeEventListener("popstate", handlePushState);
  }, [showCart, showTracking, showCatalogue, showTransportCalc, selectedProduct]);

  useEffect(() => {
    localStorage.setItem("nexus_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("nexus_recent", JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  useEffect(() => {
    localStorage.setItem("nexus_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (cart.length > 0 || recentlyViewed.length > 0) {
      setShowWelcomeBack(true);
      const timer = setTimeout(() => setShowWelcomeBack(false), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const addToRecentlyViewed = (product: Product) => {
    // Increment views for the product (conversion KPI)
    const productRef = doc(db, "products", product.id);
    import("firebase/firestore").then(({ increment }) => {
      updateDoc(productRef, {
        views: increment(1)
      }).catch(err => console.error("Could not increment product views", err));
    });

    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 10); // Keep last 10
    });
  };

  const toggleFavorite = (companyId: string) => {
    setFavorites(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId) 
        : [...prev, companyId]
    );
  };

  const [orderIds, setOrderIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("nexus_guest_orders") || "[]");
  });
  const [orderHistories, setOrderHistories] = useState<Record<string, any[]>>({});
  const [activeOrderCount, setActiveOrderCount] = useState(0);

  // Fetch Order Histories
  useEffect(() => {
    if (orderIds.length === 0) return;

    const unsubscribes = orderIds.map(orderId => {
      const q = query(
        collection(db, "order_history"),
        where("orderId", "==", orderId)
      );
      return onSnapshot(q, (snap) => {
        const history = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        
        setOrderHistories(prev => ({ ...prev, [orderId]: history }));
      }, (error) => handleFirestoreError(error, OperationType.GET, "order_history"));
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [orderIds]);
  const [notifSettings, setNotifSettings] = useState(() => {
    const saved = localStorage.getItem("nexus_notif_settings");
    return saved ? JSON.parse(saved) : { push: true, whatsapp: true, sms: false };
  });

  const SUPPORT_NUMBER = "237640790996";

  useEffect(() => {
    localStorage.setItem("nexus_notif_settings", JSON.stringify(notifSettings));
  }, [notifSettings]);

  useEffect(() => {
    if (orderIds.length === 0) return;

    const chunks = [];
    for (let i = 0; i < orderIds.length; i += 10) {
      chunks.push(orderIds.slice(i, i + 10));
    }

    const unsubscribes = chunks.map((chunk) => {
      const q = query(
        collection(db, "ecommerce_orders"),
        where("__name__", "in", chunk),
      );
      return onSnapshot(q, (snap) => {
        const orders = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setGuestOrders((prev) => {
          const otherOrders = prev.filter((o) => !chunk.includes(o.id));
          return [...otherOrders, ...orders].sort(
            (a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0),
          );
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, "ecommerce_orders"));
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [orderIds]);

  useEffect(() => {
    const active = guestOrders.filter((o) =>
      ["PENDING", "PROCESSING", "SHIPPED"].includes(o.status),
    ).length;
    setActiveOrderCount(active);
  }, [guestOrders]);

  const fetchGuestOrders = async () => {
    // This is now handled by the real-time effect
  };

  useEffect(() => {
    if (showTracking) {
      fetchGuestOrders();
    }
  }, [showTracking]);

  useEffect(() => {
    setLoading(true);
    // Fetch companies
    const unsubscribeCompanies = onSnapshot(
      collection(db, "companies"),
      (snap) => {
        setCompanies(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Company),
        );
      },
    );

    // Fetch all products
    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (snap) => {
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product),
        );
        setLoading(false);
      },
    );

    return () => {
      unsubscribeCompanies();
      unsubscribeProducts();
    };
  }, []);

  const categoryIcons: Record<string, any> = {
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

  const categories = ["Tous", "Construction", "Ciment", "Céréales", "Pièces détachées", "Bricolage", "Informatique", "Électroménager", "Divers"];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const pName = p.name || '';
      const pDesc = p.description || '';
      const matchesSearch =
        pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pDesc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany =
        activeCompanyId === "all" || p.companyId === activeCompanyId;
      const matchesCategory = activeCategory === "Tous" || p.category === activeCategory;
      return matchesSearch && matchesCompany && matchesCategory;
    });
  }, [products, searchTerm, activeCompanyId, activeCategory]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Record<string, Product[]>> = {};
    
    filteredProducts.forEach(product => {
      const category = product.category || 'Divers';
      const companyId = product.companyId || 'unknown';
      const company = companies.find(c => c.id === companyId);
      const companyName = company?.name || 'Inconnu';
      
      if (!groups[category]) groups[category] = {};
      if (!groups[category][companyName]) groups[category][companyName] = [];
      
      groups[category][companyName].push(product);
    });
    
    // Sort categories, moving Divers to the end
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      if (a === 'Divers') return 1;
      if (b === 'Divers') return -1;
      return a.localeCompare(b);
    });

    const sortedGroups: Record<string, Record<string, Product[]>> = {};
    for (const cat of sortedCategories) {
      sortedGroups[cat] = groups[cat];
    }
    
    return sortedGroups;
  }, [filteredProducts, companies]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0 && !product.allowBackorder) {
      alert("Désolé, ce produit est en rupture de stock.");
      return;
    }
    
    addToRecentlyViewed(product);
    const company = companies.find((c) => c.id === product.companyId);
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (!product.allowBackorder && existing.cartQuantity >= product.stock) {
          alert(`Désolé, seulement ${product.stock} articles sont disponibles.`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          ...product,
          cartQuantity: 1,
          companyName: company?.name || "Nexus Partner",
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, item.cartQuantity + delta);
            return { ...item, cartQuantity: newQty };
          }
          return item;
        })
        .filter((item) => item.cartQuantity > 0),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.cartQuantity,
    0,
  );

  // Default Naira rate for Maroua context if not set per company
  const GLOBAL_NAIRA_RATE = 1.2;

  const getStockStatus = (stock: number) => {
    if (stock <= 0)
      return {
        label: "Rupture de Stock",
        color: "bg-slate-100 text-slate-500 border-slate-200",
      };
    if (stock <= 10)
      return {
        label: `Stock Limité - Plus que ${stock}`,
        color: "bg-orange-50 text-orange-600 border-orange-100",
      };
    return {
      label: "En Stock",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    };
  };

  const checkoutWhatsApp = (product?: Product) => {
    const targetProduct = product || cart[0];
    const company = companies.find((c) => c.id === targetProduct?.companyId);
    // Use company number if available, otherwise global help number
    const phone = company?.whatsappNumber || "640790996";

    let message = "";
    if (product) {
      message = `Bonjour, je suis intéressé par le produit *${product.name}* (${product.price.toLocaleString()} FCFA) vu sur l'application Nexus Marketplace. Est-il toujours disponible ?`;
    } else {
      const locationInfo = selectedLocation ? `\nLivraison: ${selectedLocation}` : '';
      message =
        `*Nouvelle Commande Nexus ERP*\n\n` +
        cart
          .map(
            (item) =>
              `- ${item.name} (x${item.cartQuantity}) : ${(item.price * item.cartQuantity).toLocaleString()} FCFA`,
          )
          .join("\n") +
        `\n\n*Total Articles : ${cartTotal.toLocaleString()} FCFA*` +
        locationInfo +
        `\n\nClient: ${checkoutData.name}\nTél: ${checkoutData.phone}\nQuartier: ${checkoutData.quartier}`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleQuickCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Only show paying step if it's Mobile Money
    if (selectedPaymentMethod === 'MOMO') {
      setPaymentStep('PAYING');
    }

    try {
      setSubmitting(true);
      
      // Calculate total with exactly the delivery fees for each unique vendor
      const uniqueCompanyIds = Array.from(new Set(cart.map(i => i.companyId)));
      const totalDeliveryFees = uniqueCompanyIds.reduce((acc, cid) => {
        const company = companies.find(c => c.id === cid);
        return acc + (company?.deliveryFees?.[selectedLocation] || 0);
      }, 0);
      const grandTotal = cartTotal + totalDeliveryFees;

      // 1. Create a Global Order first
      const globalOrderRef = await addDoc(collection(db, "global_orders"), {
        total: grandTotal,
        status: "PENDING",
        paymentMethod: selectedPaymentMethod === 'CASH' ? 'CASH' : (paymentOperator === 'MTN' ? 'MTN MoMo' : 'Orange Money'),
        paymentStatus: selectedPaymentMethod === 'CASH' ? "UNPAID" : "PENDING_MOMO",
        customerName: checkoutData.name,
        customerPhone: checkoutData.phone,
        customerQuartier: checkoutData.quartier,
        customerEmail: "Marketplace Multi-Vendor",
        createdAt: serverTimestamp(),
        subOrderIds: [] 
      });

      setGlobalOrderId(globalOrderRef.id);

      // Group items by companyId
      const ordersByCompany: Record<string, CartItem[]> = {};
      cart.forEach((item) => {
        if (!ordersByCompany[item.companyId]) {
          ordersByCompany[item.companyId] = [];
        }
        ordersByCompany[item.companyId].push(item);
      });

      // Create an order for each company
      const orderPromises = Object.entries(ordersByCompany).map(
        async ([companyId, items]) => {
          const company = companies.find((c) => c.id === companyId);
          const companyTotal = items.reduce(
            (acc, item) => acc + item.price * item.cartQuantity,
            0,
          );
          
          let deliveryFee = 0;
          if (company?.deliveryFees && selectedLocation) {
            deliveryFee = company.deliveryFees[selectedLocation] || 0;
          }
          
          const orderRef = await addDoc(collection(db, "ecommerce_orders"), {
            companyId,
            globalOrderId: globalOrderRef.id,
            items: items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.cartQuantity,
            })),
            total: companyTotal + deliveryFee,
            deliveryFee,
            deliveryLocation: selectedLocation,
            status: "PENDING",
            paymentStatus: selectedPaymentMethod === 'CASH' ? "UNPAID" : "PENDING_MOMO",
            paymentMethod: selectedPaymentMethod === 'CASH' ? 'CASH' : (paymentOperator === 'MTN' ? 'MTN MoMo' : 'Orange Money'),
            operator: paymentOperator,
            date: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            checkoutSource: "MARKETPLACE",
            customerName: checkoutData.name,
            customerPhone: checkoutData.phone,
            customerQuartier: checkoutData.quartier,
            customerEmail: "Marketplace Multi-Vendor",
          });

          // Update Global Order with sub-order ID
          const { arrayUnion } = await import("firebase/firestore");
          await updateDoc(doc(db, "global_orders", globalOrderRef.id), {
            subOrderIds: arrayUnion(orderRef.id)
          });

          // Deduct Stock immediately (Reservation) & Increment soldCount
          for (const item of items) {
             const productRef = doc(db, "products", item.id);
             const { increment } = await import("firebase/firestore");
             await updateDoc(productRef, {
               stock: increment(-item.cartQuantity),
               soldCount: increment(item.cartQuantity),
               updatedAt: serverTimestamp()
             });
          }

          // Save to guest orders for tracking
          const existingGuestOrders = JSON.parse(localStorage.getItem('nexus_guest_orders') || '[]');
          const newIds = [...existingGuestOrders, orderRef.id];
          localStorage.setItem('nexus_guest_orders', JSON.stringify(newIds));
          setOrderIds(newIds);

          // If Mobile Money, simulate the push delay
          if (selectedPaymentMethod === 'MOMO') {
            await new Promise(resolve => setTimeout(resolve, 6000));
            // Check if order was cancelled while waiting
            try {
              const { getDoc } = await import("firebase/firestore");
              const freshSnap = await getDoc(doc(db, "ecommerce_orders", orderRef.id));
              if (freshSnap.exists() && freshSnap.data()?.status === "CANCELLED_BY_CUSTOMER") {
                console.log("Order was cancelled by user during MOMO wait, stopping processing.");
                return;
              }
            } catch (e) {
              console.error("Error checking order status during wait:", e);
            }

            await updateDoc(doc(db, "ecommerce_orders", orderRef.id), {
              paymentStatus: "PAID",
              status: "PROCESSING",
              updatedAt: serverTimestamp(),
            });

            // Also update Global Order status if all sub-orders are paid (simplified here)
            await updateDoc(doc(db, "global_orders", globalOrderRef.id), {
               paymentStatus: "PAID"
            });
          }

          // Notify company owner
          if (company?.ownerId) {
            await createNotification(
              companyId,
              [company.ownerId],
              selectedPaymentMethod === 'CASH' ? "Nouvelle Commande (Cash sur place)" : "Commande Marketplace Payée !",
              `${checkoutData.name} a passé une commande de ${(companyTotal + deliveryFee).toLocaleString()} FCFA. Paiement: ${selectedPaymentMethod === 'CASH' ? 'Espèces' : paymentOperator}.`,
              "alert"
            );
          }
        },
      );

      await Promise.all(orderPromises);

      setPaymentStep('SUCCESS');
      setTimeout(() => {
        setCart([]);
        setShowCheckoutForm(false);
        setShowCart(false);
        setPaymentStep('INFO');
        setSelectedPaymentMethod('CASH'); // Reset
      }, 5000);
    } catch (err) {
      console.error("Order save failed:", err);
      setPaymentStep('INFO');
      alert("Une erreur est survenue lors de l'enregistrement de votre commande.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: string, reason: string) => {
    console.log("Attempting to cancel order:", orderId, "Reason:", reason);
    
    try {
      const { getDoc, increment } = await import("firebase/firestore");
      const orderRef = doc(db, "ecommerce_orders", orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) return;
      const orderData = orderSnap.data();

      // Restore Stock if order wasn't already cancelled/delivered
      if (orderData.status === 'PENDING') {
        const items = orderData.items || [];
        for (const item of items) {
          if (item.id) {
            const productRef = doc(db, "products", item.id);
            await updateDoc(productRef, {
              stock: increment(item.quantity || 0),
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      await updateDoc(orderRef, {
        status: "CANCELLED_BY_CUSTOMER",
        cancellationReason: reason,
        updatedAt: serverTimestamp()
      });
      console.log("Order cancelled successfully:", orderId);
      setCancellingOrderId(null);
      setCancelReason("");
      alert("Votre commande a été annulée avec succès.");
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      const errorMsg = err.message || "Erreur inconnue";
      alert(`Erreur lors de l'annulation: ${errorMsg}. Veuillez contacter le support.`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          Chargement du Nexus Marketplace...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-24">
      {/* Floating WhatsApp Help Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          const url = `https://wa.me/237640790996?text=${encodeURIComponent("Bonjour Nexus Aide, j'ai besoin d'assistance sur la Marketplace.")}`;
          window.open(url, '_blank');
        }}
        className="fixed bottom-24 right-6 z-50 bg-emerald-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-600 transition-all border-4 border-white group"
      >
        <MessageCircle size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em]">
          Aide Nexus
        </span>
      </motion.button>
      {/* Search & Navigation Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center gap-4 px-6 py-4">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-4">
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all font-black text-[9px] uppercase tracking-widest hover:border-slate-300 shrink-0"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Retour</span>
            </button>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Store size={22} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none italic">
                NEXUS MARKETPLACE
              </h1>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1 italic">
                Commerce Ouvert d'Excellence
              </p>
            </div>
          </div>

          <div className="flex-1 w-full relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none"
              size={18}
            />
            <input
              type="text"
              placeholder="Riz, ciment, matériel informatique..."
              className="w-full bg-slate-100/80 border-2 border-transparent rounded-2xl py-3.5 pl-12 pr-12 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button 
                onClick={() => {
                  const message = "Bonjour, j'ai une question sur Nexus Marketplace.";
                  window.open(`https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
                }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <MessageCircle size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
              >
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                </div>
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
              >
                <Filter size={18} />
              </button>
            </div>

            <button
              onClick={() => setNairaEnabled(!nairaEnabled)}
              className={cn(
                "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                nairaEnabled
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-white text-slate-400 border-slate-100",
              )}
            >
              {nairaEnabled ? "Naira (₦)" : "FCFA"}
            </button>
            
            {/* Suivi Commandes Button in Header */}
            <button
              onClick={() => setShowTracking(true)}
              className="relative p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm group"
              title="Suivi de mes commandes"
            >
              <Truck size={20} className={cn(activeOrderCount > 0 ? "text-blue-600" : "text-slate-400")} />
              {activeOrderCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                  {activeOrderCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowCart(true)}
              className="relative p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                  {cart.reduce((a, b) => a + b.cartQuantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Back Banner */}
        <AnimatePresence>
          {showWelcomeBack && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-200 border border-blue-400/30 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Sparkles size={120} />
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                    <History size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight">C'est bon de vous revoir !</h3>
                    <p className="text-xs font-bold text-blue-50 opacity-80 uppercase tracking-widest mt-1">Nous avons conservé votre session intacte.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {cart.length > 0 && (
                    <button 
                      onClick={() => setShowCart(true)}
                      className="flex-1 sm:flex-none px-6 py-3 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg active:scale-95"
                    >
                      Voir mon Panier ({cart.length})
                    </button>
                  )}
                  <button 
                    onClick={() => setShowWelcomeBack(false)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "Mall" Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                Le "Mall" Virtuel de Maroua
              </h2>
              <p className="text-[9px] font-bold text-slate-300 uppercase">
                Explorez les boutiques de nos partenaires locaux
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTransportCalc(true)}
                className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-4 py-3 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 shadow-sm"
              >
                <TrendingUp size={14} /> Estimer Livraison
              </button>
              <button
                onClick={() => setShowCatalogue(true)}
                className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase bg-white px-4 py-3 rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
              >
                <FileText size={14} /> Catalogue Officiel
              </button>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide -mx-2 px-2 mask-linear-gradient-x">
            <motion.div
              whileHover={{ y: -5 }}
              onClick={() => setActiveCompanyId("all")}
              className={cn(
                "min-w-[100px] aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all border-2 shrink-0",
                activeCompanyId === "all"
                  ? "bg-slate-900 border-slate-900 shadow-2xl shadow-slate-200"
                  : "bg-white border-slate-100 hover:border-blue-200 shadow-sm",
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  activeCompanyId === "all"
                    ? "bg-white text-slate-900"
                    : "bg-slate-50 text-slate-400",
                )}
              >
                <Store size={24} />
              </div>
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  activeCompanyId === "all" ? "text-white" : "text-slate-400",
                )}
              >
                Tous
              </span>
            </motion.div>

            {companies.map((company) => (
              <motion.div
                whileHover={{ y: -5 }}
                key={company.id}
                onClick={() => setActiveCompanyId(company.id)}
                className={cn(
                  "min-w-[100px] aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all border-2 group shrink-0",
                  activeCompanyId === company.id
                    ? "bg-blue-600 border-blue-600 shadow-2xl shadow-blue-200"
                    : "bg-white border-slate-100 hover:border-blue-200 shadow-sm",
                )}
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-inner group-hover:scale-110 transition-transform bg-slate-50 flex items-center justify-center relative">
                  {company.logo ? (
                    <img
                      src={company.logo}
                      className="w-full h-full object-cover"
                      alt={company.name}
                    />
                  ) : (
                    <span className="text-slate-300 font-black text-xl">
                      {company.name.charAt(0)}
                    </span>
                  )}
                  {/* Favorite Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(company.id);
                    }}
                    className={cn(
                      "absolute top-1 right-1 p-1 rounded-full transition-all backdrop-blur-md",
                      favorites.includes(company.id)
                        ? "bg-red-500 text-white"
                        : "bg-white/60 text-slate-400 hover:text-red-500"
                    )}
                  >
                    <Heart size={10} fill={favorites.includes(company.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-tighter truncate w-full px-3 text-center",
                    activeCompanyId === company.id
                      ? "text-white"
                      : "text-slate-400",
                  )}
                >
                  {company.name}
                </span>
              </motion.div>
            ))}

            <motion.div
              whileHover={{ y: -5 }}
              onClick={() => {
                window.location.href = "#login";
              }}
              className="min-w-[100px] aspect-square rounded-[2rem] bg-amber-50 border-2 border-dashed border-amber-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-amber-100 transition-all shrink-0"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                <Plus size={24} />
              </div>
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter text-center">
                Vendre
              </span>
            </motion.div>
          </div>
        </div>

        {/* Sectors / Filters */}
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2 mask-linear-gradient-x">
          {categories.map((cat, idx) => {
            const isActive = activeCategory === cat;
            const Icon = categoryIcons[cat] || Package;
            return (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border shrink-0 flex items-center gap-3",
                  isActive
                    ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200 scale-105"
                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-600",
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all",
                  isActive ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400"
                )}>
                  <Icon size={14} />
                </div>
                {cat}
              </motion.button>
            );
          })}
        </div>

        {/* Personalized Sections - only on home */}
        {searchTerm === "" && activeCompanyId === "all" && (
          <div className="space-y-12">
            {/* 1. Resume / Cart Reminder */}
            {cart.length > 0 && (
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <ShoppingBag size={32} />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {cart.length}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic">Reprendre mes achats</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vous avez laissé {cart.length} article(s) dans votre panier.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCart(true)}
                  className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  Finaliser la Commande <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* 2. Favorites / My Shops */}
            {favorites.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                    <Heart size={20} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Mes Adresses Favorites</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vos boutiques les plus consultées</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                  {companies.filter(c => favorites.includes(c.id)).map(company => (
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      key={company.id}
                      onClick={() => setActiveCompanyId(company.id)}
                      className="min-w-[140px] bg-white p-4 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-inner bg-slate-50 flex items-center justify-center">
                        {company.logo ? <img src={company.logo} className="w-full h-full object-cover" /> : <Store className="text-slate-300" />}
                      </div>
                      <span className="text-[10px] font-black text-slate-900 uppercase italic truncate w-full text-center">{company.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Articles Récemment Vus</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reprenez là où vous vous êtes arrêté</p>
                  </div>
                </div>
                <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
                  {recentlyViewed.map(product => (
                    <motion.div 
                      whileHover={{ y: -5 }}
                      key={`recent-${product.id}`}
                      onClick={() => {
                        addToRecentlyViewed(product);
                        setSelectedProduct(product);
                      }}
                      className="min-w-[180px] bg-white rounded-3xl border border-slate-100 overflow-hidden cursor-pointer shadow-sm group"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={product.image} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                      </div>
                      <div className="p-4 space-y-1">
                        <h4 className="text-[10px] font-black text-slate-900 uppercase italic line-clamp-1">{product.name}</h4>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-blue-600">{product.price.toLocaleString()} FCFA</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{companies.find(c => c.id === product.companyId)?.name}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic List Header */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-8 mt-4">
          <div className="space-y-0.5">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
              {searchTerm ? `Résultats pour "${searchTerm}"` : activeCompanyId === "all" ? "Toutes les nouveautés" : `Catalogue ${companies.find(c => c.id === activeCompanyId)?.name}`}
            </h2>
            <p className="text-[9px] font-bold text-slate-300 uppercase">
              {filteredProducts.length} articles trouvés • Maroua
            </p>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Vue:</span>
             <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
               <button 
                 onClick={() => setViewMode('grid')}
                 className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
               >
                 Grille
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
               >
                 Liste
               </button>
             </div>
          </div>
        </div>

        {/* Product Grid / List Grouped */}
        <div className="space-y-12">
          {Object.entries(groupedProducts).length === 0 ? (
            <div className="py-20 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  Aucun résultat
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Essayez une autre recherche ou un autre partenaire.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setActiveCompanyId("all");
                }}
                className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-600 hover:text-blue-600 transition-all"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            Object.entries(groupedProducts).map(([category, companiesDict]) => {
              const CategoryIcon = categoryIcons[category] || categoryIcons["Divers"];
              return (
                <div key={category} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* Category Header */}
                  <div className="flex items-center gap-3">
                    <div className="h-px bg-slate-200 flex-1" />
                    <div className="px-5 py-2 bg-white rounded-full border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] flex items-center gap-2.5">
                      <CategoryIcon size={14} className="text-blue-600" />
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{category}</span>
                    </div>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                  
                  <div className="space-y-10">
                    {Object.entries(companiesDict).map(([companyName, companyProducts]) => (
                      <div key={companyName} className="space-y-6 bg-slate-50/50 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100">
                        {/* Company Header */}
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                          <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tight">{companyName}</h3>
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md ml-auto border border-indigo-100 shadow-sm">{companyProducts.length} Produit{companyProducts.length > 1 ? 's' : ''}</span>
                        </div>
                        
                        <div className={cn(
                          "transition-all duration-500",
                          viewMode === 'grid' 
                            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" 
                            : "flex flex-col gap-4"
                        )}>
                          <AnimatePresence mode="popLayout">
                            {companyProducts.map((product) => {
                              const company = companies.find((c) => c.id === product.companyId);
                              const nairaPrice = ((product.price * (company?.nairaRate || GLOBAL_NAIRA_RATE)) / 1000).toFixed(1);
                              
                              if (viewMode === 'list') {
                                return (
                                  <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => {
                                      addToRecentlyViewed(product);
                                      setSelectedProduct(product);
                                    }}
                                    className="group bg-white rounded-3xl border border-slate-100 p-4 flex items-center gap-6 cursor-pointer hover:shadow-xl hover:border-blue-100 transition-all"
                                  >
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                                      <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[8px] font-black text-blue-600 underline underline-offset-4 decoration-2">{company?.name}</span>
                                          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">• {product.category}</span>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase italic line-clamp-1">{product.name}</h3>
                                      </div>
                                      <div className="flex items-center gap-6">
                                        <div className="text-right">
                                          <p className="text-sm font-black text-slate-900 line-none">{product.price.toLocaleString()} F</p>
                                          <p className={cn("text-[9px] font-black uppercase tracking-widest", nairaEnabled ? "text-amber-500" : "text-slate-300")}>₦ {nairaPrice}k</p>
                                        </div>
                                        <div className={cn("hidden sm:block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", getStockStatus(product.stock).color)}>
                                          {getStockStatus(product.stock).label}
                                        </div>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(product);
                                          }}
                                          className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                                        >
                                          <Plus size={18} />
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              }

                              return (
                                <motion.div
                                  key={product.id}
                                  layout
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 flex flex-col relative shadow-sm"
                                >
                                  <div
                                    className="aspect-square overflow-hidden relative cursor-pointer"
                                    onClick={() => {
                                      addToRecentlyViewed(product);
                                      setSelectedProduct(product);
                                    }}
                                  >
                                    <img
                                      src={product.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60"}
                                      alt={product.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] brightness-[0.98] group-hover:brightness-100"
                                      referrerPolicy="no-referrer"
                                    />

                                    {/* Progressive Loading Visual Placeholder */}
                                    <div className="absolute inset-0 bg-slate-100 animate-pulse opacity-0 pointer-events-none" />

                                    <div className="absolute top-4 right-4 flex flex-col gap-2 scale-90 origin-top-right">
                                      {company?.logo && (
                                        <div className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl p-1.5 shadow-xl border border-white/50 overflow-hidden flex items-center justify-center">
                                          <img src={company.logo} className="max-w-full max-h-full object-contain" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                      <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-xl flex items-center gap-2">
                                        <Info size={12} />
                                        Détails
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[7px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">{product.category}</span>
                                        <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest truncate">{company?.name}</span>
                                      </div>
                                      <h3 className="text-[12px] font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors uppercase italic line-clamp-1 mt-1">
                                        {product.name}
                                      </h3>
                                    </div>

                                    <div className="mt-5 space-y-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                          <span className="text-[14px] font-black text-slate-900 leading-none tracking-tight">
                                            {product.price.toLocaleString()} <span className="text-[7px] opacity-40">F</span>
                                          </span>
                                          <span className={cn(
                                            "text-[7px] font-black uppercase tracking-widest mt-1.5 transition-colors",
                                            nairaEnabled ? "text-amber-500" : "text-slate-300"
                                          )}>
                                            ₦ {nairaPrice}k Naira
                                          </span>
                                        </div>
                                        <div
                                          className={cn(
                                            "px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest border shadow-sm",
                                            getStockStatus(product.stock).color,
                                          )}
                                        >
                                          {getStockStatus(product.stock).label}
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            checkoutWhatsApp(product);
                                          }}
                                          className="w-10 h-10 bg-white border border-slate-100 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-50 transition-all active:scale-95"
                                        >
                                          <MessageCircle size={16} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (product.stock > 0) addToCart(product);
                                          }}
                                          disabled={product.stock <= 0}
                                          className={cn(
                                            "flex-1 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-xl group/btn",
                                            product.stock > 0 
                                              ? "bg-slate-950 text-white hover:bg-blue-600 shadow-slate-200 group-hover:shadow-blue-600/20" 
                                              : "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100 shadow-none"
                                          )}
                                        >
                                          <Plus size={14} className="mr-1.5 group-hover/btn:rotate-90 transition-transform duration-300" />
                                          <span className="text-[8px] font-black uppercase tracking-widest">
                                            {product.stock > 0 ? "Panier" : "Rupture"}
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  {showCheckoutForm ? (
                    <button
                      onClick={() => setShowCheckoutForm(false)}
                      className="p-2 -ml-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <ArrowLeft size={20} />
                    </button>
                  ) : (
                    <ShoppingCart size={20} className="text-blue-600" />
                  )}
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    {showCheckoutForm ? "Finalisation" : "Votre Panier"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide pb-20">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                    <ShoppingBag size={48} />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">
                      Panier Vide
                    </p>
                  </div>
                ) : showCheckoutForm ? (
                  /* Focused Order Summary when Checking Out */
                  <div className="space-y-10 relative">
                    {paymentStep === 'PAYING' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-x-0 -top-6 bottom-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-10 text-center space-y-8"
                      >
                        <div className="relative">
                           <div className={cn(
                             "w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl animate-pulse transition-colors duration-1000",
                             paymentOperator === 'MTN' ? "bg-[#FFCC00]" : (paymentOperator === 'ORANGE' ? "bg-[#FF7900]" : "bg-blue-600")
                           )}>
                             <Smartphone size={40} />
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100">
                             <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h3 className="text-xl font-black text-slate-900 uppercase italic">Validation USSD Push</h3>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed px-4">
                            Veuillez consulter votre téléphone <span className="text-slate-900 font-black">({checkoutData.phone})</span> et entrer votre code secret <span className={cn("font-black", paymentOperator === 'MTN' ? "text-[#FFCC00]" : "text-[#FF7900]")}>{paymentOperator}</span> pour autoriser la transaction.
                          </p>
                        </div>
                        
                        <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                           <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                             <span>Statut</span>
                             <span className="text-blue-600 animate-pulse">En attente...</span>
                           </div>
                           <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: "100%" }}
                               transition={{ duration: 8, ease: "linear" }}
                               className="h-full bg-blue-600"
                             />
                           </div>
                        </div>

                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">NE FERMEZ PAS CETTE PAGE</p>
                      </motion.div>
                    )}

                    {paymentStep === 'SUCCESS' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-x-0 -top-6 bottom-0 bg-white z-50 flex flex-col items-center justify-center p-10 text-center space-y-8"
                      >
                        <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30">
                           <CheckCircle2 size={48} />
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black text-slate-900 uppercase italic">Succès !</h3>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">
                            Votre commande a été reçue. Nous vous contacterons sous peu pour la confirmation finale.
                          </p>
                        </div>

                        <div className="space-y-3 w-full">
                          <button
                            onClick={() => {
                              setShowTracking(true);
                              // We don't Reset yet, let the timeout handle it or user can do it
                            }}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                          >
                            <Truck size={16} /> Suivre ou Annuler
                          </button>

                          <button
                            onClick={() => {
                              const message = `Bonjour Nexus, je viens de passer une commande sur Nexus Marketplace. Pouvez-vous confirmer la réception ? [CLIENT: ${checkoutData.name}]`;
                              window.open(`https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
                            }}
                            className="w-full py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
                          >
                            <MessageCircle size={16} /> Confirmation WhatsApp
                          </button>
                        </div>
                        
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[8px] font-black text-slate-400 italic uppercase">Redirection automatique dans quelques secondes...</p>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-3xl border border-blue-100">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Étape 2/2</p>
                        <h4 className="text-sm font-black text-slate-900 uppercase italic">Détails de Livraison</h4>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Résumé du Panier ({cart.length} articles)</h5>
                      <div className="grid grid-cols-4 gap-2">
                        {cart.slice(0, 4).map((item) => (
                          <div key={item.id} className="aspect-square rounded-xl overflow-hidden border border-slate-100 relative group">
                            <img src={item.image} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0" alt="" />
                            <div className="absolute inset-0 bg-slate-900/10" />
                            <span className="absolute bottom-1 right-1 bg-white text-slate-900 text-[8px] font-black px-1.5 rounded-md shadow-sm border border-slate-100">
                              x{item.cartQuantity}
                            </span>
                          </div>
                        ))}
                        {cart.length > 4 && (
                          <div className="aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <span className="text-[10px] font-black text-slate-400">+{cart.length - 4}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MOVED FORM INSIDE SCROLLABLE AREA */}
                    <div className="space-y-8 pb-10">
                      <form onSubmit={handleQuickCheckout} className="space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Votre Nom Complet</label>
                            <input
                              required
                              type="text"
                              placeholder="Ex: Amadou Maroua"
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 focus:ring-8 focus:ring-blue-50 transition-all shadow-sm"
                              value={checkoutData.name}
                              onChange={(e) =>
                                setCheckoutData({
                                  ...checkoutData,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Numéro WhatsApp</label>
                            <input
                              required
                              type="tel"
                              placeholder="6xx xx xx xx"
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 focus:ring-8 focus:ring-blue-50 transition-all shadow-sm"
                              value={checkoutData.phone}
                              onChange={(e) =>
                                setCheckoutData({
                                  ...checkoutData,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Quartier & Précisions</label>
                            <input
                              required
                              type="text"
                              placeholder="Ex: Hardé, face École du Centre"
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 focus:ring-8 focus:ring-blue-50 transition-all shadow-sm"
                              value={checkoutData.quartier}
                              onChange={(e) =>
                                setCheckoutData({
                                  ...checkoutData,
                                  quartier: e.target.value,
                                })
                              }
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Zone de Livraison</label>
                            <div className="relative">
                              <select 
                                required
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 pr-12 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 appearance-none transition-all shadow-sm"
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                              >
                                <option value="">Où livrer le colis ?</option>
                                {Array.from(new Set(cart.flatMap(item => {
                                  const company = companies.find(c => c.id === item.companyId);
                                  return Object.keys(company?.deliveryFees || {});
                                }))).map(loc => (
                                  <option key={loc} value={loc}>{loc}</option>
                                ))}
                                <option value="Autre / Centre-ville">Autre / Centre-ville</option>
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Truck size={20} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block">Mode de Paiement</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setSelectedPaymentMethod('CASH')}
                              className={cn(
                                "p-4 rounded-[1.5rem] border-2 transition-all flex items-center gap-3 text-left group relative overflow-hidden",
                                selectedPaymentMethod === 'CASH' 
                                  ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10" 
                                  : "border-slate-100 hover:border-slate-200 bg-white"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                selectedPaymentMethod === 'CASH' ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                              )}>
                                <History size={20} />
                              </div>
                              <div>
                                <p className={cn("text-[10px] font-black uppercase leading-none", selectedPaymentMethod === 'CASH' ? "text-emerald-600" : "text-slate-900")}>Espèces (COD)</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase italic">Payer à la livraison</p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedPaymentMethod('MOMO')}
                              className={cn(
                                "p-4 rounded-[1.5rem] border-2 transition-all flex items-center gap-3 text-left group relative overflow-hidden",
                                selectedPaymentMethod === 'MOMO' 
                                  ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/10" 
                                  : "border-slate-100 hover:border-slate-200 bg-white"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                selectedPaymentMethod === 'MOMO' ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                              )}>
                                <Smartphone size={20} />
                              </div>
                              <div>
                                <p className={cn("text-[10px] font-black uppercase leading-none flex items-center gap-1", selectedPaymentMethod === 'MOMO' ? "text-amber-600" : "text-slate-900")}>
                                  Mobile Money
                                  <HelpTrigger topic="PAYMENT" />
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                   <div className="px-1 py-0.5 bg-orange-500 text-white text-[7px] font-black rounded uppercase">Orange</div>
                                   <div className="px-1 py-0.5 bg-yellow-400 text-slate-900 text-[7px] font-black rounded uppercase">MTN</div>
                                </div>
                              </div>
                            </button>
                          </div>
                          {selectedPaymentMethod === 'MOMO' && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-amber-50 border border-amber-100 rounded-3xl space-y-3"
                            >
                              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-snug">
                                Payez via Orange Money ou MTN MoMo. Un message USSD de confirmation sera envoyé sur votre téléphone après validation.
                              </p>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white/50 rounded-xl border border-amber-200/50">
                                <Info size={12} className="text-amber-500" />
                                <span className="text-[8px] font-bold text-amber-400 uppercase italic">Utilise le numéro WhatsApp saisi plus haut</span>
                              </div>
                            </motion.div>
                          )}
                          {selectedPaymentMethod === 'CASH' && (
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-3">
                              <History size={16} className="text-emerald-500" />
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-snug italic">
                                Vous paierez le montant total directement à l'agent de livraison lors de la réception de vos articles.
                              </p>
                            </div>
                          )}
                        </div>

                        {selectedLocation && (
                          <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4 shadow-xl shadow-slate-200 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                               <TrendingUp size={80} />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest opacity-60">
                              <span>Sous-total articles</span>
                              <span>{cartTotal.toLocaleString()} FCFA</span>
                            </div>
                            <div className="space-y-2">
                               {Array.from(new Set(cart.map(i => i.companyId))).map(cid => {
                                 const company = companies.find(c => c.id === cid);
                                 const fee = company?.deliveryFees?.[selectedLocation] || 0;
                                 return (
                                   <div key={cid} className="flex justify-between items-center text-[10px] font-bold text-blue-300">
                                     <span className="italic">Livraison {company?.name} :</span>
                                     <span>{fee > 0 ? `+ ${fee.toLocaleString()} FCFA` : 'Inclus'}</span>
                                   </div>
                                 );
                               })}
                            </div>
                            <div className="pt-4 border-t border-white/10 mt-2 flex justify-between items-center relative z-10">
                              <span className="text-xs font-black uppercase">Total Final</span>
                              <span className="text-2xl font-black text-emerald-400 tracking-tighter">
                                {(cartTotal + Array.from(new Set(cart.map(i => i.companyId))).reduce((acc, cid) => {
                                   const company = companies.find(c => c.id === cid);
                                   return acc + (company?.deliveryFees?.[selectedLocation] || 0);
                                }, 0)).toLocaleString()} FCFA
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-4 pt-4">
                          <button
                            type="submit"
                            disabled={submitting}
                            className={cn(
                              "w-full py-6 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl disabled:opacity-50 flex items-center justify-center gap-4 transition-all active:scale-95 group",
                              selectedPaymentMethod === 'CASH' 
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30" 
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
                            )}
                          >
                            {submitting ? "Nexus ERP Traitement..." : (
                              <>
                                {selectedPaymentMethod === 'CASH' ? "Valider sans payer" : "Confirmer la commande"} 
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCheckoutForm(false)}
                            className="w-full py-5 bg-white text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"
                          >
                            Revenir au panier
                          </button>
                        </div>
                        
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed max-w-[240px] mx-auto">
                          En confirmant, l'entreprise recevra votre demande sur sa plateforme de gestion.
                        </p>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* Full Cart List */
                  <div className="space-y-10">
                    {Object.entries(
                      cart.reduce((acc, item) => {
                        if (!acc[item.companyId]) acc[item.companyId] = [];
                        acc[item.companyId].push(item);
                        return acc;
                      }, {} as Record<string, CartItem[]>)
                    ).map(([companyId, items]) => {
                      const company = companies.find(c => c.id === companyId);
                      const companyName = items[0]?.companyName || "Boutique";
                      
                      return (
                        <div key={companyId} className="space-y-6">
                          <div className="flex items-center justify-between border-l-4 border-blue-600 pl-3">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                Expédié par
                              </span>
                              <span className="text-xs font-black text-slate-900 uppercase italic">
                                {companyName}
                              </span>
                            </div>
                            {company?.deliveryFees && selectedLocation && (
                              <div className="text-right">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Livraison</span>
                                <span className="text-[10px] font-black text-blue-600">
                                  {company.deliveryFees[selectedLocation] 
                                    ? `+ ${company.deliveryFees[selectedLocation].toLocaleString()} FCFA` 
                                    : "Frais à définir"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-6">
                            {items.map((item) => (
                              <div key={item.id} className="flex gap-4 group">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shrink-0 shadow-sm relative">
                                  <img
                                    src={item.image}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                  {item.cartQuantity > 1 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                      {item.cartQuantity}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-xs font-black text-slate-900 truncate pr-4 italic leading-tight">
                                      {item.name}
                                    </h4>
                                    <span className="text-xs font-black text-slate-900 whitespace-nowrap">
                                      {(
                                        item.price * item.cartQuantity
                                      ).toLocaleString()}{" "}
                                      FCFA
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-3">
                                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 px-3 border border-slate-100">
                                      <button
                                        onClick={() =>
                                          updateQuantity(item.id, -1)
                                        }
                                        className="p-1 hover:text-red-600 transition-colors"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="text-xs font-black min-w-[20px] text-center">
                                        {item.cartQuantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          updateQuantity(item.id, 1)
                                        }
                                        className="p-1 hover:text-blue-600 transition-colors"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedProduct(item);
                                        setShowCart(false);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest underline decoration-2 underline-offset-4"
                                    >
                                      Fiche
                                    </button>
                                    <div className="h-4 w-px bg-slate-200" />
                                    <button
                                      onClick={() => removeFromCart(item.id)}
                                      className="text-[9px] font-black text-red-400 uppercase tracking-widest"
                                    >
                                      Enlever
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {cart.length > 0 && !showCheckoutForm && (
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-6">
                  {/* WhatsApp Sync Suggestion for Guests */}
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl border border-emerald-100 flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50 group-hover:scale-110 transition-transform">
                      <MessageCircle size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-tight">Sécuriser mon Panier</p>
                      <p className="text-[9px] font-medium text-slate-500 mt-1 italic leading-snug">Liez votre activité à votre WhatsApp pour ne jamais perdre vos articles.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const message = "Bonjour Nexus, je souhaite lier mon panier Marketplace à mon compte WhatsApp. [SESSION_GUEST]";
                        window.open(`https://wa.me/237690000000?text=${encodeURIComponent(message)}`, "_blank");
                      }}
                      className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      Total Estimate
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-slate-900 tracking-tighter">
                        {cartTotal.toLocaleString()} FCFA
                      </span>
                      {nairaEnabled && (
                        <span className="text-[10px] font-black text-amber-600 italic">
                          ₦ {(cartTotal * GLOBAL_NAIRA_RATE).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCheckoutForm(true)}
                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Acheter maintenant <ArrowRight size={18} />
                  </button>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                    Sans compte, par WhatsApp. Simple, rapide, Maroua.
                  </p>
                </div>
              )}

              {/* FORM REMOVED FROM HERE - MOVED INSIDE SCROLLABLE AREA */}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Details Side-drawer */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[80]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-[90] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                    >
                      <X size={20} />
                    </button>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Détails de l'article</h2>
                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Nexus Engineering Hub</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <button 
                     onClick={() => toggleFavorite(selectedProduct.companyId)}
                     className={cn(
                       "p-3 rounded-2xl border transition-all",
                       favorites.includes(selectedProduct.companyId) ? "bg-red-50 border-red-100 text-red-500" : "bg-slate-50 border-slate-100 text-slate-400"
                     )}
                   >
                     <Heart size={20} fill={favorites.includes(selectedProduct.companyId) ? "currentColor" : "none"} />
                   </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="p-8 space-y-12 pb-24">
                  {/* Hero section with image and key info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="aspect-square rounded-[3rem] overflow-hidden border border-slate-100 shadow-inner group">
                        <img 
                          src={selectedProduct.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          referrerPolicy="no-referrer"
                        />
                     </div>
                     <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                             <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase rounded-full tracking-widest shadow-lg shadow-blue-200 italic">
                               {selectedProduct.category}
                             </span>
                             <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", getStockStatus(selectedProduct.stock).color)}>
                               {getStockStatus(selectedProduct.stock).label}
                             </div>
                          </div>
                          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight leading-none">
                            {selectedProduct.name}
                          </h1>
                        </div>

                        <div className="p-6 bg-slate-950 rounded-[2rem] text-white space-y-4 shadow-xl">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center italic underline underline-offset-8 decoration-blue-500">Dual Pricing Agreement</p>
                           <div className="grid grid-cols-2 divide-x divide-white/10 items-center">
                              <div className="text-center group">
                                 <p className="text-[8px] font-bold text-slate-500 uppercase mb-2">Devise Locale</p>
                                 <p className="text-2xl font-black tracking-tighter tabular-nums group-hover:text-blue-400 transition-colors">{selectedProduct.price.toLocaleString()}</p>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FCFA</p>
                              </div>
                              <div className="text-center group">
                                 <p className="text-[8px] font-bold text-slate-500 uppercase mb-2 group-hover:text-amber-500 transition-colors">Naira Market</p>
                                 <p className="text-2xl font-black tracking-tighter tabular-nums text-amber-500">
                                   ₦ {((selectedProduct.price * (companies.find(c => c.id === selectedProduct.companyId)?.nairaRate || GLOBAL_NAIRA_RATE)) / 1000).toFixed(1)}k
                                 </p>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Nigeria</p>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <button 
                             onClick={() => addToCart(selectedProduct)}
                             disabled={selectedProduct.stock <= 0}
                             className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3"
                           >
                             <ShoppingCart size={18} /> Ajouter
                           </button>
                           <button 
                             onClick={() => checkoutWhatsApp(selectedProduct)}
                             className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                           >
                             <MessageCircle size={18} /> WhatsApp
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Company and Detailed Description */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-slate-100 pt-12">
                     <div className="md:col-span-4 space-y-6">
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 flex flex-col items-center text-center space-y-4">
                           <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 flex items-center justify-center overflow-hidden p-3">
                              {companies.find(c => c.id === selectedProduct.companyId)?.logo ? (
                                <img src={companies.find(c => c.id === selectedProduct.companyId)?.logo} className="max-w-full max-h-full object-contain" />
                              ) : (
                                <Store className="text-slate-300" size={32} />
                              )}
                           </div>
                           <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{companies.find(c => c.id === selectedProduct.companyId)?.name}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{companies.find(c => c.id === selectedProduct.companyId)?.category || 'Partenaire Nexus'}</p>
                           </div>
                           <button 
                             onClick={() => {
                               setActiveCompanyId(selectedProduct.companyId);
                               setSelectedProduct(null);
                             }}
                             className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all"
                           >
                             Voir la boutique
                           </button>
                        </div>

                        <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                              <Truck size={24} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Zones desservies</p>
                              <p className="text-[11px] font-bold text-slate-600 mt-0.5">Livraison sur tout Maroua et environs</p>
                           </div>
                        </div>
                     </div>

                     <div className="md:col-span-8 space-y-8">
                        <div className="space-y-4">
                           <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight pb-3 border-b-2 border-slate-100 inline-block">Description Technique</h3>
                           <p className="text-slate-600 font-medium leading-relaxed">
                             {selectedProduct.description}
                           </p>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Avantages Nexus</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                { icon: <Sparkles size={16} />, text: 'Garanti Authentique' },
                                { icon: <Smartphone size={16} />, text: 'Payer via MoMo/Orange' },
                                { icon: <ArrowRight size={16} />, text: 'Livraison Rapide (<2h)' },
                                { icon: <Award size={16} />, text: 'Points de Fidélité' }
                              ].map((adv, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
                                   <div className="text-blue-600">{adv.icon}</div>
                                   <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{adv.text}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Cart for Mobile */}
      {cart.length > 0 && !showCart && (
        <motion.button
          initial={{ scale: 0, y: 100 }}
          animate={{ scale: 1, y: 0 }}
          onClick={() => setShowCart(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-50 active:scale-90"
        >
          <ShoppingBag size={28} />
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            {cart.reduce((a, b) => a + b.cartQuantity, 0)}
          </span>
        </motion.button>
      )}

      {/* Transport Calculator Modal */}
      <AnimatePresence>
        {showTransportCalc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTransportCalc(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-2xl z-[110]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">
                  Estimer Livraison
                </h3>
                <button
                  onClick={() => setShowTransportCalc(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Moto-Taxi (Petit colis)
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900">
                      Centre-ville & Proximité
                    </span>
                    <span className="text-xs font-black text-blue-600">
                      500 FCFA
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900">
                      Zones éloignées (Dewe, Harde)
                    </span>
                    <span className="text-xs font-black text-blue-600">
                      1,000 FCFA
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Tricycle (Matériaux/Lourd)
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900">
                      Forfait Standard Maroua
                    </span>
                    <span className="text-xs font-black text-blue-600">
                      2,500 FCFA
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTransportCalc(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mt-6"
              >
                Compris
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
     {/* Catalogue View Modal */}
     <AnimatePresence>
        {showCatalogue && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowCatalogue(false)}
               className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[120]"
            />
            <motion.div 
               initial={{ y: "100%", opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: "100%", opacity: 0 }}
               className="fixed inset-x-0 bottom-0 top-10 md:top-20 bg-white rounded-t-[3rem] shadow-2xl z-[130] flex flex-col"
            >
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[3rem] sticky top-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase italic">Catalogue Complet</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maroua Nexus Connect • {filteredProducts.length} articles</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Imprimer / PDF
                    </button>
                    <button onClick={() => setShowCatalogue(false)} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all"><X size={20} /></button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-12">
                  {companies.map(company => {
                    const companyProducts = filteredProducts.filter(p => p.companyId === company.id);
                    if (companyProducts.length === 0) return null;
                    return (
                      <div key={company.id} className="space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shadow-inner flex items-center justify-center font-black text-slate-300">
                            {company.logo ? <img src={company.logo} className="w-full h-full object-cover" alt="" /> : company.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase">{company.name}</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                               <MessageCircle size={10} /> {company.whatsappNumber}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {companyProducts.map(p => (
                             <div key={p.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                               <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                                  <img src={p.image} className="w-full h-full object-cover" alt="" />
                               </div>
                               <div className="flex-1 flex flex-col justify-between">
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 uppercase italic leading-tight">{p.name}</h4>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">{p.category}</p>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                     <span className="text-xs font-black text-slate-900">{p.price.toLocaleString()} FCFA</span>
                                     <span className={cn("text-[7px] font-black uppercase px-2 py-0.5 rounded-full", getStockStatus(p.stock).color)}>{getStockStatus(p.stock).label}</span>
                                  </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    );
                  })}
               </div>
            </motion.div>
          </>
        )}
     </AnimatePresence>
     {/* Tracking View Modal */}
     <AnimatePresence>
        {showTracking && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowTracking(false)}
               className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[120]"
            />
            <motion.div 
               initial={{ x: "100%" }}
               animate={{ x: 0 }}
               exit={{ x: "100%" }}
               className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[140] flex flex-col"
            >
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase italic">Suivi Commandes</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vos derniers achats sur Nexus</p>
                  </div>
                  <button onClick={() => setShowTracking(false)} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all"><X size={20} /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                  {/* Notification Settings Section */}
                  <div className="bg-blue-600 rounded-[2rem] p-6 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Sparkles size={60} />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest italic">Configurations Notifications</h3>
                        <p className="text-[9px] font-bold opacity-80 uppercase mt-1">Recevez des mises à jour en temps réel</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setNotifSettings(prev => ({ ...prev, push: !prev.push }))}
                          className={cn(
                            "p-3 rounded-xl border flex flex-col gap-2 transition-all text-left",
                            notifSettings.push ? "bg-white/20 border-white/40 shadow-inner" : "bg-white/5 border-white/10 opacity-60"
                          )}
                        >
                          <Smartphone size={14} />
                          <span className="text-[10px] font-black uppercase">Push App</span>
                        </button>
                        <button 
                          onClick={() => setNotifSettings(prev => ({ ...prev, whatsapp: !prev.whatsapp }))}
                          className={cn(
                            "p-3 rounded-xl border flex flex-col gap-2 transition-all text-left",
                            notifSettings.whatsapp ? "bg-white/20 border-white/40 shadow-inner" : "bg-white/5 border-white/10 opacity-60"
                          )}
                        >
                          <MessageCircle size={14} />
                          <span className="text-[10px] font-black uppercase">WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* General Support Button */}
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                        <MessageCircle size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-600">Support Nexus 24/7</p>
                        <p className="text-[8px] font-bold text-emerald-400 uppercase">Contact Direct Maroua</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const message = "Bonjour, j'ai besoin d'une assistance sur Nexus Marketplace.";
                        window.open(`https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
                      }}
                      className="px-4 py-2 bg-white text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                    >
                      Discuter
                    </button>
                  </div>

                  {guestOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40 py-20 text-center">
                      <ShoppingBag size={48} />
                      <p className="text-sm font-black uppercase tracking-widest">Aucune commande trouvée</p>
                      <p className="text-[10px] font-medium text-slate-500 max-w-[200px]">Passez une commande pour commencer le suivi en temps réel.</p>
                    </div>
                  ) : (
                    (Object.entries(
                      guestOrders.reduce((acc, order) => {
                        const gid = order.globalOrderId || `solo-${order.id}`;
                        if (!acc[gid]) acc[gid] = [];
                        acc[gid].push(order);
                        return acc;
                      }, {} as Record<string, any[]>)
                    ) as [string, any[]][]).map(([gid, subOrders]) => {
                      const isMultiVendor = subOrders.length > 1;
                      const firstSub = subOrders[0];
                      const globalTotal = subOrders.reduce((sum, o) => sum + o.total, 0);
                      
                      return (
                        <div key={gid} className={cn(
                          "rounded-[2rem] p-6 border space-y-6 transition-all",
                          isMultiVendor ? "bg-slate-900 text-white border-slate-800 shadow-2xl" : "bg-slate-50 text-slate-900 border-slate-100"
                        )}>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={cn("text-[8px] font-black uppercase tracking-widest", isMultiVendor ? "text-slate-500" : "text-slate-400")}>
                                {isMultiVendor ? "COMMANDE MULTI-BOUTIQUES" : "N° COMMANDE"}
                              </span>
                              <h3 className="text-sm font-black uppercase">
                                {isMultiVendor ? `GRP-${gid.slice(0, 8)}` : `CMD-${firstSub.id.slice(0, 8)}`}
                              </h3>
                            </div>
                            {isMultiVendor ? (
                              <div className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                {subOrders.length} Expéditions
                              </div>
                            ) : (
                              <div className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                firstSub.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                firstSub.status === 'PROCESSING' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                firstSub.status === 'SHIPPED' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                firstSub.status === 'CANCELLED_BY_CUSTOMER' ? "bg-red-50 text-red-600 border-red-100" :
                                "bg-emerald-50 text-emerald-600 border-emerald-100"
                              )}>
                                {firstSub.status === 'PENDING' ? 'Attente' : 
                                 firstSub.status === 'PROCESSING' ? 'En cours' :
                                 firstSub.status === 'SHIPPED' ? 'Expédiée' : 
                                 firstSub.status === 'CANCELLED_BY_CUSTOMER' ? 'Annulée' : 'Livrée'}
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            {subOrders.map(order => (
                              <div key={order.id} className={cn(
                                "p-4 rounded-2xl relative",
                                isMultiVendor ? "bg-white/5 border border-white/10" : "bg-white border border-slate-100"
                              )}>
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[8px] font-black">
                                       {companies.find(c => c.id === order.companyId)?.name.charAt(0) || "B"}
                                    </div>
                                    <span className="text-[10px] font-black uppercase truncate max-w-[120px]">
                                      {companies.find(c => c.id === order.companyId)?.name || "Boutique"}
                                    </span>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                                    order.status === 'CANCELLED_BY_CUSTOMER' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                                  )}>
                                    {order.status}
                                  </span>
                                </div>
                                
                                {order.status !== 'CANCELLED_BY_CUSTOMER' && (
                                  <div className="relative h-1 bg-slate-200/20 rounded-full overflow-hidden mb-3">
                                    <div 
                                      className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-1000"
                                      style={{ 
                                        width: order.status === 'PENDING' ? '5%' : 
                                               order.status === 'PROCESSING' ? '38%' : 
                                               order.status === 'SHIPPED' ? '72%' : '100%' 
                                      }}
                                    />
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center text-[9px] font-bold">
                                  <span className={isMultiVendor ? "text-slate-400" : "text-slate-500"}>
                                    {order.items?.length || 0} articles • {order.total.toLocaleString()} FCFA
                                  </span>
                                  <button 
                                    onClick={() => {
                                      const message = `Bonjour, je souhaite des infos sur ma commande ${order.id.slice(0,8)} chez ${companies.find(c => c.id === order.companyId)?.name}`;
                                      window.open(`https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
                                    }}
                                    className="text-blue-400 hover:underline"
                                  >
                                    Assistance
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className={cn(
                            "pt-4 border-t flex justify-between items-center",
                            isMultiVendor ? "border-white/10" : "border-slate-100"
                          )}>
                            <div>
                               <span className={cn("text-[9px] font-black uppercase block tracking-widest leading-none mb-1", isMultiVendor ? "text-slate-500" : "text-slate-400")}>Total Global</span>
                               <span className={cn("text-lg font-black", isMultiVendor ? "text-emerald-400" : "text-blue-600")}>{globalTotal.toLocaleString()} FCFA</span>
                            </div>
                            {!isMultiVendor && firstSub.status === 'PENDING' && (
                              <button 
                                onClick={() => setCancellingOrderId(firstSub.id)}
                                className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-100"
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
               </div>
            </motion.div>
          </>
        )}
     </AnimatePresence>

      {/* Floating Tracking Shortcut */}
      {activeOrderCount > 0 && !showTracking && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[45] w-[92%] max-w-md"
        >
          <button
            onClick={() => setShowTracking(true)}
            className="w-full bg-slate-900 border border-slate-700/50 backdrop-blur-xl p-4 rounded-[2rem] flex items-center justify-between shadow-2xl shadow-blue-900/30 group overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-400 to-blue-600 animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white relative shadow-inner">
                 <Truck size={22} className="group-hover:translate-x-1 transition-transform" />
                 <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white uppercase tracking-tighter">Mes Commandes Maroua</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                  {activeOrderCount} {activeOrderCount > 1 ? "articles en mouvement" : "colis en cours de livraison"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pr-2">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest hidden sm:inline">Détails</span>
              <div className="p-2 bg-white/10 rounded-xl group-hover:bg-blue-600 transition-colors">
                <ChevronRight size={16} className="text-white" />
              </div>
            </div>
          </button>
        </motion.div>
      )}

      {/* Cancellation Reason Modal */}
      <AnimatePresence>
        {cancellingOrderId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancellingOrderId(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white z-[160] rounded-[2.5rem] shadow-2xl p-8 border border-slate-100"
            >
              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
                  <X size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Annuler la commande ?</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dites-nous pourquoi pour nous améliorer</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  "Erreur de produit",
                  "Trop cher / Frais de livraison",
                  "Changement d'avis",
                  "Délais trop longs",
                  "Autre raison"
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      setCancelReason(reason);
                      cancelOrder(cancellingOrderId, reason);
                    }}
                    className="w-full p-4 rounded-2xl border-2 border-slate-50 hover:border-red-100 hover:bg-red-50 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all"
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCancellingOrderId(null)}
                className="w-full mt-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all"
              >
                Garder la commande
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

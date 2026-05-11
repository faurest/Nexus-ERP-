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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
    const saved = localStorage.getItem("nexus_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    const saved = localStorage.getItem("nexus_recent");
    return saved ? JSON.parse(saved) : [];
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("nexus_favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [showTransportCalc, setShowTransportCalc] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [guestOrders, setGuestOrders] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nairaEnabled, setNairaEnabled] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    name: "",
    phone: "",
    quartier: "",
  });
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
  const [activeOrderCount, setActiveOrderCount] = useState(0);

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
      });
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany =
        activeCompanyId === "all" || p.companyId === activeCompanyId;
      return matchesSearch && matchesCompany;
    });
  }, [products, searchTerm, activeCompanyId]);

  const addToCart = (product: Product) => {
    addToRecentlyViewed(product);
    const company = companies.find((c) => c.id === product.companyId);
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
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

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.cartQuantity,
    0,
  );

  // Default Naira rate for Maroua context if not set per company
  const GLOBAL_NAIRA_RATE = 1.2;

  const getStockStatus = (stock: number) => {
    if (stock <= 0)
      return {
        label: "Sur commande",
        color: "bg-amber-50 text-amber-600 border-amber-100",
      };
    if (stock <= 5)
      return {
        label: "Stock Limité",
        color: "bg-red-50 text-red-600 border-red-100",
      };
    return {
      label: "Disponible",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    };
  };

  const checkoutWhatsApp = (product?: Product) => {
    const targetProduct = product || cart[0];
    const company = companies.find((c) => c.id === targetProduct?.companyId);
    const phone = company?.whatsappNumber || "237690000000";

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

    try {
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
            date: serverTimestamp(),
            checkoutSource: "MARKETPLACE",
            customerName: checkoutData.name,
            customerPhone: checkoutData.phone,
            customerQuartier: checkoutData.quartier,
            customerEmail: "Marketplace Guest",
          });

          // Save to guest orders for tracking
          const existingGuestOrders = JSON.parse(localStorage.getItem('nexus_guest_orders') || '[]');
          const newIds = [...existingGuestOrders, orderRef.id];
          localStorage.setItem('nexus_guest_orders', JSON.stringify(newIds));
          setOrderIds(newIds);

          // Notify company owner and any ecommerce manager if possible
          if (company?.ownerId) {
            await createNotification(
              companyId,
              [company.ownerId],
              "URGENT: Nouvelle Commande Marketplace !",
              `${checkoutData.name} a passé une commande de ${(companyTotal + deliveryFee).toLocaleString()} FCFA. Veuillez traiter via le module E-commerce.`,
              "alert"
            );
          }
        },
      );

      await Promise.all(orderPromises);

      setCart([]);
      setShowCheckoutForm(false);
      setShowCart(false);
      alert("Votre commande a été envoyée avec succès à l'entreprise !");
    } catch (err) {
      console.error("Order save failed:", err);
      alert("Une erreur est survenue lors de l'enregistrement de votre commande.");
    } finally {
      setSubmitting(false);
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
      {/* Search & Navigation Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center gap-4 px-6 py-4">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-4">
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="hidden md:flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all font-black text-[9px] uppercase tracking-widest hover:border-slate-300"
            >
              <ArrowLeft size={18} />
              Retour
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
              <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <MessageCircle size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
          {[
            "Tous",
            "Matériaux",
            "Alimentation",
            "Informatique",
            "Services",
            "Pièces Auto",
          ].map((cat, idx) => {
            const isActive =
              (cat === "Tous" && searchTerm === "") ||
              searchTerm.toLowerCase() === cat.toLowerCase();
            return (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={cat}
                onClick={() => setSearchTerm(cat === "Tous" ? "" : cat)}
                className={cn(
                  "px-6 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border shrink-0",
                  isActive
                    ? "bg-white border-blue-600 text-blue-600 shadow-xl shadow-blue-50"
                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-200",
                )}
              >
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
              Les meilleurs prix de l'Extrême-Nord
            </p>
          </div>
          <Filter className="text-slate-300" size={18} />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 flex flex-col"
              >
                <div
                  className="aspect-square overflow-hidden relative cursor-pointer group/img"
                  onClick={() => {
                    addToRecentlyViewed(product);
                    setSelectedProduct(product);
                  }}
                >
                  <img
                    src={
                      product.image ||
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60"
                    }
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] brightness-95 group-hover:brightness-100"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="absolute top-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg text-blue-600 shadow-xl flex items-center gap-2">
                      <Info size={14} className="font-black" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        Détails
                      </span>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-150">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm border border-slate-100">
                      {companies.find((c) => c.id === product.companyId)
                        ?.name || "Nexus"}
                    </span>
                    <div
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-[0.2em] border shadow-sm backdrop-blur-md",
                        getStockStatus(product.stock).color.replace(
                          "bg-",
                          "bg-white/80 ",
                        ),
                      )}
                    >
                      {getStockStatus(product.stock).label}
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors italic line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {product.category}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 leading-none tracking-tight">
                          {nairaEnabled
                            ? `₦ ${((product.price * GLOBAL_NAIRA_RATE) / 1000).toFixed(1)}k`
                            : `${product.price.toLocaleString()}`}
                        </span>
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {nairaEnabled ? "Naira (Est)" : "FCFA"}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border",
                          getStockStatus(product.stock).color,
                        )}
                      >
                        {getStockStatus(product.stock).label}
                      </div>
                    </div>

                    <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          checkoutWhatsApp(product);
                        }}
                        className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100 active:scale-90"
                        title="Négocier sur WhatsApp"
                      >
                        <MessageCircle size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="flex-1 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200 group-hover:shadow-blue-600/20 px-4"
                      >
                        <Plus size={18} className="mr-2" />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                          Panier
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
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
        )}
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
                  <div className="space-y-10">
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
                            className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center gap-4 transition-all active:scale-95 group"
                          >
                            {submitting ? "Nexus ERP Traitement..." : (
                              <>
                                Confirmer la commande <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
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
                    {Array.from(new Set(cart.map((item) => item.companyId))).map(
                      (companyId) => {
                        const companyName =
                          cart.find((i) => i.companyId === companyId)
                            ?.companyName || "Boutique";
                        const items = cart.filter(
                          (i) => i.companyId === companyId,
                        );
                        return (
                          <div key={companyId} className="space-y-4">
                            <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Boutique:
                              </span>
                              <span className="text-[10px] font-black text-slate-900 uppercase italic">
                                {companyName}
                              </span>
                            </div>
                            <div className="space-y-6">
                              {items.map((item) => (
                                <div key={item.id} className="flex gap-4 group">
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shrink-0 shadow-sm">
                                    <img
                                      src={item.image}
                                      className="w-full h-full object-cover"
                                      alt=""
                                    />
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
                                        Détails
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      },
                    )}
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

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl bg-white z-[90] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              <div className="md:w-1/2 bg-slate-100 relative">
                <img
                  src={
                    selectedProduct.image ||
                    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60"
                  }
                  className="w-full h-full object-cover shadow-2xl"
                  alt=""
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-6 left-6 p-3 bg-white/80 backdrop-blur-md rounded-2xl text-slate-900 shadow-xl md:hidden"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 p-10 md:p-14 flex flex-col justify-between bg-white relative">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-8 right-8 p-3 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-blue-600 transition-all hidden md:block"
                >
                  <X size={24} />
                </button>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg">
                        {selectedProduct.category}
                      </span>
                      <div
                        className={cn(
                          "flex items-center gap-1 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                          getStockStatus(selectedProduct.stock).color,
                        )}
                      >
                        {getStockStatus(selectedProduct.stock).label}
                      </div>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight italic leading-tight">
                      {selectedProduct.name}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Description
                    </h4>
                    <p className="text-base font-medium text-slate-500 leading-relaxed italic line-clamp-4">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Boutique
                      </p>
                      <p className="text-xs font-black text-slate-900 uppercase truncate">
                        {
                          companies.find(
                            (c) => c.id === selectedProduct.companyId,
                          )?.name
                        }
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Emplacement
                      </p>
                      <p className="text-xs font-black text-slate-900 uppercase">
                        {selectedProduct.location || "Dewe / Hardé"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col gap-6">
                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Prix Marketplace
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                          {nairaEnabled
                            ? (
                                selectedProduct.price * GLOBAL_NAIRA_RATE
                              ).toLocaleString()
                            : selectedProduct.price.toLocaleString()}
                        </span>
                        <span className="text-xl font-black text-slate-400 uppercase">
                          {nairaEnabled ? "₦" : "FCFA"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                        setShowCart(true);
                      }}
                      className="flex-1 py-6 bg-slate-900 text-white hover:bg-blue-600 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95"
                    >
                      <ShoppingCart size={20} /> Ajouter
                    </button>
                    <button
                      onClick={() => checkoutWhatsApp(selectedProduct)}
                      className="flex-1 py-6 bg-emerald-500 text-white hover:bg-emerald-600 text-[11px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
                    >
                      <MessageCircle size={20} /> WhatsApp
                    </button>
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
                  {guestOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40 py-20 text-center">
                      <ShoppingBag size={48} />
                      <p className="text-sm font-black uppercase tracking-widest">Aucune commande trouvée</p>
                      <p className="text-[10px] font-medium text-slate-500 max-w-[200px]">Passez une commande pour commencer le suivi en temps réel.</p>
                    </div>
                  ) : (
                    guestOrders.map((order) => (
                      <div key={order.id} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">N° COMMANDE</span>
                            <h3 className="text-sm font-black text-slate-900 uppercase">CMD-{order.id.slice(0, 8)}</h3>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5",
                            order.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            order.status === 'PROCESSING' ? "bg-blue-50 text-blue-600 border-blue-100 animate-pulse" :
                            order.status === 'SHIPPED' ? "bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse" :
                            "bg-emerald-50 text-emerald-600 border-emerald-100"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", 
                              order.status === 'PENDING' ? "bg-amber-400" :
                              order.status === 'PROCESSING' ? "bg-blue-400" :
                              order.status === 'SHIPPED' ? "bg-indigo-400" : "bg-emerald-400"
                            )} />
                            {order.status === 'PENDING' ? 'En Attente' : 
                             order.status === 'PROCESSING' ? 'En Traitement' :
                             order.status === 'SHIPPED' ? 'En Livraison' : 'Colis Arrivé'}
                          </div>
                        </div>

                        {/* Order Timeline Visual */}
                        <div className="relative pt-2 px-1">
                           <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 rounded-full" />
                           <div 
                             className="absolute top-6 left-0 h-1 bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
                             style={{ 
                               width: order.status === 'PENDING' ? '5%' : 
                                      order.status === 'PROCESSING' ? '38%' : 
                                      order.status === 'SHIPPED' ? '72%' : '100%' 
                             }}
                           />
                           <div className="flex justify-between relative">
                              {[
                                { id: 'PENDING', icon: <Clock size={12} /> },
                                { id: 'PROCESSING', icon: <Package size={12} /> },
                                { id: 'SHIPPED', icon: <Truck size={12} /> },
                                { id: 'DELIVERED', icon: <CheckCircle2 size={12} /> }
                              ].map((step, idx) => {
                                const statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
                                const currentIdx = statuses.indexOf(order.status);
                                const isPast = idx <= currentIdx;
                                
                                return (
                                  <div key={step.id} className="flex flex-col items-center">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 z-10 border-4 border-white shadow-sm",
                                      isPast ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400",
                                      order.status === step.id && step.id !== 'DELIVERED' && "ring-4 ring-blue-50 scale-110"
                                    )}>
                                      {step.icon}
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>

                        {/* High Visibility Status Messages */}
                        {['PROCESSING', 'SHIPPED'].includes(order.status) && (
                          <div className={cn(
                            "p-4 rounded-2xl flex items-center gap-4 border",
                            order.status === 'PROCESSING' ? "bg-blue-50/50 border-blue-100" : "bg-indigo-50/50 border-indigo-100"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              order.status === 'PROCESSING' ? "bg-blue-600 text-white" : "bg-indigo-600 text-white"
                            )}>
                              {order.status === 'PROCESSING' ? <Package size={20} /> : <Truck size={20} />}
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 leading-tight">
                                {order.status === 'PROCESSING' ? "Votre commande a été prise en charge." : "Votre colis est en route !"}
                              </p>
                              <p className="text-[9px] font-semibold text-slate-500 mt-0.5 leading-snug italic">
                                {order.status === 'PROCESSING' ? "L'entreprise prépare actuellement vos articles." : "Le livreur est en mouvement vers Maroua."}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-center text-[10px] font-black">
                            <span className="text-slate-400 uppercase tracking-widest">Date</span>
                            <span className="text-slate-900">{order.date?.toDate()?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) || 'Récent'}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black">
                            <span className="text-slate-400 uppercase tracking-widest">Boutique</span>
                            <span className="text-slate-900 uppercase italic">{companies.find(c => c.id === order.companyId)?.name || 'Nexus Shop'}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black border-t border-slate-100 pt-3">
                            <span className="text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-sm font-black text-blue-600">{order.total.toLocaleString()} FCFA</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            const company = companies.find(c => c.id === order.companyId);
                            if (company?.whatsappNumber) {
                               const message = `Bonjour, je souhaite discuter avec l'équipe de gestion de ma commande CMD-${order.id.slice(0, 8).toUpperCase()} sur Nexus Marketplace. Merci !`;
                               window.open(`https://wa.me/${company.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
                            }
                          }}
                          className="w-full py-5 bg-white border-2 border-slate-100 rounded-3xl text-[10px] font-black text-slate-900 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center gap-3 group/btn"
                        >
                          <MessageCircle size={16} className="group-hover/btn:scale-110 transition-transform text-blue-600 group-hover/btn:text-white" /> 
                          Aide de l'entreprise
                        </button>
                      </div>
                    ))
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
    </div>
  );
}

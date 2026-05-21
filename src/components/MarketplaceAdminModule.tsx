import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, updateDoc, doc, getDocs, where, orderBy } from '../lib/firebase';
import { Shield, Lock, PowerOff, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function MarketplaceAdminModule() {
  const { isGlobalAdmin } = useAuthStore();
  const [vendors, setVendors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!isGlobalAdmin) return;
    
    // Fetch companies (Vendors)
    const unsubVendors = onSnapshot(collection(db, 'companies'), (snap) => {
      setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch orders (marketplace)
    const unsubOrders = onSnapshot(query(collection(db, 'ecommerce_orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // Fetch products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubVendors();
      unsubOrders();
      unsubProducts();
    };
  }, [isGlobalAdmin]);

  if (!isGlobalAdmin) return <div className="p-8 text-center text-red-500">Accès Refusé. Privilèges Super Admin requis.</div>;

  const suspendVendor = async (companyId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        isMarketplaceSuspended: !currentStatus
      });
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la suspension');
    }
  };

  const removeProduct = async (productId: string) => {
    if (!confirm("Voulez-vous retirer ce produit du marketplace public ?")) return;
    try {
      await updateDoc(doc(db, 'products', productId), {
        is_marketplace_visible: false
      });
    } catch(e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tight">Super Admin Marketplace</h1>
            <p className="text-slate-400">Centre de contrôle et de modération globale.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs">Total Vendeurs</h3>
          <p className="text-4xl font-black mt-2">{vendors.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs">Produits Actifs</h3>
          <p className="text-4xl font-black mt-2">{products.filter(p => p.is_marketplace_visible !== false).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs">Commandes Globales</h3>
          <p className="text-4xl font-black mt-2">{orders.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
          <Lock size={20} /> Modération Vendeurs
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b uppercase text-[10px] tracking-widest text-slate-400">
                <th className="pb-4 pt-2">ID & Nom</th>
                <th className="pb-4 pt-2">Produits</th>
                <th className="pb-4 pt-2">Chiffre d'Affaires</th>
                <th className="pb-4 pt-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => (
                <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-4">
                    <div className="font-bold">{v.name}</div>
                    <div className="text-[10px] text-slate-400">{v.id}</div>
                  </td>
                  <td className="py-4">
                    {products.filter(p => p.companyId === v.id).length}
                  </td>
                  <td className="py-4 font-mono font-bold text-blue-600">
                    {(v.totalProfit || 0).toLocaleString()} FCFA
                  </td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => suspendVendor(v.id, v.isMarketplaceSuspended)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${v.isMarketplaceSuspended ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}
                    >
                      {v.isMarketplaceSuspended ? 'Réactiver' : 'Suspendre'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-lg font-black uppercase mb-6 flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} /> Litiges & Modération Produits
        </h2>
        <div className="space-y-4">
           {products.slice(0, 50).map(p => (
             <div key={p.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border rounded-2xl gap-4">
                <div className="flex items-center gap-4">
                   <img src={p.image} className="w-12 h-12 rounded-xl object-cover" />
                   <div>
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{vendors.find(v => v.id === p.companyId)?.name || 'Inconnu'}</p>
                   </div>
                </div>
                <button 
                  onClick={() => removeProduct(p.id)}
                  disabled={p.is_marketplace_visible === false}
                  className="px-4 py-2 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-[10px] font-black uppercase disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <PowerOff size={14} /> 
                  {p.is_marketplace_visible === false ? 'Masqué' : 'Bannir'}
                </button>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

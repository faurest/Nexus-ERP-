import { getSupabase } from '../lib/supabase';
import { db, doc, collection } from '../lib/firebase';
import { runTransaction, serverTimestamp } from 'firebase/firestore';

export interface CheckoutPayload {
  cart: any[];
  companies: any[];
  checkoutData: any;
  selectedLocation: string;
  selectedPaymentMethod: string;
  paymentOperator: string;
}

export const marketplaceApi = {
  async getProducts() {
    const sb = getSupabase();
    if (!sb) return [];
    
    // Abstracting product fetch
    const { data } = await sb.from('products').select('*');
    return data || [];
  },

  async processMarketplaceCheckout(payload: CheckoutPayload) {
    const { cart, companies, checkoutData, selectedLocation, selectedPaymentMethod, paymentOperator } = payload;
    
    try {
      const result = await runTransaction(db, async (transaction) => {
        // 1. Read all product docs to ensure stock is valid (Reads must happen first)
        const productRefs = cart.map(item => doc(db, 'products', item.id));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
        
        for (let i = 0; i < productDocs.length; i++) {
          const productDoc = productDocs[i];
          const item = cart[i];
          if (!productDoc.exists()) {
            throw new Error(`Le produit ${item.name} n'existe plus.`);
          }
          const currentStock = productDoc.data().stock || 0;
          if (currentStock < item.cartQuantity) {
            throw new Error(`En rupture: ${item.name} a seulement ${currentStock} en stock.`);
          }
        }

        // --- Writes happen below ---
        
        // Calculate totals
        const cartTotal = cart.reduce((acc, item) => acc + item.price * item.cartQuantity, 0);
        const uniqueCompanyIds = Array.from(new Set(cart.map(i => i.companyId)));
        const totalDeliveryFees = uniqueCompanyIds.reduce((acc, cid) => {
          const company = companies.find(c => c.id === cid);
          return acc + (company?.deliveryFees?.[selectedLocation] || 0);
        }, 0);
        const grandTotal = cartTotal + totalDeliveryFees;

        // 2. Create Global Order Ref
        const globalOrderRef = doc(collection(db, "global_orders"));
        
        // Group items by companyId
        const ordersByCompany: Record<string, any[]> = {};
        cart.forEach((item) => {
          if (!ordersByCompany[item.companyId]) { ordersByCompany[item.companyId] = []; }
          ordersByCompany[item.companyId].push(item);
        });

        const subOrderIds: string[] = [];
        const companyOrderIds: { companyId: string, orderId: string }[] = [];

        // 3. Create Vendor Orders
        for (const [companyId, items] of Object.entries(ordersByCompany)) {
          const company = companies.find((c) => c.id === companyId);
          const companyTotal = items.reduce((acc, item) => acc + item.price * item.cartQuantity, 0);
          const deliveryFee = (company?.deliveryFees && selectedLocation) ? company.deliveryFees[selectedLocation] || 0 : 0;
          
          const orderRef = doc(collection(db, "ecommerce_orders"));
          subOrderIds.push(orderRef.id);
          companyOrderIds.push({ companyId, orderId: orderRef.id });
          
          transaction.set(orderRef, {
            companyId,
            globalOrderId: globalOrderRef.id,
            items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.cartQuantity })),
            total: companyTotal + deliveryFee,
            deliveryFee,
            deliveryLocation: selectedLocation,
            status: "PENDING",
            paymentStatus: selectedPaymentMethod === 'CASH' ? "UNPAID" : "PENDING_MOMO",
            paymentMethod: selectedPaymentMethod === 'CASH' ? 'CASH' : (paymentOperator === 'MTN' ? 'MTN MoMo' : 'Orange Money'),
            operator: paymentOperator,
            date: serverTimestamp(),
            checkoutSource: "MARKETPLACE",
            customerName: checkoutData.name,
            customerPhone: checkoutData.phone,
            customerQuartier: checkoutData.quartier,
          });
        }

        // 4. Save Global Order
        transaction.set(globalOrderRef, {
          total: grandTotal,
          status: "PENDING",
          paymentMethod: selectedPaymentMethod === 'CASH' ? 'CASH' : (paymentOperator === 'MTN' ? 'MTN MoMo' : 'Orange Money'),
          paymentStatus: selectedPaymentMethod === 'CASH' ? "UNPAID" : "PENDING_MOMO",
          customerName: checkoutData.name,
          customerPhone: checkoutData.phone,
          customerQuartier: checkoutData.quartier,
          customerEmail: "Marketplace Multi-Vendor",
          createdAt: serverTimestamp(),
          subOrderIds
        });

        // 5. Decrement Stock
        for (let i = 0; i < productDocs.length; i++) {
            const productDoc = productDocs[i];
            const item = cart[i];
            transaction.update(productRefs[i], {
                stock: (productDoc.data().stock || 0) - item.cartQuantity,
                soldCount: (productDoc.data().soldCount || 0) + item.cartQuantity
            });
        }
        
        return { globalOrderId: globalOrderRef.id, subOrderIds, companyOrderIds };
      });
      return { success: true, ...result };
    } catch (e: any) {
      console.error("Atomic transaction checkout failed:", e);
      return { success: false, error: e.message };
    }
  }
};

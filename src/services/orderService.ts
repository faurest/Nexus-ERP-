import { supabase } from '../lib/supabase';
import { db_offline } from '../lib/offline-db';
import { Order, OrderItem, OrderStatus } from '../types/enterprise';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export class OrderService {
  /**
   * Professional OMS Pipeline
   */
  static async createOrder(order: Partial<Order>, items: Partial<OrderItem>[]) {
    // 1. Transactional Write to Supabase
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...order,
        qr_code: `NEXUS-ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const itemsToInsert = items.map(item => ({
      ...item,
      order_id: orderData.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // 2. Local Cache Update
    await db_offline.orders.put({ ...orderData, items: itemsToInsert } as any);

    return { order: orderData, items: itemsToInsert };
  }

  /**
   * Update order status with real-time tracking
   */
  static async updateStatus(orderId: string, status: OrderStatus, companyId: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (!error) {
      // Sync local
      await db_offline.orders.update(orderId, { status });
      
      // Auto-create shipment if "shipped"
      if (status === 'shipped') {
        await supabase.from('shipments').insert({ order_id: orderId });
      }
    }

    return { data, error };
  }

  /**
   * Professional PDF Invoice Generation
   */
  static generateInvoicePDF(order: Order, companyName: string) {
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(20);
    doc.text('FACTURE PROFÊSSIONAL', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Nexus ERP Ecosystem - ${companyName}`, 20, 40);
    doc.text(`Facture N°: ${order.id.substring(0, 8).toUpperCase()}`, 20, 45);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 50);
    
    // Client Info
    doc.text('Destinataire:', 140, 40);
    doc.text(order.buyer_email || 'Client au comptoir', 140, 45);
    doc.text(order.buyer_phone || '', 140, 50);

    // Items Table
    const tableData = (order.items || []).map(item => [
      item.product_id.substring(0, 8), // Placeholder for name
      item.quantity,
      `${item.unit_price} FCFA`,
      `${item.total_price} FCFA`
    ]);

    doc.autoTable({
      startY: 60,
      head: [['ID Produit', 'Qté', 'Prix Unitaire', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Sous-total: ${order.total_amount} FCFA`, 140, finalY);
    doc.text(`Remise: ${order.discount_amount} FCFA`, 140, finalY + 7);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL FINAL: ${order.final_amount} FCFA`, 140, finalY + 15);

    // QR Code visual marker (actual QR rendered by React)
    doc.setFontSize(8);
    doc.text('Scannez pour suivi realtime', 20, finalY + 15);
    
    doc.save(`Facture-Nexus-${order.id.substring(0, 8)}.pdf`);
  }
}

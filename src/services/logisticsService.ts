import { supabase } from '../lib/supabase';

export class LogisticsService {
  /**
   * Smart Delivery Routing
   * Optimized for motorcycle/manual delivery in Africa
   */
  static async assignCourier(orderId: string, courierDetails: { name: string, phone: string }) {
    const { data, error } = await supabase
      .from('shipments')
      .update({
        carrier_name: courierDetails.name,
        courier_phone: courierDetails.phone,
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (!error) {
      // Trigger SMS notification (Simulation)
      console.log(`[SMS Gateway] Vers le client: Votre commande ${orderId.substring(0,8)} est en route avec ${courierDetails.name}. Tél: ${courierDetails.phone}`);
    }

    return { data, error };
  }

  /**
   * Approximate Geolocation (Cell Tower / LatLng) for tracking
   */
  static async updateLocation(shipmentId: string, lat: number, lng: number) {
    return await supabase
      .from('shipments')
      .update({
        metadata: {
          last_known_location: { lat, lng, timestamp: new Date().toISOString() }
        }
      })
      .eq('id', shipmentId);
  }

  /**
   * Proof of Delivery (Photo/Signature URL)
   */
  static async completeDelivery(shipmentId: string, proofUrl: string) {
    const { data, error } = await supabase
      .from('shipments')
      .update({
        status: 'delivered',
        proof_of_delivery_url: proofUrl,
        actual_delivery: new Date().toISOString()
      })
      .eq('id', shipmentId)
      .select()
      .single();

    if (!error && data) {
      // Finalize order status
      await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', data.order_id);
    }

    return { data, error };
  }
}

/**
 * NEXUS ERP - Enterprise Ecosystem Typings
 * Optimized for African Business Realities
 */

export type kycStatus = 'pending' | 'verified' | 'rejected';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type MovementType = 'in' | 'out' | 'transfer' | 'adjustment' | 'return';
export type ShipmentStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';

export interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  fullname?: string;
  avatar_url?: string;
  phone?: string;
  kyc_status: kycStatus;
}

export interface Company {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  sector?: string;
  owner_id: string;
  subscription_tier: string;
  is_verified: boolean;
  trust_score: number;
  settings: Record<string, any>;
}

export interface Warehouse {
  id: string;
  company_id: string;
  name: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  phone?: string;
  is_main: boolean;
}

export interface Product {
  id: string;
  company_id: string;
  sku?: string;
  name: string;
  description?: string;
  category?: string;
  base_price: number;
  sale_price?: number;
  min_stock_level: number;
  unit: string;
  images: string[];
  is_marketplace_visible: boolean;
  is_ecommerce_visible: boolean;
  stock?: InventoryStock[]; // Joined data
}

export interface InventoryStock {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface Order {
  id: string;
  company_id: string;
  buyer_id?: string;
  buyer_email?: string;
  buyer_phone?: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  delivery_address?: string;
  delivery_coordinates?: { lat: number; lng: number };
  order_type: 'direct' | 'marketplace' | 'ecommerce' | 'pos';
  qr_code?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Transaction {
  id: string;
  company_id: string;
  order_id: string;
  amount: number;
  currency: string;
  provider: 'mtn' | 'orange' | 'wave' | 'stripe' | 'cash';
  provider_tx_id?: string;
  status: 'pending' | 'success' | 'failed' | 'reversed';
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  carrier_name?: string;
  tracking_number?: string;
  status: ShipmentStatus;
  estimated_delivery?: string;
  courier_phone?: string;
  proof_of_delivery_url?: string;
}

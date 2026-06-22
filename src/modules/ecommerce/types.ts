export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  purchasePrice?: number;
  category: string;
  image: string;
  stock: number;
  points: number;
  stockThreshold?: number;
  allowBackorder?: boolean;
}

export interface InternalResource {
  id: string;
  name: string;
  type: 'Véhicule' | 'Électronique' | 'Mobilier' | 'Autre';
  status: 'Opérationnel' | 'En panne' | 'En réparation';
  assignedTo?: string;
  acquisitionDate?: number;
  purchaseValue?: number;
  lastMaintenanceDate?: number;
}

export interface StockHistory {
  id: string;
  productId: string;
  productName: string;
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  purchasePrice?: number;
  reason?: string;
  authorName: string;
  createdAt: number;
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export interface Order {
  id: string;
  items: any[];
  total: number;
  subtotal?: number;
  nexusCommission?: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'CANCELLED_BY_SELLER';
  paymentStatus?: 'PAID' | 'UNPAID';
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
  realizedProfit?: number;
  transactionFee?: number;
  globalOrderId?: string;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: any;
  isRead: boolean;
}

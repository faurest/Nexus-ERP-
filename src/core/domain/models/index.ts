export interface BaseEntity {
  id: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

export interface Company extends BaseEntity {
  name: string;
  status: 'active' | 'suspended';
}

export interface User extends BaseEntity {
  email: string;
  role: string;
}

export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  type: 'individual' | 'business';
}

export interface Product extends BaseEntity {
  name: string;
  price: number;
  stock: number;
}

export interface Order extends BaseEntity {
  customerId: string;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface Invoice extends BaseEntity {
  orderId?: string;
  amount: number;
  status: 'draft' | 'issued' | 'paid';
}

export interface Project extends BaseEntity {
  name: string;
  status: 'active' | 'completed';
}

export interface Task extends BaseEntity {
  projectId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
}

export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  read: boolean;
}

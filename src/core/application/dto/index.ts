export interface CreateCustomerDto {
  name: string;
  email?: string;
  phone?: string;
  type: 'individual' | 'business';
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  id: string;
}

export interface CreateProductDto {
  name: string;
  price: number;
  stock: number;
}

export interface CreateOrderDto {
  customerId: string;
  total: number;
}

export interface LoginDto {
  email: string;
  password?: string;
}

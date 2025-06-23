export interface UserProfile {
  name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrintJob {
  id: string;
  file: File;
  copies: number;
  isColor: boolean;
}

export interface PrintShop {
  id: string;
  name: string;
  rating: number;
  distance: string;
  price: number;
  eta: string;
  image: string;
  isShopOpen: boolean;
  perPageCostAdjustment: number;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface OrderItem {
  id: string;
  fileName: string;
  copies: number;
  isColor: boolean;
  pages: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  timestamp: string;
  shopId: number;
  isPaid: boolean;
}

export type PaymentMethod = 'upi' | 'qr';
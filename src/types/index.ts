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
  pageCount: number; // actual number of pages in the document (1 for images)
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

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';

export interface OrderItem {
  id: string;
  fileName: string;
  filePath?: string; // Supabase storage path (for private access)
  fileUrl?: string; // Legacy:/Direct link (deprecated for private files)
  copies: number;
  isColor: boolean;
  pages: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  sellerPhone: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  timestamp: string;
  shopId: number;
  isPaid: boolean;
  otpVerified?: boolean;
  otp?: string;
  otpGeneratedAt?: string;
  completedAt?: string;
  paymentId?: string;
  invoiceUrl?: string;
}

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';
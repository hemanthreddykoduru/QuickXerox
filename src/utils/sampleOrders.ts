import { Order } from '../types';

export const generateSampleOrders = (): Order[] => {
  return [
    {
      id: 'ORD-001',
      customerName: 'John Doe',
      customerPhone: '+91 98765 43210',
      sellerPhone: '+91 87654 32109',
      items: [
        {
          id: 'item-1',
          fileName: 'document.pdf',
          copies: 2,
          isColor: false,
          pages: 5
        }
      ],
      total: 25.00,
      status: 'processing',
      timestamp: new Date().toISOString(),
      shopId: 1,
      isPaid: true,
      otpVerified: false,
      otpGeneratedAt: new Date().toISOString()
    },
    {
      id: 'ORD-002',
      customerName: 'Jane Smith',
      customerPhone: '+91 91234 56789',
      sellerPhone: '+91 87654 32109',
      items: [
        {
          id: 'item-2',
          fileName: 'presentation.pptx',
          copies: 1,
          isColor: true,
          pages: 10
        }
      ],
      total: 50.00,
      status: 'completed',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      shopId: 2,
      isPaid: true,
      otpVerified: true,
      otpGeneratedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'ORD-003',
      customerName: 'Mike Johnson',
      customerPhone: '+91 99887 76655',
      sellerPhone: '+91 87654 32109',
      items: [
        {
          id: 'item-3',
          fileName: 'report.docx',
          copies: 3,
          isColor: false,
          pages: 8
        },
        {
          id: 'item-4',
          fileName: 'invoice.pdf',
          copies: 1,
          isColor: true,
          pages: 2
        }
      ],
      total: 35.00,
      status: 'pending',
      timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      shopId: 1,
      isPaid: false,
      otpVerified: false
    }
  ];
};

export const getOrderById = (orderId: string): Order | null => {
  const orders = generateSampleOrders();
  return orders.find(order => order.id === orderId) || null;
};

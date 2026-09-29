export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  amount: number;
  currency: string;
  provider: 'stripe' | 'mpesa';
  status: 'pending' | 'completed' | 'failed';
  providerRef: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithCount {
  id: string;
  title: string;
  uploadedAt: string;
  _count: { chunks: number };
}

export interface UnansweredQuestion {
  id: string;
  question: string;
  createdAt: string;
}

'use client';

import { formatDistanceToNow } from 'date-fns';

interface OrderRow {
  id: string;
  items: unknown;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  phone: string | null;
  createdAt: Date | string;
}

const statusStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-3">Recent Orders</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-400">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">When</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {order.currency} {order.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 capitalize">{order.provider}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusStyles[order.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{order.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

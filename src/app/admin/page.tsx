import { prisma } from '@/lib/db';
import { OrdersTable } from '@/components/admin/OrdersTable';
import { UnansweredQuestions } from '@/components/admin/UnansweredQuestions';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [
    totalOrders,
    completedOrders,
    pendingOrders,
    recentOrders,
    unansweredQuestions,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'completed' } }),
    prisma.order.count({ where: { status: 'pending' } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.unansweredQuestion.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const totalRevenue = await prisma.order.aggregate({
    where: { status: 'completed' },
    _sum: { amount: true },
  });

  const stats = [
    { label: 'Total Orders', value: totalOrders, color: 'text-blue-600' },
    { label: 'Completed', value: completedOrders, color: 'text-green-600' },
    { label: 'Pending', value: pendingOrders, color: 'text-amber-600' },
    {
      label: 'Revenue (KES)',
      value: `${((totalRevenue._sum.amount ?? 0)).toLocaleString()}`,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <OrdersTable orders={recentOrders as Parameters<typeof OrdersTable>[0]['orders']} />

      <UnansweredQuestions questions={unansweredQuestions} />
    </div>
  );
}

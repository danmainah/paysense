import { prisma } from '@/lib/db';
import { ProductManager } from '@/components/admin/ProductManager';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your catalog. The AI assistant uses these products and prices when helping customers.
        </p>
      </div>

      <ProductManager
        initialProducts={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          inStock: p.inStock,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

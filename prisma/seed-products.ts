/**
 * Seeds the product catalog for TechNairobi Electronics.
 * Prices/specs mirror the RAG knowledge in seed.ts so the assistant stays consistent.
 * Idempotent: skips if the products table already has rows.
 * Run: npm run db:seed-products  (requires DATABASE_URL)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: 'Samsung Galaxy A55', price: 42000, category: 'Smartphones', description: '6.6" Super AMOLED 120Hz, 8GB RAM, 128/256GB, 50MP triple camera, 5000mAh.', inStock: true },
  { name: 'iPhone 15', price: 135000, category: 'Smartphones', description: '6.1" Super Retina XDR, 6GB RAM, 128/256/512GB, 48MP dual camera.', inStock: true },
  { name: 'Samsung Galaxy S24', price: 105000, category: 'Smartphones', description: '6.2" Dynamic AMOLED 120Hz, 8GB RAM, 128/256GB, 50MP triple camera with AI.', inStock: true },
  { name: 'Tecno Spark 20 Pro', price: 22000, category: 'Smartphones', description: '6.78" IPS LCD 120Hz, 8GB RAM, 256GB, 108MP AI camera, 5000mAh. Budget-friendly.', inStock: true },
  { name: 'HP Pavilion 15 (2024)', price: 65000, category: 'Laptops', description: 'Intel Core i5-1335U, 8GB DDR4, 512GB SSD, 15.6" FHD, Windows 11.', inStock: true },
  { name: 'MacBook Air M2 (13-inch)', price: 180000, category: 'Laptops', description: 'Apple M2, 8GB unified memory, 256GB SSD, 13.6" Liquid Retina, macOS.', inStock: true },
  { name: 'Dell Inspiron 15 3000', price: 58000, category: 'Laptops', description: 'Intel Core i3-1215U, 8GB RAM, 256GB SSD, 15.6" FHD, Windows 11.', inStock: true },
  { name: 'Samsung Galaxy Buds FE', price: 12000, category: 'Accessories', description: 'ANC earbuds, 6h battery (30h with case), Bluetooth 5.2.', inStock: true },
  { name: 'USB-C Hub 7-in-1', price: 3500, category: 'Accessories', description: '3x USB-A 3.0, HDMI 4K, USB-C PD 100W, SD + microSD.', inStock: true },
  { name: 'Logitech MX Master 3S Mouse', price: 9500, category: 'Accessories', description: 'Bluetooth + USB receiver, rechargeable (70 days).', inStock: true },
];

async function main() {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`Products table already has ${existing} rows — skipping. Delete them in /admin/products to re-seed.`);
    return;
  }
  const result = await prisma.product.createMany({ data: PRODUCTS });
  console.log(`Seeded ${result.count} products.`);
}

main()
  .catch((e) => {
    console.error('Product seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

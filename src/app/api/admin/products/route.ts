import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional().nullable(),
  price: z.number().int().positive('Price must be a positive number'),
  category: z.string().trim().optional().nullable(),
  inStock: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(products);
  } catch (err) {
    console.error('[Admin/Products] list failed:', err);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  try {
    const product = await prisma.product.create({ data: parsed.data });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error('[Admin/Products] create failed:', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

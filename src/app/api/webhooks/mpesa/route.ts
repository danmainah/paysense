import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const callback = body?.Body?.stkCallback;

  if (!callback) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const checkoutRequestId: string = callback.CheckoutRequestID;
  const resultCode: number = callback.ResultCode;

  const order = await prisma.order.findFirst({
    where: { providerRef: checkoutRequestId },
  });

  if (order) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: resultCode === 0 ? 'completed' : 'failed' },
    });
  }

  // Daraja expects this exact response shape
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

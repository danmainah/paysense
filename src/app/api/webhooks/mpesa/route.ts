import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendReceipt } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
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
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: resultCode === 0 ? 'completed' : 'failed' },
      });
      if (resultCode === 0 && updated.email) {
        await sendReceipt(updated).catch((e) => console.error('[Webhook/M-Pesa] receipt failed:', e));
      }
    }
  } catch (err) {
    console.error('[Webhook/M-Pesa] Processing failed:', err);
  }

  // Always respond 200 — Daraja retries on non-200
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

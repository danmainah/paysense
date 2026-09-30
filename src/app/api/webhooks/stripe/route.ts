import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { sendReceipt } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        const email = session.customer_details?.email ?? null;
        const order = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'completed', ...(email ? { email } : {}) },
        });
        // Fire-and-forget receipt — never let email failure break the webhook.
        await sendReceipt(order).catch((e) => console.error('[Webhook/Stripe] receipt failed:', e));
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'failed' } });
      }
    }
  } catch (err) {
    console.error('[Webhook/Stripe] DB update failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

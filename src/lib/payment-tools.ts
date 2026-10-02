import { type Prisma } from '@prisma/client';
import { prisma } from './db';
import { createCheckoutSession } from './stripe';
import { stkPush } from './mpesa';
import { generateOrderReference } from './orders';

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface StripeToolResult {
  success: boolean;
  paymentUrl: string | null;
  orderId: string;
  reference: string;
  totalAmount: number;
  message: string;
}

export interface MpesaToolResult {
  success: boolean;
  orderId: string;
  reference: string;
  message: string;
}

function calcTotal(items: OrderItem[]): number {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}

export async function executeStripeCheckout(
  items: OrderItem[],
  baseUrl?: string
): Promise<StripeToolResult> {
  const amount = calcTotal(items);
  const reference = generateOrderReference();

  let order: { id: string };
  try {
    order = await prisma.order.create({
      data: { reference, items: items as unknown as Prisma.InputJsonValue, amount, currency: 'KES', provider: 'stripe', status: 'pending' },
    });
  } catch (err: unknown) {
    console.error('[Stripe] Order create failed:', err);
    return {
      success: false,
      paymentUrl: null,
      orderId: 'unknown',
      reference,
      totalAmount: amount,
      message: `Failed to create order: ${err instanceof Error ? err.message : 'DB error'}. Please try again.`,
    };
  }

  try {
    const { url, sessionId } = await createCheckoutSession(items, order.id, baseUrl);

    await prisma.order.update({
      where: { id: order.id },
      data: { providerRef: sessionId },
    }).catch((e) => console.error('[Stripe] Order update failed:', e));

    return {
      success: true,
      paymentUrl: url,
      orderId: order.id,
      reference,
      totalAmount: amount,
      message: `I've created a secure payment link for KES ${amount.toLocaleString()}. Your order reference is ${reference}. Click below to pay with your card.`,
    };
  } catch (err: unknown) {
    console.error('[Stripe] Checkout session failed:', err);
    await prisma.order.update({ where: { id: order.id }, data: { status: 'failed' } }).catch(() => null);
    return {
      success: false,
      paymentUrl: null,
      orderId: order.id,
      reference,
      totalAmount: amount,
      message: `Failed to create payment link: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
    };
  }
}

export async function executeMpesaStk(
  phone: string,
  items: OrderItem[],
  email?: string
): Promise<MpesaToolResult> {
  const amount = calcTotal(items);
  const reference = generateOrderReference();

  let order: { id: string };
  try {
    order = await prisma.order.create({
      data: {
        reference,
        items: items as unknown as Prisma.InputJsonValue,
        amount,
        currency: 'KES',
        provider: 'mpesa',
        status: 'pending',
        phone,
        email: email ?? null,
      },
    });
  } catch (err: unknown) {
    console.error('[M-Pesa] Order create failed:', err);
    return {
      success: false,
      orderId: 'unknown',
      reference,
      message: `Failed to create order: ${err instanceof Error ? err.message : 'DB error'}. Please try again.`,
    };
  }

  try {
    const { checkoutRequestId } = await stkPush(phone, amount, order.id);

    await prisma.order.update({
      where: { id: order.id },
      data: { providerRef: checkoutRequestId },
    });

    return {
      success: true,
      orderId: order.id,
      reference,
      message: `An M-Pesa request of KES ${amount.toLocaleString()} has been sent to ${phone}. Your order reference is ${reference}. Please check your phone and enter your M-Pesa PIN to complete the payment.`,
    };
  } catch (err: unknown) {
    console.error('[M-Pesa] STK push failed:', err);
    await prisma.order.update({ where: { id: order.id }, data: { status: 'failed' } }).catch(() => null);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      orderId: order.id,
      reference,
      message: `Failed to send M-Pesa request: ${message}. Please try again or use card payment.`,
    };
  }
}

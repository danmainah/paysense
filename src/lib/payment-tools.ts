import { type Prisma } from '@prisma/client';
import { prisma } from './db';
import { createCheckoutSession } from './stripe';
import { stkPush } from './mpesa';

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface StripeToolResult {
  success: boolean;
  paymentUrl: string | null;
  orderId: string;
  totalAmount: number;
  message: string;
}

export interface MpesaToolResult {
  success: boolean;
  orderId: string;
  message: string;
}

function calcTotal(items: OrderItem[]): number {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}

export async function executeStripeCheckout(items: OrderItem[]): Promise<StripeToolResult> {
  const amount = calcTotal(items);

  const order = await prisma.order.create({
    data: { items: items as unknown as Prisma.InputJsonValue, amount, currency: 'KES', provider: 'stripe', status: 'pending' },
  });

  const { url, sessionId } = await createCheckoutSession(items, order.id);

  await prisma.order.update({
    where: { id: order.id },
    data: { providerRef: sessionId },
  });

  return {
    success: true,
    paymentUrl: url,
    orderId: order.id,
    totalAmount: amount,
    message: `I've created a secure payment link for KES ${amount.toLocaleString()}. Click below to pay with your card.`,
  };
}

export async function executeMpesaStk(phone: string, items: OrderItem[]): Promise<MpesaToolResult> {
  const amount = calcTotal(items);

  const order = await prisma.order.create({
    data: { items: items as unknown as Prisma.InputJsonValue, amount, currency: 'KES', provider: 'mpesa', status: 'pending', phone },
  });

  try {
    const { checkoutRequestId } = await stkPush(phone, amount, order.id);

    await prisma.order.update({
      where: { id: order.id },
      data: { providerRef: checkoutRequestId },
    });

    return {
      success: true,
      orderId: order.id,
      message: `An M-Pesa request of KES ${amount.toLocaleString()} has been sent to ${phone}. Please check your phone and enter your M-Pesa PIN to complete the payment.`,
    };
  } catch (err: unknown) {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'failed' } });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      orderId: order.id,
      message: `Failed to send M-Pesa request: ${message}. Please try again or use card payment.`,
    };
  }
}

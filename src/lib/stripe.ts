import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export interface CheckoutItem {
  name: string;
  price: number; // KES
  quantity: number;
}

export async function createCheckoutSession(
  items: CheckoutItem[],
  orderId: string
): Promise<{ url: string; sessionId: string }> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: items.map((item) => ({
      price_data: {
        currency: 'kes',
        product_data: { name: item.name },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?payment=success&order=${orderId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?payment=cancelled`,
    metadata: { orderId },
  });

  return { url: session.url!, sessionId: session.id };
}

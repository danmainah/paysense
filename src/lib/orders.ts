import { prisma } from './db';
import type { OrderItem } from './payment-tools';

// Unambiguous alphabet (no O/0, I/1) for human-readable order references.
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generate an 8-char uppercase order reference, e.g. "K7P2M9QX". */
export function generateOrderReference(): string {
  let ref = '';
  for (let i = 0; i < 8; i++) {
    ref += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return ref;
}

/** Normalize customer-typed references: strip spaces/dashes, uppercase. */
export function normalizeReference(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export interface OrderLookupResult {
  found: boolean;
  reference?: string;
  status?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  items?: OrderItem[];
  createdAt?: string;
  message: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'awaiting payment',
  completed: 'paid and confirmed',
  failed: 'failed or cancelled',
};

/** Look up an order by its human reference for the chat lookup_order tool. */
export async function lookupOrder(reference: string): Promise<OrderLookupResult> {
  const ref = normalizeReference(reference ?? '');
  if (!ref) {
    return { found: false, message: 'No order reference was provided. Ask the customer for their 8-character order reference.' };
  }

  try {
    const order = await prisma.order.findUnique({ where: { reference: ref } });
    if (!order) {
      return {
        found: false,
        message: `No order found with reference ${ref}. Ask the customer to double-check the reference from their confirmation.`,
      };
    }

    const label = STATUS_LABEL[order.status] ?? order.status;
    return {
      found: true,
      reference: ref,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      provider: order.provider,
      items: order.items as unknown as OrderItem[],
      createdAt: order.createdAt.toISOString(),
      message: `Order ${ref} is ${label}. Total: ${order.currency} ${order.amount.toLocaleString()} via ${order.provider}.`,
    };
  } catch (err) {
    console.error('[Orders] lookupOrder failed:', err);
    return { found: false, message: 'Sorry, I could not look up that order right now. Please try again shortly.' };
  }
}

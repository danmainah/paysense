import { Resend } from 'resend';
import type { OrderItem } from './payment-tools';

export interface ReceiptOrder {
  reference: string | null;
  email: string | null;
  amount: number;
  currency: string;
  provider: string;
  items: unknown;
}

const FROM = process.env.RECEIPT_FROM_EMAIL ?? 'TechNairobi <onboarding@resend.dev>';

/**
 * Send a payment receipt email. No-ops gracefully (logs and returns false) if
 * RESEND_API_KEY is not configured or the order has no email — never throws.
 */
export async function sendReceipt(order: ReceiptOrder): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — skipping receipt.');
    return false;
  }
  if (!order.email) {
    console.warn('[Email] Order has no email — skipping receipt.');
    return false;
  }

  const items = Array.isArray(order.items) ? (order.items as OrderItem[]) : [];
  const ref = order.reference ?? '—';

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: order.email,
      subject: `Your TechNairobi receipt — order ${ref}`,
      html: renderReceiptHtml({ ...order, items, ref }),
    });

    if (error) {
      console.error('[Email] Resend returned error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Email] sendReceipt failed:', err);
    return false;
  }
}

function renderReceiptHtml(o: {
  ref: string;
  amount: number;
  currency: string;
  provider: string;
  items: OrderItem[];
}): string {
  const rows = o.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 0;color:#111">${escapeHtml(i.name)} × ${i.quantity}</td>
          <td style="padding:6px 0;text-align:right;color:#111">${o.currency} ${(i.price * i.quantity).toLocaleString()}</td>
        </tr>`
    )
    .join('');

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="color:#2563eb;margin:0 0 4px">TechNairobi Electronics</h2>
    <p style="color:#6b7280;margin:0 0 20px">Payment received — thank you! 🎉</p>
    <p style="color:#111;margin:0 0 16px">Order reference: <strong>${o.ref}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows}
      <tr>
        <td style="padding:10px 0 0;border-top:1px solid #e5e7eb;font-weight:bold;color:#111">Total (paid via ${escapeHtml(o.provider)})</td>
        <td style="padding:10px 0 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:bold;color:#111">${o.currency} ${o.amount.toLocaleString()}</td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:12px;margin:24px 0 0">Questions? Reply to this email or call +254 700 123 456.</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

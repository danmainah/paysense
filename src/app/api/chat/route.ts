import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { type NextRequest } from 'next/server';
import { retrieveRelevantChunks, buildSystemPrompt, getProductCatalog } from '@/lib/rag';
import { executeStripeCheckout, executeMpesaStk } from '@/lib/payment-tools';
import { lookupOrder } from '@/lib/orders';
import { trackUnansweredQuestion, persistConversation } from '@/lib/conversation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const itemSchema = z.object({
  name: z.string().describe('Product name'),
  price: z.number().positive().describe('Price in KES'),
  quantity: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const { messages, conversationId } = await req.json();

  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
  const query = lastUserMsg?.content ?? '';

  const [chunks, products] = await Promise.all([
    retrieveRelevantChunks(query),
    getProductCatalog(),
  ]);
  const systemPrompt = buildSystemPrompt(chunks, products);

  const result = streamText({
    onError: (err) => console.error('[Chat] streamText error:', err),
    // gemini-3.5-flash-lite is a thinking model; the patched @ai-sdk/google
    // bridges the part-level thought_signature so multi-step tool calls work.
    model: google('gemini-3.5-flash-lite'),
    system: systemPrompt,
    messages,
    maxSteps: 5,
    tools: {
      create_stripe_checkout: tool({
        description:
          'Create a Stripe Checkout link for card payment. Call only after confirming items with the customer.',
        parameters: z.object({ items: z.array(itemSchema) }),
        execute: ({ items }) => executeStripeCheckout(items),
      }),

      mpesa_stk_push: tool({
        description:
          "Send an M-Pesa STK push payment request to the customer's phone. Ask for their phone number first (format: 254XXXXXXXXX). Optionally pass their email to send a receipt after payment.",
        parameters: z.object({
          phone: z.string().describe('Phone number in format 254XXXXXXXXX'),
          items: z.array(itemSchema),
          email: z.string().email().optional().describe('Customer email for a payment receipt (optional)'),
        }),
        execute: ({ phone, items, email }) => executeMpesaStk(phone, items, email),
      }),

      lookup_order: tool({
        description:
          'Look up the status of an existing order using the customer\'s order reference (the 8-character code from their confirmation, e.g. "K7P2M9QX").',
        parameters: z.object({
          reference: z.string().describe('The order reference code, e.g. K7P2M9QX'),
        }),
        execute: ({ reference }) => lookupOrder(reference),
      }),
    },

    onFinish: async ({ text }) => {
      await trackUnansweredQuestion(query, text);
      if (conversationId) {
        await persistConversation(conversationId, query, text);
      }
    },
  });

  return result.toDataStreamResponse();
}

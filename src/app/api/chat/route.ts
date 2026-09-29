import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { type NextRequest } from 'next/server';
import { retrieveRelevantChunks, buildSystemPrompt } from '@/lib/rag';
import { executeStripeCheckout, executeMpesaStk } from '@/lib/payment-tools';
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

  const chunks = await retrieveRelevantChunks(query);
  const systemPrompt = buildSystemPrompt(chunks);

  const result = streamText({
    model: google('gemini-flash-lite-latest'),
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
          "Send an M-Pesa STK push payment request to the customer's phone. Ask for their phone number first (format: 254XXXXXXXXX).",
        parameters: z.object({
          phone: z.string().describe('Phone number in format 254XXXXXXXXX'),
          items: z.array(itemSchema),
        }),
        execute: ({ phone, items }) => executeMpesaStk(phone, items),
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

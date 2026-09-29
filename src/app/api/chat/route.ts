import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { retrieveRelevantChunks, buildSystemPrompt } from '@/lib/rag';
import { createCheckoutSession } from '@/lib/stripe';
import { stkPush } from '@/lib/mpesa';

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

  const result = await streamText({
    model: google('gemini-flash-latest'),
    system: systemPrompt,
    messages,
    maxSteps: 5,
    tools: {
      create_stripe_checkout: tool({
        description:
          'Create a Stripe Checkout link for card payment. Call only after confirming items with the customer.',
        parameters: z.object({
          items: z.array(itemSchema),
        }),
        execute: async ({ items }) => {
          // Server recalculates total — never trust model-provided amounts
          const amount = items.reduce((s, i) => s + i.price * i.quantity, 0);

          const order = await prisma.order.create({
            data: { items, amount, currency: 'KES', provider: 'stripe', status: 'pending' },
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
        },
      }),

      mpesa_stk_push: tool({
        description:
          'Send an M-Pesa STK push payment request to the customer\'s phone. Ask for their phone number first (format: 254XXXXXXXXX).',
        parameters: z.object({
          phone: z.string().describe('Phone number in format 254XXXXXXXXX'),
          items: z.array(itemSchema),
        }),
        execute: async ({ phone, items }) => {
          const amount = items.reduce((s, i) => s + i.price * i.quantity, 0);

          const order = await prisma.order.create({
            data: { items, amount, currency: 'KES', provider: 'mpesa', status: 'pending', phone },
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
        },
      }),
    },

    onFinish: async ({ text }) => {
      const unanswered =
        text.toLowerCase().includes("i don't have information") ||
        text.toLowerCase().includes("i don't know") ||
        text.toLowerCase().includes('contact us');

      if (unanswered && query) {
        await prisma.unansweredQuestion.create({ data: { question: query } });
      }

      // Persist messages when a conversationId is supplied
      if (conversationId) {
        await prisma.conversation
          .upsert({
            where: { id: conversationId },
            create: { id: conversationId },
            update: {},
          })
          .catch(() => null);

        await prisma.message
          .createMany({
            data: [
              { conversationId, role: 'user', content: query },
              { conversationId, role: 'assistant', content: text },
            ],
            skipDuplicates: true,
          })
          .catch(() => null);
      }
    },
  });

  return result.toDataStreamResponse();
}

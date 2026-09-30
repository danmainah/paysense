import { prisma } from './db';

const UNANSWERED_SIGNALS = [
  "i don't have information",
  "i don't know",
  'contact us',
];

export async function trackUnansweredQuestion(query: string, text: string): Promise<void> {
  const lower = text.toLowerCase();
  const isUnanswered = UNANSWERED_SIGNALS.some((s) => lower.includes(s));
  if (isUnanswered && query) {
    await prisma.unansweredQuestion.create({ data: { question: query } }).catch((e) => {
      console.error('[Conversation] trackUnansweredQuestion failed:', e);
    });
  }
}

export async function persistConversation(
  conversationId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  await prisma.conversation
    .upsert({ where: { id: conversationId }, create: { id: conversationId }, update: {} })
    .catch(() => null);

  await prisma.message
    .createMany({
      data: [
        { conversationId, role: 'user', content: userMessage },
        { conversationId, role: 'assistant', content: assistantMessage },
      ],
      skipDuplicates: true,
    })
    .catch(() => null);
}

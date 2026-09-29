import { prisma } from './db';
import { createEmbedding } from './embeddings';

export interface RetrievedChunk {
  id: string;
  content: string;
  documentTitle: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  query: string,
  limit = 5
): Promise<RetrievedChunk[]> {
  const embedding = await createEmbedding(query);
  const vector = `[${embedding.join(',')}]`;

  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      content: string;
      document_title: string;
      similarity: number;
    }>
  >`
    SELECT
      c.id,
      c.content,
      d.title AS document_title,
      1 - (c.embedding <=> ${vector}::vector) AS similarity
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vector}::vector
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    documentTitle: r.document_title,
    similarity: r.similarity,
  }));
}

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const base = `You are a helpful AI shop assistant for TechNairobi Electronics, a Nairobi-based electronics store.

Your capabilities:
- Answer questions about products, prices, delivery, warranty, and store policies
- Collect payment via Stripe card checkout or M-Pesa STK push
- You have TWO payment tools: create_stripe_checkout (card) and mpesa_stk_push (M-Pesa)

Payment rules:
1. Confirm items and total with the customer before calling any payment tool
2. For M-Pesa, ask for the phone number in format 254XXXXXXXXX
3. Never modify or guess prices — use only amounts from the shop knowledge below
4. After a payment tool returns, relay the result message to the customer clearly`;

  if (chunks.length === 0) {
    return `${base}

No relevant shop knowledge was found for this query. If the customer asks about products or policies and you don't have the information, say: "I don't have information about that in our current catalog. Please contact us at info@technairobi.co.ke or call +254 700 123 456."`;
  }

  const context = chunks
    .map((c, i) => `[Source ${i + 1} — ${c.documentTitle}]\n${c.content}`)
    .join('\n\n---\n\n');

  return `${base}

Answer based ONLY on the shop knowledge below. Always mention which source you used.
If the answer is not in the knowledge, say so honestly and suggest the customer contact us.

SHOP KNOWLEDGE:
${context}`;
}

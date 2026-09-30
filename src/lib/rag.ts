import { prisma } from './db';
import { createEmbedding } from './embeddings';

export interface RetrievedChunk {
  id: string;
  content: string;
  documentTitle: string;
  similarity: number;
}

export interface CatalogProduct {
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  inStock: boolean;
}

/** In-stock products first, for injection into the chat system prompt. */
export async function getProductCatalog(): Promise<CatalogProduct[]> {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ inStock: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      select: { name: true, price: true, category: true, description: true, inStock: true },
    });
    return products;
  } catch (err) {
    console.error('[RAG] getProductCatalog failed:', err);
    return [];
  }
}

function formatCatalog(products: CatalogProduct[]): string {
  return products
    .map((p) => {
      const parts = [`- ${p.name} — KES ${p.price.toLocaleString()}`];
      if (p.category) parts.push(`[${p.category}]`);
      if (!p.inStock) parts.push('(OUT OF STOCK)');
      if (p.description) parts.push(`\n    ${p.description}`);
      return parts.join(' ');
    })
    .join('\n');
}

export async function retrieveRelevantChunks(
  query: string,
  limit = 5
): Promise<RetrievedChunk[]> {
  try {
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
  } catch (err) {
    console.error('[RAG] retrieveRelevantChunks failed:', err);
    return [];
  }
}

export function buildSystemPrompt(chunks: RetrievedChunk[], products: CatalogProduct[] = []): string {
  const base = `You are a helpful AI shop assistant for TechNairobi Electronics, a Nairobi-based electronics store.

Your capabilities:
- Answer questions about products, prices, delivery, warranty, and store policies
- Collect payment via Stripe card checkout or M-Pesa STK push
- You have TWO payment tools: create_stripe_checkout (card) and mpesa_stk_push (M-Pesa)
- You can look up an existing order's status with the lookup_order tool when a customer gives an order reference

Payment rules:
1. Confirm items and total with the customer before calling any payment tool
2. For M-Pesa, ask for the phone number in format 254XXXXXXXXX
3. Never modify or guess prices — use only prices from the PRODUCT CATALOG or shop knowledge below
4. Do not sell items marked OUT OF STOCK; offer an in-stock alternative instead
5. After a payment tool returns, relay the result message to the customer clearly`;

  const catalog =
    products.length > 0
      ? `\n\nPRODUCT CATALOG (authoritative for names, prices, and availability):\n${formatCatalog(products)}`
      : '';

  if (chunks.length === 0) {
    return `${base}${catalog}

No relevant shop knowledge was found for this query beyond the catalog above. If the customer asks about policies you don't have, say: "I don't have information about that in our current catalog. Please contact us at info@technairobi.co.ke or call +254 700 123 456."`;
  }

  const context = chunks
    .map((c, i) => `[Source ${i + 1} — ${c.documentTitle}]\n${c.content}`)
    .join('\n\n---\n\n');

  return `${base}${catalog}

Answer based on the PRODUCT CATALOG above and the shop knowledge below. When you cite policy or spec details from the knowledge, mention which source you used.
If the answer is not in the catalog or knowledge, say so honestly and suggest the customer contact us.

SHOP KNOWLEDGE:
${context}`;
}

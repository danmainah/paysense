import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

export async function createEmbedding(text: string): Promise<number[]> {
  const result = await model.embedContent(text.slice(0, 8000));
  return result.embedding.values;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map((t) => model.embedContent(t.slice(0, 8000)))
  );
  return results.map((r) => r.embedding.values);
}

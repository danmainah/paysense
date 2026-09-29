// Lazy import to avoid bundling issues with pdf-parse in Next.js
async function getPdfParse() {
  const mod = await import('pdf-parse');
  return mod.default;
}

const CHUNK_WORDS = 400;
const OVERLAP_WORDS = 40;

export function chunkText(text: string): string[] {
  // Split on paragraph breaks first, then by word count
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let buffer: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    buffer.push(...words);

    while (buffer.length >= CHUNK_WORDS) {
      const chunk = buffer.slice(0, CHUNK_WORDS).join(' ').trim();
      if (chunk.length > 60) chunks.push(chunk);
      buffer = buffer.slice(CHUNK_WORDS - OVERLAP_WORDS);
    }
  }

  if (buffer.length > 30) {
    chunks.push(buffer.join(' ').trim());
  }

  return chunks;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parse = await getPdfParse();
  const data = await parse(buffer);
  return data.text;
}

export function extractTextFromMarkdown(content: string): string {
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .trim();
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createEmbeddings } from '@/lib/embeddings';
import { chunkText, extractTextFromPDF, extractTextFromMarkdown } from '@/lib/chunker';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BATCH = 20;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    text = await extractTextFromPDF(buffer);
  } else if (
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt') ||
    file.type === 'text/markdown' ||
    file.type === 'text/plain'
  ) {
    text = extractTextFromMarkdown(buffer.toString('utf-8'));
  } else {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PDF, Markdown, or plain text.' },
      { status: 400 }
    );
  }

  const chunks = chunkText(text);
  if (chunks.length === 0)
    return NextResponse.json({ error: 'No readable content in file.' }, { status: 400 });

  const title = file.name.replace(/\.[^/.]+$/, '');
  const doc = await prisma.document.create({ data: { title } });

  let inserted = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await createEmbeddings(batch);

    for (let j = 0; j < batch.length; j++) {
      const id = crypto.randomUUID();
      const vec = `[${embeddings[j].join(',')}]`;
      await prisma.$executeRaw`
        INSERT INTO chunks (id, document_id, content, embedding)
        VALUES (${id}, ${doc.id}, ${batch[j]}, ${vec}::vector)
      `;
      inserted++;
    }
  }

  return NextResponse.json({ success: true, documentId: doc.id, chunksCreated: inserted });
}

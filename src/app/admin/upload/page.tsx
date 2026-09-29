import { prisma } from '@/lib/db';
import { DocumentUpload } from '@/components/admin/DocumentUpload';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const documents = await prisma.document.findMany({
    orderBy: { uploadedAt: 'desc' },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload PDF or Markdown files. The AI uses these to answer customer questions.
        </p>
      </div>

      <DocumentUpload
        initialDocuments={documents.map((d) => ({
          id: d.id,
          title: d.title,
          uploadedAt: d.uploadedAt.toISOString(),
          _count: { chunks: d._count.chunks },
        }))}
      />
    </div>
  );
}

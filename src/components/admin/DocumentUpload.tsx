'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import type { DocumentWithCount } from '@/types';

export function DocumentUpload({
  initialDocuments,
}: {
  initialDocuments: DocumentWithCount[];
}) {
  const [docs, setDocs] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const router = useRouter();

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setUploading(true);
      setStatus(null);

      const form = new FormData();
      form.append('file', file);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? 'Upload failed');

        setStatus({ type: 'success', msg: `Uploaded "${file.name}" — ${data.chunksCreated} chunks created.` });
        router.refresh();

        const docsRes = await fetch('/api/admin/documents');
        if (docsRes.ok) setDocs(await docsRes.json());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setStatus({ type: 'error', msg });
      } finally {
        setUploading(false);
      }
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/markdown': ['.md'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    disabled: uploading,
  });

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document and all its chunks?')) return;
    await fetch('/api/admin/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">{uploading ? '⏳' : '📂'}</div>
        <p className="font-medium text-gray-700">
          {uploading
            ? 'Uploading and embedding…'
            : isDragActive
            ? 'Drop your file here'
            : 'Drag & drop a PDF, Markdown, or TXT file'}
        </p>
        <p className="text-sm text-gray-400 mt-1">or click to browse</p>
      </div>

      {status && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-100'
              : 'bg-red-50 text-red-800 border border-red-100'
          }`}
        >
          {status.type === 'success' ? '✅' : '❌'} {status.msg}
        </div>
      )}

      {/* Document list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">
          Uploaded documents ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400">No documents yet. Upload one above.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between bg-white border rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc._count.chunks} chunks ·{' '}
                    {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

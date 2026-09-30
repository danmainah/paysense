'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-5 py-3 border-b bg-white shadow-sm shrink-0">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-lg leading-none">
          ←
        </Link>
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          TN
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">TechNairobi Assistant</p>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Online
          </p>
        </div>
      </header>

      <Suspense>
        <ChatInterface />
      </Suspense>
    </div>
  );
}

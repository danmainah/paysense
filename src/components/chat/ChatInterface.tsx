'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';

const WELCOME =
  "Hi! I'm the TechNairobi AI assistant. Ask me about our products, prices, delivery, or anything else — and I can help you pay via M-Pesa or card right here. How can I help you today?";

export function ChatInterface() {
  const conversationId = useRef(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: { conversationId: conversationId.current },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME,
      },
    ],
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-red-600 py-2">
            Something went wrong. Please try again.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts (only before first user message) */}
      {messages.filter((m) => m.role === 'user').length === 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {[
            'What phones do you have under KES 50k?',
            'Do you deliver to Kisumu?',
            'I want to buy a MacBook Air M2',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
              }}
              className="text-xs border border-blue-200 text-blue-600 rounded-full px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t bg-white px-4 py-3 flex gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about products, prices, or pay here…"
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

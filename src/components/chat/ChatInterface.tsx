'use client';

import { useChat } from 'ai/react';
import type { Message } from 'ai';
import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageBubble } from './MessageBubble';

const WELCOME =
  "Hi! I'm the TechNairobi AI assistant. Ask me about our products, prices, delivery, or anything else — and I can help you pay via M-Pesa or card right here. How can I help you today?";

const STORAGE_KEY = 'paysense_chat_messages';
const CONV_KEY = 'paysense_conversation_id';

// Stable conversation id that survives the Stripe redirect (even in a new tab,
// so localStorage — shared across tabs — rather than sessionStorage).
function getConversationId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(CONV_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(CONV_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

export function ChatInterface() {
  const conversationId = useRef<string>('');
  if (!conversationId.current) conversationId.current = getConversationId();

  const bottomRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const router = useRouter();

  const { messages, setMessages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: '/api/chat',
      body: { conversationId: conversationId.current },
      initialMessages: [{ id: 'welcome', role: 'assistant', content: WELCOME }],
    });

  // On mount: restore saved conversation, then append any payment-result message.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 1. Restore prior conversation (survives the Stripe redirect / refresh).
    let base: Message[] | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) base = parsed;
      }
    } catch {
      /* ignore corrupt storage */
    }

    // 2. If we returned from a Stripe redirect, build an in-chat confirmation.
    const payment = params.get('payment');
    let paymentMsg: Message | null = null;
    if (payment) {
      const order = params.get('order');
      const ref = order ? order.slice(-8).toUpperCase() : null;
      paymentMsg = {
        id: `payment-${Date.now()}`,
        role: 'assistant',
        content:
          payment === 'success'
            ? `✅ **Payment received — thank you!**${ref ? ` Your order reference is \`${ref}\`.` : ''} Is there anything else I can help you with about your purchase?`
            : '⚠️ **Payment was cancelled.** No problem — let me know if you’d like to try again or have any other questions.',
      };
      // Clean the query string so a refresh doesn't re-add the message.
      router.replace('/chat');
    }

    // 3. Apply restored history + payment message in one update.
    if (base || paymentMsg) {
      setMessages((prev) => {
        const start = base ?? prev;
        return paymentMsg ? [...start, paymentMsg] : start;
      });
    }
  }, [params, router, setMessages]);

  // Persist the conversation on every change so it survives redirects.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear the stored conversation and start fresh (full reload gives useChat a new conversationId).
  const resetChat = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONV_KEY);
    } catch {
      /* non-fatal */
    }
    window.location.href = '/chat';
  };

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
        {messages.length > 1 && (
          <button
            type="button"
            onClick={resetChat}
            title="Start a new chat"
            aria-label="Start a new chat"
            className="shrink-0 w-10 h-10 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors"
          >
            ↻
          </button>
        )}
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

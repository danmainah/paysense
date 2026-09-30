'use client';

import type { Message, ToolInvocation } from 'ai';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-900 rounded-tl-sm'
        }`}
      >
        <div className="prose-chat">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {message.toolInvocations?.map((inv) => (
          <ToolResult key={inv.toolCallId} invocation={inv} />
        ))}
      </div>
    </div>
  );
}

function ToolResult({ invocation }: { invocation: ToolInvocation }) {
  if (invocation.toolName === 'create_stripe_checkout') {
    if (invocation.state === 'call') {
      return (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Creating payment link…
        </div>
      );
    }
    if (invocation.state === 'result') {
      const r = invocation.result as { paymentUrl?: string; totalAmount?: number; success: boolean; reference?: string };
      if (!r.success) {
        return (
          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-700">
            ❌ Could not create payment link. Please try again.
          </div>
        );
      }
      return (
        <div className="mt-3 p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
          <p className="text-xs font-medium text-gray-700 mb-2">
            💳 Stripe Checkout · KES {r.totalAmount?.toLocaleString()}
          </p>
          <a
            href={r.paymentUrl}
            className="inline-block bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Pay with Card →
          </a>
          {r.reference && (
            <p className="mt-2 text-[10px] text-gray-400 font-mono">Order {r.reference}</p>
          )}
        </div>
      );
    }
  }

  if (invocation.toolName === 'mpesa_stk_push') {
    if (invocation.state === 'call') {
      return (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Sending M-Pesa request…
        </div>
      );
    }
    if (invocation.state === 'result') {
      const r = invocation.result as { success: boolean; orderId?: string; reference?: string };
      return (
        <div
          className={`mt-3 p-3 rounded-xl border text-xs ${
            r.success
              ? 'bg-green-50 border-green-100 text-green-800'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {r.success ? (
            <>
              <p className="font-medium mb-1">📱 M-Pesa request sent</p>
              <p>Check your phone, enter your PIN, and the payment will be confirmed.</p>
              {r.orderId && (
                <OrderStatusPoll orderId={r.orderId} reference={r.reference} />
              )}
            </>
          ) : (
            <p>❌ Failed to send M-Pesa request. Try again or use card payment.</p>
          )}
        </div>
      );
    }
  }

  return null;
}

function OrderStatusPoll({ orderId, reference }: { orderId: string; reference?: string }) {
  const [status, setStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (status === 'completed' || status === 'failed') return;
    if (attempts >= 40) return; // give up after ~2 min of polling

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (data.status === 'completed' || data.status === 'failed') {
            setStatus(data.status);
          }
        }
      } catch {
        /* transient network error — will retry on next tick */
      } finally {
        setAttempts((n) => n + 1);
      }
    }, 3000);

    return () => clearTimeout(t);
  }, [orderId, status, attempts]);

  const ref = reference ?? orderId.slice(-8).toUpperCase();

  if (status === 'completed') {
    return (
      <p className="mt-1.5 text-green-700 font-medium text-xs">
        ✅ Payment confirmed! · <span className="font-mono text-[10px]">Order {ref}</span>
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <p className="mt-1.5 text-red-600 font-medium text-xs">
        ❌ Payment not completed. · <span className="font-mono text-[10px]">Order {ref}</span>
      </p>
    );
  }

  return (
    <p className="mt-1.5 text-green-600 font-mono text-[10px] flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      Order {ref} · waiting for confirmation…
    </p>
  );
}

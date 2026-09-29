'use client';

import type { Message, ToolInvocation } from 'ai';
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
      const r = invocation.result as { paymentUrl?: string; totalAmount?: number; success: boolean };
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
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Pay with Card →
          </a>
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
      const r = invocation.result as { success: boolean; orderId?: string };
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
                <OrderStatusPoll orderId={r.orderId} />
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

function OrderStatusPoll({ orderId }: { orderId: string }) {
  return (
    <p className="mt-1.5 text-green-600 font-mono text-[10px]">
      Order: {orderId.slice(-8).toUpperCase()}
    </p>
  );
}

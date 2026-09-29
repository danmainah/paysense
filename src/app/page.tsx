import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI Assistant Online
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            TechNairobi<br />
            <span className="text-blue-200">Electronics</span>
          </h1>

          <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto">
            Ask our AI assistant about products, prices, and delivery — then pay instantly via M-Pesa or card without leaving the chat.
          </p>

          <Link
            href="/chat"
            className="inline-block bg-white text-blue-900 font-bold text-lg px-10 py-4 rounded-full hover:bg-blue-50 transition-colors shadow-xl"
          >
            Start Shopping →
          </Link>

          <p className="mt-6 text-blue-300 text-sm">
            Try asking: <em>&quot;Do you deliver to Kisumu? Can I pay with M-Pesa?&quot;</em>
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            {
              icon: '🤖',
              title: 'AI-Powered Q&A',
              body: 'Accurate answers from our real product catalog and policies — no guessing.',
            },
            {
              icon: '📱',
              title: 'M-Pesa Payments',
              body: 'Pay via STK push without leaving the chat. Fast and familiar for Kenyans.',
            },
            {
              icon: '💳',
              title: 'Card Payments',
              body: 'Visa / Mastercard accepted via Stripe Checkout. International buyers welcome.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-blue-200 text-sm">{f.body}</p>
            </div>
          ))}
        </div>

        <p className="text-center mt-12 text-blue-400 text-xs">
          <Link href="/admin" className="hover:text-blue-200 transition-colors">
            Admin dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}

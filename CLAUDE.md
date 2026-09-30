# PaySense

AI shop assistant that answers questions (RAG over uploaded docs) and collects payment via Stripe or M-Pesa — all inside the chat window.

Demo shop: **TechNairobi Electronics** (Nairobi, Kenya).

## Tech Stack

- **Framework**: Next.js 14 App Router + TypeScript
- **Styling**: Tailwind CSS
- **AI / Streaming**: Vercel AI SDK v4 (`ai@4`, `@ai-sdk/google@1`)
- **LLM**: `gemini-3.5-flash-lite` — free tier via Google AI Studio (chat + tool calling). It's a *thinking* model, so multi-step tool calls need the `thought_signature` patch (see Gotchas).
- **Embeddings**: Google `gemini-embedding-001` (3072-dim) via `@google/generative-ai` — free
- **Database**: Postgres + pgvector via Prisma ORM (Neon/Supabase)
- **Payments**: Stripe Checkout + M-Pesa Daraja STK Push
- **Auth**: NextAuth v4 credentials (single admin)

## Common Commands

```bash
npm run dev           # start dev server on :3000
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run db:generate   # regenerate Prisma client
npm run db:push       # push schema to database (no migration files)
npm run db:seed       # seed demo shop knowledge (needs OPENAI_API_KEY)
npm run db:studio     # open Prisma Studio
npm run hash-password <pw>  # bcrypt hash for ADMIN_PASSWORD_HASH
```

## Key Patterns

- **RAG flow**: user message → Google embedding → pgvector cosine search → top-5 chunks + the live product catalog injected into the system prompt → Gemini streams the answer.
- **Product catalog**: managed in `/admin/products` (CRUD via `/api/admin/products`), stored in the `products` table, and injected into the chat system prompt by `getProductCatalog()` — the assistant treats it as authoritative for names/prices/availability.
- **Tool calling**: the model calls `create_stripe_checkout`, `mpesa_stk_push`, or `lookup_order`; tools run server-side, price recalculated from intent — never trust the model's amount directly. Every order gets an 8-char `reference` (see `lib/orders.ts`) shown to the customer and used for lookup.
- **Webhooks**: `/api/webhooks/stripe` and `/api/webhooks/mpesa` update `orders.status` (signatures verified first) and send an email receipt via `lib/email.ts` (Resend) when the order has an email.
- **Auth**: single admin via `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (bcrypt). `AdminLayout` enforces session server-side.

## File Map

```
src/
  app/
    api/
      chat/route.ts           ← RAG + streaming tool calling
      upload/route.ts         ← PDF/markdown → chunks → embeddings
      webhooks/stripe/route.ts
      webhooks/mpesa/route.ts
      orders/[id]/route.ts    ← order status polling
      admin/documents/route.ts
      auth/[...nextauth]/route.ts
    admin/                    ← protected dashboard
    chat/                     ← customer chat UI
    login/
  components/
    chat/ChatInterface.tsx     ← useChat, streams, tool results
    chat/MessageBubble.tsx     ← renders markdown + payment widgets
    admin/
  lib/
    db.ts                      ← Prisma singleton
    embeddings.ts              ← Google gemini-embedding-001 helpers
    chunker.ts                 ← PDF/Markdown → chunks
    rag.ts                     ← retrieval + product catalog + system prompt builder
    stripe.ts                  ← Stripe client + checkout helper
    mpesa.ts                   ← Daraja STK push
    payment-tools.ts           ← create_stripe_checkout / mpesa_stk_push executors
    orders.ts                  ← order reference generation + lookup_order
    email.ts                   ← Resend receipt sender (no-op if unconfigured)
    auth.ts                    ← NextAuth options
prisma/
  schema.prisma
  seed.ts                      ← seeds TechNairobi Electronics knowledge
```

## Common Gotchas

- **`thought_signature` patch (payments depend on this).** `gemini-3.5-flash-lite` is a thinking model: it returns a `thoughtSignature` at the **part level** (sibling of `functionCall`, NOT inside it) and *requires* it echoed back on step 2 of a multi-step tool call, or the API 400s with "Function call is missing a thought_signature". `@ai-sdk/google@1.2.22` doesn't know about it — its Zod schema strips it and it never sends it back. Fixed via `patches/@ai-sdk+google+1.2.22.patch` (applied automatically by the `postinstall` → `patch-package` hook). The patch adds a module-level `Map` keyed by `toolCallId` that bridges the signature from response-parsing (`getToolCallsFromParts`) to request-rebuilding (`convertToGoogleGenerativeAIMessages`). Both `dist/index.js` (CJS) and `dist/index.mjs` (ESM, what the Next dev server actually loads) are patched. **If tool calls suddenly 400 after `npm install`, check the patch applied.**
- `ADMIN_PASSWORD_HASH` in `.env.local` must be **base64-encoded** (not raw bcrypt) — dotenv-expand strips `$` signs from unquoted values. Generate: `node -e "console.log(Buffer.from(hash).toString('base64'))"`. `auth.ts` decodes it back with `Buffer.from(val,'base64').toString('utf8')`.
- Admin credentials: email=`admin@paysense.co`, password=`admin123` (set during Day 2 setup).

- `pgvector` extension must be enabled on the database: `CREATE EXTENSION IF NOT EXISTS vector;`
- M-Pesa callback needs a **public HTTPS URL**. Use ngrok locally: `ngrok http 3000`, then set `MPESA_CALLBACK_URL=https://<id>.ngrok.io`.
- Stripe webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — this sets the webhook secret.
- `pdf-parse` is listed in `serverComponentsExternalPackages` in next.config.ts to avoid bundling issues.
- The `embedding` column is `vector(3072)` (gemini-embedding-001), created via raw SQL in `prisma/seed.ts` and declared in `schema.prisma` as `Unsupported("vector(3072)")?` so `db push` doesn't drop it. All inserts/queries use `prisma.$executeRaw` / `prisma.$queryRaw`. (An earlier note said 1536 — that was wrong.)
- **Email receipts** need `RESEND_API_KEY` (and optionally `RECEIPT_FROM_EMAIL`, default `onboarding@resend.dev`). If unset, `sendReceipt()` logs and no-ops — payments still succeed. Stripe supplies the customer email automatically; for M-Pesa the assistant must collect it (optional `email` arg on `mpesa_stk_push`).

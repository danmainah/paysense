/**
 * Seeds TechNairobi Electronics shop knowledge.
 * Run: npm run db:seed  (requires GOOGLE_GENERATIVE_AI_API_KEY + DATABASE_URL)
 */
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const embModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

const SHOP_KNOWLEDGE = `
# TechNairobi Electronics — Product Catalog & Policies

## Smartphones

### Samsung Galaxy A55
Price: KES 42,000
Display: 6.6-inch Super AMOLED, 120Hz
RAM: 8GB  |  Storage: 128GB / 256GB
Camera: 50MP triple camera
Battery: 5000mAh
Availability: In stock

### iPhone 15
Price: KES 135,000
Display: 6.1-inch Super Retina XDR
RAM: 6GB  |  Storage: 128GB / 256GB / 512GB
Camera: 48MP dual camera
Battery: Up to 20 hours talk time
Availability: In stock

### Samsung Galaxy S24
Price: KES 105,000
Display: 6.2-inch Dynamic AMOLED, 120Hz
RAM: 8GB  |  Storage: 128GB / 256GB
Camera: 50MP triple camera with AI features
Battery: 4000mAh
Availability: In stock

### Tecno Spark 20 Pro
Price: KES 22,000
Display: 6.78-inch IPS LCD, 120Hz
RAM: 8GB  |  Storage: 256GB
Camera: 108MP AI camera
Battery: 5000mAh
Availability: In stock (budget-friendly option)

## Laptops

### HP Pavilion 15 (2024)
Price: KES 65,000
Processor: Intel Core i5-1335U  |  RAM: 8GB DDR4
Storage: 512GB SSD  |  Display: 15.6-inch FHD
Battery: Up to 8 hours  |  OS: Windows 11 Home
Availability: In stock

### MacBook Air M2 (13-inch)
Price: KES 180,000
Processor: Apple M2 chip  |  RAM: 8GB unified memory (16GB: KES 215,000)
Storage: 256GB SSD (512GB: KES 200,000)
Display: 13.6-inch Liquid Retina
Battery: Up to 18 hours  |  OS: macOS Sonoma
Availability: 8GB/256GB in stock; 16GB on order (3-5 days)

### Dell Inspiron 15 3000
Price: KES 58,000
Processor: Intel Core i3-1215U  |  RAM: 8GB
Storage: 256GB SSD  |  Display: 15.6-inch FHD
Battery: Up to 7 hours  |  OS: Windows 11 Home
Availability: In stock

## Accessories

### Samsung Galaxy Buds FE
Price: KES 12,000
Battery: 6 hours (30 hours with case)  |  Bluetooth: 5.2
Active Noise Cancellation: Yes
Availability: In stock

### USB-C Hub 7-in-1
Price: KES 3,500
Ports: 3x USB-A 3.0, HDMI 4K, USB-C PD 100W, SD card, microSD
Availability: In stock

### Logitech MX Master 3S Mouse
Price: KES 9,500
Connectivity: Bluetooth + USB receiver  |  Battery: Rechargeable (70 days)
Availability: In stock

## Delivery Policy

We deliver across all 47 counties of Kenya.

Delivery timelines:
- Nairobi CBD and estates: Same day if ordered before 2 PM, next day otherwise (KES 200)
- Major towns (Mombasa, Kisumu, Nakuru, Eldoret, Thika): 1-3 business days (KES 400)
- Other counties: 3-5 business days (KES 600)

FREE delivery on all orders over KES 50,000 nationwide.

Pickup: Free pickup at our Nairobi CBD store (Mon-Sat, 8 AM–6 PM).

## Payment Methods

We accept:
- M-Pesa (most popular — STK push or Paybill 247247, Account: your order number)
- Visa and Mastercard (online secure checkout)
- Bank transfer for orders over KES 100,000 (contact us for bank details)

## Warranty Policy

All products include the manufacturer's standard warranty:
- Smartphones: 12 months
- Laptops: 12 months
- Accessories: 6 months

Warranty covers manufacturing defects only. Physical damage, liquid damage, and unauthorized repairs void the warranty.

To claim warranty, bring the product with the original receipt to our store or call us to arrange courier pickup (Nairobi only).

## Return & Exchange Policy

Returns accepted within 7 days of purchase for items in original, unused condition with all accessories and original packaging.

No returns on:
- Opened software / digital product keys
- Customized or special-order items

Exchange: Available within 14 days for a different model (price difference applies).

## Installment Plans

M-Shwari and KCB M-Pesa installment plans available:
- 3-month plan: Available on purchases over KES 30,000
- 6-month plan: Available on purchases over KES 60,000
- Requires M-Pesa registration and approval

## Contact & Store Location

Physical store: Moi Avenue, Nairobi CBD, 2nd Floor, Room 24
Phone / WhatsApp: +254 700 123 456
Email: info@technairobi.co.ke
Working hours: Monday – Saturday, 8 AM – 6 PM, Sunday: Closed

## Frequently Asked Questions

Q: Can I reserve an item without full payment?
A: Yes. Pay a 30% deposit and we'll hold the item for up to 7 days.

Q: Do you buy second-hand devices?
A: Yes, we accept trade-ins. Bring your device for evaluation; we'll give you a quote within 30 minutes.

Q: Is there a price-match guarantee?
A: Yes, we'll match any official dealer's price on identical new items in Kenya.

Q: Can I try a laptop before buying?
A: Yes, all display models are available for a hands-on test in-store.

Q: Do you offer repairs?
A: Yes, we repair phones and laptops. Free diagnosis; repair quote within 2 hours.
`;

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const CHUNK = 400;
  const OVERLAP = 40;
  const chunks: string[] = [];
  let buffer: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    buffer.push(...words);
    while (buffer.length >= CHUNK) {
      const chunk = buffer.slice(0, CHUNK).join(' ').trim();
      if (chunk.length > 60) chunks.push(chunk);
      buffer = buffer.slice(CHUNK - OVERLAP);
    }
  }
  if (buffer.length > 30) chunks.push(buffer.join(' ').trim());
  return chunks;
}

async function main() {
  // Recreate embedding column with correct 768-dim for Google embedding-001
  await prisma.$executeRaw`ALTER TABLE chunks DROP COLUMN IF EXISTS embedding`;
  await prisma.$executeRaw`ALTER TABLE chunks ADD COLUMN embedding vector(3072)`;

  console.log('Clearing existing seed data…');
  const old = await prisma.document.findFirst({
    where: { title: 'TechNairobi Product Catalog & Policies' },
  });
  if (old) await prisma.document.delete({ where: { id: old.id } });

  const chunks = chunkText(SHOP_KNOWLEDGE);
  console.log(`Creating document with ${chunks.length} chunks…`);

  const doc = await prisma.document.create({
    data: { title: 'TechNairobi Product Catalog & Policies' },
  });

  const BATCH = 20;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await Promise.all(
      batch.map((t) => embModel.embedContent(t.slice(0, 8000)).then((r) => r.embedding.values))
    );

    for (let j = 0; j < batch.length; j++) {
      const id = crypto.randomUUID();
      const vec = `[${embeddings[j].join(',')}]`;
      await prisma.$executeRaw`
        INSERT INTO chunks (id, document_id, content, embedding)
        VALUES (${id}, ${doc.id}, ${batch[j]}, ${vec}::vector)
      `;
    }
    console.log(`  embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
  }

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

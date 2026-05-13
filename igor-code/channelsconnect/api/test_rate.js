const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function test() {
  try {
    console.log('Testing rate upsert for listing 61...');
    const r = await p.rate.upsert({
      where: { listingId_date: { listingId: 61, date: new Date('2026-05-15') } },
      update: { available: false },
      create: { listingId: 61, date: new Date('2026-05-15'), price: 0, available: false, minStay: 1 }
    });
    console.log('UPSERT OK:', JSON.stringify(r));
  } catch (e) {
    console.log('UPSERT FAILED:', e.constructor.name);
    console.log('message:', e.message);
    console.log('code:', e.code);
    console.log('reason:', e.reason);
    console.log('meta:', JSON.stringify(e.meta));
  }
  await p.$disconnect();
}

test();
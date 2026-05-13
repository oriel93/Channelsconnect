const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const dbUrl = 'postgresql://postgres.ncaacrnkdgymcxaxnzcw:Channelsconnect!2026@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
  
  // Check rate table for listing 61 dates
  const rates61 = await prisma.rate.findMany({
    where: { listingId: 61 },
    orderBy: { date: 'asc' }
  });
  console.log('Rates for listing 61:', JSON.stringify(rates61.map(r => ({listingId: r.listingId, date: r.date.toISOString().slice(0,10), price: r.price, available: r.available}))));

  // Check syncLog for listing 61
  const logs61 = await prisma.syncLog.findMany({
    where: { 
      message: { contains: '61::' },
      syncType: 'channex_ari'
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('\nSyncLog for listing 61:', JSON.stringify(logs61.map(l => ({id: l.id, status: l.status, message: l.message, createdAt: l.createdAt}))));

  // Also check the booking's listing 61 mapping
  const listing61 = await prisma.listing.findUnique({
    where: { id: 61 },
    select: { 
      id: true, 
      title: true, 
      userId: true, 
      channexPropertyId: true, 
      channexRoomId: true,
      channexRatePlanId: true 
    }
  });
  console.log('\nListing 61 details:', JSON.stringify(listing61));

  const map61 = await prisma.channexMapping.findFirst({ where: { listingId: 61 } });
  console.log('\nMapping for 61:', JSON.stringify(map61));
}

main().finally(() => prisma.$disconnect()).catch(console.error);
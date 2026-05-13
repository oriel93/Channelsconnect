const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Check ChannexMapping for listing 61
  const map61 = await prisma.channexMapping.findFirst({ where: { listingId: 61 } });
  console.log('Mapping for 61:', JSON.stringify(map61, (k, v) => k === 'createdAt' || k === 'updatedAt' || k === 'lastSyncAt' ? v?.toISOString?.() : v, 2));

  // Check listing 61 channex fields
  const listing61 = await prisma.listing.findUnique({
    where: { id: 61 },
    select: { 
      id: true, title: true, userId: true, 
      channexPropertyId: true, channexRoomId: true 
    }
  });
  console.log('\nListing 61:', JSON.stringify(listing61, null, 2));

  // Check all mappings for the new user's userId (c600fa35...)
  const userMaps = await prisma.channexMapping.findMany({
    where: { userId: 'c600fa35-3278-4776-9518-95f2b8a8b461' },
    orderBy: { createdAt: 'desc' }
  });
  console.log('\nAll mappings for new user:', JSON.stringify(userMaps.length), userMaps.map(m => ({listingId: m.listingId, propId: m.channexPropertyId, roomId: m.channexRoomTypeId})));

  // Check recent syncLog entries
  const recentLogs = await prisma.syncLog.findMany({
    where: { syncType: 'channex_ari' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('\nRecent syncLogs:', JSON.stringify(recentLogs.map(l => ({id: l.id, status: l.status, message: l.message, createdAt: l.createdAt?.toISOString()}))));

  // Check rates table for listing 35 (cert property)
  const rates35 = await prisma.rate.findMany({
    where: { listingId: 35 },
    orderBy: { date: 'asc' },
    take: 3
  });
  console.log('\nRates for listing 35 (cert):', JSON.stringify(rates35.map(r => ({listingId: r.listingId, date: r.date?.toISOString?.()?.slice(0,10), price: r.price, available: r.available}))));
}

main().finally(() => prisma.$disconnect()).catch(console.error);
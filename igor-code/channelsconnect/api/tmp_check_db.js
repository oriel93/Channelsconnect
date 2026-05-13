const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const dbUrl = 'postgresql://postgres.ncaacrnkdgymcxaxnzcw:Channelsconnect!2026@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
  // Check listing 61
  const listing61 = await prisma.listing.findUnique({
    where: { id: 61 },
    select: { id: true, title: true, userId: true, channexPropertyId: true, channexRoomId: true }
  });
  console.log('Listing 61:', JSON.stringify(listing61));

  const map61 = await prisma.channexMapping.findFirst({ where: { listingId: 61 } });
  console.log('Map 61:', JSON.stringify(map61));

  const certMaps = await prisma.channexMapping.findMany({
    where: { userId: '1d63e070-dbff-48b8-ba2a-be8ba3a41ae8' },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log('Cert user mappings:', JSON.stringify(certMaps));

  const recent = await prisma.booking.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent bookings:', JSON.stringify(recent.map(b => ({id: b.id, listingId: b.listingId, guestName: b.guestName, status: b.status}))));
}

main().finally(() => prisma.$disconnect()).catch(console.error);
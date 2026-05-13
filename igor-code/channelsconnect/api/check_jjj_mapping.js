const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Get listing 61 full details
  const listing = await p.listing.findUnique({ where: { id: 61 } });
  console.log('Listing 61:', JSON.stringify(listing, null, 2));
  
  // Get channex mapping for listing 61
  const mapping = await p.channexMapping.findFirst({ where: { listingId: 61 } });
  console.log('\nMapping for listing 61:', JSON.stringify(mapping, null, 2));
  
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });

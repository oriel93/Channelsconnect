const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.booking.findMany({ 
  orderBy: { createdAt: 'desc' }, 
  take: 10,
  include: { listing: { select: { id: true, title: true } } }
}).then(bs => {
  bs.forEach(b => console.log('id:', b.id, 'listing:', b.listingId, b.listing.title, b.guestName, b.checkIn?.toString().slice(0,10), '→', b.checkOut?.toString().slice(0,10), b.status));
  p.$disconnect();
}).catch(e => { console.error(e.message); p.$disconnect(); });

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.syncLog.findMany({
  orderBy: { createdAt: 'desc' },
  take: 20,
  where: { syncType: 'channex_ari' }
}).then(logs => {
  logs.forEach(l => {
    const d = l.details || {};
    console.log('id:', l.id, 'status:', l.status, 'listing:', d.listingId, 'date:', d.date, 'prop:', d.channexPropertyId?.slice(0,8), 'msg:', l.message?.slice(0,40));
  });
  p.$disconnect();
}).catch(e => { console.error(e.message); p.$disconnect(); });

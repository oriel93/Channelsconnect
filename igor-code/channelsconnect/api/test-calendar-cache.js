/**
 * Test script for Calendar Cache functionality
 * Run with: node test-calendar-cache.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCalendarCache() {
  console.log('=================================');
  console.log('Calendar Cache Test');
  console.log('=================================\n');

  try {
    // Test 1: Get a listing with beds24RoomId
    console.log('1. Finding a listing with Beds24 Room ID...');
    const listing = await prisma.listing.findFirst({
      where: {
        beds24RoomId: { not: null },
      },
      select: {
        id: true,
        title: true,
        beds24RoomId: true,
      },
    });

    if (!listing) {
      console.log('❌ No listing found with Beds24 Room ID');
      return;
    }

    console.log(`✓ Found listing: ${listing.title}`);
    console.log(`  ID: ${listing.id}`);
    console.log(`  Beds24 Room ID: ${listing.beds24RoomId}\n`);

    // Test 2: Check if calendar cache exists
    console.log('2. Checking existing calendar cache...');
    const existingCache = await prisma.calendar.count({
      where: { listingId: listing.id },
    });
    console.log(`  Found ${existingCache} cached entries\n`);

    // Test 3: Show sample cached data if exists
    if (existingCache > 0) {
      console.log('3. Sample cached calendar data:');
      const sampleCache = await prisma.calendar.findMany({
        where: { listingId: listing.id },
        orderBy: { date: 'asc' },
        take: 5,
      });

      sampleCache.forEach((entry, idx) => {
        console.log(`  [${idx + 1}] Date: ${entry.date.toISOString().split('T')[0]}`);
        console.log(`      Price: $${entry.price}`);
        console.log(`      Min Stay: ${entry.minStay} nights`);
        console.log(`      Available: ${entry.numAvail}`);
        console.log(`      Override: ${entry.override}`);
      });
      console.log('');
    }

    // Test 4: Show calendar table structure
    console.log('4. Calendar Table Info:');
    const cacheStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_entries,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(DISTINCT "listingId") as unique_listings
      FROM calendar
    `;
    console.log('  Cache Statistics:');
    console.log(`    Total entries: ${cacheStats[0].total_entries}`);
    console.log(`    Unique listings: ${cacheStats[0].unique_listings}`);
    console.log(`    Date range: ${cacheStats[0].earliest_date?.toISOString().split('T')[0]} to ${cacheStats[0].latest_date?.toISOString().split('T')[0]}`);
    console.log('');

    console.log('=================================');
    console.log('Test Complete!');
    console.log('=================================');
    console.log('\nTo sync calendar from Beds24, use the API endpoint:');
    console.log(`POST http://localhost:3001/calendar/sync/${listing.id}`);
    console.log('\nOr use the calendar service directly in your NestJS application.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCalendarCache();

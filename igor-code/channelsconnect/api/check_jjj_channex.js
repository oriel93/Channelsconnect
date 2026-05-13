const axios = require('axios');

// Check availability for jjj's Channex property for the booking dates
const PROP_ID = 'd2c3079d-ba58-40cc-8e4f-586400461d5f';
const ROOM_ID = '1aa2a855-a9aa-4e61-a780-2ec16b6c65c9';

async function check() {
  // Get the API key from the ECS container via the health endpoint's config
  const health = await axios.get('https://api.channelsconnect.com/health').catch(() => null);
  
  // We need the actual Channex API key - try from env file
  const fs = require('fs');
  const path = require('path');
  
  // Try to read from .env files
  const possiblePaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env.production'),
  ];
  
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/CHANNEX_API_KEY=(.+)/);
        if (match) {
          console.log('Found API key in:', p);
          return match[1];
        }
      }
    } catch (e) {}
  }
  
  console.log('No API key found in env files');
  return null;
}

check().then(key => {
  console.log('API key prefix:', key ? key.slice(0, 8) + '...' : 'NOT FOUND');
  if (key) {
    // Check availability for dates May 14-25
    const dates = ['2026-05-14','2026-05-15','2026-05-16','2026-05-17','2026-05-18','2026-05-20','2026-05-21','2026-05-22','2026-05-23','2026-05-24','2026-05-25'];
    return Promise.all(dates.map(async (date) => {
      try {
        const res = await axios.get(
          `https://staging.channex.io/api/v1/restrictions?filter[property_id]=${PROP_ID}&filter[date][gte]=${date}&filter[date][lte]=${date}&filter[restrictions]=availability`,
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        );
        const attrs = res.data?.data?.[0]?.attributes;
        console.log(`${date}: availability=${attrs?.availability ?? 'null'}, rate=${attrs?.rate ?? 'null'}`);
      } catch (e) {
        console.log(`${date}: ERROR ${e.response?.status} ${e.response?.data?.message || e.message}`);
      }
    }));
  }
}).catch(console.error);

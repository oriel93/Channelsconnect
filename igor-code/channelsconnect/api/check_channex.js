const axios = require('axios');
const apiKey = process.env.CHANNEX_API_KEY || 'test';

async function check() {
  // Check availability for listing 61's Channex property for the booking dates
  const dates = ['2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'];
  
  for (const date of dates) {
    try {
      const res = await axios.get(
        `https://staging.channex.io/api/v1/restrictions?filter[property_id]=d2c3079d-ba58-40cc-8e4f-586400461d5f&filter[date][gte]=${date}&filter[date][lte]=${date}&filter[restrictions]=availability`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const attrs = res.data?.data?.[0]?.attributes;
      console.log(date, 'availability:', attrs?.availability, 'rate:', attrs?.rate);
    } catch (e) {
      console.log(date, 'ERROR:', e.response?.data?.message || e.message);
    }
  }
}
check().catch(console.error);

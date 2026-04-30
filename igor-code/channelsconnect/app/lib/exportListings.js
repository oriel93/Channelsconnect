/**
 * exportListings.js — Frontend-only CSV export utility
 *
 * No backend calls. Reads from the listings array already in React state.
 * Safe: zero changes to Channex sync, webhook, or ARI logic.
 */

/**
 * Parse a field that might be a JSON string, array, or object.
 * Returns the raw value or a safe fallback.
 */
function safeParse(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

/**
 * Extract room count from a listing.
 * Tries: bedrooms → rooms array length → propertyData.bedrooms → 0
 */
function getRooms(listing) {
  if (listing.bedrooms != null) return listing.bedrooms;
  const pd = safeParse(listing.propertyData);
  if (pd?.bedrooms != null) return pd.bedrooms;
  const rooms = safeParse(listing.rooms);
  if (Array.isArray(rooms)) return rooms.length;
  return '';
}

/**
 * Extract bathroom count from a listing.
 */
function getBathrooms(listing) {
  if (listing.bathrooms != null) return listing.bathrooms;
  const pd = safeParse(listing.propertyData);
  if (pd?.bathrooms != null) return pd.bathrooms;
  return '';
}

/**
 * Extract amenities as a pipe-separated string.
 */
function getAmenities(listing) {
  let amenities = listing.amenities;
  const parsed = safeParse(amenities, []);
  if (Array.isArray(parsed)) return parsed.filter(Boolean).join(' | ');
  if (typeof parsed === 'string') return parsed;
  return '';
}

/**
 * Map listings array to export-ready rows.
 */
function mapListingsToRows(listings) {
  return listings.map((l) => ({
    'Title': l.title || l.name || '',
    'Property Type': l.property_type || l.propertyType || '',
    'Bedrooms / Rooms': getRooms(l),
    'Bathrooms': getBathrooms(l),
    'Max Guests': l.max_guests || l.maxGuests || '',
    'City': l.city || '',
    'Country': l.country || '',
    'Amenities': getAmenities(l),
    'Source': l.source || (l.airbnbListingId ? 'Airbnb' : 'Manual') || '',
    'Active': l.isActive || l.is_active ? 'Yes' : 'No',
    'Created': l.created_date ? new Date(l.created_date).toLocaleDateString() : '',
  }));
}

/**
 * Convert an array of objects to a CSV string.
 * Handles values that contain commas or quotes.
 */
function toCSV(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const str = v == null ? '' : String(v);
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

/**
 * Download listings as a CSV file.
 * Triggers a browser download — no network requests made.
 *
 * @param {Array} listings - The listings array from React state
 */
export function downloadListingsCSV(listings) {
  if (!listings || listings.length === 0) {
    alert('No listings to export.');
    return;
  }

  const rows = mapListingsToRows(listings);
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `channelsconnect-listings-${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

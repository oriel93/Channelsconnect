import React from 'react';

export default function AmenitiesList({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-slate-500">—</p>;
  }

  // Ensure items is an array
  const amenities = Array.isArray(items) ? items : [];

  return (
    <ul className="grid grid-cols-2 gap-x-8 gap-y-2 list-disc list-inside text-slate-700">
      {amenities.map((amenity, i) => (
        <li key={i}>{amenity}</li>
      ))}
    </ul>
  );
}
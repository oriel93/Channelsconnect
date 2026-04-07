import React from 'react';

export default function PriceBadge({ price, currency }) {
  if (price == null || !currency) {
    return <span className="text-slate-500">—</span>;
  }

  return (
    <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-lg">
      {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(price)}
      <span className="text-sm font-normal ml-1">/ night</span>
    </span>
  );
}
/**
 * PropertyList.jsx — Clean property grid view.
 *
 * Replaces TapeChart.jsx. Preserves data-fetching logic (api.listings.getAll)
 * but removes the broken date-picker / virtualised timeline UI entirely.
 *
 * RED ZONE: does NOT import or modify channex-sync.service.ts, webhook handlers,
 *           or ARI batching logic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  RefreshCw, Search, Home, MapPin, DollarSign, Users, Star,
  CheckCircle, AlertCircle, Clock,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function syncBadge(status) {
  const map = {
    completed: { label: 'Synced',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    syncing:   { label: 'Syncing…',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700 border-red-200' },
    idle:      { label: 'Idle',      cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  const s = status?.toLowerCase?.() || 'idle';
  return map[s] || map.idle;
}

function SyncIcon({ status }) {
  const s = status?.toLowerCase?.() || 'idle';
  if (s === 'syncing')   return <Clock   className="w-3.5 h-3.5 animate-spin" />;
  if (s === 'completed') return <CheckCircle className="w-3.5 h-3.5" />;
  if (s === 'failed')    return <AlertCircle className="w-3.5 h-3.5" />;
  return null;
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ listing }) {
  const badge = syncBadge(listing.syncStatus);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border border-slate-200 overflow-hidden">
      {/* Cover image */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {listing.images?.[0] || listing.mainImage || listing.imageUrl ? (
          <img
            src={listing.images?.[0] || listing.mainImage || listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Home className="w-12 h-12" />
          </div>
        )}

        {/* Sync badge — top-right */}
        <span
          className={`absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}
        >
          <SyncIcon status={listing.syncStatus} />
          {badge.label}
        </span>
      </div>

      <CardContent className="p-4 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">
          {listing.title || 'Untitled Property'}
        </h3>

        {/* Location */}
        {(listing.city || listing.state || listing.country) && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {[listing.city, listing.state, listing.country].filter(Boolean).join(', ')}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          {listing.basePrice != null && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              <span className="font-medium">{Number(listing.basePrice).toFixed(0)}</span>
              <span className="text-slate-400">/night</span>
            </span>
          )}
          {listing.maxGuests != null && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Users className="w-3 h-3 text-blue-500" />
              <span>{listing.maxGuests} guests</span>
            </span>
          )}
          {listing.rating != null && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span>{Number(listing.rating).toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Property type */}
        {listing.propertyType && (
          <Badge variant="outline" className="text-xs capitalize border-slate-200 text-slate-500">
            {listing.propertyType}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PropertyList() {
  const { user } = useAuth();

  const [listings,  setListings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [query,     setQuery]     = useState('');

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listings.getAll();
      // API may return { data: [...] } or the array directly
      const list = Array.isArray(res?.data) ? res.data
                 : Array.isArray(res)       ? res
                 : [];
      setListings(list);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load properties';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = listings.filter((l) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q)  ||
      l.state?.toLowerCase().includes(q) ||
      l.propertyType?.toLowerCase().includes(q)
    );
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Home className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800 leading-none">Property List</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? 'Loading…' : `${filtered.length} of ${listings.length} properties`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search properties…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9 w-48 sm:w-56 text-sm"
              />
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchListings}
              disabled={loading}
              className="h-9 gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-slate-600 text-sm max-w-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchListings}>
              Try again
            </Button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 overflow-hidden animate-pulse">
                <div className="h-44 bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — fetched but nothing matches */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Home className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 font-medium">
              {query ? 'No properties match your search.' : 'No properties found.'}
            </p>
            {query && (
              <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        )}

        {/* Property grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

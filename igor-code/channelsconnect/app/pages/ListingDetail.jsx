/**
 * ListingDetail.jsx — Customer-facing property detail view
 *
 * RBAC rules enforced here:
 *   - Raw system IDs (beds24PropId, beds24RoomId, userId, externalId,
 *     latitude/longitude coordinates) are hidden from role='user'.
 *   - "Integration Details" card is admin-only.
 *   - reviewStatus is displayed as a friendly badge, never as a raw enum string.
 *   - isActive shown as "Live" / "Pending" (not the boolean).
 */

import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { useAuth } from '@/lib/authContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Listing } from '@/api/entities';
import {
  Loader2, MapPin, Users, Bed, Bath, Calendar,
  Settings, Home, ArrowLeft, ShieldCheck,
} from 'lucide-react';

// ─── Status helpers ───────────────────────────────────────────────────────────

function ReviewBadge({ reviewStatus, isActive }) {
  if (reviewStatus === 'pending_admin_review') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs">
        ⏳ Pending Approval
      </Badge>
    );
  }
  if (reviewStatus === 'rejected') {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">
        ✗ Not Approved
      </Badge>
    );
  }
  if (reviewStatus === 'archived') {
    return (
      <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs">
        Archived
      </Badge>
    );
  }
  // approved or null
  return isActive ? (
    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
      🚀 Live
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">
      Inactive
    </Badge>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="bg-slate-100 p-2 rounded-lg shrink-0">
      <Icon className="w-4 h-4 text-slate-600" />
    </div>
    <div className="min-w-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-medium text-slate-900 truncate">{value}</p>
    </div>
  </div>
);

// ─── Main content ─────────────────────────────────────────────────────────────

const ListingDetailContent = () => {
  const [listing, setListing]     = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);
  const { isAdmin }               = useAuth();
  const location                  = useLocation();
  const listingId                 = new URLSearchParams(location.search).get('id');

  useEffect(() => {
    if (!listingId) {
      setError('No listing ID provided.');
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await Listing.findOne(listingId);
        setListing(data);
        document.title = `${data.title} | Channels Connect`;
      } catch (err) {
        console.error('Failed to fetch listing details', err);
        setError('Could not load listing details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [listingId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-red-50 rounded-lg gap-4 p-8">
        <Home className="w-12 h-12 text-red-400" />
        <h3 className="text-xl font-semibold text-red-700">Something went wrong</h3>
        <p className="text-red-600 text-sm text-center">{error}</p>
        <Link to={createPageUrl('Listings')}>
          <Button variant="outline">Back to Listings</Button>
        </Link>
      </div>
    );
  }

  if (!listing) return null;

  const locationString = [listing.city, listing.state, listing.country].filter(Boolean).join(', ');

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <Link to={createPageUrl('Listings')} className="inline-flex items-center text-slate-500 hover:text-slate-900 text-sm gap-1.5">
        <ArrowLeft className="w-4 h-4" />
        Back to Properties
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Home className="w-7 h-7 text-slate-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{listing.title}</h1>
              {locationString && (
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{locationString}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <ReviewBadge reviewStatus={listing.reviewStatus} isActive={listing.isActive} />
                {listing.propertyType && (
                  <Badge variant="outline" className="text-xs capitalize">{listing.propertyType}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailItem icon={Home}  label="Property Type" value={listing.propertyType || 'Not specified'} />
            <DetailItem icon={Users} label="Max Guests"    value={listing.maxGuests    || 'Not specified'} />
            <DetailItem icon={Bed}   label="Bedrooms"      value={listing.bedrooms     || 'Not specified'} />
            <DetailItem icon={Bath}  label="Bathrooms"     value={listing.bathrooms    || 'Not specified'} />
          </CardContent>
        </Card>

        {/* Location — admin sees coordinates; user sees only address */}
        {listing.address && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-slate-700">{listing.address}</p>
              {listing.postalCode && <p className="text-slate-500">{listing.postalCode}</p>}
              {/* Coordinates — admin only */}
              {isAdmin && listing.latitude && listing.longitude && (
                <p className="text-xs text-slate-400 font-mono">
                  {listing.latitude}, {listing.longitude}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Management actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" />Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={createPageUrl('Dashboard')} className="block">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Calendar className="w-4 h-4" />View Calendar
              </Button>
            </Link>
            <Link to={createPageUrl('TapeChart')} className="block">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Calendar className="w-4 h-4" />Open Tape Chart
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* ── Admin-only: Integration details ───────────────────────────────── */}
        {isAdmin && (listing.beds24PropId || listing.beds24RoomId || listing.userId) && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                <ShieldCheck className="w-4 h-4" />
                Integration Details
                <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-[10px] ml-auto">
                  Admin Only
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {listing.beds24PropId && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Property ID</p>
                  <p className="font-mono text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                    {listing.beds24PropId}
                  </p>
                </div>
              )}
              {listing.beds24RoomId && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Room ID</p>
                  <p className="font-mono text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                    {listing.beds24RoomId}
                  </p>
                </div>
              )}
              {listing.userId && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Owner User ID</p>
                  <p className="font-mono text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                    {listing.userId}
                  </p>
                </div>
              )}
              {listing.reviewStatus && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Review Status</p>
                  <p className="font-mono text-xs text-slate-600">{listing.reviewStatus}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
              {listing.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stay Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Currency</p>
              <p className="font-medium text-slate-900">{listing.currency || 'USD'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Minimum Nights</p>
              <p className="font-medium text-slate-900">{listing.minNights || 1}</p>
            </div>
            {listing.maxNights && (
              <div>
                <p className="text-slate-500 text-xs">Maximum Nights</p>
                <p className="font-medium text-slate-900">{listing.maxNights}</p>
              </div>
            )}
            {listing.checkInTime && (
              <div>
                <p className="text-slate-500 text-xs">Check-in Time</p>
                <p className="font-medium text-slate-900">{listing.checkInTime}</p>
              </div>
            )}
            {listing.checkOutTime && (
              <div>
                <p className="text-slate-500 text-xs">Check-out Time</p>
                <p className="font-medium text-slate-900">{listing.checkOutTime}</p>
              </div>
            )}
            <div>
              <p className="text-slate-500 text-xs">Listed Since</p>
              <p className="font-medium text-slate-900">
                {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function ListingDetail() {
  return (
    <NewLoginRequired>
      <AppLayout>
        <ListingDetailContent />
      </AppLayout>
    </NewLoginRequired>
  );
}

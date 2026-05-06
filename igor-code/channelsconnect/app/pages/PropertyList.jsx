/**
 * PropertyList.jsx — Property Management Hub
 *
 * Three integrated panels per property:
 *   1. Property card (summary, status, quick actions)
 *   2. Tape chart row (90-day scrollable, bookings + rates + blocks)
 *   3. Side drawer (iCal import/export, rate override, PriceLabs markup)
 *
 * Data flow:
 *   - Listings:  GET /listings          → property rows
 *   - Bookings:  GET /bookings?listingId → booking pills
 *   - Rates:     GET /calendar/rates     → per-day rate cells
 *   - Blocked:   GET /calendar/blocked-dates → grey cells
 *   - iCal:      GET /ical/connections   → per-property iCal feeds
 *
 * Write flow (RED ZONE safe — no direct Channex calls):
 *   - Rate update:  POST /calendar/rates/bulk  → applyChange queue
 *   - Block dates:  POST /calendar/block/bulk
 *   - iCal add:     POST /ical/connections
 *   - iCal sync:    POST /ical/sync/:id
 *   - iCal export:  GET  /listings/:id/calendar.ics
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { format, addDays, parseISO, isToday, isWeekend, startOfDay, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/apiClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import AppLayout from '@/components/app/AppLayout';
import {
  ChevronLeft, ChevronRight, RefreshCw, Search, Settings2,
  Calendar, Link2, Download, Upload, Loader2, X, Check,
  DollarSign, Lock, Unlock, Copy, ExternalLink, Percent,
  Plus, Trash2, AlertCircle,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_VISIBLE  = 365;
const COL_W         = 34;   // px per day cell
const PROP_COL_W    = 220;  // px for sticky property name column

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateKey(d) { return format(d, 'yyyy-MM-dd'); }

function buildDateRange(start, count) {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

// All bookings render identically — availability is what matters, not channel source
function bookingBg() { return 'bg-slate-700'; }

// ─── Build lookup maps from API data ─────────────────────────────────────────

function buildMaps(rates = [], blocked = [], bookings = []) {
  const rateMap    = {};   // `${listingId}_${date}` → { price, minStay, available }
  const blockMap   = {};   // `${listingId}_${date}` → true
  const bookingMap = {};   // listingId → [ ...booking segments ]

  for (const r of rates) {
    rateMap[`${r.listingId}_${r.date?.slice(0, 10)}`] = r;
  }
  for (const b of blocked) {
    const dk = b.date?.slice(0, 10) || dateKey(parseISO(b.date));
    blockMap[`${b.listingId}_${dk}`] = true;
  }
  for (const bk of bookings) {
    const lid = bk.listingId;
    if (!bookingMap[lid]) bookingMap[lid] = [];
    bookingMap[lid].push(bk);
  }

  return { rateMap, blockMap, bookingMap };
}

// ─── Inline rate editor cell ──────────────────────────────────────────────────

function RateCell({ listingId, date, rateMap, blockMap, bookedDates, onEdit }) {
  const dk      = dateKey(date);
  const key     = `${listingId}_${dk}`;
  const r       = rateMap[key];
  const blocked = blockMap[key];
  const booked  = bookedDates?.[key];
  const today   = isToday(date);
  const weekend = isWeekend(date);

  // Availability-first colour logic
  let bg        = weekend ? 'bg-slate-50' : 'bg-white';
  let textColor = 'text-slate-400';
  if (today)   { bg = 'bg-blue-50'; }
  if (blocked) { bg = 'bg-slate-300'; textColor = 'text-slate-500'; }
  // booked cells are handled entirely by the pill overlay — cell stays white

  return (
    <div
      className={`relative flex flex-col items-center justify-center border-r border-b border-slate-100 cursor-pointer group transition-colors hover:bg-blue-50 ${bg} ${today ? 'ring-inset ring-1 ring-blue-300' : ''}`}
      style={{ width: COL_W, minWidth: COL_W, height: 52 }}
      onClick={() => !booked && onEdit(listingId, date, r)}
      title={blocked ? 'Blocked — click to unblock' : booked ? 'Booked' : r?.price ? `$${r.price} — click to edit` : 'Available — click to set rate'}
    >
      {blocked && <Lock className="w-3 h-3 text-slate-500" />}
      {!blocked && !booked && r?.price && (
        <span className={`text-[9px] font-semibold leading-none ${textColor} group-hover:text-blue-600`}>
          ${Number(r.price).toFixed(0)}
        </span>
      )}
      {!blocked && !booked && !r?.price && (
        <span className="text-[8px] text-slate-200 group-hover:text-blue-300">•</span>
      )}
      {r?.minStay && r.minStay > 1 && !blocked && !booked && (
        <span className="text-[7px] text-slate-300 leading-none mt-0.5">{r.minStay}n</span>
      )}
    </div>
  );
}

// ─── Booking pills ────────────────────────────────────────────────────────────

function BookingPills({ listingId, dates, bookingMap, onClickBooking }) {
  const bookings  = bookingMap[listingId] || [];
  const startDate = dates[0];
  const endDate   = dates[dates.length - 1];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
      {bookings.map((bk) => {
        const cin  = startOfDay(parseISO(bk.checkIn));
        const cout = startOfDay(parseISO(bk.checkOut));
        if (cout <= startDate || cin > endDate) return null;

        const offsetDays = Math.max(0, differenceInDays(cin, startDate));
        const spanDays   = Math.min(
          differenceInDays(cout, cin),
          differenceInDays(endDate, cin) + 1,
          DAYS_VISIBLE - offsetDays,
        );
        if (spanDays <= 0) return null;

        const left  = offsetDays * COL_W + 2;
        const width = spanDays  * COL_W - 4;

        return (
          <div
            key={bk.id}
            className="absolute top-1 h-[34px] rounded-md flex items-center px-2 pointer-events-auto cursor-pointer shadow-sm bg-slate-700 hover:bg-slate-800 transition-colors"
            style={{ left, width, zIndex: 10 }}
            onClick={() => onClickBooking(bk)}
            title={`${bk.guestName} · ${bk.checkIn} → ${bk.checkOut}`}
          >
            <span className="text-white text-[10px] font-medium truncate">{bk.guestName}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Rate edit dialog ─────────────────────────────────────────────────────────

function RateEditDialog({ open, onClose, onSave, listingId, date, existing }) {
  const [rate, setRate]       = useState('');
  const [minStay, setMinStay] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRate(existing?.price ? String(Number(existing.price)) : '');
      setMinStay(existing?.minStay ? String(existing.minStay) : '');
      setBlocked(false);
    }
  }, [open, existing]);

  const save = async () => {
    setLoading(true);
    try {
      if (blocked) {
        await api.calendar.blockDate({ listingId, date: dateKey(date) });
        toast.success('Date blocked');
      } else {
        if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) {
          toast.error('Enter a valid rate');
          return;
        }
        await api.calendar.updateRate({
          listingId,
          date:    dateKey(date),
          price:   Number(rate),
          minStay: minStay ? Number(minStay) : undefined,
        });
        toast.success('Rate updated');
      }
      onSave();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-blue-600" />
            {date ? format(date, 'EEEE, MMM d yyyy') : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <button
              onClick={() => setBlocked(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${!blocked ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Set Rate
            </button>
            <button
              onClick={() => setBlocked(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${blocked ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Block Date
            </button>
          </div>

          {!blocked && (
            <>
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Nightly Rate</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="number"
                    min="0"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="pl-10"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Min Stay (nights)</Label>
                <Input
                  type="number"
                  min="1"
                  value={minStay}
                  onChange={(e) => setMinStay(e.target.value)}
                  placeholder="1"
                />
              </div>
            </>
          )}

          {blocked && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">This date will be closed to new bookings.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={save} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {blocked ? 'Block' : 'Save Rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Booking detail drawer ────────────────────────────────────────────────────

function BookingDrawer({ booking, onClose }) {
  if (!booking) return null;
  const nights = differenceInDays(parseISO(booking.checkOut), parseISO(booking.checkIn));
  return (
    <Sheet open={!!booking} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${bookingBg(booking.bookingSource)}`} />
            Booking Details
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <div>
              <p className="text-xs text-slate-500">Guest</p>
              <p className="font-semibold text-slate-900">{booking.guestName}</p>
            </div>
            {booking.guestEmail && (
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-slate-700">{booking.guestEmail}</p>
              </div>
            )}
            {booking.guestPhone && (
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm text-slate-700">{booking.guestPhone}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">Check-in</p>
              <p className="font-semibold text-sm">{format(parseISO(booking.checkIn), 'MMM d, yyyy')}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">Check-out</p>
              <p className="font-semibold text-sm">{format(parseISO(booking.checkOut), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">{nights} night{nights !== 1 ? 's' : ''} · {booking.numGuests} guest{booking.numGuests !== 1 ? 's' : ''}</span>
            <span className="font-bold text-slate-900">${Number(booking.totalPrice || 0).toFixed(2)}</span>
          </div>
          {booking.bookingSource && (
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${bookingBg(booking.bookingSource)}`} />
              <span className="text-sm text-slate-600 capitalize">{booking.bookingSource}</span>
            </div>
          )}
          {booking.externalId && (
            <div>
              <p className="text-xs text-slate-500">Ref #</p>
              <p className="text-sm font-mono text-slate-700">{booking.externalId}</p>
            </div>
          )}
          {booking.notes && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-700 font-medium mb-1">Notes</p>
              <p className="text-sm text-amber-900">{booking.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Property settings drawer (iCal + pricing) ───────────────────────────────

function PropertySettingsDrawer({ listing, onClose, onRefresh }) {
  const [icalConns, setIcalConns]       = useState([]);
  const [loadingIcal, setLoadingIcal]   = useState(true);
  const [newFeedUrl, setNewFeedUrl]     = useState('');
  const [newFeedName, setNewFeedName]   = useState('');
  const [addingFeed, setAddingFeed]     = useState(false);
  const [syncingId, setSyncingId]       = useState(null);
  const [markup, setMarkup]             = useState('');
  const [markupSaving, setMarkupSaving] = useState(false);
  const [exportUrl, setExportUrl]       = useState('');

  const lid = listing?.id;

  useEffect(() => {
    if (!lid) return;
    setLoadingIcal(true);
    api.ical.getConnections(lid)
      .then((res) => setIcalConns(res.data || []))
      .catch(() => setIcalConns([]))
      .finally(() => setLoadingIcal(false));

    // Build export URL
    const apiBase = import.meta.env.VITE_API_URL || '';
    setExportUrl(`${apiBase}/listings/${lid}/calendar.ics`);
  }, [lid]);

  const addFeed = async () => {
    if (!newFeedUrl.trim()) return;
    setAddingFeed(true);
    try {
      await api.ical.create({
        listingId: lid,
        icalUrl:   newFeedUrl.trim(),
        name:      newFeedName.trim() || 'iCal Feed',
        direction: 'import',
      });
      toast.success('iCal feed added');
      setNewFeedUrl('');
      setNewFeedName('');
      const res = await api.ical.getConnections(lid);
      setIcalConns(res.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to add feed');
    } finally {
      setAddingFeed(false);
    }
  };

  const syncFeed = async (connId) => {
    setSyncingId(connId);
    try {
      await api.ical.sync(connId);
      toast.success('Synced — bookings imported');
      onRefresh();
    } catch (e) {
      toast.error('Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const deleteFeed = async (connId) => {
    try {
      await api.ical.delete(connId);
      setIcalConns((c) => c.filter((x) => x.id !== connId));
      toast.success('Feed removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  const copyExport = () => {
    navigator.clipboard.writeText(exportUrl).then(() => toast.success('Copied!'));
  };

  const saveMarkup = async () => {
    const val = parseFloat(markup);
    if (isNaN(val)) { toast.error('Enter a valid % markup'); return; }
    setMarkupSaving(true);
    try {
      await api.listings.update(lid, { priceLabsMarkup: val });
      toast.success('Markup saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setMarkupSaving(false);
    }
  };

  if (!listing) return null;

  return (
    <Sheet open={!!listing} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{listing.title}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="ical" className="mt-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="ical">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />iCal
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />Pricing
            </TabsTrigger>
          </TabsList>

          {/* ─── iCal tab ─────────────────────────────────────────── */}
          <TabsContent value="ical" className="space-y-5 mt-4">

            {/* Export */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Export Your Calendar</p>
              <p className="text-xs text-slate-500 mb-2">
                Share this URL with Airbnb, Booking.com, or any iCal-compatible platform to block
                your confirmed bookings automatically.
              </p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <code className="text-[10px] text-slate-600 truncate flex-1">{exportUrl}</code>
                <button onClick={copyExport} className="text-blue-600 hover:text-blue-800 shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a href={exportUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Import feeds */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Import Feeds</p>
              <p className="text-xs text-slate-500 mb-3">
                Add iCal URLs from other platforms (Airbnb, VRBO, etc.) to import their bookings as
                blocked dates on your calendar.
              </p>

              {loadingIcal ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />Loading feeds…
                </div>
              ) : icalConns.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                  No iCal feeds yet
                </div>
              ) : (
                <div className="space-y-2">
                  {icalConns.map((conn) => (
                    <div key={conn.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{conn.name || 'iCal Feed'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{conn.icalUrl}</p>
                      </div>
                      <button
                        onClick={() => syncFeed(conn.id)}
                        disabled={syncingId === conn.id}
                        className="text-blue-600 hover:text-blue-800 shrink-0"
                        title="Sync now"
                      >
                        {syncingId === conn.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteFeed(conn.id)}
                        className="text-red-400 hover:text-red-600 shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new feed */}
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Feed name (e.g. Airbnb)"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="text-sm font-mono text-xs"
                />
                <Button
                  onClick={addFeed}
                  disabled={addingFeed || !newFeedUrl.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {addingFeed ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                  Add Feed
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ─── Pricing tab ──────────────────────────────────────── */}
          <TabsContent value="pricing" className="space-y-5 mt-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">PriceLabs Markup</p>
              <p className="text-xs text-slate-500 mb-3">
                Apply a percentage markup on top of PriceLabs dynamic rates for this property.
                Use this to add your management fee or margin before rates are pushed to channels.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="number"
                    min="-100"
                    max="500"
                    step="0.5"
                    value={markup}
                    onChange={(e) => setMarkup(e.target.value)}
                    className="pl-10"
                    placeholder="0 = no markup"
                  />
                </div>
                <Button
                  onClick={saveMarkup}
                  disabled={markupSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  size="sm"
                >
                  {markupSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                E.g. 10 = rates pushed at 110% of PriceLabs price. Negative values for discounts.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-1">PriceLabs Integration</p>
              <p className="text-xs text-blue-700 mb-2">
                Connect your PriceLabs account to enable dynamic pricing. Rates sync automatically
                when PriceLabs pushes updates via webhook.
              </p>
              <Button variant="outline" size="sm" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100">
                <ExternalLink className="w-3 h-3 mr-1.5" />
                Open PriceLabs
              </Button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Base Rate</p>
              <p className="text-xs text-slate-500 mb-1">
                Set a fallback nightly rate used when PriceLabs hasn't pushed a price for a date.
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  type="number"
                  className="pl-10"
                  placeholder={listing.basePrice ? String(Number(listing.basePrice)) : '0.00'}
                  disabled
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Edit base rate in property settings.</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─── Date header row ──────────────────────────────────────────────────────────

function DateHeader({ dates, scrollRef }) {
  return (
    <div
      className="sticky top-0 z-20 flex border-b border-slate-200 bg-white shadow-sm"
    >
      {/* Property name column placeholder */}
      <div
        className="sticky left-0 z-30 bg-white border-r border-slate-200 flex items-center px-4 shrink-0"
        style={{ width: PROP_COL_W, minWidth: PROP_COL_W }}
      >
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Property</span>
      </div>

      {/* Scrollable date cells */}
      <div ref={scrollRef} className="flex overflow-x-hidden">
        {dates.map((d) => {
          const isT   = isToday(d);
          const isWE  = isWeekend(d);
          const isM   = d.getDate() === 1;
          return (
            <div
              key={dateKey(d)}
              className={`flex flex-col items-center justify-center border-r border-slate-100 shrink-0 py-1 ${isT ? 'bg-blue-50' : isWE ? 'bg-slate-50' : 'bg-white'}`}
              style={{ width: COL_W, minWidth: COL_W }}
            >
              {isM && (
                <span className="text-[8px] font-bold text-blue-600 uppercase leading-none">
                  {format(d, 'MMM')}
                </span>
              )}
              <span className={`text-[9px] font-medium leading-none ${isT ? 'text-blue-700 font-bold' : isWE ? 'text-slate-500' : 'text-slate-400'}`}>
                {format(d, 'd')}
              </span>
              <span className={`text-[8px] leading-none mt-0.5 ${isT ? 'text-blue-600' : 'text-slate-300'}`}>
                {format(d, 'EEE')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Single property row ──────────────────────────────────────────────────────

function PropertyRow({ listing, dates, rateMap, blockMap, bookingMap, onEditRate, onClickBooking, onOpenSettings }) {
  const hasChannex = !!listing.channexPropertyId;

  // Build a set of booked date keys for this listing so RateCell can detect overlap
  const bookedDates = useMemo(() => {
    const map = {};
    const bks = bookingMap[listing.id] || [];
    for (const bk of bks) {
      const cin  = startOfDay(parseISO(bk.checkIn));
      const cout = startOfDay(parseISO(bk.checkOut));
      let cur = cin;
      while (cur < cout) {
        map[`${listing.id}_${dateKey(cur)}`] = true;
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [bookingMap, listing.id]);

  return (
    <div className="flex border-b border-slate-100 hover:bg-slate-50/50 group transition-colors">
      {/* Sticky property name */}
      <div
        className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 border-r border-slate-200 flex items-center gap-3 px-3 shrink-0 transition-colors"
        style={{ width: PROP_COL_W, minWidth: PROP_COL_W }}
      >
        {/* Thumbnail */}
        <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {listing.images?.[0] || listing.mainImage ? (
            <img
              src={listing.images?.[0] || listing.mainImage}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span className="text-slate-400 text-xs font-bold">
              {listing.title?.charAt(0) || '?'}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate leading-tight">{listing.title}</p>
          <p className="text-[10px] text-slate-400 truncate leading-tight">
            {listing.city || ''}{listing.city && listing.country ? ', ' : ''}{listing.country || ''}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {hasChannex ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-medium">
                <Check className="w-2.5 h-2.5" />Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                <AlertCircle className="w-2.5 h-2.5" />Pending
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenSettings(listing)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 shrink-0"
          title="iCal & Pricing settings"
        >
          <Settings2 className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Rate cells + booking pills */}
      <div className="relative flex" style={{ height: 52 }}>
        {dates.map((d) => (
          <RateCell
            key={dateKey(d)}
            listingId={listing.id}
            date={d}
            rateMap={rateMap}
            blockMap={blockMap}
            bookedDates={bookedDates}
            onEdit={onEditRate}
          />
        ))}
        <BookingPills
          listingId={listing.id}
          dates={dates}
          bookingMap={bookingMap}
          onClickBooking={onClickBooking}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PropertyList() {
  const { user }  = useAuth();
  const today     = useMemo(() => startOfDay(new Date()), []);

  const [listings,    setListings]    = useState([]);
  const [rateMap,     setRateMap]     = useState({});
  const [blockMap,    setBlockMap]    = useState({});
  const [bookingMap,  setBookingMap]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [startOffset, setStartOffset] = useState(0);   // days from today

  // Drawer/dialog state
  const [editCell,    setEditCell]    = useState(null);  // { listingId, date, existing }
  const [activeBook,  setActiveBook]  = useState(null);  // booking object
  const [settingsProp, setSettingsProp] = useState(null); // listing object

  // Synchronized scroll refs (header + rows)
  const headerScrollRef = useRef(null);
  const bodyScrollRef   = useRef(null);

  const dates = useMemo(
    () => buildDateRange(addDays(today, startOffset), DAYS_VISIBLE),
    [today, startOffset],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return listings.filter(
      (l) => !q || l.title?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q),
    );
  }, [listings, search]);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, bookRes, ratesRes, blockedRes] = await Promise.allSettled([
        api.listings.getAll(),
        api.bookings.getAll(),
        api.calendar.getRates({
          startDate: format(dates[0], 'yyyy-MM-dd'),
          endDate:   format(dates[dates.length - 1], 'yyyy-MM-dd'),
        }),
        api.calendar.getBlockedDates({
          startDate: format(dates[0], 'yyyy-MM-dd'),
          endDate:   format(dates[dates.length - 1], 'yyyy-MM-dd'),
        }),
      ]);

      const ls = listRes.status === 'fulfilled' ? (listRes.value.data || []) : [];
      const bk = bookRes.status === 'fulfilled' ? (bookRes.value.data || []) : [];
      const rt = ratesRes.status === 'fulfilled' ? (ratesRes.value.data || []) : [];
      const bl = blockedRes.status === 'fulfilled' ? (blockedRes.value.data || []) : [];

      setListings(ls);
      const { rateMap: rm, blockMap: bm, bookingMap: bkm } = buildMaps(rt, bl, bk);
      setRateMap(rm);
      setBlockMap(bm);
      setBookingMap(bkm);
    } catch (e) {
      toast.error('Failed to load property data');
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Sync horizontal scroll between header and body
  const syncScroll = useCallback((src, dst) => {
    if (dst.current) dst.current.scrollLeft = src.scrollLeft;
  }, []);

  const onBodyScroll = useCallback((e) => {
    syncScroll(e.currentTarget, headerScrollRef);
  }, [syncScroll]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleEditRate = useCallback((listingId, date, existing) => {
    setEditCell({ listingId, date, existing });
  }, []);

  const handleRateSaved = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  // Navigate date window
  const shiftDays = (n) => setStartOffset((o) => Math.max(-30, o + n));

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50">

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Property List</h1>
            <p className="text-xs text-slate-500">12-month tape chart · {filtered.length} properties</p>
          </div>

          {/* Search */}
          <div className="ml-4 flex-1 max-w-xs">
            <Input
              placeholder="Search properties…"
              className="h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Date navigation */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => shiftDays(-30)}
                className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"
                title="Back 30 days"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setStartOffset(0)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all"
              >
                Today
              </button>
              <button
                onClick={() => shiftDays(30)}
                className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"
                title="Forward 30 days"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAll}
              disabled={loading}
              className="text-xs"
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* ── Legend ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-4 py-1.5 bg-white border-b border-slate-100 text-[10px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white ring-1 ring-slate-200 inline-block" />Available</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-700 inline-block" />Booked</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />Blocked</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-50 ring-1 ring-blue-300 inline-block" />Today</span>
          <span className="ml-auto text-slate-400">Click any cell to set rate or block · Click booking for details · Hover property → ⚙ for iCal &amp; pricing</span>
        </div>

        {/* ── Grid ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Date header — scrolls horizontally in sync with body */}
          <div className="flex shrink-0 overflow-hidden">
            <div
              className="sticky left-0 z-20 bg-white border-r border-slate-200 shrink-0"
              style={{ width: PROP_COL_W, minWidth: PROP_COL_W }}
            />
            <div
              ref={headerScrollRef}
              className="flex overflow-x-hidden"
              style={{ flex: 1 }}
            >
              {dates.map((d) => {
                const isT  = isToday(d);
                const isWE = isWeekend(d);
                const isM  = d.getDate() === 1;
                return (
                  <div
                    key={dateKey(d)}
                    className={`flex flex-col items-center justify-center border-r border-b border-slate-100 shrink-0 py-1.5 ${isT ? 'bg-blue-50' : isWE ? 'bg-slate-50' : 'bg-white'}`}
                    style={{ width: COL_W, minWidth: COL_W }}
                  >
                    {isM && (
                      <span className="text-[8px] font-bold text-blue-600 uppercase leading-none">
                        {format(d, 'MMM')}
                      </span>
                    )}
                    <span className={`text-[9px] font-semibold leading-none ${isT ? 'text-blue-700' : isWE ? 'text-slate-500' : 'text-slate-400'}`}>
                      {format(d, 'd')}
                    </span>
                    <span className="text-[8px] text-slate-300 leading-none mt-0.5">
                      {format(d, 'EEE')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body — vertical scroll + horizontal sync */}
          <div
            ref={bodyScrollRef}
            className="flex-1 overflow-auto"
            onScroll={(e) => {
              if (headerScrollRef.current) {
                headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading properties…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                <Search className="w-6 h-6" />
                <p className="text-sm">{search ? 'No properties match your search' : 'No properties yet'}</p>
              </div>
            ) : (
              <div>
                {filtered.map((listing) => (
                  <PropertyRow
                    key={listing.id}
                    listing={listing}
                    dates={dates}
                    rateMap={rateMap}
                    blockMap={blockMap}
                    bookingMap={bookingMap}
                    onEditRate={handleEditRate}
                    onClickBooking={setActiveBook}
                    onOpenSettings={setSettingsProp}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs & drawers ──────────────────────────────────────── */}
      <RateEditDialog
        open={!!editCell}
        onClose={() => setEditCell(null)}
        onSave={handleRateSaved}
        listingId={editCell?.listingId}
        date={editCell?.date}
        existing={editCell?.existing}
      />

      <BookingDrawer
        booking={activeBook}
        onClose={() => setActiveBook(null)}
      />

      <PropertySettingsDrawer
        listing={settingsProp}
        onClose={() => setSettingsProp(null)}
        onRefresh={fetchAll}
      />
    </AppLayout>
  );
}

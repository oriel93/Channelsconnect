/**
 * PropertyList.jsx — Virtualized Multi-Calendar (Inventory Management)
 *
 * Architecture:
 *   Module A: 2D virtualization via @tanstack/react-virtual
 *             - Y axis: property rows (useVirtualizer, overscan=3)
 *             - X axis: date columns (useVirtualizer, overscan=7)
 *             - Only visible cells are in the DOM
 *
 *   Module B: Neutral visual blocks
 *             - All bookings → identical charcoal pill (bg-slate-700)
 *             - No channel color-coding
 *             - Pill shows: guest name + "Xn" stay duration
 *
 *   Module C: Drag-to-select → Block Room | Override Price
 *             - mousedown + mousemove + mouseup on date cells
 *             - Modal with two options; save calls api.calendar.updateRate
 *               or api.calendar.blockDate → goes through applyChange queue
 *
 *   Module D: O(1) hash maps built once on data load
 *             - rateMap:    `${listingId}_${date}` → Rate
 *             - blockMap:   `${listingId}_${date}` → true
 *             - bookingMap: `${listingId}_${date}` → { guestName, nights, bookingId, isStart }
 *
 * Data source: GET /calendar/tape  (single round-trip for all listings)
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo, useReducer,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  format, addDays, parseISO, isToday, isWeekend,
  startOfDay, differenceInDays, isSameMonth,
} from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import AppLayout from '@/components/app/AppLayout';
import {
  ChevronLeft, ChevronRight, RefreshCw, Loader2,
  DollarSign, Lock, Unlock, Settings2, Check, AlertCircle,
  Calendar, Copy, ExternalLink, Plus, Trash2, Percent,
} from 'lucide-react';

// ─── Layout constants ─────────────────────────────────────────────────────────

const PROP_W     = 200;   // sticky left column width (px)
const COL_W      = 36;    // date column width (px)
const ROW_H      = 52;    // property row height (px)
const HEADER_H   = 44;    // date header height (px)
const DAYS_TOTAL = 365;   // 12-month window

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dk = (d) => format(d, 'yyyy-MM-dd');

function buildDates(startOffset) {
  const base = addDays(startOfDay(new Date()), startOffset);
  return Array.from({ length: DAYS_TOTAL }, (_, i) => addDays(base, i));
}

// ─── Module D: Build O(1) hash maps ──────────────────────────────────────────

function buildMaps(rates = [], blockedDates = [], bookings = []) {
  // rateMap[`${lid}_${date}`] → { price, minStay, available }
  const rateMap = {};
  for (const r of rates) {
    const d = typeof r.date === 'string' ? r.date.slice(0, 10) : dk(new Date(r.date));
    rateMap[`${r.listingId}_${d}`] = r;
  }

  // blockMap[`${lid}_${date}`] → true
  const blockMap = {};
  for (const b of blockedDates) {
    const d = typeof b.date === 'string' ? b.date.slice(0, 10) : dk(new Date(b.date));
    blockMap[`${b.listingId}_${d}`] = true;
  }

  // bookingMap[`${lid}_${date}`] → { guestName, nights, bookingId, isStart }
  // We mark every date in the booking span so rendering is O(1) per cell
  const bookingMap = {};
  // Also keep an array of booking objects per listing for pill rendering
  const bookingsByListing = {};

  for (const bk of bookings) {
    const cin  = startOfDay(parseISO(bk.checkIn));
    const cout = startOfDay(parseISO(bk.checkOut));
    const nights = differenceInDays(cout, cin);
    const lid  = bk.listingId;

    if (!bookingsByListing[lid]) bookingsByListing[lid] = [];
    bookingsByListing[lid].push({ ...bk, nights, cinDate: cin, coutDate: cout });

    // Mark check-in day as isStart=true; subsequent days as continuation
    let cur = cin;
    let dayIndex = 0;
    while (cur < cout) {
      const key = `${lid}_${dk(cur)}`;
      bookingMap[key] = {
        guestName: bk.guestName,
        nights,
        bookingId: bk.id,
        isStart:   dayIndex === 0,
        booking:   bk,
      };
      cur = addDays(cur, 1);
      dayIndex++;
    }
  }

  return { rateMap, blockMap, bookingMap, bookingsByListing };
}

// ─── Drag-select state ────────────────────────────────────────────────────────

const initialDrag = { dragging: false, listingId: null, startDate: null, endDate: null };

function dragReducer(state, action) {
  switch (action.type) {
    case 'START':  return { dragging: true, listingId: action.lid, startDate: action.date, endDate: action.date };
    case 'MOVE':   return state.dragging && action.lid === state.listingId
                     ? { ...state, endDate: action.date }
                     : state;
    case 'END':    return { ...state, dragging: false };
    case 'RESET':  return initialDrag;
    default:       return state;
  }
}

// ─── Block/Rate modal ─────────────────────────────────────────────────────────

function ActionModal({ open, onClose, onSave, listing, startDate, endDate }) {
  const [tab,     setTab]     = useState('block');
  const [rate,    setRate]    = useState('');
  const [minStay, setMinStay] = useState('');
  const [loading, setLoading] = useState(false);

  // Sort dates so start is always before end
  const [dateA, dateB] = useMemo(() => {
    if (!startDate || !endDate) return [null, null];
    return startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  }, [startDate, endDate]);

  const nights = useMemo(() => {
    if (!dateA || !dateB) return 0;
    return differenceInDays(addDays(dateB, 1), dateA);
  }, [dateA, dateB]);

  const save = async () => {
    if (!listing || !dateA || !dateB) return;
    setLoading(true);
    try {
      if (tab === 'block') {
        // Block each date in range individually (existing applyChange queue)
        const promises = [];
        let cur = dateA;
        while (cur <= dateB) {
          promises.push(api.calendar.blockDate({ listingId: listing.id, date: dk(cur) }));
          cur = addDays(cur, 1);
        }
        await Promise.all(promises);
        toast.success(`Blocked ${nights} night${nights !== 1 ? 's' : ''}`);
      } else {
        // Rate override — bulk update via applyChange queue
        if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) {
          toast.error('Enter a valid nightly rate');
          setLoading(false);
          return;
        }
        await api.calendar.bulkUpdateRates({
          listingId: listing.id,
          startDate: dk(dateA),
          endDate:   dk(dateB),
          price:     Number(rate),
          ...(minStay ? { minStay: Number(minStay) } : {}),
        });
        toast.success(`Rate $${rate} set for ${nights} night${nights !== 1 ? 's' : ''}`);
      }
      onSave();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            {listing?.title}
          </DialogTitle>
          {dateA && dateB && (
            <p className="text-xs text-slate-500 mt-1">
              {format(dateA, 'MMM d')} → {format(dateB, 'MMM d yyyy')}
              {' '}· {nights} night{nights !== 1 ? 's' : ''}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Tab toggle */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setTab('block')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${tab === 'block' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Lock className="w-3.5 h-3.5" />Block Room
            </button>
            <button
              onClick={() => setTab('rate')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${tab === 'rate' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <DollarSign className="w-3.5 h-3.5" />Override Price
            </button>
          </div>

          {tab === 'block' && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Block {nights} night{nights !== 1 ? 's' : ''}</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  These dates will be closed to new bookings across all connected channels.
                  Your sync queue handles updates automatically.
                </p>
              </div>
            </div>
          )}

          {tab === 'rate' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Nightly Rate</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="pl-10"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Min Stay (nights)</Label>
                <Input
                  type="number"
                  min="1"
                  value={minStay}
                  onChange={(e) => setMinStay(e.target.value)}
                  placeholder="1"
                />
              </div>
              <p className="text-xs text-slate-400">
                Rate change queued through the rate-limiter — syncs to all connected channels automatically.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={save}
            disabled={loading}
            className={tab === 'block' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {tab === 'block' ? 'Block Dates' : 'Save Rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Booking detail drawer ────────────────────────────────────────────────────

function BookingDrawer({ booking, onClose }) {
  if (!booking) return null;
  const nights = differenceInDays(
    startOfDay(parseISO(booking.checkOut)),
    startOfDay(parseISO(booking.checkIn)),
  );
  return (
    <Sheet open={!!booking} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Booking Details</SheetTitle>
        </SheetHeader>
        <div className="mt-5 space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <div>
              <p className="text-xs text-slate-500">Guest</p>
              <p className="font-semibold text-slate-900">{booking.guestName}</p>
            </div>
            {booking.guestEmail && (
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-slate-700 break-all">{booking.guestEmail}</p>
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
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">{nights} nights · {booking.numGuests || 1} guest{(booking.numGuests || 1) !== 1 ? 's' : ''}</span>
            <span className="font-bold">${Number(booking.totalPrice || 0).toFixed(2)}</span>
          </div>
          {booking.bookingSource && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Source</p>
              <p className="text-sm font-medium capitalize">{booking.bookingSource}</p>
            </div>
          )}
          {booking.notes && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
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
  const [icalConns,    setIcalConns]    = useState([]);
  const [loadingIcal,  setLoadingIcal]  = useState(true);
  const [newFeedUrl,   setNewFeedUrl]   = useState('');
  const [newFeedName,  setNewFeedName]  = useState('');
  const [addingFeed,   setAddingFeed]   = useState(false);
  const [syncingId,    setSyncingId]    = useState(null);
  const [markup,       setMarkup]       = useState('');
  const [markupSaving, setMarkupSaving] = useState(false);
  const exportUrl = useMemo(() => {
    const base = import.meta.env.VITE_API_URL || '';
    return listing ? `${base}/listings/${listing.id}/calendar.ics` : '';
  }, [listing]);

  useEffect(() => {
    if (!listing) return;
    setLoadingIcal(true);
    api.ical.getConnections(listing.id)
      .then((r) => setIcalConns(r.data || []))
      .catch(() => setIcalConns([]))
      .finally(() => setLoadingIcal(false));
  }, [listing]);

  const addFeed = async () => {
    if (!newFeedUrl.trim()) return;
    setAddingFeed(true);
    try {
      await api.ical.create({ listingId: listing.id, icalUrl: newFeedUrl.trim(), name: newFeedName.trim() || 'iCal Feed', direction: 'import' });
      toast.success('Feed added');
      setNewFeedUrl(''); setNewFeedName('');
      const r = await api.ical.getConnections(listing.id);
      setIcalConns(r.data || []);
    } catch (e) { toast.error('Failed to add feed'); }
    finally { setAddingFeed(false); }
  };

  const syncFeed = async (id) => {
    setSyncingId(id);
    try { await api.ical.sync(id); toast.success('Synced'); onRefresh(); }
    catch { toast.error('Sync failed'); }
    finally { setSyncingId(null); }
  };

  const deleteFeed = async (id) => {
    try { await api.ical.delete(id); setIcalConns((c) => c.filter((x) => x.id !== id)); toast.success('Removed'); }
    catch { toast.error('Delete failed'); }
  };

  if (!listing) return null;

  return (
    <Sheet open={!!listing} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">{listing.title}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="ical" className="mt-5">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="ical"><Calendar className="w-3 h-3 mr-1" />iCal</TabsTrigger>
            <TabsTrigger value="pricing"><DollarSign className="w-3 h-3 mr-1" />Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="ical" className="space-y-5 mt-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Export Calendar</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <code className="text-[10px] text-slate-600 truncate flex-1">{exportUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(exportUrl); toast.success('Copied'); }} className="text-blue-600 hover:text-blue-800">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a href={exportUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Import Feeds</p>
              {loadingIcal ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
              ) : icalConns.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs border border-dashed rounded-lg">No feeds yet</div>
              ) : (
                <div className="space-y-2">
                  {icalConns.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.icalUrl}</p>
                      </div>
                      <button onClick={() => syncFeed(c.id)} disabled={syncingId === c.id} className="text-blue-600 hover:text-blue-800">
                        {syncingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteFeed(c.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 space-y-2">
                <Input placeholder="Feed name" value={newFeedName} onChange={(e) => setNewFeedName(e.target.value)} className="text-sm" />
                <Input placeholder="https://..." value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)} className="text-sm font-mono text-xs" />
                <Button onClick={addFeed} disabled={addingFeed || !newFeedUrl.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                  {addingFeed ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}Add Feed
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-5 mt-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">PriceLabs Markup %</p>
              <p className="text-xs text-slate-500 mb-3">Applied on top of dynamic rates before pushing to channels.</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input type="number" min="-100" max="500" step="0.5" value={markup} onChange={(e) => setMarkup(e.target.value)} className="pl-10" placeholder="0" />
                </div>
                <Button onClick={async () => { setMarkupSaving(true); try { await api.listings.update(listing.id, { priceLabsMarkup: parseFloat(markup) }); toast.success('Saved'); } catch { toast.error('Save failed'); } finally { setMarkupSaving(false); } }} disabled={markupSaving} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0" size="sm">
                  {markupSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main virtualized calendar ────────────────────────────────────────────────

export default function PropertyList() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [listings,    setListings]    = useState([]);
  const [maps,        setMaps]        = useState({ rateMap: {}, blockMap: {}, bookingMap: {}, bookingsByListing: {} });
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [startOffset, setStartOffset] = useState(0);   // days from today

  const [activeBooking,   setActiveBooking]   = useState(null);
  const [settingsProp,    setSettingsProp]     = useState(null);
  const [actionModal,     setActionModal]      = useState(null);  // { listing, startDate, endDate }

  const [drag, dragDispatch] = useReducer(dragReducer, initialDrag);

  // ── Dates (memoised) ───────────────────────────────────────────────────────
  const dates = useMemo(() => buildDates(startOffset), [startOffset]);

  // ── Filtered property rows ─────────────────────────────────────────────────
  const filteredListings = useMemo(() => {
    const q = search.toLowerCase();
    return q ? listings.filter((l) => l.title?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q)) : listings;
  }, [listings, search]);

  // ── Fetch: single /calendar/tape round-trip ────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(dates[0], 'yyyy-MM-dd');
      const endDate   = format(dates[dates.length - 1], 'yyyy-MM-dd');
      const res = await api.calendar.getTapeData(startDate, endDate);
      const { listings: ls, rates, blockedDates, bookings } = res.data;
      setListings(ls || []);
      setMaps(buildMaps(rates || [], blockedDates || [], bookings || []));
    } catch (e) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Virtualizer refs ───────────────────────────────────────────────────────
  const scrollRef = useRef(null);

  // Y axis: property rows
  const rowVirt = useVirtualizer({
    count:         filteredListings.length,
    getScrollElement: () => scrollRef.current,
    estimateSize:  () => ROW_H,
    overscan:      3,
  });

  // X axis: date columns
  const colVirt = useVirtualizer({
    count:            DAYS_TOTAL,
    horizontal:       true,
    getScrollElement: () => scrollRef.current,
    estimateSize:     () => COL_W,
    overscan:         7,
  });

  const totalW = PROP_W + DAYS_TOTAL * COL_W;
  const totalH = filteredListings.length * ROW_H;

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onCellMouseDown = useCallback((lid, date, e) => {
    e.preventDefault();
    dragDispatch({ type: 'START', lid, date });
  }, []);

  const onCellMouseEnter = useCallback((lid, date) => {
    if (drag.dragging) dragDispatch({ type: 'MOVE', lid, date });
  }, [drag.dragging]);

  const onCellMouseUp = useCallback((lid) => {
    if (!drag.dragging || drag.listingId !== lid) { dragDispatch({ type: 'RESET' }); return; }
    const listing = filteredListings.find((l) => l.id === drag.listingId);
    if (!listing) { dragDispatch({ type: 'RESET' }); return; }
    dragDispatch({ type: 'END' });
    setActionModal({ listing, startDate: drag.startDate, endDate: drag.endDate });
  }, [drag, filteredListings]);

  // Prevent ghost drag image
  useEffect(() => {
    const up = () => { if (drag.dragging) dragDispatch({ type: 'RESET' }); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [drag.dragging]);

  // ── Jump to today ──────────────────────────────────────────────────────────
  const jumpToToday = () => {
    setStartOffset(0);
    // After re-render, scroll to column 0
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    }, 50);
  };

  // ── Cell renderer ──────────────────────────────────────────────────────────
  const renderCell = useCallback((listing, date, colIndex) => {
    const dateStr = dk(date);
    const key     = `${listing.id}_${dateStr}`;
    const blocked = maps.blockMap[key];
    const booked  = maps.bookingMap[key];
    const rate    = maps.rateMap[key];
    const today   = isToday(date);
    const weekend  = isWeekend(date);

    // Determine if this cell is in the drag selection for this listing
    const inDrag = drag.dragging && drag.listingId === listing.id && (() => {
      const [dA, dB] = drag.startDate <= drag.endDate
        ? [drag.startDate, drag.endDate]
        : [drag.endDate, drag.startDate];
      return date >= dA && date <= dB;
    })();

    let cellBg = weekend ? '#f8fafc' : '#ffffff';
    if (today)   cellBg = '#eff6ff';
    if (blocked) cellBg = '#cbd5e1';
    if (inDrag)  cellBg = '#dbeafe';

    return (
      <div
        key={key}
        style={{
          position:   'absolute',
          left:       colIndex * COL_W,
          width:      COL_W,
          height:     ROW_H,
          background: cellBg,
          borderRight: '1px solid #f1f5f9',
          borderBottom: '1px solid #f1f5f9',
          boxSizing:   'border-box',
          cursor:      booked ? 'pointer' : 'crosshair',
          userSelect:  'none',
          outline:     today ? '1px inset #93c5fd' : 'none',
        }}
        onMouseDown={(e) => !booked && !blocked && onCellMouseDown(listing.id, date, e)}
        onMouseEnter={() => onCellMouseEnter(listing.id, date)}
        onMouseUp={() => onCellMouseUp(listing.id)}
        onClick={() => booked?.isStart && setActiveBooking(booked.booking)}
        title={blocked ? 'Blocked' : booked ? `${booked.guestName} · ${booked.nights}n` : rate?.price ? `$${Number(rate.price).toFixed(0)}` : 'Drag to block or set rate'}
      >
        {/* Blocked indicator */}
        {blocked && !booked && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Lock style={{ width: 12, height: 12, color: '#64748b' }} />
          </div>
        )}

        {/* Rate label on available cells */}
        {!blocked && !booked && rate?.price && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b' }}>
              ${Number(rate.price).toFixed(0)}
            </span>
          </div>
        )}

        {/* Booking pill — only render on check-in day; pill spans multiple cols via absolute overlay */}
        {booked?.isStart && (
          <div
            onClick={(e) => { e.stopPropagation(); setActiveBooking(booked.booking); }}
            style={{
              position:  'absolute',
              top:        6,
              left:       2,
              width:      `calc(${booked.nights} * ${COL_W}px - 4px)`,
              height:     ROW_H - 12,
              background: '#334155',
              borderRadius: 5,
              display:    'flex',
              alignItems: 'center',
              paddingLeft: 8,
              paddingRight: 8,
              zIndex:     5,
              cursor:     'pointer',
              overflow:   'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', marginRight: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {booked.guestName}
            </span>
            <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0 }}>
              {booked.nights}n
            </span>
          </div>
        )}
      </div>
    );
  }, [maps, drag, onCellMouseDown, onCellMouseEnter, onCellMouseUp]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div
        style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#f8fafc', overflow: 'hidden' }}
        onMouseUp={() => { if (drag.dragging) dragDispatch({ type: 'RESET' }); }}
      >

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Property Calendar</h1>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              {filteredListings.length} properties · 12 months · drag cells to block or price
            </p>
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties…"
            style={{ flex: 1, maxWidth: 280, marginLeft: 16, height: 36, fontSize: 13 }}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Date nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
              <button
                onClick={() => setStartOffset((o) => Math.max(-60, o - 30))}
                style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Back 30 days"
              >
                <ChevronLeft style={{ width: 16, height: 16, color: '#475569' }} />
              </button>
              <button
                onClick={jumpToToday}
                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#475569' }}
              >
                Today
              </button>
              <button
                onClick={() => setStartOffset((o) => o + 30)}
                style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Forward 30 days"
              >
                <ChevronRight style={{ width: 16, height: 16, color: '#475569' }} />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              {loading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <RefreshCw style={{ width: 14, height: 14 }} />}
            </Button>
          </div>
        </div>

        {/* ── Legend ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9', flexShrink: 0, fontSize: 10, color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fff', border: '1px solid #e2e8f0', display: 'inline-block' }} />Available
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#334155', display: 'inline-block' }} />Booked
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#cbd5e1', display: 'inline-block' }} />Blocked
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#eff6ff', border: '1px solid #93c5fd', display: 'inline-block' }} />Today
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10 }}>Drag across empty cells → block or price · Click booking for details · Hover row → ⚙ settings</span>
        </div>

        {/* ── Main scrollable grid ─────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, color: '#94a3b8' }}>
            <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} />
            <span style={{ fontSize: 14 }}>Loading calendar…</span>
          </div>
        ) : filteredListings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, color: '#94a3b8' }}>
            <Calendar style={{ width: 32, height: 32 }} />
            <p style={{ fontSize: 14 }}>{search ? 'No matching properties' : 'No active properties found'}</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            style={{ flex: 1, overflow: 'auto', position: 'relative' }}
          >
            {/* Total size sizer */}
            <div style={{ width: totalW, height: HEADER_H + totalH, position: 'relative' }}>

              {/* ── Sticky date header ──────────────────────────── */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 30,
                display: 'flex',
                height: HEADER_H,
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {/* Property col label */}
                <div style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 40,
                  width: PROP_W,
                  minWidth: PROP_W,
                  background: '#fff',
                  borderRight: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 14,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property</span>
                </div>

                {/* Virtualised date cells */}
                <div style={{ position: 'relative', flex: 1 }}>
                  {colVirt.getVirtualItems().map((vc) => {
                    const d   = dates[vc.index];
                    const isT = isToday(d);
                    const isWE = isWeekend(d);
                    const isFirst = d.getDate() === 1;
                    return (
                      <div
                        key={vc.key}
                        style={{
                          position:   'absolute',
                          left:       vc.start,
                          width:      COL_W,
                          height:     HEADER_H,
                          display:    'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRight: '1px solid #f1f5f9',
                          background: isT ? '#eff6ff' : isWE ? '#f8fafc' : '#fff',
                          boxSizing:  'border-box',
                        }}
                      >
                        {isFirst && (
                          <span style={{ fontSize: 8, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', lineHeight: 1 }}>
                            {format(d, 'MMM')}
                          </span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: isT ? 700 : 500, color: isT ? '#2563eb' : isWE ? '#64748b' : '#94a3b8', lineHeight: 1.2 }}>
                          {format(d, 'd')}
                        </span>
                        <span style={{ fontSize: 8, color: isT ? '#93c5fd' : '#cbd5e1', lineHeight: 1 }}>
                          {format(d, 'EEE')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Virtualised rows ────────────────────────────── */}
              <div style={{ position: 'relative', height: totalH, top: HEADER_H }}>
                {rowVirt.getVirtualItems().map((vr) => {
                  const listing = filteredListings[vr.index];
                  if (!listing) return null;
                  const hasChannex = !!listing.channexPropertyId;

                  return (
                    <div
                      key={vr.key}
                      style={{
                        position:   'absolute',
                        top:        vr.start,
                        width:      '100%',
                        height:     ROW_H,
                        display:    'flex',
                      }}
                      className="group"
                    >
                      {/* Sticky property name cell */}
                      <div style={{
                        position:    'sticky',
                        left:        0,
                        zIndex:      20,
                        width:       PROP_W,
                        minWidth:    PROP_W,
                        height:      ROW_H,
                        background:  '#fff',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #f1f5f9',
                        display:     'flex',
                        alignItems:  'center',
                        gap:         8,
                        paddingLeft: 10,
                        paddingRight: 6,
                        boxSizing:   'border-box',
                      }}
                        className="group-hover:bg-slate-50"
                      >
                        {/* Color dot for quick ID */}
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: hasChannex ? '#10b981' : '#f59e0b',
                        }} title={hasChannex ? 'Connected to channels' : 'Pending channel mapping'} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {listing.title}
                          </p>
                          {listing.city && (
                            <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {listing.city}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => setSettingsProp(listing)}
                          style={{ opacity: 0, padding: '4px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                          className="group-hover:!opacity-100 transition-opacity"
                          title="iCal & Pricing settings"
                        >
                          <Settings2 style={{ width: 13, height: 13, color: '#64748b' }} />
                        </button>
                      </div>

                      {/* Virtualised date cells for this row */}
                      <div style={{ position: 'relative', flex: 1, height: ROW_H }}>
                        {colVirt.getVirtualItems().map((vc) => {
                          const d = dates[vc.index];
                          return renderCell(listing, d, vc.index);
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals & drawers ────────────────────────────────────── */}
      <ActionModal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        onSave={fetchAll}
        listing={actionModal?.listing}
        startDate={actionModal?.startDate}
        endDate={actionModal?.endDate}
      />

      <BookingDrawer
        booking={activeBooking}
        onClose={() => setActiveBooking(null)}
      />

      <PropertySettingsDrawer
        listing={settingsProp}
        onClose={() => setSettingsProp(null)}
        onRefresh={fetchAll}
      />
    </AppLayout>
  );
}

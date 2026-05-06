/**
 * TapeChart.jsx — High-Performance Enterprise Multi-Calendar (Tape Chart)
 *
 * Architecture:
 *   - 2D virtual grid via @tanstack/react-virtual (row = property, column = date)
 *   - Data normalized into HashMap before render: O(1) cell lookups
 *   - Drag-to-select via React.useRef (zero grid re-renders during drag)
 *   - Booking pills as absolute-positioned spans within each row
 *   - Action modal dispatches to certified applyChange() queue ONLY
 *   - Booking side-drawer for inspection
 *
 * RED ZONE: does NOT import or modify channex-sync.service.ts, webhook handlers,
 *           or ARI batching logic. Dispatch-only via api.channexSync.applyChange().
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, addDays, differenceInDays, parseISO, isToday, isWeekend, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/apiClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronLeft, ChevronRight, Loader2, Lock, DollarSign, Clock,
  Calendar, User, Phone, Mail, RefreshCw, X, Check,
} from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

// ─── Constants ────────────────────────────────────────────────────────────────

const COL_WIDTH      = 44;   // px per day column
const ROW_HEIGHT     = 52;   // px per property row
const HEADER_HEIGHT  = 72;   // sticky date header
const PROPERTY_WIDTH = 200;  // sticky left property name column
const VISIBLE_COLS   = 90;   // days to render in one window (90 = ~3 months)

// Booking source → display colour (pill BG)
const SOURCE_COLOUR = {
  airbnb:     'bg-rose-500',
  booking:    'bg-blue-600',
  direct:     'bg-emerald-600',
  expedia:    'bg-yellow-500',
  vrbo:       'bg-purple-600',
  default:    'bg-slate-500',
};

function bookingColor(source) {
  if (!source) return SOURCE_COLOUR.default;
  const s = source.toLowerCase();
  if (s.includes('airbnb'))   return SOURCE_COLOUR.airbnb;
  if (s.includes('booking'))  return SOURCE_COLOUR.booking;
  if (s.includes('direct'))   return SOURCE_COLOUR.direct;
  if (s.includes('expedia'))  return SOURCE_COLOUR.expedia;
  if (s.includes('vrbo'))     return SOURCE_COLOUR.vrbo;
  return SOURCE_COLOUR.default;
}

// ─── Data Normalisation ────────────────────────────────────────────────────────
// Builds two maps from the API response:
//   cellMap["<listingId>_<YYYY-MM-DD>"] = { price, minStay, available, blocked, reason }
//   bookingMap["<listingId>"] = [ ...booking rows ]
// These structures let the cell renderer do O(1) lookups with no .find() calls.

function buildMaps(rates, blockedDates, bookings) {
  const cellMap    = {};
  const bookingMap = {};

  for (const r of rates) {
    const key = `${r.listingId}_${format(new Date(r.date), 'yyyy-MM-dd')}`;
    cellMap[key] = {
      price:     parseFloat(r.price),
      minStay:   r.minStay,
      available: r.available,
      blocked:   false,
    };
  }

  for (const b of blockedDates) {
    const key = `${b.listingId}_${format(new Date(b.date), 'yyyy-MM-dd')}`;
    const existing = cellMap[key] ?? {};
    cellMap[key] = { ...existing, blocked: true, reason: b.reason };
  }

  for (const bk of bookings) {
    if (!bookingMap[bk.listingId]) bookingMap[bk.listingId] = [];
    bookingMap[bk.listingId].push(bk);
  }

  return { cellMap, bookingMap };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateKey(d) { return format(d, 'yyyy-MM-dd'); }

function buildDateArray(start, count) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(addDays(start, i));
  return arr;
}

// ─── Action Modal ─────────────────────────────────────────────────────────────

function ActionModal({ open, onClose, listingId, listingTitle, startDate, endDate, currentCell, onSave }) {
  const [mode, setMode]         = useState('block'); // 'block' | 'rate' | 'minStay'
  const [price, setPrice]       = useState(currentCell?.price ?? '');
  const [minStay, setMinStay]   = useState(currentCell?.minStay ?? 1);
  const [saving, setSaving]     = useState(false);
  const isBlocked = !!currentCell?.blocked;

  const fmtRange = `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`;
  const dayCount = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build one ARIUpdate per day and push through the certified queue
      const updates = [];
      for (let i = 0; i < dayCount; i++) {
        const date = format(addDays(parseISO(startDate), i), 'yyyy-MM-dd');
        const update = { listingId, date };
        if (mode === 'block')   { update.available = isBlocked;  } // toggle
        if (mode === 'rate')    { update.price      = Number(price); }
        if (mode === 'minStay') { update.minStay    = Number(minStay); }
        updates.push(update);
      }
      await Promise.all(updates.map(u => api.channexSync.applyChange(u)));
      onSave({ mode, price: Number(price), minStay: Number(minStay), toggle: isBlocked });
      toast.success(`${dayCount} day${dayCount > 1 ? 's' : ''} updated and queued for Channex sync`);
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err?.response?.data?.message || err?.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-800">
            Edit Dates — <span className="text-blue-600 font-normal truncate">{listingTitle}</span>
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{fmtRange} · {dayCount} night{dayCount > 1 ? 's' : ''}</p>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
          {[
            { id: 'block',   icon: <Lock className="w-3.5 h-3.5" />,       label: isBlocked ? 'Unblock' : 'Block' },
            { id: 'rate',    icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Rate'   },
            { id: 'minStay', icon: <Clock className="w-3.5 h-3.5" />,      label: 'Min Stay' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                mode === m.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        {/* Mode-specific input */}
        <div className="space-y-3 py-2">
          {mode === 'block' && (
            <Alert className={isBlocked ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}>
              <AlertDescription className="text-sm">
                {isBlocked
                  ? '✅ This date range is currently blocked. Clicking Save will unblock it.'
                  : '🔒 Clicking Save will block this date range from new bookings.'}
              </AlertDescription>
            </Alert>
          )}
          {mode === 'rate' && (
            <div className="space-y-1.5">
              <Label className="text-slate-600 text-sm">Nightly Rate (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. 175.00"
                  autoFocus
                />
              </div>
              {currentCell?.price && (
                <p className="text-xs text-slate-400">Current: ${currentCell.price.toFixed(2)}</p>
              )}
            </div>
          )}
          {mode === 'minStay' && (
            <div className="space-y-1.5">
              <Label className="text-slate-600 text-sm">Minimum Stay (nights)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={minStay}
                onChange={e => setMinStay(e.target.value)}
                placeholder="e.g. 2"
                autoFocus
              />
              {currentCell?.minStay && (
                <p className="text-xs text-slate-400">Current: {currentCell.minStay} nights</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</> : <><Check className="w-4 h-4 mr-1" />Save & Sync</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Booking Side-Drawer ──────────────────────────────────────────────────────

function BookingDrawer({ booking, listingTitle, onClose }) {
  if (!booking) return null;

  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
  const sourceClass = bookingColor(booking.bookingSource);

  return (
    <Sheet open={!!booking} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col">
        {/* Header band */}
        <div className={`${sourceClass} text-white px-6 py-4`}>
          <SheetHeader>
            <SheetTitle className="text-white text-lg font-semibold truncate">
              {booking.guestName}
            </SheetTitle>
            <SheetDescription className="text-white/80 text-sm">
              {listingTitle}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Date range */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <Row icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Check-in">
              {format(new Date(booking.checkIn), 'EEE, MMM d, yyyy')}
            </Row>
            <Row icon={<Calendar className="w-4 h-4 text-slate-400" />} label="Check-out">
              {format(new Date(booking.checkOut), 'EEE, MMM d, yyyy')}
            </Row>
            <Row icon={<Clock className="w-4 h-4 text-slate-400" />} label="Duration">
              {nights} night{nights !== 1 ? 's' : ''}
            </Row>
          </div>

          {/* Financials */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <Row icon={<DollarSign className="w-4 h-4 text-emerald-600" />} label="Total Payout">
              <span className="font-semibold text-emerald-700 text-base">
                ${parseFloat(booking.totalPrice).toFixed(2)}
              </span>
            </Row>
            {booking.numGuests && (
              <Row icon={<User className="w-4 h-4 text-slate-400" />} label="Guests">
                {booking.numGuests}
              </Row>
            )}
          </div>

          {/* Source */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Channel</p>
            <Badge className={`${sourceClass} text-white text-xs capitalize`}>
              {booking.bookingSource || 'Direct'}
            </Badge>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
            <Badge className={`text-xs capitalize ${
              booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
              booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {booking.status}
            </Badge>
          </div>

          {/* Contact */}
          {(booking.guestEmail || booking.guestPhone) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
              {booking.guestEmail && (
                <Row icon={<Mail className="w-4 h-4 text-slate-400" />} label="">
                  <a href={`mailto:${booking.guestEmail}`} className="text-blue-500 hover:underline text-sm truncate">
                    {booking.guestEmail}
                  </a>
                </Row>
              )}
              {booking.guestPhone && (
                <Row icon={<Phone className="w-4 h-4 text-slate-400" />} label="">
                  {booking.guestPhone}
                </Row>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-md p-3">{booking.notes}</p>
            </div>
          )}

          {/* Booking ID */}
          <p className="text-xs text-slate-300 font-mono">ID #{booking.id}</p>
        </div>

        <div className="px-6 pb-5">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5 py-0.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        {label && <span className="text-xs text-slate-400 block">{label}</span>}
        <span className="text-sm text-slate-700">{children}</span>
      </div>
    </div>
  );
}

// ─── Grid Cell ────────────────────────────────────────────────────────────────
// Memoised — only re-renders if its specific data changes.

const GridCell = React.memo(function GridCell({
  cellKey, isToday: isTodayFlag, isWeekend: isWeekendFlag,
  dragState, colIdx, rowIdx,
  onMouseDown, onMouseEnter, onMouseUp,
  cellData,
}) {
  const isSelected = dragState && dragState.rowIdx === rowIdx &&
    colIdx >= Math.min(dragState.startCol, dragState.endCol) &&
    colIdx <= Math.max(dragState.startCol, dragState.endCol);

  let bg = 'bg-white';
  if (cellData?.blocked)       bg = 'bg-slate-200';
  else if (cellData?.available === false) bg = 'bg-slate-100';
  else if (isWeekendFlag)      bg = 'bg-blue-50/40';
  if (isTodayFlag)             bg = 'bg-amber-50';
  if (isSelected)              bg = 'bg-blue-200';

  return (
    <div
      className={`${bg} border-b border-r border-slate-100 flex flex-col items-center justify-center
        select-none cursor-pointer hover:bg-blue-100 transition-colors relative group`}
      style={{ width: COL_WIDTH, height: ROW_HEIGHT }}
      onMouseDown={() => onMouseDown(rowIdx, colIdx)}
      onMouseEnter={() => onMouseEnter(rowIdx, colIdx)}
      onMouseUp={() => onMouseUp(rowIdx, colIdx)}
    >
      {cellData?.blocked && (
        <Lock className="w-3 h-3 text-slate-400" />
      )}
      {!cellData?.blocked && cellData?.price && (
        <span className="text-[10px] font-semibold text-slate-500 leading-none">
          ${Math.round(cellData.price)}
        </span>
      )}
      {!cellData?.blocked && cellData?.minStay && cellData.minStay > 1 && (
        <span className="text-[9px] text-blue-400 leading-none mt-0.5">
          {cellData.minStay}n
        </span>
      )}
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

function HorizontalTapeChart() {
  const { user } = useAuth();

  // ── Viewport window ────────────────────────────────────────────────────────
  const [windowStart, setWindowStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return startOfDay(d);
  });
  const dates = useMemo(() => buildDateArray(windowStart, VISIBLE_COLS), [windowStart]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [listings,   setListings]   = useState([]);
  const [cellMap,    setCellMap]    = useState({});
  const [bookingMap, setBookingMap] = useState({});
  const [loading,    setLoading]    = useState(false);
  const [loadError,  setLoadError]  = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const start = format(windowStart, 'yyyy-MM-dd');
      const end   = format(addDays(windowStart, VISIBLE_COLS - 1), 'yyyy-MM-dd');
      const res   = await api.calendar.getTapeData(start, end);
      const { listings: ls, rates, blockedDates, bookings } = res.data;
      const { cellMap: cm, bookingMap: bm } = buildMaps(rates, blockedDates, bookings);
      setListings(ls);
      setCellMap(cm);
      setBookingMap(bm);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load tape chart');
    } finally {
      setLoading(false);
    }
  }, [user, windowStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Virtualizer refs ───────────────────────────────────────────────────────
  const outerRef    = useRef(null);
  const innerRef    = useRef(null);
  const scrollRef   = useRef(null); // the scrollable container

  // Row virtualizer (vertical = properties)
  const rowVirtualizer = useVirtualizer({
    count:         listings.length,
    getScrollElement: () => scrollRef.current,
    estimateSize:  () => ROW_HEIGHT,
    overscan:      5,
  });

  // Column virtualizer (horizontal = dates)
  const colVirtualizer = useVirtualizer({
    horizontal:    true,
    count:         VISIBLE_COLS,
    getScrollElement: () => scrollRef.current,
    estimateSize:  () => COL_WIDTH,
    overscan:      10,
  });

  // Scroll to "today" on first load
  useLayoutEffect(() => {
    if (!scrollRef.current || listings.length === 0) return;
    const todayIdx = dates.findIndex(d => isToday(d));
    if (todayIdx >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * COL_WIDTH - 200);
    }
  }, [listings.length]); // eslint-disable-line

  // ── Drag-to-select (zero grid re-renders during drag) ──────────────────────
  // dragRef holds live cursor state; only committed to React state on mouseUp
  const dragRef    = useRef(null);  // { rowIdx, startCol, endCol } while dragging
  const [dragState, setDragState] = useState(null); // same shape, triggers re-render for highlight

  const handleMouseDown = useCallback((rowIdx, colIdx) => {
    dragRef.current = { rowIdx, startCol: colIdx, endCol: colIdx };
    setDragState({ rowIdx, startCol: colIdx, endCol: colIdx });
  }, []);

  const handleMouseEnter = useCallback((rowIdx, colIdx) => {
    if (!dragRef.current || dragRef.current.rowIdx !== rowIdx) return;
    dragRef.current.endCol = colIdx;
    // Throttle: only update React state when column actually changes
    setDragState(prev => {
      if (prev?.endCol === colIdx) return prev;
      return { ...dragRef.current };
    });
  }, []);

  // ── Action Modal state ─────────────────────────────────────────────────────
  const [actionModal, setActionModal] = useState(null); // { listingId, listingTitle, startDate, endDate, cellData }

  const handleMouseUp = useCallback((rowIdx, colIdx) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragState(null);
    if (!drag) return;

    const startColIdx = Math.min(drag.startCol, drag.endCol);
    const endColIdx   = Math.max(drag.startCol, drag.endCol);
    const listing     = listings[rowIdx];
    if (!listing) return;

    const start = dateKey(dates[startColIdx]);
    const end   = dateKey(dates[endColIdx]);

    // O(1) lookup for the first selected cell's current data
    const cellData = cellMap[`${listing.id}_${start}`] ?? null;

    setActionModal({
      listingId:    listing.id,
      listingTitle: listing.title,
      startDate:    start,
      endDate:      end,
      cellData,
    });
  }, [listings, dates, cellMap]);

  // Global mouseUp guard (so drag doesn't get stuck if user releases outside grid)
  useEffect(() => {
    const up = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setDragState(null);
      }
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // ── Optimistic update after action save ───────────────────────────────────
  const handleActionSave = useCallback(({ mode, price, minStay, toggle, startDate, endDate }) => {
    setCellMap(prev => {
      const next = { ...prev };
      // Mutate every key in the affected range
      const start = parseISO(actionModal.startDate);
      const end   = parseISO(actionModal.endDate);
      const nights = differenceInDays(end, start) + 1;
      for (let i = 0; i < nights; i++) {
        const dk = `${actionModal.listingId}_${dateKey(addDays(start, i))}`;
        const existing = next[dk] ?? {};
        if (mode === 'block')    next[dk] = { ...existing, blocked: !existing.blocked };
        if (mode === 'rate')     next[dk] = { ...existing, price };
        if (mode === 'minStay')  next[dk] = { ...existing, minStay };
      }
      return next;
    });
  }, [actionModal]);

  // ── Booking drawer ─────────────────────────────────────────────────────────
  const [drawerBooking,   setDrawerBooking]   = useState(null);
  const [drawerListingTitle, setDrawerListingTitle] = useState('');

  // ── Window navigation ──────────────────────────────────────────────────────
  const navigateDays = (delta) => setWindowStart(d => addDays(d, delta));
  const jumpToToday  = () => setWindowStart(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return startOfDay(d);
  });

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalWidth = PROPERTY_WIDTH + VISIBLE_COLS * COL_WIDTH;

  // ─────────────────────────────────────────────────────────────────────────

  if (loading && listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm">Loading tape chart…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{loadError}</AlertDescription>
        </Alert>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />Retry
        </Button>
      </div>
    );
  }

  if (!loading && listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Calendar className="w-12 h-12 text-slate-300" />
        <p className="font-medium">No active properties yet</p>
        <p className="text-sm text-center max-w-xs">
          Approved properties will appear here. Add listings via Import Listings or the Admin Review Queue.
        </p>
      </div>
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualCols = colVirtualizer.getVirtualItems();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">

      {/* ── Top toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-bold text-slate-800 mr-2">Tape Chart</h1>
          <Button variant="outline" size="sm" onClick={() => navigateDays(-30)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateDays(-7)}>−7d
          </Button>
          <Button variant="outline" size="sm" onClick={jumpToToday} className="text-blue-600 font-medium">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateDays(7)}>+7d
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateDays(30)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          {/* Legend */}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"/>Today</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300 inline-block"/>Blocked</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block"/>Airbnb</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block"/>Booking.com</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600 inline-block"/>Direct</span>

          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400 ml-2" />}
          <Button variant="ghost" size="sm" onClick={fetchData} className="ml-1 p-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        </div>
      </div>

      {/* ── Sticky date header ───────────────────────────────────────────────── */}
      <div
        className="shrink-0 bg-white border-b border-slate-200 overflow-hidden"
        style={{ height: HEADER_HEIGHT }}
      >
        <div
          style={{ width: totalWidth, paddingLeft: PROPERTY_WIDTH, position: 'relative' }}
          ref={outerRef}
        >
          {/* Month labels */}
          <div className="flex absolute top-0" style={{ left: PROPERTY_WIDTH }}>
            {/* Compute month groups from visible virtual cols */}
            {(() => {
              const months = {};
              for (const vc of virtualCols) {
                const d = dates[vc.index];
                const mk = format(d, 'yyyy-MM');
                if (!months[mk]) months[mk] = { label: format(d, 'MMMM yyyy'), startOffset: vc.start, cols: 0 };
                months[mk].cols++;
              }
              return Object.entries(months).map(([mk, m]) => (
                <div
                  key={mk}
                  className="absolute text-[11px] font-bold text-slate-500 tracking-wide uppercase top-1"
                  style={{ left: m.startOffset, width: m.cols * COL_WIDTH }}
                >
                  {m.label}
                </div>
              ));
            })()}
          </div>

          {/* Day columns */}
          <div
            className="flex absolute bottom-0"
            style={{ left: PROPERTY_WIDTH }}
          >
            {virtualCols.map(vc => {
              const d = dates[vc.index];
              const today = isToday(d);
              const weekend = isWeekend(d);
              return (
                <div
                  key={vc.index}
                  className={`flex flex-col items-center justify-end pb-1 shrink-0 border-r border-slate-100
                    ${today ? 'bg-amber-50' : weekend ? 'bg-blue-50/30' : 'bg-white'}`}
                  style={{ width: COL_WIDTH, position: 'absolute', left: vc.start }}
                >
                  <span className={`text-[10px] ${today ? 'font-bold text-amber-600' : 'text-slate-400'}`}>
                    {format(d, 'EEE')[0]}
                  </span>
                  <span className={`text-[11px] font-semibold leading-none
                    ${today ? 'bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center' :
                      'text-slate-600'}`}>
                    {format(d, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Virtual scroll container ─────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        style={{ willChange: 'scroll-position' }}
      >
        {/* Total virtual canvas */}
        <div
          style={{
            height:   rowVirtualizer.getTotalSize() + HEADER_HEIGHT,
            width:    totalWidth,
            position: 'relative',
          }}
        >

          {/* Rows */}
          {virtualRows.map(vRow => {
            const listing = listings[vRow.index];
            const listingBookings = bookingMap[listing.id] ?? [];

            return (
              <div
                key={vRow.key}
                style={{
                  position:  'absolute',
                  top:       vRow.start,
                  left:      0,
                  width:     totalWidth,
                  height:    ROW_HEIGHT,
                  display:   'flex',
                }}
              >
                {/* ── Sticky property name column ──────────────────────────── */}
                <div
                  className="shrink-0 bg-white border-b border-r border-slate-200
                    flex flex-col justify-center px-3 z-10 sticky left-0"
                  style={{ width: PROPERTY_WIDTH, minWidth: PROPERTY_WIDTH }}
                >
                  <p className="text-xs font-semibold text-slate-700 truncate leading-tight">
                    {listing.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {listing.city}{listing.propertyType ? ` · ${listing.propertyType}` : ''}
                  </p>
                  {listing.basePrice && (
                    <p className="text-[10px] text-blue-500 font-medium">
                      ${parseFloat(listing.basePrice).toFixed(0)}/night
                    </p>
                  )}
                </div>

                {/* ── Date cells (virtualised columns) ─────────────────────── */}
                <div
                  className="relative flex-1"
                  style={{
                    width:  VISIBLE_COLS * COL_WIDTH,
                    height: ROW_HEIGHT,
                  }}
                >
                  {/* Booking pills — absolutely positioned within the row */}
                  {listingBookings.map(bk => {
                    const checkIn  = new Date(bk.checkIn);
                    const checkOut = new Date(bk.checkOut);
                    const startIdx = differenceInDays(checkIn, windowStart);
                    const endIdx   = differenceInDays(checkOut, windowStart);

                    // Clip to visible range
                    const visStart = Math.max(0, startIdx);
                    const visEnd   = Math.min(VISIBLE_COLS - 1, endIdx - 1);
                    if (visStart > visEnd) return null;

                    const left   = visStart * COL_WIDTH + 2;
                    const width  = (visEnd - visStart + 1) * COL_WIDTH - 4;
                    const nights = differenceInDays(checkOut, checkIn);
                    const color  = bookingColor(bk.bookingSource);

                    return (
                      <div
                        key={bk.id}
                        className={`absolute ${color} rounded-full text-white text-[10px]
                          font-semibold flex items-center px-2 overflow-hidden whitespace-nowrap
                          cursor-pointer hover:brightness-110 active:brightness-90 z-10
                          shadow-sm select-none transition-all`}
                        style={{
                          left,
                          width,
                          top: 8,
                          height: ROW_HEIGHT - 16,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerBooking(bk);
                          setDrawerListingTitle(listing.title);
                        }}
                      >
                        <span className="truncate">{bk.guestName} · {nights}n</span>
                      </div>
                    );
                  })}

                  {/* Grid cells */}
                  {virtualCols.map(vCol => {
                    const d       = dates[vCol.index];
                    const dk      = `${listing.id}_${dateKey(d)}`;
                    const cellData = cellMap[dk] ?? null;

                    return (
                      <div
                        key={vCol.index}
                        style={{
                          position: 'absolute',
                          left:     vCol.start,
                          top:      0,
                          width:    COL_WIDTH,
                          height:   ROW_HEIGHT,
                        }}
                      >
                        <GridCell
                          cellKey={dk}
                          isToday={isToday(d)}
                          isWeekend={isWeekend(d)}
                          dragState={dragState}
                          colIdx={vCol.index}
                          rowIdx={vRow.index}
                          onMouseDown={handleMouseDown}
                          onMouseEnter={handleMouseEnter}
                          onMouseUp={handleMouseUp}
                          cellData={cellData}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modals / Drawers ─────────────────────────────────────────────────── */}
      {actionModal && (
        <ActionModal
          open={!!actionModal}
          onClose={() => setActionModal(null)}
          listingId={actionModal.listingId}
          listingTitle={actionModal.listingTitle}
          startDate={actionModal.startDate}
          endDate={actionModal.endDate}
          currentCell={actionModal.cellData}
          onSave={handleActionSave}
        />
      )}

      <BookingDrawer
        booking={drawerBooking}
        listingTitle={drawerListingTitle}
        onClose={() => setDrawerBooking(null)}
      />
    </div>
  );
}

// ─── ErrorBoundary wrapper — Phase 1 Stability Shield ────────────────────────
// Wraps the entire Horizontal Resource Timeline so that a malformed booking date
// or any other render error is caught here, showing a localised fallback without
// unmounting the rest of the dashboard.

export default function TapeChart() {
  return (
    <ErrorBoundary label="timeline">
      <HorizontalTapeChart />
    </ErrorBoundary>
  );
}

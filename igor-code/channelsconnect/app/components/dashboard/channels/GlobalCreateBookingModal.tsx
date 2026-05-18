/**
 * GlobalCreateBookingModal.tsx
 *
 * THE single source-of-truth modal for creating bookings.
 * All scattered booking buttons across the app route here.
 *
 * Validation (Zod + react-hook-form):
 *   - listingId   (must be a positive integer — the active room/property)
 *   - checkIn     (YYYY-MM-DD, must be before checkOut)
 *   - checkOut    (YYYY-MM-DD, must be after checkIn, must be in the future)
 *   - guestName   (non-empty string)
 *   - numGuests   (positive integer)
 *   - totalPrice  (non-negative number)
 *
 * On valid submit:
 *   1. POST /api/bookings/manual
 *   2. Booking saved locally (source of truth)
 *   3. Inventory deducted → event-driven ARI push to Channex
 *   4. On success → closes modal + calls onSuccess() to refresh the list
 *   5. On error → shows inline error below the form (no cryptic toast)
 *
 * No external CSS — pure Tailwind + shadcn/ui.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Calendar, User, Plus, X } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ── Zod schema ─────────────────────────────────────────────────────────────────
const bookingSchema = z.object({
  listingId:   z.number({ invalid_type_error: 'Please select a property' })
                  .positive('Please select a property'),
  checkIn:     z.string()
                  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
                  .refine((d) => {
                    const t = new Date(d + 'T00:00:00Z');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return t >= today;
                  }, 'Check-in must be today or in the future'),
  checkOut:    z.string()
                  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
                  .refine((d) => {
                    const t = new Date(d + 'T00:00:00Z');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return t > today;
                  }, 'Check-out must be after today'),
  guestName:   z.string().min(1, 'Guest name is required').max(100),
  guestEmail:  z.string().email('Invalid email').optional().or(z.literal('')),
  guestPhone:  z.string().optional().or(z.literal('')),
  numGuests:   z.number({ invalid_type_error: 'Enter a number' })
                  .int('Must be a whole number')
                  .min(1, 'At least 1 guest')
                  .max(50),
  totalPrice:  z.number({ invalid_type_error: 'Enter a price' })
                  .min(0, 'Price cannot be negative'),
  notes:       z.string().max(500).optional().or(z.literal('')),
}).refine(({ checkIn, checkOut }) => {
  const ci = new Date(checkIn + 'T00:00:00Z');
  const co = new Date(checkOut + 'T00:00:00Z');
  return co > ci;
}, {
  message: 'Check-out must be after check-in',
  path: ['checkOut'],
});

type BookingFormValues = z.infer<typeof bookingSchema>;

// ── Default today / tomorrow for date inputs ──────────────────────────────────
function todayStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function GlobalCreateBookingModal({
  open,
  onOpenChange,
  prefillListingId,
  onSuccess,
}) {
  const [listings, setListings]     = useState<{ id: number; title: string }[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      listingId:   prefillListingId ?? ('' as unknown as number),
      checkIn:     todayStr(),
      checkOut:    tomorrowStr(),
      guestName:   '',
      guestEmail:  '',
      guestPhone:  '',
      numGuests:   1,
      totalPrice:  0,
      notes:       '',
    },
  });

  const watchedCheckIn  = watch('checkIn');
  const watchedCheckOut = watch('checkOut');

  // Pre-fill listingId if passed in as a prop
  useEffect(() => {
    if (prefillListingId) {
      setValue('listingId', prefillListingId);
    }
  }, [prefillListingId, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [open, reset]);

  // Fetch active listings for the dropdown
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingListings(true);
    api.listings.getActive().then(({ data }) => {
      if (cancelled) return;
      setListings(data ?? []);
    }).catch(() => {
      if (!cancelled) setListings([]);
    }).finally(() => {
      if (!cancelled) setLoadingListings(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  // Auto-advance checkOut to day after checkIn if checkOut ≤ checkIn
  useEffect(() => {
    if (!watchedCheckIn || !watchedCheckOut) return;
    const ci = new Date(watchedCheckIn + 'T00:00:00Z');
    const co = new Date(watchedCheckOut + 'T00:00:00Z');
    if (co <= ci) {
      const next = new Date(ci);
      next.setDate(next.getDate() + 1);
      setValue('checkOut', next.toISOString().split('T')[0]);
    }
  }, [watchedCheckIn, setValue]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (values: BookingFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        listingId:   values.listingId,
        guestName:   values.guestName,
        guestEmail:  values.guestEmail || undefined,
        guestPhone:  values.guestPhone || undefined,
        checkIn:     values.checkIn,
        checkOut:    values.checkOut,
        numGuests:   values.numGuests,
        totalPrice:  values.totalPrice,
        notes:       values.notes || undefined,
      };
      const { data, error } = await api.bookings.createManual(payload);
      if (error) {
        const msg = error?.response?.data?.message
                  ?? error?.message
                  ?? 'Failed to create booking';
        setSubmitError(msg);
        return;
      }
      toast.success('Booking created successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'An unexpected error occurred';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=\"max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100\">
        <DialogClose className=\"absolute right-4 top-4 opacity-60 hover:opacity-100\">
          <X className=\"w-4 h-4\" />
        </DialogClose>

        <DialogHeader>
          <DialogTitle className=\"flex items-center gap-2 text-lg\">
            <Plus className=\"w-5 h-5 text-indigo-400\" />
            Create Direct Booking
          </DialogTitle>
          <DialogDescription className=\"text-slate-400\">
            Book a stay directly — inventory will be reserved and synced to connected channels.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className=\"space-y-4 mt-2\">

          {/* Property selector */}
          <div className=\"space-y-1\">
            <Label htmlFor=\"listingId\" className=\"text-slate-300 text-sm\">
              Property <span className=\"text-red-400\">*</span>
            </Label>
            <Select
              onValueChange={(v) => setValue('listingId', Number(v))}
              value={String(watch('listingId') ?? '')}
            >
              <SelectTrigger
                id=\"listingId\"
                className={`bg-slate-800 border-slate-700 text-slate-100 ${
                  errors.listingId ? 'border-red-500' : ''
                }`}
              >
                {loadingListings ? (
                  <Loader2 className=\"w-4 h-4 animate-spin\" />
                ) : (
                  <SelectValue placeholder=\"Select a property...\" />
                )}
              </SelectTrigger>
              <SelectContent className=\"bg-slate-800 border-slate-700 text-slate-100\">
                {listings.length === 0 && !loadingListings && (
                  <div className=\"px-4 py-2 text-slate-400 text-sm\">No active properties found</div>
                )}
                {listings.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)} className=\"focus:bg-slate-700\">
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.listingId && (
              <p className=\"text-red-400 text-xs\">{errors.listingId.message}</p>
            )}
          </div>

          {/* Guest name */}
          <div className=\"space-y-1\">
            <Label htmlFor=\"guestName\" className=\"text-slate-300 text-sm\">
              Guest Name <span className=\"text-red-400\">*</span>
            </Label>
            <div className=\"relative\">
              <User className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none\" />
              <Input
                id=\"guestName\"
                {...register('guestName')}
                placeholder=\"Full name as shown on ID\"
                className={`pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 ${
                  errors.guestName ? 'border-red-500' : ''
                }`}
              />
            </div>
            {errors.guestName && (
              <p className=\"text-red-400 text-xs\">{errors.guestName.message}</p>
            )}
          </div>

          {/* Dates row */}
          <div className=\"grid grid-cols-2 gap-3\">
            <div className=\"space-y-1\">
              <Label htmlFor=\"checkIn\" className=\"text-slate-300 text-sm\">
                Check-in <span className=\"text-red-400\">*</span>
              </Label>
              <div className=\"relative\">
                <Calendar className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none\" />
                <Input
                  id=\"checkIn\"
                  type=\"date\"
                  {...register('checkIn')}
                  className={`pl-10 bg-slate-800 border-slate-700 text-slate-100 ${
                    errors.checkIn ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {errors.checkIn && (
                <p className=\"text-red-400 text-xs\">{errors.checkIn.message}</p>
              )}
            </div>
            <div className=\"space-y-1\">
              <Label htmlFor=\"checkOut\" className=\"text-slate-300 text-sm\">
                Check-out <span className=\"text-red-400\">*</span>
              </Label>
              <div className=\"relative\">
                <Calendar className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none\" />
                <Input
                  id=\"checkOut\"
                  type=\"date\"
                  {...register('checkOut')}
                  className={`pl-10 bg-slate-800 border-slate-700 text-slate-100 ${
                    errors.checkOut ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {errors.checkOut && (
                <p className=\"text-red-400 text-xs\">{errors.checkOut.message}</p>
              )}
            </div>
          </div>

          {/* Guests + Price row */}
          <div className=\"grid grid-cols-2 gap-3\">
            <div className=\"space-y-1\">
              <Label htmlFor=\"numGuests\" className=\"text-slate-300 text-sm\">
                Guests <span className=\"text-red-400\">*</span>
              </Label>
              <Input
                id=\"numGuests\"
                type=\"number\"
                min={1}
                max={50}
                {...register('numGuests', { valueAsNumber: true })}
                className={`bg-slate-800 border-slate-700 text-slate-100 ${
                  errors.numGuests ? 'border-red-500' : ''
                }`}
              />
              {errors.numGuests && (
                <p className=\"text-red-400 text-xs\">{errors.numGuests.message}</p>
              )}
            </div>
            <div className=\"space-y-1\">
              <Label htmlFor=\"totalPrice\" className=\"text-slate-300 text-sm\">
                Total Price <span className=\"text-red-400\">*</span>
              </Label>
              <Input
                id=\"totalPrice\"
                type=\"number\"
                min={0}
                step={0.01}
                {...register('totalPrice', { valueAsNumber: true })}
                placeholder=\"0.00\"
                className={`bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 ${
                  errors.totalPrice ? 'border-red-500' : ''
                }`}
              />
              {errors.totalPrice && (
                <p className=\"text-red-400 text-xs\">{errors.totalPrice.message}</p>
              )}
            </div>
          </div>

          {/* Contact info (optional) */}
          <div className=\"grid grid-cols-2 gap-3\">
            <div className=\"space-y-1\">
              <Label htmlFor=\"guestEmail\" className=\"text-slate-300 text-sm\">
                Email <span className=\"text-slate-500 text-xs\">(optional)</span>
              </Label>
              <Input
                id=\"guestEmail\"
                type=\"email\"
                {...register('guestEmail')}
                placeholder=\"guest@example.com\"
                className=\"bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600\"
              />
              {errors.guestEmail && (
                <p className=\"text-red-400 text-xs\">{errors.guestEmail.message}</p>
              )}
            </div>
            <div className=\"space-y-1\">
              <Label htmlFor=\"guestPhone\" className=\"text-slate-300 text-sm\">
                Phone <span className=\"text-slate-500 text-xs\">(optional)</span>
              </Label>
              <Input
                id=\"guestPhone\"
                type=\"tel\"
                {...register('guestPhone')}
                placeholder=\"+1 555 000 0000\"
                className=\"bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600\"
              />
            </div>
          </div>

          {/* Notes */}
          <div className=\"space-y-1\">
            <Label htmlFor=\"notes\" className=\"text-slate-300 text-sm\">
              Notes <span className=\"text-slate-500 text-xs\">(optional)</span>
            </Label>
            <textarea
              id=\"notes\"
              {...register('notes')}
              rows={2}
              maxLength={500}
              placeholder=\"Special requests, VIP notes, etc.\"
              className=\"w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-600 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50\"
            />
            {errors.notes && (
              <p className=\"text-red-400 text-xs\">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit error */}
          {submitError && (
            <Alert className=\"border-red-500/40 bg-red-500/10\">
              <AlertDescription className=\"text-red-300 text-sm\">
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <DialogFooter className=\"pt-2\">
            <Button
              type=\"button\"
              variant=\"ghost\"
              onClick={() => onOpenChange(false)}
              className=\"text-slate-400 hover:text-slate-200 hover:bg-slate-800\"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type=\"submit\"
              disabled={isSubmitting}
              className=\"bg-indigo-600 hover:bg-indigo-500 text-white gap-2\"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className=\"w-4 h-4 animate-spin\" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className=\"w-4 h-4\" />
                  Create Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
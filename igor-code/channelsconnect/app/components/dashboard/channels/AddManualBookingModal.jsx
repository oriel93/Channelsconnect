/**
 * AddManualBookingModal.jsx
 *
 * TASK 2 — Manual Direct Booking
 *
 * Location: ListingDetail page → Reservations section → toolbar.
 *           Opens when the user clicks the 'Create Direct Booking' button.
 *
 * Form fields:
 *   - listingId   (dropdown of active rooms/properties)
 *   - guestName   (text input, required)
 *   - checkIn     (date picker, required)
 *   - checkOut    (date picker, required)
 *   - numGuests   (number input, required)
 *   - totalPrice  (number input, optional)
 *   - notes       (text input, optional)
 *
 * On valid submit → POST /api/bookings/manual
 *   1. Creates the booking record in the local DB.
 *   2. Deducts inventory (blocks stay nights) via applyChange().
 *   3. Event-driven sync pushes the availability delta to all connected channels.
 *   4. On success: closes modal + calls onSuccess() to refresh the list.
 *   5. On error: displays an inline error message below the form.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Calendar } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function AddManualBookingModal({ open, onOpenChange, listingId: propListingId, onSuccess }) {
  const [listingId,   setListingId]   = useState('');
  const [guestName,   setGuestName]   = useState('');
  const [checkIn,     setCheckIn]     = useState('');
  const [checkOut,    setCheckOut]    = useState('');
  const [numGuests,   setNumGuests]   = useState(1);
  const [totalPrice,  setTotalPrice]  = useState('');
  const [notes,       setNotes]       = useState('');

  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Block submit if no active session — show clear message instead of cryptic 401 toast
  useEffect(() => {
    if (!open) { setAuthChecked(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) {
        setApiError('You must be signed in to create a booking.');
        setAuthChecked(false);
      } else {
        setApiError(null);
        setAuthChecked(true);
      }
    });
  }, [open]);

  const [listings,        setListings]        = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingListings(true);
    api.listings.getActive()
      .then(res => setListings(res.data ?? []))
      .catch(()  => setListings([]))
      .finally(() => setLoadingListings(false));
  }, [open]);

  useEffect(() => {
    if (propListingId) setListingId(String(propListingId));
  }, [propListingId]);

  useEffect(() => {
    if (!open) return;
    setGuestName('');
    setCheckIn('');
    setCheckOut('');
    setNumGuests(1);
    setTotalPrice('');
    setNotes('');
    setApiError(null);
    setLoading(false);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!listingId)               { setApiError('Please select a room.');           return; }
    if (!guestName.trim())        { setApiError('Please enter the guest name.');    return; }
    if (!checkIn)                 { setApiError('Please select a check-in date.');  return; }
    if (!checkOut)                { setApiError('Please select a check-out date.'); return; }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setApiError('Check-out must be after check-in.'); return;
    }
    if (!numGuests || Number(numGuests) < 1) {
      setApiError('Number of guests must be at least 1.'); return;
    }

    if (!authChecked) { setApiError('Session check in progress — please wait a moment.'); return; }
    setLoading(true);

    try {
      await api.bookings.createManual({
        listingId:      parseInt(listingId, 10),
        guestName:      guestName.trim(),
        checkIn:        checkIn,
        checkOut:       checkOut,
        numGuests:      parseInt(numGuests, 10),
        totalPrice:     parseFloat(totalPrice) || 0,
        bookingSource:  'Channels Connect Direct',
        notes:          notes.trim() || undefined,
      });

      toast.success(
        `Booking created for ${guestName.trim()} ` +
        `(${checkIn} → ${checkOut}). Availability updated.`,
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const status = err?.response?.status;
      const data   = err?.response?.data;

      // 401 = session expired — redirect to login
      if (status === 401) {
        toast.error('Your session has expired. Redirecting to login…');
        setTimeout(() => { window.location.href = '/Login'; }, 1500);
        setLoading(false);
        return;
      }

      // 403 = no permission
      if (status === 403) {
        setApiError('You do not have permission to create bookings.');
        toast.error('Permission denied.');
        setLoading(false);
        return;
      }

      const apiMsg = typeof data === 'string' ? data : data?.message;
      const msg = apiMsg ?? err?.message ?? 'Failed to save booking.';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Calendar className='w-5 h-5 text-blue-600' />
            Create Direct Booking
          </DialogTitle>
          <DialogDescription>
            Manually add a booking made outside online channels.
            Availability will be deducted and synced to all connected channels.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Room / Property dropdown */}
          <div className='space-y-1.5'>
            <Label htmlFor='listingId'>Room / Property *</Label>
            <Select
              value={listingId}
              onValueChange={setListingId}
              disabled={loadingListings}
            >
              <SelectTrigger id='listingId'>
                <SelectValue placeholder='Select a room…' />
              </SelectTrigger>
              <SelectContent>
                {listings.map(l => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Guest Name */}
          <div className='space-y-1.5'>
            <Label htmlFor='guestName'>Guest Name *</Label>
            <Input
              id='guestName'
              type='text'
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder='e.g. Jane Smith'
              autoComplete='name'
              maxLength={100}
              required
            />
          </div>

          {/* Check-in / Check-out dates */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='checkIn'>Check-in *</Label>
              <Input
                id='checkIn'
                type='date'
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                min={today}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='checkOut'>Check-out *</Label>
              <Input
                id='checkOut'
                type='date'
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                min={checkIn || today}
                required
              />
            </div>
          </div>

          {/* Guests + Total Price */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='numGuests'>Guests *</Label>
              <Input
                id='numGuests'
                type='number'
                min='1'
                max='50'
                value={numGuests}
                onChange={e => setNumGuests(e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='totalPrice'>Total Price</Label>
              <Input
                id='totalPrice'
                type='number'
                min='0'
                step='0.01'
                value={totalPrice}
                onChange={e => setTotalPrice(e.target.value)}
                placeholder='0.00'
              />
            </div>
          </div>

          {/* Notes */}
          <div className='space-y-1.5'>
            <Label htmlFor='notes'>Notes (optional)</Label>
            <Input
              id='notes'
              type='text'
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Internal notes…'
              maxLength={500}
            />
          </div>

          {/* Inline API error */}
          {apiError && (
            <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-3'>
              <p className='text-sm text-red-700'>{apiError}</p>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type='button' variant='outline' disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type='submit'
              disabled={loading || loadingListings || !authChecked}
              className='bg-blue-600 hover:bg-blue-700 text-white'
            >
              {loading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin mr-2' />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className='w-4 h-4 mr-2' />
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
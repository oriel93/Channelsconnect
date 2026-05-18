/**
 * ChannexMappingModal.tsx
 *
 * THE primary mapping interface for Channex PMS Certification.
 *
 * Allows an admin to input the three Channex IDs that our system needs
 * in order to push ARI updates. This is the endpoint the cert reviewer
 * will use during the screenshare to set up a working test property.
 *
 * IDs required for ANY ARI sync to work:
 *   - channexPropertyId   → used as property_id in all Channex API calls
 *   - channexRoomTypeId   → used as room_type_id in /availability calls
 *   - channexRatePlanId   → used as rate_plan_id in /restrictions calls
 *
 * Saved via: POST /admin/channex/mapping/:listingId
 *
 * On success: closes modal + calls onSuccess() to refresh parent state.
 * On error:   shows inline error with the exact reason (no silent failure).
 */

import { useState, useEffect } from 'react';
import { Loader2, Link2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── Props ──────────────────────────────────────────────────────────────────────
interface ListingOption {
  id: number;
  title: string;
  city?: string;
  channexPropertyId?: string;
  syncStatus?: string;
}

interface Props {
  /** Whether the modal is open */
  open: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /**
   * Pre-loaded listing options for the dropdown.
   * If not provided, fetches from GET /admin/channex/properties-mapping.
   */
  listings?: ListingOption[];
  /**
   * If provided, the modal opens in edit mode pre-filled with this listing's
   * current mapping. If omitted, the user selects a listing first.
   */
  initialListingId?: number;
  initialPropertyId?: string;
  initialRoomTypeId?: string;
  initialRatePlanId?: string;
  /** Called after a successful save — parent refreshes the table */
  onSuccess?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ChannexMappingModal({
  open,
  onClose,
  listings: propListings,
  initialListingId,
  initialPropertyId,
  initialRoomTypeId,
  initialRatePlanId,
  onSuccess,
}: Props) {
  // Form state
  const [listingId, setListingId] = useState<number | null>(
    initialListingId ?? null,
  );
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? '');
  const [roomTypeId, setRoomTypeId] = useState(initialRoomTypeId ?? '');
  const [ratePlanId, setRatePlanId] = useState(initialRatePlanId ?? '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingOption[]>(propListings ?? []);
  const [loadingListings, setLoadingListings] = useState(!propListings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch listings if not provided
  useEffect(() => {
    if (!propListings && open) {
      setLoadingListings(true);
      api.admin
        .getPropertiesMapping()
        .then((res) => {
          // Shape: { listing: { id, title, city }, mapping: { channexPropertyId, ... } | null }
          const opts: ListingOption[] = (res.data ?? []).map((row: any) => ({
            id: row.listing.id,
            title: row.listing.title ?? `Listing #${row.listing.id}`,
            city: row.listing.city,
            channexPropertyId: row.mapping?.channexPropertyId ?? undefined,
            syncStatus: row.mapping?.syncStatus ?? undefined,
          }));
          setListings(opts);
        })
        .catch(() => toast.error('Failed to load listings'))
        .finally(() => setLoadingListings(false));
    }
  }, [open, propListings]);

  // Reset when modal opens with new initial values
  useEffect(() => {
    if (open) {
      setPropertyId(initialPropertyId ?? '');
      setRoomTypeId(initialRoomTypeId ?? '');
      setRatePlanId(initialRatePlanId ?? '');
      setError(null);
      setSaveSuccess(false);
      if (initialListingId) setListingId(initialListingId);
    }
  }, [open, initialListingId, initialPropertyId, initialRoomTypeId, initialRatePlanId]);

  // Auto-select if only one listing
  useEffect(() => {
    if (listings.length === 1 && !listingId) {
      setListingId(listings[0].id);
    }
  }, [listings, listingId]);

  const selectedListing = listings.find((l) => l.id === listingId);

  // ── Validation ─────────────────────────────────────────────────────────────
  const canSubmit =
    listingId !== null &&
    propertyId.trim().length > 0 &&
    roomTypeId.trim().length > 0;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || saving) return;

    setSaving(true);
    setError(null);

    try {
      const response = await api.admin.saveChannexMapping(listingId!, {
        channexPropertyId: propertyId.trim(),
        channexRoomTypeId: roomTypeId.trim(),
        channexRatePlanId: ratePlanId.trim() || undefined,
      });

      const data = response.data as any;

      setSaveSuccess(true);
      toast.success(
        `Mapping saved for ${selectedListing?.title ?? `listing #${listingId}`}`,
        {
          description: `property_id=${propertyId.trim()} | room_type_id=${roomTypeId.trim()}`,
        },
      );

      // Log for cert screenshare
      console.log(
        `[CHANNEX_CERT_LOG] MAPPING_SAVED ` +
          `listingId=${listingId} ` +
          `property_id=${propertyId.trim()} ` +
          `room_type_id=${roomTypeId.trim()} ` +
          `rate_plan_id=${ratePlanId.trim() || 'not set'} ` +
          `response_taskId=${data?.taskId ?? 'N/A'}`,
      );

      // Small delay so the cert reviewer can see the success state
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSaveSuccess(false);
      }, 1200);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        'Failed to save mapping';

      setError(message);
      console.error(
        `[CHANNEX_CERT_LOG] MAPPING_SAVE_FAILED listingId=${listingId} error=${message}`,
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={`sm:max-w-lg`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2`}>
            <Link2 className={`w-4 h-4 text-indigo-400`} />
            Channex Property Mapping
          </DialogTitle>
          <DialogDescription>
            Set the three Channex IDs required for ARI sync.
            Without these, all availability updates will fail.
          </DialogDescription>
        </DialogHeader>

        {/* Success banner */}
        {saveSuccess && (
          <Alert className={`border-emerald-500/40 bg-emerald-500/10`}>
            <CheckCircle2 className={`w-4 h-4 text-emerald-400`} />
            <AlertDescription className={`text-emerald-300 text-sm font-medium`}>
              Mapping saved. You can now run Full Sync or create a booking.
            </AlertDescription>
          </Alert>
        )}

        {/* Error banner */}
        {error && (
          <Alert className={`border-red-500/40 bg-red-500/10`}>
            <XCircle className={`w-4 h-4 text-red-400`} />
            <AlertDescription className={`text-red-300 text-sm`}>{error}</AlertDescription>
          </Alert>
        )}

        <div className={`space-y-4 py-2`}>
          {/* Listing selector */}
          <div className={`space-y-1.5`}>
            <Label htmlFor={`listing-select`}>
              Property / Listing
              <span className={`text-red-400 ml-0.5`}>*</span>
            </Label>
            {loadingListings ? (
              <div className={`flex items-center gap-2 text-sm text-slate-400`}>
                <Loader2 className={`w-4 h-4 animate-spin`} />
                Loading listings…
              </div>
            ) : listings.length === 0 ? (
              <p className={`text-sm text-slate-500`}>No listings found.</p>
            ) : (
              <Select
                value={listingId?.toString() ?? ''}
                onValueChange={(val) => setListingId(Number(val))}
              >
                <SelectTrigger id={`listing-select`} className={`w-full`}>
                  <SelectValue placeholder={`Select a property…`} />
                </SelectTrigger>
                <SelectContent>
                  {listings.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      <span className={`flex items-center gap-2`}>
                        {l.title}
                        {l.city && (
                          <span className={`text-slate-500 text-xs`}>· {l.city}</span>
                        )}
                        {l.channexPropertyId && (
                          <span className={`text-emerald-400 text-xs`}>✓ mapped</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Overwrite warning */}
          {selectedListing?.channexPropertyId && (
            <div className={`rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2`}>
              <p className={`text-xs text-amber-300 flex items-center gap-1.5`}>
                <AlertTriangle className={`w-3 h-3 shrink-0`} />
                <>
                  <strong>Already mapped.</strong> Saving will overwrite existing IDs
                  for this property.
                </>
              </p>
            </div>
          )}

          {/* ID inputs */}
          <div className={`space-y-3`}>
            {/* Channex Property ID */}
            <div className={`space-y-1.5`}>
              <Label htmlFor={`channex-property-id`}>
                Channex Property ID
                <span className={`text-red-400 ml-0.5`}>*</span>
              </Label>
              <Input
                id={`channex-property-id`}
                placeholder={`e.g. prop_abc12345`}
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className={`font-mono text-sm`}
                autoComplete={`off`}
              />
              <p className={`text-[11px] text-slate-500`}>
                Used as <code className={`text-indigo-400`}>property_id</code> in all ARI calls.
                Found in your Channex dashboard under Property → Settings → API.
              </p>
            </div>

            {/* Channex Room Type ID */}
            <div className={`space-y-1.5`}>
              <Label htmlFor={`channex-room-type-id`}>
                Channex Room Type ID
                <span className={`text-red-400 ml-0.5`}>*</span>
              </Label>
              <Input
                id={`channex-room-type-id`}
                placeholder={`e.g. rt_xyz789`}
                value={roomTypeId}
                onChange={(e) => setRoomTypeId(e.target.value)}
                className={`font-mono text-sm`}
                autoComplete={`off`}
              />
              <p className={`text-[11px] text-slate-500`}>
                Used as <code className={`text-indigo-400`}>room_type_id</code> in{' '}
                <strong>/availability</strong> calls. Found in Channex under
                Property → Rooms → API ID.
              </p>
            </div>

            {/* Channex Rate Plan ID */}
            <div className={`space-y-1.5`}>
              <Label htmlFor={`channex-rate-plan-id`}>
                Channex Rate Plan ID
                <span className={`text-slate-500 ml-1`}>(optional but recommended)</span>
              </Label>
              <Input
                id={`channex-rate-plan-id`}
                placeholder={`e.g. rp_def456`}
                value={ratePlanId}
                onChange={(e) => setRatePlanId(e.target.value)}
                className={`font-mono text-sm`}
                autoComplete={`off`}
              />
              <p className={`text-[11px] text-slate-500`}>
                Used as <code className={`text-indigo-400`}>rate_plan_id</code> in{' '}
                <strong>/restrictions</strong> calls (rate plans). Found in Channex under
                Property → Rate Plans → API ID.
              </p>
            </div>
          </div>

          {/* Cert reminder box */}
          <div className={`
            rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3
            text-xs text-slate-400 leading-relaxed
          `}>
            <strong className={`text-slate-300`}>For the certification screenshare:</strong>{' '}
            Enter the exact Channex IDs from your test property. Once saved, run{' '}
            <strong className={`text-emerald-400`}>Full Sync (500 days)</strong> to
            generate task IDs for the cert form. Then create a test booking to verify
            the ARI push appears in Channex under your property's calendar.
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className={`gap-2`}>
          <Button
            variant={`outline`}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className={`
              bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
              text-white border-0
              ${saveSuccess ? 'ring-2 ring-emerald-400/50' : ''}
            `}
          >
            {saving ? (
              <>
                <Loader2 className={`w-4 h-4 mr-2 animate-spin`} />
                Saving…
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className={`w-4 h-4 mr-2`} />
                Saved!
              </>
            ) : (
              'Save Mapping'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
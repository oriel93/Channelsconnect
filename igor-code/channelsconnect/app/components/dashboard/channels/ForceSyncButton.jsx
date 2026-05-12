/**
 * ForceSyncButton.jsx
 *
 * TASK 1 — Force Full Channel Sync
 *
 * Location: Channel Manager dashboard → Manual Sync Controls section.
 *
 * Flow:
 *  1. User clicks the button.
 *  2. Confirmation modal appears (rate-limit warning).
 *  3. On confirm → POST /api/properties/:id/force-sync
 *  4. Button shows loading spinner while awaiting response.
 *  5. On success: green success box with Sync Operation IDs rendered
 *     visibly on screen — required so the certification auditor can
 *     see and copy the IDs during the screenshare.
 *  6. On error: red error box with the failure message.
 */

import { useState } from 'react';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ForceSyncButton({ listingId, propertyId }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    const id = propertyId || listingId;

    try {
      const res = await api.properties.forceSync(id);
      const data = res.data ?? res;

      if (data.success) {
        setResult(data);
        toast.success('Full channel sync triggered successfully.');
      } else {
        setError(data.message ?? 'Sync failed. No response from server.');
        toast.error(data.message ?? 'Sync failed.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error.';
      setError(msg);
      toast.error(`Sync failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const dismissResult = () => {
    setResult(null);
    setShowConfirm(false);
  };

  return (
    <>
      {/* ── Trigger button ────────────────────────────────────────────── */}
      <Button
        variant='outline'
        size='sm'
        onClick={() => setShowConfirm(true)}
        className='gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700'
      >
        <RefreshCw className='w-4 h-4' />
        Force Full Channel Sync
      </Button>

      {/* ── Confirmation modal ─────────────────────────────────────────── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='w-5 h-5 text-amber-500' />
              Force Full Channel Sync
            </DialogTitle>
            <DialogDescription>
              This will push a full 500-day availability and rate sync to all
              connected channels. This action is rate-limited — please wait a
              few minutes before triggering again.
            </DialogDescription>
          </DialogHeader>

          {/* ── Sync Operation ID success display ──────────────────────── */}
          {result && (
            <div className='bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2'>
              <div className='flex items-center gap-2 text-emerald-800 font-semibold text-sm'>
                <CheckCircle2 className='w-4 h-4' />
                Sync Successful
              </div>
              <p className='text-sm text-emerald-700'>
                All connected channels have been updated.
              </p>
              <div className='bg-white border border-emerald-200 rounded-lg p-3 mt-1'>
                <p className='text-xs text-emerald-600 font-medium mb-2'>
                  Sync Operation IDs — copy to cert form:
                </p>
                {(result.taskIds ?? []).map((id, i) => (
                  <div
                    key={i}
                    className='font-mono text-sm text-emerald-800 break-all bg-emerald-50 px-2 py-1.5 rounded mb-1 last:mb-0'
                  >
                    {id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error display ──────────────────────────────────────────── */}
          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
              <p className='text-sm text-red-700'>{error}</p>
            </div>
          )}

          <DialogFooter className='gap-2'>
            {(result || error) ? (
              <Button variant='outline' onClick={dismissResult}>
                Done
              </Button>
            ) : (
              <>
                <DialogClose asChild>
                  <Button variant='outline'>Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleSync}
                  disabled={loading}
                  className='bg-orange-600 hover:bg-orange-700 text-white'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin mr-2' />
                      Syncing…
                    </>
                  ) : (
                    'Yes, Sync Now'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
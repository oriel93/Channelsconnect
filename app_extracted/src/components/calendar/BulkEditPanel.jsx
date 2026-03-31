
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateRate } from '@/api/functions';
import { blockDate } from '@/api/functions';
import { Loader2, X, Lock, Unlock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkEditPanel({ listingId, selectedDates, onClear, onSave, calendarData, onLocalUpdate }) {
  const [netRate, setNetRate] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);

  // If any selected day is blocked (manually or via iCal), the toggle action will be to unblock.
  const anyBlocked = selectedDates.some(date => 
    calendarData?.blocked_dates?.some(b => b.date === date)
  );
  const blockAction = anyBlocked ? 'unblock' : 'block';

  // Generic function to process updates and refresh data
  const processUpdates = async (updateFunction, updateType, onStart, onEnd, successMsg, errorMsg) => {
    onStart(true);
    let successfulUpdates = [];
    let errorCount = 0;

    const promises = selectedDates.map(async (date, i) => {
      await new Promise(resolve => setTimeout(resolve, i * 150)); // Stagger API calls
      try {
        const response = await updateFunction(date);
        if (response.data?.error) {
          throw new Error(response.data.error);
        }
        return response.data; // Return data from backend
      } catch (err) {
        console.error(`Failed during bulk update for ${date}:`, err.message);
        toast.error(`Update for ${date} failed: ${err.message.substring(0, 100)}`);
        throw err;
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value) {
        successfulUpdates.push({ type: updateType, data: res.value });
      } else {
        errorCount++;
      }
    });

    // --- Core Logic Change: Immediate UI Update ---
    if (successfulUpdates.length > 0) {
      onLocalUpdate(successfulUpdates);
      toast.success(`${successfulUpdates.length} ${successMsg}`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} ${errorMsg}`);
    }
    
    onEnd(false);
    onClear();
  };

  const handleApplyRate = async () => {
    const rateValue = parseFloat(netRate);
    if (isNaN(rateValue) || rateValue <= 0) {
      toast.error('Please enter a valid positive number for the rate.');
      return;
    }
    
    const updateRateAction = (date) => updateRate({ listing_id: listingId, date, net_rate: rateValue });

    await processUpdates(
      updateRateAction, 
      'rate',
      setIsSavingRate, 
      setIsSavingRate, 
      'day(s) had their rate updated.', 
      'day(s) failed to update rate.'
    );
  };

  const handleBlockToggle = async () => {
    const toggleBlockAction = (date) => blockDate({ listing_id: listingId, date, action: blockAction });

    await processUpdates(
      toggleBlockAction,
      'block',
      setIsTogglingBlock,
      setIsTogglingBlock,
      `day(s) were ${blockAction}ed.`,
      `day(s) failed to be ${blockAction}ed.`
    );
  };

  if (selectedDates.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl p-4 z-20">
      <div className="bg-white rounded-lg shadow-2xl border p-6 w-full">
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">{selectedDates.length} Dates Selected</h3>
             <Button variant="ghost" size="icon" onClick={onClear} disabled={isSavingRate || isTogglingBlock}>
                <X className="w-5 h-5" />
            </Button>
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Label htmlFor="bulk-net-rate">Set Rate ($)</Label>
              <Input
                id="bulk-net-rate"
                type="number"
                placeholder="e.g. 150"
                value={netRate}
                onChange={(e) => setNetRate(e.target.value)}
                disabled={isSavingRate || isTogglingBlock}
              />
            </div>
            <Button onClick={handleApplyRate} disabled={isSavingRate || isTogglingBlock || !netRate}>
              {isSavingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            </Button>
          </div>
          <Button 
              onClick={handleBlockToggle} 
              disabled={isSavingRate || isTogglingBlock}
              className={blockAction === 'unblock' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-800 hover:bg-gray-900"}
          >
            {isTogglingBlock ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (blockAction === 'unblock' ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />)}
            {`${blockAction === 'unblock' ? 'Unblock' : 'Block'} ${selectedDates.length} Day(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}

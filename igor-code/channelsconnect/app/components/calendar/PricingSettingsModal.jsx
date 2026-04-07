import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PricingSettingsModal({ isOpen, onClose, pricingRules, onSave }) {
  const [localRules, setLocalRules] = useState(pricingRules);

  useEffect(() => {
    if (isOpen) {
      setLocalRules(pricingRules);
    }
  }, [isOpen, pricingRules]);

  const handleSave = () => {
    onSave(localRules);
    toast.success('Pricing settings saved!');
    onClose();
  };

  const handleRuleChange = (key, value) => {
    // Ensure we handle percentage-based discounts correctly
    if (key.includes('Discount')) {
        const percentage = Math.max(0, Math.min(100, parseFloat(value)));
        setLocalRules(prev => ({...prev, [key]: percentage / 100 }));
    } else { // Multipliers
        const multiplier = Math.max(1, parseFloat(value));
        setLocalRules(prev => ({...prev, [key]: multiplier }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Advanced Pricing Settings</DialogTitle>
          <DialogDescription>
            Fine-tune your dynamic pricing rules for optimal performance.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weekendMultiplier">Weekend Multiplier</Label>
            <Input
              id="weekendMultiplier"
              type="number"
              step="0.01"
              value={localRules.weekendMultiplier}
              onChange={(e) => handleRuleChange('weekendMultiplier', e.target.value)}
              placeholder="e.g., 1.25 for +25%"
            />
             <p className="text-xs text-muted-foreground">Applies to Friday & Saturday nights.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holidayMultiplier">Holiday Multiplier</Label>
            <Input
              id="holidayMultiplier"
              type="number"
              step="0.01"
              value={localRules.holidayMultiplier}
              onChange={(e) => handleRuleChange('holidayMultiplier', e.target.value)}
               placeholder="e.g., 1.40 for +40%"
            />
            <p className="text-xs text-muted-foreground">Applies to major holidays and events.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastMinuteDiscount">Last-Minute Discount (%)</Label>
            <Input
              id="lastMinuteDiscount"
              type="number"
              step="1"
              value={Math.round(localRules.lastMinuteDiscount * 100)}
              onChange={(e) => handleRuleChange('lastMinuteDiscount', e.target.value)}
              placeholder="e.g., 15 for 15% off"
            />
             <p className="text-xs text-muted-foreground">Applies to bookings made within 7 days of arrival.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="advanceBookingDiscount">Advance Booking Discount (%)</Label>
            <Input
              id="advanceBookingDiscount"
              type="number"
              step="1"
              value={Math.round(localRules.advanceBookingDiscount * 100)}
              onChange={(e) => handleRuleChange('advanceBookingDiscount', e.target.value)}
              placeholder="e.g., 10 for 10% off"
            />
            <p className="text-xs text-muted-foreground">Applies to bookings made more than 30 days in advance.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
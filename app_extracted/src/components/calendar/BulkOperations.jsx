import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Lock, Unlock, X } from 'lucide-react';

export default function BulkOperations({ selectedDates, onBulkOperation, onClearSelection, isLoading }) {
  const [price, setPrice] = useState('');
  const [action, setAction] = useState('set');
  const [reason, setReason] = useState('Manual block');
  
  const handlePriceUpdate = () => {
    if (!price) return;
    onBulkOperation('updatePrice', { price: parseFloat(price), action });
  };
  
  const handleBlock = () => {
    onBulkOperation('block', { reason });
  };
  
  const handleUnblock = () => {
    onBulkOperation('unblock');
  };
  
  if (selectedDates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <p>Select dates on the calendar to perform bulk actions.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Actions for {selectedDates.length} Dates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="font-medium">Update Prices</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bulk-action">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="bulk-action"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set Price</SelectItem>
                  {/* Future actions
                  <SelectItem value="increase">Increase By ($)</SelectItem>
                  <SelectItem value="decrease">Decrease By ($)</SelectItem>
                  */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bulk-price">Price ($)</Label>
              <Input id="bulk-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={handlePriceUpdate} disabled={!price || isLoading}>
            <DollarSign className="w-4 h-4 mr-2" /> Apply Price Update
          </Button>
        </div>
        
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="font-medium">Update Availability</h4>
           <div className="grid grid-cols-2 gap-4">
             <Button variant="outline" onClick={handleBlock} disabled={isLoading}>
               <Lock className="w-4 h-4 mr-2" /> Block Dates
             </Button>
             <Button variant="outline" onClick={handleUnblock} disabled={isLoading}>
               <Unlock className="w-4 h-4 mr-2" /> Unblock Dates
             </Button>
           </div>
        </div>
        
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClearSelection}>
            <X className="w-4 h-4 mr-2" /> Clear Selection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from 'react';
import { PricingRule } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PricingRulesManager({ listingId, onRulesChange }) {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRule, setNewRule] = useState({ day_of_week: '', net_rate: '' });

  const fetchRules = async () => {
    setIsLoading(true);
    const existingRules = await PricingRule.filter({ listing_id: listingId });
    setRules(existingRules);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, [listingId]);

  const handleAddRule = async () => {
    if (!newRule.day_of_week || !newRule.net_rate) {
      toast.error("Please select a day and enter a rate.");
      return;
    }
    
    // Check for duplicate day
    if(rules.some(r => r.day_of_week === parseInt(newRule.day_of_week))) {
      toast.error("A rule for this day already exists. Please delete the old one first.");
      return;
    }

    await PricingRule.create({
      listing_id: listingId,
      day_of_week: parseInt(newRule.day_of_week),
      net_rate: parseFloat(newRule.net_rate),
    });
    setNewRule({ day_of_week: '', net_rate: '' });
    toast.success("Recurring rule added!");
    await fetchRules();
    onRulesChange();
  };

  const handleDeleteRule = async (ruleId) => {
    await PricingRule.delete(ruleId);
    toast.success("Rule deleted.");
    await fetchRules();
    onRulesChange();
  };
  
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Recurring Pricing Rules</CardTitle>
        <CardDescription>Set default prices for specific days of the week. These are overridden by manual price changes.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="animate-spin" /> : (
          <div className="space-y-4">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                <p><strong>Every {dayNames[rule.day_of_week]}</strong> set rate to <strong>${rule.net_rate}</strong></p>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
             {rules.length === 0 && <p className="text-slate-500 text-sm">No recurring rules set.</p>}
          </div>
        )}
        
        <div className="mt-6 flex items-end gap-4 border-t pt-6">
          <div className="flex-grow">
             <label className="text-sm font-medium">Day of the Week</label>
             <Select value={newRule.day_of_week} onValueChange={(val) => setNewRule({...newRule, day_of_week: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Net Rate ($)</label>
            <Input 
              type="number" 
              placeholder="e.g. 150" 
              value={newRule.net_rate}
              onChange={(e) => setNewRule({...newRule, net_rate: e.target.value})}
            />
          </div>
          <Button onClick={handleAddRule}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
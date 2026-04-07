import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Settings, 
  Plus, 
  Trash2, 
  BarChart3,
  DollarSign,
  Calendar,
  Users,
  Zap
} from 'lucide-react';
import { PricingRule } from '@/api/entities';
import { toast } from 'sonner';

export default function PricingEngine({ 
  listingId, 
  pricingRules, 
  onRulesUpdate, 
  calendarData, 
  onCalendarUpdate 
}) {
  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: 'seasonal',
    priority: 1,
    conditions: {},
    adjustments: {},
    date_range_start: '',
    date_range_end: '',
    is_active: true
  });
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Rule templates for different types
  const ruleTemplates = {
    seasonal: {
      name: 'Seasonal Adjustment',
      conditions: { season: 'summer' },
      adjustments: { multiplier: 1.2, type: 'percentage' }
    },
    event: {
      name: 'Event-based Pricing',
      conditions: { event_type: 'conference' },
      adjustments: { multiplier: 1.5, type: 'percentage' }
    },
    occupancy: {
      name: 'Occupancy-based',
      conditions: { occupancy_threshold: 80 },
      adjustments: { multiplier: 1.15, type: 'percentage' }
    },
    advance_booking: {
      name: 'Advance Booking',
      conditions: { days_ahead: 30 },
      adjustments: { multiplier: 0.9, type: 'percentage' }
    },
    length_of_stay: {
      name: 'Length of Stay',
      conditions: { min_nights: 7 },
      adjustments: { multiplier: 0.85, type: 'percentage' }
    }
  };

  // Weekend pricing rule
  const weekendRule = {
    rule_name: 'Weekend Premium',
    rule_type: 'seasonal',
    priority: 2,
    conditions: { 
      days_of_week: [5, 6], // Friday, Saturday
      multiplier_type: 'weekend'
    },
    adjustments: { 
      multiplier: 1.25, 
      type: 'percentage',
      description: '25% increase for weekends'
    },
    is_active: true
  };

  // Holiday pricing rule
  const holidayRule = {
    rule_name: 'Holiday Pricing',
    rule_type: 'event',
    priority: 3,
    conditions: { 
      event_type: 'holiday',
      holidays: ['christmas', 'new_year', 'thanksgiving']
    },
    adjustments: { 
      multiplier: 1.5, 
      type: 'percentage',
      description: '50% increase for holidays'
    },
    is_active: true
  };

  // Apply pricing rules to calendar
  const applyPricingRules = async () => {
    if (!listingId || pricingRules.length === 0) return;

    setIsApplying(true);
    try {
      const updatedCalendarData = { ...calendarData };
      let updatedDates = 0;

      // Sort rules by priority
      const sortedRules = [...pricingRules].sort((a, b) => b.priority - a.priority);

      Object.keys(updatedCalendarData).forEach(dateStr => {
        const dateObj = new Date(dateStr);
        const dayData = updatedCalendarData[dateStr];

        if (!dayData.isAvailable || !dayData.price) return;

        let finalPrice = dayData.price;
        let appliedRules = [];

        sortedRules.forEach(rule => {
          if (!rule.is_active) return;

          const shouldApply = evaluateRuleConditions(rule.conditions, dateObj, dayData);
          if (shouldApply) {
            finalPrice = applyPriceAdjustment(finalPrice, rule.adjustments);
            appliedRules.push(rule.rule_name);
          }
        });

        if (appliedRules.length > 0) {
          updatedCalendarData[dateStr] = {
            ...dayData,
            price: Math.round(finalPrice * 100) / 100,
            source: 'dynamic',
            appliedRules
          };
          updatedDates++;
        }
      });

      onCalendarUpdate(updatedCalendarData);
      toast.success(`Applied pricing rules to ${updatedDates} dates`);

    } catch (error) {
      console.error('Error applying pricing rules:', error);
      toast.error('Failed to apply pricing rules');
    } finally {
      setIsApplying(false);
    }
  };

  // Evaluate if rule conditions are met
  const evaluateRuleConditions = (conditions, date, dayData) => {
    // Weekend check
    if (conditions.days_of_week) {
      const dayOfWeek = date.getDay();
      if (!conditions.days_of_week.includes(dayOfWeek)) return false;
    }

    // Date range check
    if (conditions.date_range_start && conditions.date_range_end) {
      const startDate = new Date(conditions.date_range_start);
      const endDate = new Date(conditions.date_range_end);
      if (date < startDate || date > endDate) return false;
    }

    // Advance booking check
    if (conditions.days_ahead) {
      const today = new Date();
      const daysAhead = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      if (daysAhead < conditions.days_ahead) return false;
    }

    // Holiday check
    if (conditions.event_type === 'holiday') {
      // Simple holiday detection (can be enhanced)
      const month = date.getMonth();
      const day = date.getDate();
      
      // Christmas period
      if (month === 11 && day >= 20 && day <= 26) return true;
      // New Year period
      if ((month === 11 && day >= 29) || (month === 0 && day <= 3)) return true;
      // Thanksgiving (4th Thursday of November)
      if (month === 10 && day >= 22 && day <= 28 && date.getDay() === 4) return true;
    }

    return true;
  };

  // Apply price adjustment based on rule
  const applyPriceAdjustment = (basePrice, adjustments) => {
    const { multiplier, type, fixed_amount } = adjustments;

    switch (type) {
      case 'percentage':
        return basePrice * multiplier;
      case 'fixed':
        return basePrice + (fixed_amount || 0);
      case 'replace':
        return multiplier;
      default:
        return basePrice * multiplier;
    }
  };

  // Create new pricing rule
  const createPricingRule = async () => {
    if (!listingId || !newRule.rule_name) return;

    try {
      const ruleData = {
        listing_id: listingId,
        ...newRule,
        conditions: JSON.stringify(newRule.conditions),
        adjustments: JSON.stringify(newRule.adjustments)
      };

      await PricingRule.create(ruleData);
      
      // Refresh rules
      const updatedRules = await PricingRule.filter({
        listing_id: listingId,
        is_active: true
      });
      
      onRulesUpdate(updatedRules);
      setShowRuleForm(false);
      setNewRule({
        rule_name: '',
        rule_type: 'seasonal',
        priority: 1,
        conditions: {},
        adjustments: {},
        date_range_start: '',
        date_range_end: '',
        is_active: true
      });
      
      toast.success('Pricing rule created successfully');
    } catch (error) {
      console.error('Error creating pricing rule:', error);
      toast.error('Failed to create pricing rule');
    }
  };

  // Delete pricing rule
  const deletePricingRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this pricing rule?')) return;

    try {
      await PricingRule.delete(ruleId);
      const updatedRules = pricingRules.filter(rule => rule.id !== ruleId);
      onRulesUpdate(updatedRules);
      toast.success('Pricing rule deleted');
    } catch (error) {
      console.error('Error deleting pricing rule:', error);
      toast.error('Failed to delete pricing rule');
    }
  };

  // Quick rule creation
  const createQuickRule = async (ruleType) => {
    const template = ruleTemplates[ruleType];
    if (!template) return;

    const quickRule = {
      listing_id: listingId,
      rule_name: template.name,
      rule_type: ruleType,
      priority: pricingRules.length + 1,
      conditions: template.conditions,
      adjustments: template.adjustments,
      is_active: true
    };

    try {
      await PricingRule.create(quickRule);
      
      const updatedRules = await PricingRule.filter({
        listing_id: listingId,
        is_active: true
      });
      
      onRulesUpdate(updatedRules);
      toast.success(`Created ${template.name} rule`);
    } catch (error) {
      console.error('Error creating quick rule:', error);
      toast.error('Failed to create pricing rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Pricing Engine Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Dynamic Pricing Engine
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={applyPricingRules}
                disabled={isApplying || pricingRules.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isApplying ? 'Applying...' : 'Apply Rules'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRuleForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pricingRules.length}</div>
              <div className="text-sm text-gray-600">Active Rules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(calendarData).filter(d => d.source === 'dynamic').length}
              </div>
              <div className="text-sm text-gray-600">Dynamic Prices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(Object.values(calendarData).filter(d => d.source === 'dynamic').reduce((sum, d) => sum + (d.price || 0), 0) / Object.values(calendarData).filter(d => d.source === 'dynamic').length || 0)}
              </div>
              <div className="text-sm text-gray-600">Avg Dynamic Price</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => createQuickRule('seasonal')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Calendar className="w-6 h-6" />
              <span>Weekend Premium</span>
              <span className="text-xs text-gray-500">+25% Fri-Sat</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => createQuickRule('event')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Zap className="w-6 h-6" />
              <span>Holiday Pricing</span>
              <span className="text-xs text-gray-500">+50% holidays</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => createQuickRule('advance_booking')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span>Early Bird</span>
              <span className="text-xs text-gray-500">-10% 30+ days</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Current Pricing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {pricingRules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4" />
              <p>No pricing rules created yet.</p>
              <p className="text-sm">Create your first rule to enable dynamic pricing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pricingRules.map(rule => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rule.rule_name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{rule.rule_type}</Badge>
                      <Badge variant="secondary">Priority {rule.priority}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePricingRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Conditions: {JSON.stringify(rule.conditions)}</p>
                    <p>Adjustments: {JSON.stringify(rule.adjustments)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Creation Form */}
      {showRuleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Pricing Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={newRule.rule_name}
                    onChange={(e) => setNewRule({...newRule, rule_name: e.target.value})}
                    placeholder="e.g., Weekend Premium"
                  />
                </div>
                <div>
                  <Label htmlFor="rule-type">Rule Type</Label>
                  <Select value={newRule.rule_type} onValueChange={(value) => setNewRule({...newRule, rule_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                      <SelectItem value="event">Event-based</SelectItem>
                      <SelectItem value="occupancy">Occupancy</SelectItem>
                      <SelectItem value="advance_booking">Advance Booking</SelectItem>
                      <SelectItem value="length_of_stay">Length of Stay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({...newRule, priority: parseInt(e.target.value)})}
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newRule.date_range_start}
                    onChange={(e) => setNewRule({...newRule, date_range_start: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={newRule.date_range_end}
                    onChange={(e) => setNewRule({...newRule, date_range_end: e.target.value})}
                  />
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Advanced rule conditions and adjustments can be configured after creation.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRuleForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createPricingRule}
                  disabled={!newRule.rule_name}
                >
                  Create Rule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  DollarSign,
  Building,
  Hash,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

export default function PayoutsManager() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    payoutAccountHolderName: '',
    payoutRoutingNumber: '',
    payoutAccountNumber: '',
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const response = await api.users.me();
      if (response.data) {
        setUser(response.data);
        setFormData({
          payoutAccountHolderName: response.data.payoutAccountHolderName || '',
          payoutRoutingNumber: response.data.payoutRoutingNumber || '',
          payoutAccountNumber: response.data.payoutAccountNumber || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast.error('Failed to load payout settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.payoutAccountHolderName.trim()) {
      toast.error('Account holder name is required');
      return;
    }
    if (!formData.payoutRoutingNumber.trim()) {
      toast.error('Routing number is required');
      return;
    }
    if (!formData.payoutAccountNumber.trim()) {
      toast.error('Account number is required');
      return;
    }

    // Validate routing number (9 digits)
    if (!/^\d{9}$/.test(formData.payoutRoutingNumber)) {
      toast.error('Routing number must be exactly 9 digits');
      return;
    }

    // Validate account number (basic check)
    if (formData.payoutAccountNumber.length < 4) {
      toast.error('Account number must be at least 4 characters');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.users.update(formData);
      if (response.data) {
        setUser(response.data);
        toast.success('Payout settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save payout settings:', error);
      toast.error('Failed to save payout settings');
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = formData.payoutAccountHolderName.trim() && 
                     formData.payoutRoutingNumber.trim() && 
                     formData.payoutAccountNumber.trim();

  const hasPayoutInfo = user?.payoutAccountHolderName && 
                        user?.payoutRoutingNumber && 
                        user?.payoutAccountNumber;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payout Status
            </CardTitle>
            {hasPayoutInfo ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Setup Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasPayoutInfo ? (
            <div className="space-y-2">
              <p className="text-sm text-green-600">
                ✅ Your payout information is configured and ready for payments.
              </p>
              <p className="text-xs text-slate-500">
                Account holder: {user.payoutAccountHolderName}
              </p>
              <p className="text-xs text-slate-500">
                Routing: ****{user.payoutRoutingNumber?.slice(-4)}
              </p>
              <p className="text-xs text-slate-500">
                Account: ****{user.payoutAccountNumber?.slice(-4)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Configure your bank account information to receive payouts from your bookings.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payout Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Bank Account Information
          </CardTitle>
          <p className="text-sm text-slate-600">
            Enter your bank account details to receive payouts. All information is encrypted and secure.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountHolderName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Account Holder Name
            </Label>
            <Input
              id="accountHolderName"
              type="text"
              placeholder="John Doe"
              value={formData.payoutAccountHolderName}
              onChange={(e) => handleInputChange('payoutAccountHolderName', e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="routingNumber" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Routing Number
            </Label>
            <Input
              id="routingNumber"
              type="text"
              placeholder="123456789"
              value={formData.payoutRoutingNumber}
              onChange={(e) => {
                // Only allow digits, max 9 characters
                const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                handleInputChange('payoutRoutingNumber', value);
              }}
              className="font-mono"
              maxLength={9}
            />
            <p className="text-xs text-slate-500">9-digit bank routing number</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Account Number
            </Label>
            <Input
              id="accountNumber"
              type="text"
              placeholder="1234567890"
              value={formData.payoutAccountNumber}
              onChange={(e) => {
                // Only allow digits and basic characters, max 17 characters
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 17);
                handleInputChange('payoutAccountNumber', value);
              }}
              className="font-mono"
              maxLength={17}
            />
            <p className="text-xs text-slate-500">Bank account number (4-17 digits)</p>
          </div>

          <Separator />

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Shield className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700">
              Your banking information is encrypted and stored securely. We never store your full account details in plain text.
            </p>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              className="min-w-32"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

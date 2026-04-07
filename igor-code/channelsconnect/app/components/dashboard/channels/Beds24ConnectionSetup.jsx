import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Power, CheckCircle } from 'lucide-react';
import { setupChannexConnection } from '@/api/functions';
import { toast } from 'sonner';

export default function Beds24ConnectionSetup({ onConnect }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleActivate = async () => {
    setIsLoading(true);
    try {
      const { data } = await setupChannexConnection();
      if (data.success) {
        toast.success(data.message || 'Channel manager connected!');
        if (onConnect) onConnect();
      } else {
        toast.error(data.error || 'Connection check failed. Please contact support.');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="text-center shadow-xl border-blue-500 border-2 max-w-lg">
        <CardHeader>
          <Power className="w-12 h-12 mx-auto text-blue-500" />
          <CardTitle className="text-2xl mt-4">Activate Channels Connect</CardTitle>
          <CardDescription className="text-gray-600">
            Connect your properties to start syncing rates, availability and bookings across all platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 px-4">
            <Button onClick={handleActivate} disabled={isLoading} className="w-full" size="lg">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" /> Activate Channels Connect</>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-4 px-4">
            Channels Connect will automatically sync your channel manager properties, rates, and bookings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

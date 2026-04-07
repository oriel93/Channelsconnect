import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { setupChannexConnection } from "@/api/functions";
import { toast } from 'sonner';

export default function Beds24SetupButton({ onConnectionComplete }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);

  const handleSetup = async () => {
    setIsConnecting(true);
    setConnectionResult(null);
    toast.info('Activating Channels Connect...');

    try {
      const { data } = await setupChannexConnection();

      if (data.success) {
        setConnectionResult({ success: true, message: data.message });
        toast.success(data.message);
        if (onConnectionComplete) onConnectionComplete();
      } else {
        throw new Error(data.error || 'Setup failed');
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: error.message || 'Failed to activate Channels Connect',
      });
      toast.error(error.message || 'Failed to activate Channels Connect');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Button
          onClick={handleSetup}
          disabled={isConnecting}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isConnecting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Activating...</>
          ) : (
            <><Zap className="w-5 h-5 mr-2" />Activate Channels Connect</>
          )}
        </Button>
      </div>

      {connectionResult && (
        <Alert className={connectionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {connectionResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={connectionResult.success ? 'text-green-800' : 'text-red-800'}>
            <strong>{connectionResult.success ? 'Success!' : 'Error:'}</strong> {connectionResult.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">What this will do:</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>Connect your properties to Channels Connect</li>
          <li>Import all your listings automatically</li>
          <li>Enable two-way sync across all channels</li>
          <li>Start receiving bookings in real time</li>
        </ul>
      </div>
    </div>
  );
}

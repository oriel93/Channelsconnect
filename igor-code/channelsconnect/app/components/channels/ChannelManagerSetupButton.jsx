import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { setupChannexConnection } from '@/api/functions';
import { toast } from 'sonner';

export default function ChannelManagerSetupButton({ onSetupComplete }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data } = await setupChannexConnection({});
      if (data.success) {
        toast.success("Channel distribution platform activated successfully!");
        if (onSetupComplete) {
          onSetupComplete();
        }
      } else {
        throw new Error(data.error || 'Failed to activate platform.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(`Setup failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6"
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Activating Platform...
        </>
      ) : (
        <>
          <Zap className="w-5 h-5 mr-2" />
          Activate Distribution Platform
        </>
      )}
    </Button>
  );
}
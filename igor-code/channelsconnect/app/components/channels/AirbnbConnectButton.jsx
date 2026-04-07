import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const AirbnbConnectButton = ({ onConnect, isConnecting }) => {
  const handleConnect = async () => {
    if (onConnect) {
      onConnect();
    }
  };

  return (
    <div className="flex justify-center">
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-[#FF5A5F] hover:bg-[#E04E52] text-white px-8 py-3 text-lg font-semibold rounded-lg transition-colors"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect with Airbnb'
        )}
      </Button>
    </div>
  );
};

export default AirbnbConnectButton;
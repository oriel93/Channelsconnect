import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import AirbnbConnectButton from './AirbnbConnectButton';
import { toast } from 'sonner';
import { airbnbConnect } from '@/api/functions/airbnbConnect';

const ConnectAirbnbDialog = ({ channel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const { data } = await airbnbConnect({ action: 'initiate' });
      
      if (data.success && data.authUrl) {
        // Redirect to Airbnb OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full" 
          variant={channel.featured ? "default" : "outline"}
        >
          <Plus className="w-4 h-4 mr-2" />
          Connect {channel.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to {channel.name}</DialogTitle>
          <DialogDescription>
            Authorize Channels Connect to access your Airbnb listings and import them into our system.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">What happens next:</h4>
            <ul className="text-sm text-blue-800 space-y-1 text-left list-disc list-inside">
              <li>You'll be redirected to Airbnb for authorization</li>
              <li>We'll import all your listings automatically</li>
              <li>Your properties will be added to Channels Connect</li>
              <li>You'll receive a confirmation email when complete</li>
            </ul>
          </div>
          <AirbnbConnectButton 
            onConnect={handleConnect}
            isConnecting={isConnecting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectAirbnbDialog;
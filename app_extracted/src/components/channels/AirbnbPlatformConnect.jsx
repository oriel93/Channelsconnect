
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, Home, RefreshCw, KeyRound, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChannelConnection } from '@/api/entities';
import { importBeds24Properties } from '@/api/functions';
import { setupBeds24Connection } from '@/api/functions';
import { disconnectBeds24Connection } from '@/api/functions';
import { toast } from 'sonner';

export default function AirbnbPlatformConnect({ onImportComplete }) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const checkConnection = useCallback(async () => {
    setStatus('loading');
    try {
      const connections = await ChannelConnection.filter({ channel_type: 'channel_manager' });
      // Stricter check: A connection is only valid if it exists, is connected, AND has an auth token.
      if (connections.length > 0 && connections[0].connection_status === 'connected' && connections[0].auth_token) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch (err) {
      console.error('Failed to check connection status:', err);
      setError('Could not verify your connection status. Please refresh.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your API Key.');
      return;
    }
    setIsConnecting(true);
    setError('');
    try {
      const { data } = await setupBeds24Connection({ apiKey: apiKey.trim() });
      if (data.success) {
        toast.success(data.message);
        setStatus('connected');
        setApiKey(''); // Clear the API key input
      } else {
        throw new Error(data.details || data.error || 'Connection failed.');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(`Connection failed: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setStatus('syncing');
    setError('');
    try {
      const { data } = await importBeds24Properties({});
      if (data.success) {
        toast.success(data.message || `Sync complete! Found ${data.summary?.propertiesFound || 0} properties.`);
        if (onImportComplete) {
          onImportComplete(data);
        }
        setStatus('connected');
      } else {
        throw new Error(data.details || data.error || 'Failed to sync properties.');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
      setStatus('error');
      setTimeout(() => setStatus('connected'), 5000);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect? This will require you to re-enter your API key.')) {
      return;
    }
    setError('');
    try {
      await disconnectBeds24Connection({});
      toast.success('Connection removed.');
      setStatus('disconnected');
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(`Failed to disconnect: ${err.message}`);
      toast.error('Could not disconnect. Please try again.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <p className="ml-3 text-slate-600">Checking connection status...</p>
          </div>
        );

      case 'disconnected':
        return (
          <div className="text-center">
            <p className="text-slate-600 mb-4">
              Connect your account by entering your API key below.
            </p>
            
            {/* API Key Setup Form */}
            <div className="space-y-4 mb-6">
              <div className="relative max-w-md mx-auto">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Enter your API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting || !apiKey.trim()}
                className="w-full max-w-md"
              >
                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect Platform
              </Button>
            </div>

            {/* Airbnb Button (shown after API connection) */}
            <div className="border-t pt-4">
              <p className="text-sm text-slate-500 mb-4">
                After connecting above, you can also link your Airbnb account:
              </p>
              <div 
                dangerouslySetInnerHTML={{
                  __html: `
                    <span class="airbnb-connect" 
                          data-state="https://preview--channelsconnectcom-a6ce3dec.base44.app/ConnectionSuccess_ownerid=46837" 
                          data-client-id="6gsna623mfeic93fod1fcqlr" 
                          data-scope="property_management,reservations_web_hooks,messages_read,messages_write" 
                          data-redirect-uri="https://api.beds24.com/airbnb.com/push.php">
                    </span>
                    <script src="https://www.airbnb.com/platform_js" async defer></script>
                  `
                }}
              />
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        );

      case 'connected':
        return (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Connection Successful!</h3>
            <p className="text-slate-600 mb-4">
              Your account is securely connected. Import your properties to sync them.
            </p>
            <div className="space-y-2">
              <Button onClick={handleSync} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Import My Listings from Airbnb
              </Button>
              <Button variant="link" className="text-red-500" onClick={handleDisconnect}>
                <XCircle className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        );
        
      case 'syncing':
        return (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600 mt-3">
              Importing your listings, rates, and calendars...<br/>
              This may take up to a minute.
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700 font-semibold mb-2">Connection Error</p>
            <p className="text-xs text-red-600 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={checkConnection}>Try Again</Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF5A5F] rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <CardTitle className="text-lg">Connect with Airbnb</CardTitle>
        </div>
        <CardDescription>
          Official Airbnb integration powered by our distribution partner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

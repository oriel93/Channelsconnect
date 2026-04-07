
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, Home, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function AirbnbPlatformConnect() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const checkConnection = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: user } = await api.users.me();
      if (user && user.airbnbHostId) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch (err) {
      console.error('Failed to check connection status:', err);
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleConnect = async () => {
    if (!profileUrl.trim()) {
      toast.error('Please enter your Airbnb profile URL');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const { data } = await api.users.connectAirbnb(profileUrl);
      if (data.success) {
        toast.success(`Airbnb profile connected! Host ID: ${data.airbnbHostId}`);
        setStatus('connected');
        setProfileUrl('');
      } else {
        throw new Error(data.error || 'Failed to connect Airbnb profile');
      }
    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to connect Airbnb profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
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
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              Enter your Airbnb profile URL to connect your account and sync your properties.
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://airbnb.com/p/yourprofile"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  disabled={isConnecting}
                  className="flex-1"
                />
                <Button onClick={handleConnect} disabled={isConnecting || !profileUrl.trim()}>
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4" />
                  )}
                </Button>
            </div>

              <p className="text-xs text-slate-500">
                Example: https://airbnb.com/p/oliviastays or https://www.airbnb.com/users/show/123456789
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        );

      case 'connected':
        return (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Connected Successfully!</h3>
            <p className="text-slate-600">
              Your Airbnb profile is connected and your properties are synced.
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
          Connect your Airbnb profile to sync your properties and calendars.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

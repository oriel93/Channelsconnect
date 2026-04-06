import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { importAllProperties } from '@/api/channexClient';
import { ChannelConnection } from '@/api/entities';

/**
 * ChannexConnectionSetup
 * Shown when no Channex API key is stored yet.
 * On connect: validates the key by calling the Channex API, then stores it
 * server-side via the ChannelConnection entity and imports properties.
 */
export default function ChannexConnectionSetup({ onConnect }) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    const key = apiKey.trim();
    if (!key) {
      toast.error('Please enter your Channex API Key.');
      return;
    }

    setIsLoading(true);
    try {
      // Validate the key by attempting a properties fetch
      const properties = await importAllProperties(key);

      // Persist key server-side via ChannelConnection entity
      const existing = await ChannelConnection.filter({ platform: 'channex' });
      if (existing.length > 0) {
        await ChannelConnection.update(existing[0].id, { api_key: key, is_active: true });
      } else {
        await ChannelConnection.create({ platform: 'channex', api_key: key, is_active: true });
      }

      toast.success(`Connected! Found ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} in Channex.`);
      if (onConnect) onConnect(key, properties);
    } catch (error) {
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="text-center shadow-xl border-blue-500 border-2 max-w-lg w-full">
        <CardHeader>
          <Zap className="w-12 h-12 mx-auto text-blue-500" />
          <CardTitle className="text-2xl mt-4">Connect to Channex</CardTitle>
          <CardDescription className="text-gray-600">
            Enter your Channex API Key to sync your properties, room types, rate plans, and bookings across all OTA channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 px-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder="Paste your Channex API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleConnect} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting to Channex...
                </>
              ) : (
                'Connect Channex'
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-4 px-4">
            Find your API key in{' '}
            <a
              href="https://app.channex.io/user_profile"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Channex → User Profile → API Keys
            </a>
            . This is a one-time setup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

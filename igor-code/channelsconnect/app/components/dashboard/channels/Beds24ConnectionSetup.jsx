import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, Power } from 'lucide-react';
import { setupBeds24Connection } from '@/api/functions';
import { toast } from 'sonner';

export default function Beds24ConnectionSetup({ onConnect }) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Distribution Platform API Key.');
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await setupBeds24Connection({ apiKey: apiKey.trim() });
      if (data.success) {
        toast.success(data.message);
        if (onConnect) onConnect();
      } else {
        throw new Error(data.error || 'Connection failed.');
      }
    } catch (error) {
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="text-center shadow-xl border-blue-500 border-2 max-w-lg">
        <CardHeader>
          <Power className="w-12 h-12 mx-auto text-blue-500" />
          <CardTitle className="text-2xl mt-4">Activate Channel Distribution</CardTitle>
          <CardDescription className="text-gray-600">
            Enter your API Key to connect to our distribution platform and sync your properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 px-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter your Platform API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pl-10 text-center"
              />
            </div>
            <Button onClick={handleConnect} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save & Connect Platform
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-4 px-4">
            You can find your API key in your distribution platform's settings under "API". This is a one-time setup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
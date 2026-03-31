
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { importBeds24Properties } from '@/api/functions';
import { toast } from 'sonner';

export default function WelcomeSync({ onSyncComplete }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.info("Attempting to import your properties from Beds24. This may take a moment...");
    try {
      const { data } = await importBeds24Properties({});
      if (data.success) {
        if (data.properties && data.properties.length > 0) {
          toast.success(`Successfully imported ${data.properties.length} new properties! Your dashboard is now loading.`);
          if (onSyncComplete) onSyncComplete();
        } else {
          toast.info("No new properties found. The import from Airbnb may still be in progress. Please try again in a few minutes.");
        }
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Initial sync error:', error);
      toast.error(error.message || 'Failed to sync properties. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="max-w-xl w-full text-center">
        <CardHeader>
          <div className="mx-auto bg-blue-100 rounded-full p-3 w-fit mb-4">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Channels Connect!</CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Your account is connected. Let's import your properties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-500">
            Click the button below to perform the initial sync with your connected distribution platform. This will pull in all the properties that have been imported from Airbnb.
          </p>
          <Button
            size="lg"
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full max-w-sm mx-auto"
          >
            {isSyncing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Please wait...</>
            ) : (
              <><RefreshCw className="w-5 h-5 mr-2" /> Sync Properties Now</>
            )}
          </Button>
          <p className="text-xs text-slate-400">
            If no properties appear, please wait 5-10 minutes for Airbnb to finish syncing with our platform, then try again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { ChannelConnection, Listing } from '@/api/entities';
import { importAllProperties } from '@/api/channexClient';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function WelcomeSync({ onSyncComplete }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.info("Importing your properties from Channex...");
    try {
      const connections = await ChannelConnection.filter({ platform: 'channex' });
      const active = connections.find(c => c.is_active && c.api_key);
      if (!active) {
        toast.error('No active Channex connection found. Please connect Channex first.');
        setIsSyncing(false);
        return;
      }

      const properties = await importAllProperties(active.api_key);
      if (!properties.length) {
        toast.info("No properties found in your Channex account.");
        setIsSyncing(false);
        return;
      }

      const existing = await Listing.list();
      const existingExternalIds = new Set(existing.map(l => l.external_id).filter(Boolean));

      let created = 0;
      for (const prop of properties) {
        if (existingExternalIds.has(prop.channexId)) continue;
        await Listing.create({
          name: prop.name,
          address: prop.address || '',
          city: prop.city || '',
          country: prop.country || '',
          currency: prop.currency || 'USD',
          external_source: 'channex',
          external_id: prop.channexId,
          status: 'active',
          default_net_rate: 0,
        });
        created++;
      }

      if (created > 0) {
        toast.success(`Successfully imported ${created} new propert${created === 1 ? 'y' : 'ies'} from Channex!`);
        if (onSyncComplete) onSyncComplete();
      } else {
        toast.info("All Channex properties are already imported.");
        if (onSyncComplete) onSyncComplete();
      }
    } catch (error) {
      console.error('Channex sync error:', error);
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
            Import your properties from Channex to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-500">
            Click below to import all properties from your Channex account. Make sure you've connected Channex first.
          </p>
          <Button
            size="lg"
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full max-w-sm mx-auto"
          >
            {isSyncing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Importing...</>
            ) : (
              <><RefreshCw className="w-5 h-5 mr-2" /> Import from Channex</>
            )}
          </Button>
          <p className="text-sm text-slate-400">
            Haven't connected Channex yet?{' '}
            <Link to={createPageUrl('ChannexDashboard')} className="text-blue-600 hover:underline inline-flex items-center gap-1">
              Go to Channex Dashboard <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

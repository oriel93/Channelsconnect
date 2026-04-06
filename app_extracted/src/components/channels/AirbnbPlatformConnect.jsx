
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, Home, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChannelConnection, Listing } from '@/api/entities';
import { importAllProperties } from '@/api/channexClient';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function AirbnbPlatformConnect({ onImportComplete }) {
  const [status, setStatus] = useState('loading'); // loading | disconnected | idle | syncing | done | error
  const [error, setError] = useState('');
  const [importSummary, setImportSummary] = useState(null);

  const checkConnection = useCallback(async () => {
    setStatus('loading');
    try {
      const connections = await ChannelConnection.filter({ platform: 'channex' });
      const active = connections.find(c => c.is_active && c.api_key);
      setStatus(active ? 'idle' : 'disconnected');
    } catch (err) {
      console.error('Failed to check Channex connection:', err);
      setError('Could not verify connection status. Please refresh.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleImport = async () => {
    setStatus('syncing');
    setError('');
    try {
      const connections = await ChannelConnection.filter({ platform: 'channex' });
      const active = connections.find(c => c.is_active && c.api_key);
      if (!active) throw new Error('No active Channex connection found.');

      const properties = await importAllProperties(active.api_key);
      if (!properties.length) {
        toast.info('No properties found in your Channex account.');
        setStatus('idle');
        return;
      }

      // Save each property as a Listing entity (skip if already imported)
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

      const summary = { total: properties.length, created, skipped: properties.length - created };
      setImportSummary(summary);
      setStatus('done');
      toast.success(`Import complete! ${created} new propert${created === 1 ? 'y' : 'ies'} added.`);
      if (onImportComplete) onImportComplete(summary);
    } catch (err) {
      console.error('Channex import error:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <p className="ml-3 text-slate-600">Checking Channex connection...</p>
          </div>
        );

      case 'disconnected':
        return (
          <div className="text-center py-6">
            <Zap className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-800 mb-2">Channex Not Connected</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Connect your Channex account first, then come back to import your properties.
            </p>
            <Link to={createPageUrl('ChannexDashboard')}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Go to Channex Dashboard
              </Button>
            </Link>
          </div>
        );

      case 'idle':
        return (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 mb-1">Channex Connected</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Click below to import your Channex properties into ChannelsConnect.
            </p>
            <Button onClick={handleImport} className="w-full max-w-xs">
              <RefreshCw className="w-4 h-4 mr-2" />
              Import Properties from Channex
            </Button>
          </div>
        );

      case 'syncing':
        return (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600 mt-3">Importing from Channex, please wait...</p>
          </div>
        );

      case 'done':
        return (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 mb-1">Import Complete!</h3>
            {importSummary && (
              <p className="text-slate-600 text-sm mb-4">
                {importSummary.created} new {importSummary.created === 1 ? 'property' : 'properties'} added
                {importSummary.skipped > 0 ? `, ${importSummary.skipped} already existed` : ''}.
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleImport}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-sync
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700 font-semibold mb-1">Import Failed</p>
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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <CardTitle className="text-lg">Import from Channex</CardTitle>
        </div>
        <CardDescription>
          Sync your properties directly from your Channex channel manager account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

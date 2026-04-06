import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import NewLoginRequired from '@/components/auth/NewLoginRequired';
import ChannexConnectionSetup from '@/components/channels/ChannexConnectionSetup';
import ChannexPropertyGrid from '@/components/channels/ChannexPropertyGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { importAllProperties } from '@/api/channexClient';
import { ChannelConnection } from '@/api/entities';
import { toast } from 'sonner';

export default function ChannexDashboard() {
  const [apiKey, setApiKey] = useState('');
  const [properties, setProperties] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | disconnected | connected | error
  const [errorMsg, setErrorMsg] = useState('');

  // Load API key from ChannelConnection entity (server-side)
  const loadApiKey = useCallback(async () => {
    try {
      const connections = await ChannelConnection.filter({ platform: 'channex' });
      const active = connections.find(c => c.is_active);
      return active?.api_key || '';
    } catch {
      return '';
    }
  }, []);

  const loadProperties = useCallback(async (key) => {
    const k = key || apiKey;
    if (!k) {
      setStatus('disconnected');
      return;
    }
    setStatus('loading');
    try {
      const props = await importAllProperties(k);
      setProperties(props);
      setStatus('connected');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }, [apiKey]);

  useEffect(() => {
    const init = async () => {
      const key = await loadApiKey();
      if (key) {
        setApiKey(key);
        await loadProperties(key);
      } else {
        setStatus('disconnected');
      }
    };
    init();
  }, [loadApiKey, loadProperties]);

  const handleConnect = (key, initialProperties) => {
    setApiKey(key);
    setProperties(initialProperties);
    setStatus('connected');
  };

  const handleDisconnect = async () => {
    try {
      const connections = await ChannelConnection.filter({ platform: 'channex' });
      for (const conn of connections) {
        await ChannelConnection.update(conn.id, { is_active: false });
      }
    } catch {
      // best-effort
    }
    setApiKey('');
    setProperties([]);
    setStatus('disconnected');
    toast.info('Disconnected from Channex.');
  };

  const handleRefresh = () => loadProperties();

  const headerActions = (
    <div className="flex items-center gap-2">
      {status === 'connected' && (
        <>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-red-600 hover:text-red-700">
            Disconnect
          </Button>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-600">Connecting to Channex...</p>
          </div>
        );

      case 'disconnected':
        return <ChannexConnectionSetup onConnect={handleConnect} />;

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center text-red-700 bg-red-50 p-8 rounded-lg">
            <AlertTriangle className="w-12 h-12" />
            <h3 className="text-xl font-semibold">Connection Error</h3>
            <p className="text-sm max-w-md">{errorMsg || 'Failed to connect to Channex. Check your API key and try again.'}</p>
            <div className="flex gap-2">
              <Button onClick={handleRefresh}>Retry</Button>
              <Button variant="outline" onClick={handleDisconnect}>Re-enter API Key</Button>
            </div>
          </div>
        );

      case 'connected':
        return (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatTile label="Properties" value={properties.length} />
              <StatTile
                label="Room Types"
                value={properties.reduce((acc, p) => acc + (p.roomTypes?.length || 0), 0)}
              />
              <StatTile
                label="Rate Plans"
                value={properties.reduce((acc, p) => acc + (p.ratePlans?.length || 0), 0)}
              />
              <StatTile
                label="Active Channels"
                value={properties.reduce(
                  (acc, p) => acc + Object.values(p.channels || {}).filter(Boolean).length,
                  0
                )}
              />
            </div>

            {/* Property grid */}
            <ChannexPropertyGrid
              properties={properties}
              apiKey={apiKey}
              onRefresh={handleRefresh}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <NewLoginRequired>
      <AppLayout headerActions={headerActions}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Channex Channel Manager</h1>
            {status === 'connected' && (
              <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </Badge>
            )}
          </div>
        </div>
        {renderContent()}
      </AppLayout>
    </NewLoginRequired>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
      <p className="text-3xl font-bold text-blue-600">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

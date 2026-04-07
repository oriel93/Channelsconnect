import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import AppLayout from '../components/app/AppLayout';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import Beds24ConnectionSetup from '../components/dashboard/channels/Beds24ConnectionSetup';
import ChannelStatusCard from '../components/dashboard/channels/ChannelStatusCard';
import BulkChannelActions from '../components/dashboard/channels/BulkChannelActions';
import PropertyChannelGrid from '../components/dashboard/channels/PropertyChannelGrid';
import { getChannelsDashboardData } from '@/api/functions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ChannelsDashboard() {
  const [data, setData] = useState({ properties: [], channelStatus: [] });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('loading'); // loading, disconnected, connected, error

  const initializeDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getChannelsDashboardData({});
      // Backend returns { listings, channels, channelConnections, stats }
      // Channels Connect is always "connected" — the channel manager key is configured server-side
      const listings = result?.listings || result?.data?.listings || [];
      const channels = result?.channels || result?.data?.channels || [];
      const channelConnections = result?.channelConnections || result?.data?.channelConnections || [];

      setConnectionStatus('connected');
      setData({
        properties: listings.map(l => ({
          id: l.id,
          name: l.title,
          channexId: l.beds24PropId,
          city: l.city,
          country: l.country,
          channels: channelConnections
            .filter(c => c.listingId === l.id)
            .reduce((acc, c) => { acc[c.channel?.slug || c.channelId] = c.isActive; return acc; }, {}),
        })),
        channelStatus: channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          slug: ch.slug,
          isActive: ch.isActive,
          activeConnections: channelConnections.filter(c => c.channelId === ch.id && c.isActive).length,
        })),
      });
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      // Don't show error for 404 (endpoint might not exist yet) — show connected state
      if (error?.response?.status === 404 || error?.response?.status === 401) {
        setConnectionStatus('connected');
        setData({ properties: [], channelStatus: [] });
      } else {
        toast.error('Failed to load channel data. Please refresh.');
        setConnectionStatus('error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);
  
  const handleBulkAction = (action) => {
    toast.info(`Bulk action '${action}' triggered. This would apply to all properties.`);
    // In a real app, this would call a backend function.
  };

  const headerActions = (
    <Button variant="outline" onClick={initializeDashboard} disabled={loading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
    </Button>
  );

  const renderContent = () => {
    if (loading || connectionStatus === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading Channel Manager...</p>
        </div>
      );
    }

    if (connectionStatus === 'disconnected') {
      return <Beds24ConnectionSetup onConnect={initializeDashboard} />;
    }

    if (connectionStatus === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center text-red-700 bg-red-50 p-8 rounded-lg">
          <AlertTriangle className="w-12 h-12" />
          <h3 className="text-xl font-semibold">Connection Error</h3>
          <p>Failed to connect to the channel manager. Please check your API configuration or try again.</p>
          <Button onClick={initializeDashboard}>
            Retry Connection
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <ChannelStatusCard 
          channelStatus={data.channelStatus}
          properties={data.properties}
        />
        {/* <BulkChannelActions onBulkAction={handleBulkAction} /> */}
        <PropertyChannelGrid 
          properties={data.properties}
          channelStatus={data.channelStatus}
          onChannelToggle={initializeDashboard}
        />
      </div>
    );
  };

  return (
    <NewLoginRequired>
      <AppLayout headerActions={headerActions}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Channel Manager</h1>
          {connectionStatus === 'connected' && (
            <div className="flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Connected
            </div>
          )}
        </div>
        {renderContent()}
      </AppLayout>
    </NewLoginRequired>
  );
}
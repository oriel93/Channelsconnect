import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import AppLayout from '../components/app/AppLayout';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import ChannelStatusCard from '../components/dashboard/channels/ChannelStatusCard';
import BulkChannelActions from '../components/dashboard/channels/BulkChannelActions';
import PropertyChannelGrid from '../components/dashboard/channels/PropertyChannelGrid';
import ForceSyncButton from '../components/dashboard/channels/ForceSyncButton';
import { getChannelsDashboardData } from '@/api/functions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ChannelsDashboard() {
  const [data, setData] = useState({ properties: [], channelStatus: [] });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('loading');

  const initializeDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result } = await getChannelsDashboardData({});
      if (result.success) {
        setConnectionStatus(result.connectionStatus);
        setData({ properties: result.properties, channelStatus: result.channelStatus });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      toast.error(error.message);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  const headerActions = (
    <Button variant='outline' onClick={initializeDashboard} disabled={loading}>
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  );

  const renderContent = () => {
    if (loading || connectionStatus === 'loading') {
      return (
        <div className='flex flex-col items-center justify-center h-64 gap-4'>
          <Loader2 className='w-12 h-12 text-blue-600 animate-spin' />
          <p className='text-gray-600'>Loading Channel Manager…</p>
        </div>
      );
    }

    if (connectionStatus === 'disconnected') {
      return (
        <div className='flex flex-col items-center justify-center h-64 gap-4 text-center'>
          <p className='text-gray-600'>
            Channel setup required. Please configure your channel connection
            to start syncing availability and rates.
          </p>
          <Button onClick={initializeDashboard}>Connect Channels</Button>
        </div>
      );
    }

    if (connectionStatus === 'error') {
      return (
        <div className='flex flex-col items-center justify-center h-64 gap-4 text-center text-red-700 bg-red-50 p-8 rounded-lg'>
          <AlertTriangle className='w-12 h-12' />
          <h3 className='text-xl font-semibold'>Connection Error</h3>
          <p>
            Failed to connect to the channel manager. Please check your API
            configuration or try again.
          </p>
          <Button onClick={initializeDashboard}>Retry Connection</Button>
        </div>
      );
    }

    return (
      <div className='space-y-8'>
        <ChannelStatusCard
          channelStatus={data.channelStatus}
          properties={data.properties}
        />

        {/* TASK 1 — Manual Sync Controls */}
        {data.properties.length > 0 && data.properties[0]?.id && (
          <div className='bg-white rounded-xl shadow-sm border p-5'>
            <h2 className='text-base font-semibold text-slate-800 mb-1'>
              Manual Sync Controls
            </h2>
            <p className='text-sm text-slate-500 mb-4'>
              Manually trigger a full 500-day availability and rate push to all
              connected channels. Sync Operation IDs are displayed for
              certification records.
            </p>
            <ForceSyncButton
              propertyId={data.properties[0].id}
              listingId={data.properties[0].listingId}
            />
          </div>
        )}

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
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-2xl font-bold'>Channel Manager</h1>
          {connectionStatus === 'connected' && (
            <div className='flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium'>
              <span className='w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse' />
              Connected
            </div>
          )}
        </div>
        {renderContent()}
      </AppLayout>
    </NewLoginRequired>
  );
}
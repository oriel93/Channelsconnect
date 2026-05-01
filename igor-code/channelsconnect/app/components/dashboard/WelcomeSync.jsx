import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { importBeds24Properties } from '@/api/functions';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

// Sync status enum values (matching backend)
const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export default function WelcomeSync({ onSyncComplete, user: initialUser }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Poll for sync status when syncing
  useEffect(() => {
    if (user?.syncStatus === SyncStatus.SYNCING && !pollingInterval) {
      const interval = setInterval(async () => {
        try {
          const response = await api.users.getSyncStatus();
          if (response.data) {
            const syncData = response.data;
            setUser(prev => ({ ...prev, ...syncData }));
            
            if (syncData.syncStatus === SyncStatus.COMPLETED) {
              toast.success('Sync completed successfully!');
              clearInterval(interval);
              setPollingInterval(null);
              setIsSyncing(false);
              if (onSyncComplete) onSyncComplete();
            } else if (syncData.syncStatus === SyncStatus.FAILED) {
              toast.error(syncData.syncError || 'Sync failed');
              clearInterval(interval);
              setPollingInterval(null);
              setIsSyncing(false);
            }
          }
        } catch (error) {
          console.error('Error polling sync status:', error);
        }
      }, 3000); // Poll every 3 seconds
      
      setPollingInterval(interval);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [user?.syncStatus]);

  // Update local user when prop changes
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      if (initialUser.syncStatus === SyncStatus.SYNCING) {
        setIsSyncing(true);
      }
    }
  }, [initialUser]);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.info("Starting Channels Connect property sync. This may take a few minutes...");
    
    try {
      const { data } = await importBeds24Properties({});
      
      if (data.success) {
        // Update local user state
        setUser(prev => ({ ...prev, syncStatus: SyncStatus.SYNCING }));
        
        if (data.properties && data.properties.length > 0) {
          toast.success(`Successfully synced ${data.properties.length} properties!`);
          if (onSyncComplete) onSyncComplete();
        } else {
          toast.info("Sync completed but no properties found. Properties may still be importing from Airbnb.");
        }
        setIsSyncing(false);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      // Check if it's a "sync in progress" error
      if (error.message?.includes('already in progress')) {
        toast.warning('A sync is already in progress. Please wait for it to complete.');
        setUser(prev => ({ ...prev, syncStatus: SyncStatus.SYNCING }));
      } else {
      toast.error(error.message || 'Failed to sync properties. Please try again.');
      setIsSyncing(false);
    }
    }
  };

  const getSyncStatusDisplay = () => {
    if (!user?.syncStatus || user.syncStatus === SyncStatus.IDLE) {
      return null;
    }

    const statusConfig = {
      [SyncStatus.SYNCING]: {
        icon: <Loader2 className="w-5 h-5 animate-spin text-blue-500" />,
        text: 'Sync in progress...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      [SyncStatus.COMPLETED]: {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: 'Last sync completed',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      [SyncStatus.FAILED]: {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        text: 'Last sync failed',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      },
    };

    const config = statusConfig[user.syncStatus];
    if (!config) return null;

    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    };

    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${config.bgColor} mb-4`}>
        {config.icon}
        <div className="flex-1">
          <p className={`font-medium ${config.color}`}>{config.text}</p>
          {user.syncStatus === SyncStatus.SYNCING && user.syncStartedAt && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Started: {formatDate(user.syncStartedAt)}
            </p>
          )}
          {user.syncStatus === SyncStatus.COMPLETED && user.syncCompletedAt && (
            <p className="text-xs text-slate-500">
              Completed: {formatDate(user.syncCompletedAt)}
            </p>
          )}
          {user.syncStatus === SyncStatus.FAILED && user.syncError && (
            <p className="text-xs text-red-500">{user.syncError}</p>
          )}
        </div>
      </div>
    );
  };

  const isButtonDisabled = isSyncing || user?.syncStatus === SyncStatus.SYNCING;

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
          {getSyncStatusDisplay()}
          
          <p className="text-slate-500">
            Click the button below to perform the initial sync with your connected distribution platform. This will pull in all the properties that have been imported from Airbnb.
          </p>
          
          <Button
            size="lg"
            onClick={handleSync}
            disabled={isButtonDisabled}
            className="w-full max-w-sm mx-auto"
          >
            {isButtonDisabled ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Syncing... Please wait</>
            ) : (
              <><RefreshCw className="w-5 h-5 mr-2" /> Sync Properties Now</>
            )}
          </Button>
          
          {user?.syncStatus === SyncStatus.SYNCING && (
            <p className="text-sm text-blue-600 animate-pulse">
              Sync is running in the background. This page will update automatically when complete.
            </p>
          )}
          
          <p className="text-xs text-slate-400">
            If no properties appear, please wait 5-10 minutes for Airbnb to finish syncing with our platform, then try again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

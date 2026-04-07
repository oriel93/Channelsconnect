
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IcalConnection } from '@/api/entities';
import { forceIcalSync } from '@/api/functions';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar, Link, Loader2, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

// Define a constant for the specific error message expected from the backend
// when an iCal connection operation fails due to an ID mismatch or non-existence for the current listing.
const ICAL_CONNECTION_NOT_FOUND_OR_MISMATCH_ERROR = "ICAL_CONNECTION_NOT_FOUND_OR_MISMATCH";

const SyncStatusBadge = ({ status }) => {
  switch (status) {
    case 'success':
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
    case 'in_progress':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Syncing...</Badge>;
    case 'error':
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
    case 'pending':
    default:
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  }
};

const ForceSyncButton = ({ connection, onSyncStart, onSyncComplete }) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        onSyncStart(connection.id);
        let data; // FIX: Declare data variable outside the try block
        try {
            const response = await forceIcalSync({ connectionId: connection.id });
            data = response.data; // FIX: Assign the response data
            if (data.success) {
                toast.success(`Sync complete for ${connection.name}! Added: ${data.imported}, Removed: ${data.deleted}.`);
            } else {
                // Handle specific Property ID Mismatch error
                if (data.error && data.error.includes(ICAL_CONNECTION_NOT_FOUND_OR_MISMATCH_ERROR)) {
                    toast.error("This iCal connection could not be found or is not associated with this listing. Refreshing connections.");
                    // Trigger a re-fetch of connections to update the UI
                    onSyncComplete(connection.id); 
                    return; // Prevent showing the generic error toast
                }
                toast.error(data.error || 'Sync failed');
            }
        } catch (err) {
            console.error('Force sync error:', err);
            toast.error('An unexpected error occurred during sync.');
        } finally {
            setIsSyncing(false);
            // Ensure onSyncComplete is always called, even after specific error handling,
            // to allow the parent component to update state (e.g., fetch connections)
            // if not already handled explicitly above.
            if (! (data && data.error && data.error.includes(ICAL_CONNECTION_NOT_FOUND_OR_MISMATCH_ERROR))) {
                onSyncComplete(connection.id);
            }
        }
    };

    return (
        <Button onClick={handleSync} disabled={isSyncing} size="sm" variant="outline">
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync Now
        </Button>
    );
};

export default function IcalSyncManager({ listingId, onSyncComplete }) {
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newConnection, setNewConnection] = useState({ name: '', ical_url: '' });
  const [isAdding, setIsAdding] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!listingId) return;
    try {
      const data = await IcalConnection.filter({ listing_id: listingId }, '-created_date');
      setConnections(data);
      
      const isStillSyncing = data.some(c => c.status === 'in_progress');
      return isStillSyncing;
    } catch (error) {
      toast.error('Failed to load iCal connections');
      console.error(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    let interval;
    const startPolling = () => {
        interval = setInterval(async () => {
            const stillSyncing = await fetchConnections();
            if (!stillSyncing) {
                clearInterval(interval);
            }
        }, 5000);
    };
    
    fetchConnections().then(isSyncing => {
        if(isSyncing) startPolling();
    });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchConnections]);

  const handleAddConnection = async (e) => {
    e.preventDefault();
    if (!newConnection.name || !newConnection.ical_url) {
      toast.warning('Please provide a name and a valid iCal URL.');
      return;
    }
    setIsAdding(true);
    try {
      await IcalConnection.create({
        ...newConnection,
        listing_id: listingId
      });
      toast.success('iCal connection added!');
      setNewConnection({ name: '', ical_url: '' });
      fetchConnections();
      onSyncComplete(); // Trigger calendar refresh
    } catch (error) {
      toast.error('Failed to add connection.');
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteConnection = async (connectionId) => {
    if (!window.confirm('Are you sure you want to delete this iCal connection? This may affect your calendar sync.')) return;
    try {
      await IcalConnection.delete(connectionId);
      toast.success('Connection deleted.');
      fetchConnections();
      onSyncComplete(); // Trigger calendar refresh
    } catch (error) {
        // Assume API errors might come with an error.response.data structure.
        // Check if the specific property ID mismatch error is present.
        if (error.response && error.response.data && typeof error.response.data === 'string' && error.response.data.includes(ICAL_CONNECTION_NOT_FOUND_OR_MISMATCH_ERROR)) {
            toast.error("This iCal connection was already removed or is not associated with this listing. Refreshing connections.");
            fetchConnections(); // Re-fetch to clean up UI as the connection is effectively gone or invalid
            onSyncComplete(); // Trigger calendar refresh
        } else {
            toast.error('Failed to delete connection.');
            console.error(error);
        }
    }
  };
  
  const handleSyncUpdate = async () => {
    await fetchConnections();
    onSyncComplete();
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link className="w-5 h-5 text-blue-600" />iCal Sync Management</CardTitle>
        <CardDescription>
          Connect external calendars from platforms like Airbnb, VRBO, or Booking.com to keep your availability perfectly in sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {connections.length > 0 ? (
              connections.map(conn => (
                <div key={conn.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-semibold text-slate-800">{conn.name}</h4>
                            <p className="text-sm text-slate-500 truncate max-w-md" title={conn.ical_url}>{conn.ical_url}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <SyncStatusBadge status={conn.status} />
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteConnection(conn.id)}>
                                <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-600" />
                            </Button>
                        </div>
                    </div>
                    {conn.status === 'error' && (
                        <Alert variant="destructive">
                            <AlertDescription className="text-xs">{conn.error_message}</AlertDescription>
                        </Alert>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t">
                        <span>Last sync: {conn.last_synced ? new Date(conn.last_synced).toLocaleString() : 'Never'}</span>
                        <span>Events found: {conn.last_event_count || 0}</span>
                        <ForceSyncButton 
                            connection={conn}
                            onSyncStart={() => {
                                // Potentially update the status of the specific connection to 'in_progress' immediately
                                setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, status: 'in_progress' } : c));
                            }}
                            onSyncComplete={handleSyncUpdate}
                        />
                    </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 py-4">No iCal connections found for this listing.</p>
            )}
          </div>
        )}

        <form onSubmit={handleAddConnection} className="pt-6 border-t space-y-4">
          <h4 className="font-medium text-slate-900">Add New iCal Connection</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="conn-name">Name</Label>
              <Input
                id="conn-name"
                placeholder="e.g. Airbnb, Beds24"
                value={newConnection.name}
                onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="conn-url">iCal URL</Label>
              <Input
                id="conn-url"
                type="url"
                placeholder="https://..."
                value={newConnection.ical_url}
                onChange={(e) => setNewConnection({ ...newConnection, ical_url: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" disabled={isAdding} className="w-full md:w-auto">
            {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Connection
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

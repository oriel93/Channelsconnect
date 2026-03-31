import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { IcalConnection } from '@/api/entities';
import { importIcal } from '@/api/functions';
import { toast } from 'sonner';

export default function SyncManager({ listingId, onSyncComplete }) {
  const [connections, setConnections] = useState([]);
  const [newIcalUrl, setNewIcalUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const fetchConnections = async () => {
    if (!listingId) return;
    const data = await IcalConnection.filter({ listing_id: listingId });
    setConnections(data);
  };
  
  useEffect(() => {
    fetchConnections();
  }, [listingId]);

  const handleAddConnection = async () => {
    if (!newIcalUrl || !listingId) return;
    try {
      await IcalConnection.create({
        listing_id: listingId,
        platform: 'generic_ical',
        connection_type: 'ical',
        import_url: newIcalUrl,
        sync_status: 'active'
      });
      setNewIcalUrl('');
      fetchConnections();
      toast.success("iCal connection added successfully.");
    } catch (error) {
      toast.error("Failed to add iCal connection.");
      console.error(error);
    }
  };
  
  const handleDeleteConnection = async (id) => {
    try {
      await IcalConnection.delete(id);
      fetchConnections();
      toast.success("iCal connection removed.");
    } catch (error) {
      toast.error("Failed to remove iCal connection.");
    }
  };
  
  const handleSyncNow = async (connectionId, url) => {
    setIsSyncing(true);
    try {
      await importIcal({ listingId, icalUrl: url });
      toast.success("Sync completed successfully!");
      if(onSyncComplete) onSyncComplete();
    } catch (error) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>iCal Sync Manager</CardTitle>
          <CardDescription>Connect and sync your calendar with external platforms using iCal links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ical-url">New iCal Import URL</Label>
            <div className="flex gap-2">
              <Input id="ical-url" placeholder="Paste iCal URL here..." value={newIcalUrl} onChange={(e) => setNewIcalUrl(e.target.value)} />
              <Button onClick={handleAddConnection}><Plus className="w-4 h-4 mr-2" /> Add</Button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium">Connected Calendars</h4>
            {connections.length > 0 ? connections.map(conn => (
              <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                <p className="text-sm text-gray-600 truncate">{conn.import_url}</p>
                <div className="flex items-center gap-2">
                   {conn.sync_status === 'active' && <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>}
                   <Button size="sm" variant="outline" onClick={() => handleSyncNow(conn.id, conn.import_url)} disabled={isSyncing}>
                     <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Now
                   </Button>
                   <Button size="icon" variant="ghost" onClick={() => handleDeleteConnection(conn.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500 text-center py-4">No iCal connections found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
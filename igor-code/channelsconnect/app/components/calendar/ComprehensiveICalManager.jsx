import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Zap,
  Shield,
  TrendingUp,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Activity,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { IcalConnection } from '@/api/entities';
import { CalendarEvent } from '@/api/entities';
import { SyncLog } from '@/api/entities';
import { icalSyncService } from '@/api/functions';
import { generateICalFeed } from '@/api/functions';
import { advancedIcalProcessor } from '@/api/functions';

export default function ComprehensiveICalManager({ listingId, listingTitle, onSyncComplete }) {
    const [connections, setConnections] = useState([]);
    const [events, setEvents] = useState([]);
    const [syncLogs, setSyncLogs] = useState([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [newConnection, setNewConnection] = useState({
        name: '',
        ical_url: '',
        platform: 'other'
    });
    const [showAddDialog, setShowAddDialog] = useState(false);
    const fileInputRef = useRef(null);

    const fetchConnections = useCallback(async () => {
        if (!listingId) return;
        setIsLoadingConnections(true);
        try {
            const data = await IcalConnection.filter({ listing_id: listingId });
            setConnections(data || []);
        } catch (error) {
            toast.error("Failed to load iCal connections");
            console.error(error);
        }
        setIsLoadingConnections(false);
    }, [listingId]);

    const fetchEvents = useCallback(async () => {
        if (!listingId) return;
        try {
            const data = await CalendarEvent.filter({ listing_id: listingId });
            setEvents(data || []);
        } catch (error) {
            console.error("Failed to load calendar events:", error);
        }
    }, [listingId]);

    const fetchSyncLogs = useCallback(async () => {
        if (!listingId || connections.length === 0) return;
        try {
            const logs = [];
            for (const connection of connections) {
                const connectionLogs = await SyncLog.filter({ 
                    ical_connection_id: connection.id 
                });
                logs.push(...(connectionLogs || []));
            }
            setSyncLogs(logs.sort((a, b) => new Date(b.sync_started_at) - new Date(a.sync_started_at)));
        } catch (error) {
            console.error("Failed to load sync logs:", error);
        }
    }, [listingId, connections]);

    useEffect(() => {
        fetchConnections();
        fetchEvents();
    }, [fetchConnections, fetchEvents]);

    useEffect(() => {
        fetchSyncLogs();
    }, [fetchSyncLogs]);

    const handleAddConnection = async (e) => {
        e.preventDefault();
        
        if (!newConnection.name || !newConnection.ical_url) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (!newConnection.ical_url.startsWith('http')) {
            toast.error("Please enter a valid URL starting with http:// or https://");
            return;
        }

        try {
            await IcalConnection.create({
                listing_id: listingId,
                name: newConnection.name,
                ical_url: newConnection.ical_url,
                platform: newConnection.platform,
                status: 'pending'
            });

            setNewConnection({ name: '', ical_url: '', platform: 'other' });
            setShowAddDialog(false);
            toast.success("iCal connection added successfully");
            fetchConnections();

            // Auto-sync new connection after 2 seconds
            setTimeout(() => {
                handleSyncConnection(connections.find(c => c.ical_url === newConnection.ical_url)?.id);
            }, 2000);

        } catch (error) {
            toast.error("Failed to add iCal connection");
            console.error(error);
        }
    };

    const handleSyncConnection = async (connectionId) => {
        if (!connectionId) return;
        
        setIsSyncing(true);
        toast.info("Starting sync...");

        try {
            const { data } = await icalSyncService({ 
                action: 'sync', 
                connectionId: connectionId 
            });

            if (data.success) {
                toast.success(data.message);
                fetchConnections();
                fetchEvents();
                fetchSyncLogs();
                onSyncComplete?.();
            } else {
                throw new Error(data.error || 'Sync failed');
            }
        } catch (error) {
            console.error("Sync error:", error);
            toast.error(`Sync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteConnection = async (connectionId) => {
        try {
            await IcalConnection.delete(connectionId);
            toast.success("Connection deleted successfully");
            fetchConnections();
            fetchEvents();
        } catch (error) {
            toast.error("Failed to delete connection");
            console.error(error);
        }
    };

    const handleFileImport = async (event) => {
        const file = event.target.files[0];
        if (!file || !file.name.match(/\.(ics|ical)$/i)) {
            toast.error('Please select a valid iCal file (.ics or .ical)');
            return;
        }

        setIsSyncing(true);
        toast.info('Processing iCal file...');

        try {
            const icalContent = await file.text();
            const { data } = await advancedIcalProcessor({
                icalContent: icalContent,
                listingId: listingId,
                source: 'ical_import_v2'
            });

            if (data.success) {
                toast.success(data.message);
                fetchEvents();
                onSyncComplete?.();
            } else {
                throw new Error(data.error || 'Import failed');
            }
        } catch (error) {
            console.error('iCal Import Error:', error);
            toast.error(`Import failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExportFeed = () => {
        const feedUrl = `${window.location.origin}/functions/generateICalFeed?listingId=${listingId}`;
        window.open(feedUrl, '_blank');
        toast.success("iCal feed downloaded");
    };

    const copyFeedUrl = async () => {
        const feedUrl = `${window.location.origin}/functions/generateICalFeed?listingId=${listingId}`;
        try {
            await navigator.clipboard.writeText(feedUrl);
            toast.success("Feed URL copied to clipboard");
        } catch (error) {
            toast.error("Failed to copy URL");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'syncing': return 'bg-blue-100 text-blue-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPlatformIcon = (platform) => {
        switch (platform) {
            case 'airbnb': return '🏠';
            case 'vrbo': return '🏖️';
            case 'booking': return '🏨';
            case 'guesty': return '🔧';
            default: return '📅';
        }
    };

    return (
        <Card>
            <Tabs defaultValue="connections">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-6 h-6 text-blue-600" />
                                <h2 className="text-xl font-semibold text-gray-800">Complete iCal Management</h2>
                                <Badge variant="secondary" className="text-xs">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Enterprise
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Sync with multiple platforms and manage your calendar</p>
                        </div>
                        <TabsList>
                            <TabsTrigger value="connections">Connections</TabsTrigger>
                            <TabsTrigger value="events">Events</TabsTrigger>
                            <TabsTrigger value="export">Export</TabsTrigger>
                            <TabsTrigger value="logs">Sync Logs</TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>

                <CardContent>
                    <TabsContent value="connections">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">iCal Connections</h3>
                                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                                    <DialogTrigger asChild>
                                        <Button className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            Add Connection
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New iCal Connection</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleAddConnection} className="space-y-4">
                                            <div>
                                                <Label htmlFor="name">Connection Name</Label>
                                                <Input
                                                    id="name"
                                                    value={newConnection.name}
                                                    onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                                                    placeholder="e.g., Airbnb Calendar"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="platform">Platform</Label>
                                                <Select 
                                                    value={newConnection.platform} 
                                                    onValueChange={(value) => setNewConnection({...newConnection, platform: value})}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="airbnb">Airbnb</SelectItem>
                                                        <SelectItem value="vrbo">VRBO</SelectItem>
                                                        <SelectItem value="booking">Booking.com</SelectItem>
                                                        <SelectItem value="guesty">Guesty</SelectItem>
                                                        <SelectItem value="siteminder">Siteminder</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="ical_url">iCal URL</Label>
                                                <Input
                                                    id="ical_url"
                                                    value={newConnection.ical_url}
                                                    onChange={(e) => setNewConnection({...newConnection, ical_url: e.target.value})}
                                                    placeholder="https://..."
                                                    type="url"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                                                    Cancel
                                                </Button>
                                                <Button type="submit">Add Connection</Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {isLoadingConnections ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                </div>
                            ) : connections.length === 0 ? (
                                <div className="text-center p-8 text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-4" />
                                    <p>No iCal connections yet</p>
                                    <p className="text-sm">Add a connection to sync with external calendars</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {connections.map((connection) => (
                                        <div key={connection.id} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg">{getPlatformIcon(connection.platform)}</span>
                                                        <h4 className="font-medium">{connection.name}</h4>
                                                        <Badge className={getStatusColor(connection.status)}>
                                                            {connection.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-600 break-all">{connection.ical_url}</p>
                                                    {connection.last_synced && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Last synced: {new Date(connection.last_synced).toLocaleString()} 
                                                            ({connection.last_event_count} events)
                                                        </p>
                                                    )}
                                                    {connection.error_message && (
                                                        <p className="text-xs text-red-600 mt-1">{connection.error_message}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSyncConnection(connection.id)}
                                                        disabled={isSyncing}
                                                    >
                                                        {isSyncing ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDeleteConnection(connection.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* File Import Section */}
                            <div className="border-t pt-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium mb-2">Import iCal File</h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Upload an .ics file to import events directly
                                    </p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileImport}
                                        accept=".ics,.ical"
                                        className="hidden"
                                        id="ical-upload"
                                    />
                                    <Label htmlFor="ical-upload" className="cursor-pointer">
                                        <Button variant="outline" asChild>
                                            <div>
                                                <Upload className="w-4 h-4 mr-2" />
                                                {isSyncing ? 'Processing...' : 'Choose File'}
                                            </div>
                                        </Button>
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="events">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Calendar Events ({events.length})</h3>
                            {events.length === 0 ? (
                                <div className="text-center p-8 text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-4" />
                                    <p>No events found</p>
                                    <p className="text-sm">Events will appear here after syncing</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {events.map((event) => (
                                        <div key={event.id} className="border rounded p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium">{event.title}</h4>
                                                    <p className="text-sm text-gray-600">
                                                        {event.start_date} to {event.end_date}
                                                    </p>
                                                    {event.description && (
                                                        <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline">{event.source}</Badge>
                                                    <Badge className={
                                                        event.event_type === 'blocked' ? 'bg-red-100 text-red-800' :
                                                        event.event_type === 'reserved' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-green-100 text-green-800'
                                                    }>
                                                        {event.event_type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="export">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Export Your Calendar</h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">iCal Feed URL</h4>
                                <p className="text-sm text-blue-700 mb-3">
                                    Use this URL to export your blocked dates to external platforms
                                </p>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        value={`${window.location.origin}/functions/generateICalFeed?listingId=${listingId}`}
                                        readOnly
                                        className="flex-1 text-xs"
                                    />
                                    <Button variant="outline" size="sm" onClick={copyFeedUrl}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button variant="outline" onClick={handleExportFeed}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download iCal File
                                </Button>
                            </div>

                            <div className="text-sm text-gray-600">
                                <h5 className="font-medium mb-2">How to use this feed:</h5>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Copy the feed URL above</li>
                                    <li>Go to your booking platform (Airbnb, VRBO, etc.)</li>
                                    <li>Find "Calendar Sync" or "Import Calendar" settings</li>
                                    <li>Paste the URL to sync your blocked dates</li>
                                </ol>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="logs">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Sync Activity ({syncLogs.length})
                            </h3>
                            {syncLogs.length === 0 ? (
                                <div className="text-center p-8 text-gray-500">
                                    <Activity className="w-12 h-12 mx-auto mb-4" />
                                    <p>No sync activity yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {syncLogs.map((log) => (
                                        <div key={log.id} className="border rounded p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {log.status === 'success' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                    ) : log.status === 'error' ? (
                                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                                    ) : (
                                                        <Clock className="w-5 h-5 text-blue-600" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium">
                                                            {log.status === 'success' ? 'Sync completed' : 
                                                             log.status === 'error' ? 'Sync failed' : 
                                                             'Sync in progress'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {new Date(log.sync_started_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                {log.status === 'success' && (
                                                    <div className="text-right text-sm text-gray-600">
                                                        <p>+{log.events_imported || 0} imported</p>
                                                        <p>-{log.events_deleted || 0} deleted</p>
                                                    </div>
                                                )}
                                            </div>
                                            {log.error_details && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                                    {log.error_details}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}
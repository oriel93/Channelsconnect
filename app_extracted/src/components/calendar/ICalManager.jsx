
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { IcalConnection } from '@/api/entities';
import { BlockedDate } from '@/api/entities';
import { enterpriseIcalSync } from '@/api/functions';
import { advancedIcalProcessor } from '@/api/functions'; // New import for advanced processing

// New component containing the full iCal management logic
function ComprehensiveICalManager({ listingId, listingTitle, onSyncComplete }) {
    const [connections, setConnections] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [newConnectionUrl, setNewConnectionUrl] = useState('');
    const [newConnectionPlatform, setNewConnectionPlatform] = useState('other');
    const fileInputRef = useRef(null);

    const fetchConnections = useCallback(async () => {
        if (!listingId) return;
        setIsLoadingConnections(true);
        try {
            const data = await IcalConnection.filter({ listing_id: listingId });
            setConnections(data);
        } catch (error) {
            toast.error("Failed to load iCal connections.");
            console.error(error);
        }
        setIsLoadingConnections(false);
    }, [listingId]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Enhanced file import handler with better file type recognition
    const handleFileImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Accept both .ics files and text/calendar MIME type
        const validExtensions = ['.ics', '.ical'];
        const validMimeTypes = ['text/calendar', 'application/ics', 'text/plain']; // Added text/plain for some exports
        
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        const isValidExtension = validExtensions.includes(fileExtension);
        const isValidMimeType = validMimeTypes.includes(file.type);
        
        if (!isValidExtension && !isValidMimeType) {
            toast.error(`Please select a valid iCal file (.ics or .ical). Selected file: ${file.name} (MIME type: ${file.type})`);
            return;
        }

        setIsSyncing(true);
        toast.info('Processing iCal file with enhanced accuracy engine...');

        try {
            const icalContent = await file.text();

            // Basic validation before sending to backend
            if (!icalContent.includes('BEGIN:VCALENDAR') && !icalContent.includes('BEGIN:VEVENT')) {
                throw new Error('Invalid iCal file format - no calendar or event data found. Please ensure it\'s a valid .ics file.');
            }

            // Send to enhanced processor
            const { data } = await advancedIcalProcessor({
                icalContent: icalContent,
                listingId: listingId,
                source: 'ical_import_v2'
            });

            if (data.success) {
                const message = data.message || `Import completed! ${data.statistics?.newDatesInserted || 0} dates blocked.`;
                toast.success(message);
                
                // Show debug info if there were parsing issues
                if (data.parsingErrors && data.parsingErrors.length > 0) {
                    console.warn('Parsing errors:', data.parsingErrors);
                    toast.warning(`${data.parsingErrors.length} events had parsing issues. Check console for details.`);
                }
                
                onSyncComplete?.();
            } else {
                throw new Error(data.error || 'Import failed during processing');
            }

        } catch (error) {
            console.error('iCal Import Error:', error);
            
            let errorMessage = 'Import failed';
            if (error.message) {
                errorMessage = `Import failed: ${error.message}`;
            } else if (error.response?.data?.error) {
                errorMessage = `Import failed: ${error.response.data.error}`;
            }
            
            toast.error(errorMessage);
            
            // Provide helpful troubleshooting info
            toast.info("Try: 1) Re-downloading the .ics file, 2) Using a different browser, 3) Checking if the file isn't corrupted.", {
                duration: 8000
            });
            
        } finally {
            setIsSyncing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExport = async () => {
        toast.info("Generating iCal file...");
        try {
            const blockedDates = await BlockedDate.filter({ listing_id: listingId });
            let icalContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//ChannelsConnect//Availability//EN',
            ];

            blockedDates.forEach((block, index) => {
                const startDate = block.date.replace(/-/g, '');
                const nextDay = new Date(block.date);
                nextDay.setDate(nextDay.getDate() + 1);
                const endDate = nextDay.toISOString().split('T')[0].replace(/-/g, '');

                icalContent.push(
                    'BEGIN:VEVENT',
                    `UID:${block.id}@channelsconnect.com`,
                    `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '')}Z`,
                    `DTSTART;VALUE=DATE:${startDate}`,
                    `DTEND;VALUE=DATE:${endDate}`,
                    `SUMMARY:Blocked - ${listingTitle}`,
                    'END:VEVENT'
                );
            });

            icalContent.push('END:VCALENDAR');

            const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `channels_connect_${listingTitle.replace(/\s+/g, '_')}_ical.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("iCal file downloaded successfully.");

        } catch (error) {
            console.error('Export failed:', error);
            toast.error("Failed to generate iCal file.");
        }
    };

    const handleEnterpriseSync = async () => {
        if (!listingId) return;
        setIsSyncing(true);
        toast.info("Starting enterprise-grade sync for all connections...");
        try {
            const { data } = await enterpriseIcalSync({ listing_id: listingId });
            if (data.success) {
                toast.success(data.message || "All connections synced successfully.");
                onSyncComplete?.();
                fetchConnections(); // Refresh connection statuses
            } else {
                throw new Error(data.error || "An unknown error occurred during sync.");
            }
        } catch(error) {
            console.error("Enterprise sync error", error);
            toast.error(`Sync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    }

    return (
        <Card>
            <Tabs defaultValue="import-export">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-6 h-6 text-blue-600" />
                                <h2 className="text-xl font-semibold text-gray-800">Advanced iCal Synchronization</h2>
                                <Badge variant="secondary" className="text-xs">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Enterprise-Grade
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Powered by Google Calendar technology for maximum compatibility</p>
                        </div>
                        <TabsList>
                            <TabsTrigger value="sync-url">Sync from URL</TabsTrigger>
                            <TabsTrigger value="import-export">Import/Export File</TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>
                <CardContent>
                    <TabsContent value="sync-url">
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900">Enterprise Sync</h4>
                                        <p className="text-sm text-blue-700">Use our premium, real-time sync for connections that require a URL.</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleEnterpriseSync}
                                    disabled={isSyncing}
                                    className="mt-3 w-full sm:w-auto"
                                >
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                    Run Enterprise Sync
                                </Button>
                            </div>

                            <div className="text-center text-sm text-gray-500">
                                <p>This feature syncs all configured URL connections for this property.</p>
                                <p>To add a new connection, please contact support.</p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="import-export">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-gray-700">Advanced iCal Import</h3>
                                    <Badge variant="outline" className="text-xs">
                                        <Zap className="w-3 h-3 mr-1" />
                                        Enhanced
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-500">Enterprise-grade processing with Google Calendar technology</p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="ical-upload"
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileImport}
                                        accept=".ics,.ical,text/calendar,application/ics,text/plain" // Updated accept attribute
                                        className="hidden"
                                    />
                                    <Label
                                        htmlFor="ical-upload"
                                        className="flex-grow inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                                    >
                                        <Upload className="w-4 h-4 mr-2"/>
                                        {isSyncing ? 'Processing...' : 'Browse for file'}
                                    </Label>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <p className="flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        Advanced parsing algorithm
                                    </p>
                                    <p className="flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Supports all major platforms
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 p-4 border rounded-lg">
                                <h3 className="font-semibold text-gray-700">Export Blocked Dates</h3>
                                <p className="text-sm text-gray-500">Download a file containing all blocked dates for this property.</p>
                                <Button onClick={handleExport} variant="secondary" className="w-full">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download .ics
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}

// The original ICalManager now acts as a wrapper
export default function ICalManager({ listingId, listingTitle, onSyncComplete }) {
    return (
        <ComprehensiveICalManager 
            listingId={listingId}
            listingTitle={listingTitle}
            onSyncComplete={onSyncComplete}
        />
    );
}

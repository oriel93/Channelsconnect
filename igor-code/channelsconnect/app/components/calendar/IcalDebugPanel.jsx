
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { debugIcalImport } from '@/api/functions';
import { 
  Bug, Loader2, CheckCircle, AlertCircle, Info, 
  Globe, Database, Calendar, ExternalLink, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function IcalDebugPanel({ listingId }) {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugUrl, setDebugUrl] = useState('');
  const [debugResults, setDebugResults] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const handleDebug = async () => {
    if (!debugUrl.trim()) {
      toast.error('Please enter an iCal URL to debug');
      return;
    }

    setIsDebugging(true);
    try {
      const { data } = await debugIcalImport({ 
        listingId, 
        icalUrl: debugUrl.trim() 
      });
      
      if (data.success) {
        const currentDebugResults = data.debug;
        const recommendations = currentDebugResults.recommendations || [];

        // --- Start: Property ID Mismatch Fix Implementation ---
        // Assume step1_listing might return an icalPropertyIdDetected if found within the iCal feed
        // This allows checking if the iCal content is for a different property than the current listingId
        const currentListingId = String(listingId);
        const detectedIcalPropertyId = String(currentDebugResults.step1_listing?.icalPropertyIdDetected || '');

        if (detectedIcalPropertyId && detectedIcalPropertyId !== '0' && detectedIcalPropertyId !== currentListingId) {
          recommendations.unshift( // Add this recommendation to the beginning of the list
            `Detected iCal Property ID (${detectedIcalPropertyId}) does not match the current listing's ID (${currentListingId}). Please ensure the iCal URL is for this specific listing, or switch to the correct listing's debug panel.`
          );
        }
        // --- End: Property ID Mismatch Fix Implementation ---
        
        setDebugResults({ ...currentDebugResults, recommendations });
        toast.success('Debug analysis completed');
      } else {
        throw new Error(data.error || 'Debug failed');
      }
    } catch (error) {
      console.error('Debug error:', error);
      toast.error(error.message || 'Debug analysis failed');
    } finally {
      setIsDebugging(false);
    }
  };

  const getStepStatus = (step) => {
    if (step?.success) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (step?.error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  const handleQuickTest = () => {
    setDebugUrl('https://api.beds24.com/ical/bookings.ics?roomid=584027');
  };

  if (!showDebugPanel) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebugPanel(true)}
            className="w-full"
          >
            <Bug className="w-4 h-4 mr-2" />
            Show Advanced iCal Debugging
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-orange-600" />
            Advanced iCal Debugging & Troubleshooting
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDebugPanel(false)}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            This comprehensive debugging tool analyzes every step of the iCal import process to identify exactly where issues occur.
          </p>
          
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="https://api.beds24.com/ical/bookings.ics?roomid=584027"
              value={debugUrl}
              onChange={(e) => setDebugUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleQuickTest} variant="outline" size="sm">
              Test Beds24
            </Button>
            <Button 
              onClick={handleDebug} 
              disabled={isDebugging || !debugUrl.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isDebugging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bug className="w-4 h-4 mr-2" />}
              Debug
            </Button>
          </div>
          
          {isDebugging && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running comprehensive analysis...
            </div>
          )}
        </div>

        {debugResults && (
          <div className="space-y-4 mt-6">
            <h4 className="font-medium text-gray-900">🔍 Detailed Debug Analysis</h4>
            
            {/* Step 1: Listing Verification */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStepStatus(debugResults.step1_listing)}
                <Database className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Step 1: Listing Verification</span>
              </div>
              
              <div className="ml-6 space-y-2 text-sm">
                <p><strong>Listing ID:</strong> {debugResults.step1_listing?.listingId}</p>
                {debugResults.step1_listing?.icalPropertyIdDetected && (
                    <p><strong>iCal Detected Property ID:</strong> {debugResults.step1_listing.icalPropertyIdDetected}</p>
                )}
                <p><strong>Listing Name:</strong> {debugResults.step1_listing?.listingName || 'N/A'}</p>
                <p><strong>User Email:</strong> {debugResults.step1_listing?.userEmail}</p>
                <p><strong>Status:</strong> 
                  <Badge variant={debugResults.step1_listing?.success ? 'default' : 'destructive'} className="ml-2">
                    {debugResults.step1_listing?.success ? 'Authorized' : 'Failed'}
                  </Badge>
                </p>
                {debugResults.step1_listing?.error && (
                  <p className="text-red-600"><strong>Error:</strong> {debugResults.step1_listing.error}</p>
                )}
              </div>
            </div>

            {/* Step 2: URL Fetch */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStepStatus(debugResults.step2_fetch)}
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Step 2: iCal URL Fetch</span>
              </div>
              
              <div className="ml-6 space-y-2 text-sm">
                <p><strong>URL:</strong> {debugResults.step2_fetch?.url}</p>
                <p><strong>Status:</strong> 
                  <Badge variant={debugResults.step2_fetch?.success ? 'default' : 'destructive'} className="ml-2">
                    {debugResults.step2_fetch?.success ? 'Success' : 'Failed'}
                  </Badge>
                </p>
                {debugResults.step2_fetch?.fetchDetails?.status && (
                  <p><strong>HTTP Status:</strong> {debugResults.step2_fetch.fetchDetails.status} {debugResults.step2_fetch.fetchDetails.statusText}</p>
                )}
                <p><strong>Content Length:</strong> {debugResults.step2_fetch?.contentLength || 0} characters</p>
                {debugResults.step2_fetch?.error && (
                  <p className="text-red-600"><strong>Error:</strong> {debugResults.step2_fetch.error}</p>
                )}
                {debugResults.step2_fetch?.contentPreview && (
                  <details>
                    <summary className="cursor-pointer text-blue-600">View iCal Content Preview</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-40">
                      {debugResults.step2_fetch.contentPreview}
                    </pre>
                  </details>
                )}
              </div>
            </div>

            {/* Step 3: Parsing */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStepStatus(debugResults.step3_parse)}
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="font-medium">Step 3: iCal Event Parsing</span>
              </div>
              
              <div className="ml-6 space-y-2 text-sm">
                <p><strong>Status:</strong>
                  <Badge variant={debugResults.step3_parse?.success ? 'default' : 'destructive'} className="ml-2">
                    {debugResults.step3_parse?.success ? 'Success' : 'Failed'}
                  </Badge>
                </p>
                <p><strong>Events Found:</strong> {debugResults.step3_parse?.eventsFound || 0}</p>
                {debugResults.step3_parse?.error && (
                  <p className="text-red-600"><strong>Error:</strong> {debugResults.step3_parse.error}</p>
                )}
                {debugResults.step3_parse?.eventsPreview && debugResults.step3_parse.eventsPreview.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-blue-600">View Parsed Events Sample</summary>
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      {debugResults.step3_parse.eventsPreview.map((event, index) => (
                        <div key={index} className="mb-2 p-2 bg-white rounded">
                          <p><strong>UID:</strong> {event.uid}</p>
                          <p><strong>Start:</strong> {event.start}</p>
                          <p><strong>End:</strong> {event.end}</p>
                          <p><strong>Summary:</strong> {event.summary || 'No summary'}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Step 4: Database Operations */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStepStatus(debugResults.step4_database)}
                <Database className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Step 4: Database Operations</span>
              </div>
              
              <div className="ml-6 space-y-2 text-sm">
                <p><strong>Status:</strong>
                  <Badge variant={debugResults.step4_database?.success ? 'default' : 'destructive'} className="ml-2">
                    {debugResults.step4_database?.success ? 'Success' : 'Failed'}
                  </Badge>
                </p>
                {debugResults.step4_database?.error && (
                  <p className="text-red-600"><strong>Error:</strong> {debugResults.step4_database.error}</p>
                )}
                
                {debugResults.step4_database?.processingResults && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="font-bold text-green-700">{debugResults.step4_database.processingResults.imported}</div>
                      <div className="text-xs">Imported</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded text-center">
                      <div className="font-bold text-blue-700">{debugResults.step4_database.processingResults.updated}</div>
                      <div className="text-xs">Updated</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded text-center">
                      <div className="font-bold text-yellow-700">{debugResults.step4_database.processingResults.skipped}</div>
                      <div className="text-xs">Skipped</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded text-center">
                      <div className="font-bold text-purple-700">{debugResults.step4_database.databaseState?.totalBlocks || 0}</div>
                      <div className="text-xs">Total Blocks</div>
                    </div>
                  </div>
                )}

                {debugResults.step4_database?.databaseState && (
                  <div className="mt-2">
                    <p><strong>Database State:</strong></p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Total Blocks: {debugResults.step4_database.databaseState.totalBlocks}</li>
                      <li>iCal Blocks: {debugResults.step4_database.databaseState.icalBlocks}</li>
                      <li>Manual Blocks: {debugResults.step4_database.databaseState.manualBlocks}</li>
                    </ul>
                  </div>
                )}

                {debugResults.step4_database?.processingResults?.errors && debugResults.step4_database.processingResults.errors.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-red-600">View Database Errors ({debugResults.step4_database.processingResults.errors.length})</summary>
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs max-h-40 overflow-y-auto">
                      {debugResults.step4_database.processingResults.errors.map((error, index) => (
                        <div key={index} className="mb-1 text-red-700">{error}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {debugResults.recommendations && debugResults.recommendations.length > 0 && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h5 className="font-medium text-blue-900 mb-2">🔧 Expert Recommendations</h5>
                <ul className="space-y-1 text-sm">
                  {debugResults.recommendations.map((rec, index) => (
                    <li key={index} className="text-blue-800">{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={() => setDebugResults(null)} 
                variant="outline" 
                size="sm"
              >
                Clear Results
              </Button>
              <Button 
                onClick={handleDebug} 
                variant="outline" 
                size="sm"
                disabled={isDebugging}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-run Analysis
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

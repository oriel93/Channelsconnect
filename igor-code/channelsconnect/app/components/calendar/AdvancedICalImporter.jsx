import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText,
  Calendar,
  Zap,
  Shield
} from 'lucide-react';
import { advancedIcalProcessor } from '@/api/functions';
import { toast } from 'sonner';

export default function AdvancedICalImporter({ listingId, onImportComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [processingStage, setProcessingStage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(ics|ical)$/i)) {
      toast.error('Please select a valid iCal file (.ics or .ical)');
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProgress(0);
    setProcessingStage('Reading file...');

    try {
      // Stage 1: Read file
      const icalContent = await file.text();
      setProgress(20);
      setProcessingStage('Validating iCal format...');

      // Basic validation
      if (!icalContent.includes('BEGIN:VCALENDAR')) {
        throw new Error('Invalid iCal file: Missing VCALENDAR structure');
      }

      setProgress(40);
      setProcessingStage('Processing events with Google Calendar technology...');

      // Stage 2: Advanced processing
      const { data } = await advancedIcalProcessor({
        icalContent: icalContent,
        listingId: listingId,
        source: 'advanced_file_import'
      });

      setProgress(80);
      setProcessingStage('Finalizing import...');

      if (data.success) {
        setResults(data);
        setProgress(100);
        setProcessingStage('Import completed successfully!');
        
        toast.success(
          `Import completed! ${data.statistics.newDatesInserted} new dates blocked from ${data.statistics.eventsProcessed} events.`
        );
        
        // Notify parent component
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        throw new Error(data.error || 'Import failed');
      }

    } catch (error) {
      console.error('iCal import error:', error);
      toast.error(`Import failed: ${error.message}`);
      setResults({
        success: false,
        error: error.message,
        statistics: { eventsProcessed: 0, newDatesInserted: 0 }
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProcessingStage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.match(/\.(ics|ical)$/i)) {
        // Simulate file input change
        const event = { target: { files: [file] } };
        handleFileImport(event);
      } else {
        toast.error('Please drop a valid iCal file (.ics or .ical)');
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Advanced iCal Importer
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Enterprise-Grade
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Powered by Google Calendar technology for maximum compatibility
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            isProcessing 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,.ical"
            onChange={handleFileImport}
            className="hidden"
            disabled={isProcessing}
          />
          
          {isProcessing ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
              <div>
                <p className="font-medium text-gray-700">{processingStage}</p>
                <Progress value={progress} className="w-full mt-2" />
                <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-blue-600 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drop your iCal file here or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports .ics and .ical files from any calendar application
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Google-level parsing
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  All-day event support
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Multi-format compatibility
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Results Display */}
        {results && (
          <div className="space-y-4">
            {results.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p className="font-medium">Import completed successfully!</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Events Processed:</span>
                        <br />
                        <span className="text-lg">{results.statistics.eventsProcessed}</span>
                      </div>
                      <div>
                        <span className="font-medium">Valid Events:</span>
                        <br />
                        <span className="text-lg">{results.statistics.validEvents}</span>
                      </div>
                      <div>
                        <span className="font-medium">New Dates Blocked:</span>
                        <br />
                        <span className="text-lg font-bold text-green-600">
                          {results.statistics.newDatesInserted}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Processing Time:</span>
                        <br />
                        <span className="text-lg">{results.statistics.processingTimeMs}ms</span>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Import failed</p>
                    <p>{results.error}</p>
                    {results.parseErrors && results.parseErrors.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer">View technical details</summary>
                        <ul className="mt-2 space-y-1">
                          {results.parseErrors.map((error, index) => (
                            <li key={index} className="text-gray-600">• {error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Debug Information for Development */}
            {results.debugInfo && results.debugInfo.length > 0 && (
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer font-medium">
                  Advanced Processing Details
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {results.debugInfo.map((info, index) => (
                    <div key={index} className="font-mono text-xs bg-gray-50 p-2 rounded">
                      {JSON.stringify(info, null, 2)}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Supported Platforms:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Airbnb calendar exports</li>
            <li>• Booking.com iCal feeds</li>
            <li>• Vrbo calendar sync</li>
            <li>• Google Calendar exports</li>
            <li>• Outlook calendar files</li>
            <li>• Any RFC-compliant iCal format</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
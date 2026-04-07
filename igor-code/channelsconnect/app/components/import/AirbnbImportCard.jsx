import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Camera, DollarSign, MapPin, Star } from 'lucide-react';

export default function AirbnbImportCard({ onImport, isLoading, importStatus }) {
  const features = [
    { icon: Camera, label: "Photo Extraction", desc: "High-res images automatically optimized" },
    { icon: DollarSign, label: "Smart Pricing", desc: "Dynamic rates and fee breakdown" },
    { icon: MapPin, label: "Location Data", desc: "Address and neighborhood details" },
    { icon: Star, label: "Reviews & Rating", desc: "Guest feedback and host info" }
  ];

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/10 to-transparent"></div>
      
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.1A9.9 9.9 0 0 0 2.1 12c0 4.12 2.45 8.43 4.25 11.23a4.13 4.13 0 0 0 3.5 1.67c1.16 0 2.44-.64 3.5-1.67C19.45 20.43 21.9 16.12 21.9 12A9.9 9.9 0 0 0 12 2.1z"/>
            </svg>
          </div>
          AI-Powered Airbnb Import
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Sparkles className="w-3 h-3 mr-1" />
            Enhanced
          </Badge>
        </CardTitle>
        <CardDescription>
          Import listings with advanced AI extraction for complete property data including photos, pricing, and amenities.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <feature.icon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">{feature.label}</div>
                <div className="text-xs text-slate-600">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {importStatus?.isLoading && importStatus?.type === 'airbnb' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="font-medium text-blue-900">Processing your listing...</span>
            </div>
            <div className="text-sm text-blue-700">
              Our AI is analyzing the page structure and extracting comprehensive property data.
            </div>
          </div>
        )}

        <Button 
          onClick={onImport}
          disabled={isLoading}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
          size="lg"
        >
          {isLoading && importStatus?.type === 'airbnb' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing from Airbnb...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Import from Airbnb
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
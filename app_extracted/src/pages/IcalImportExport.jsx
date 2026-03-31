
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, RefreshCw, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function IcalImportExport() {
  React.useEffect(() => {
    document.title = "iCal Import and Export for Vacation Rentals | Channels Connect";
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Easily import and export your calendars to keep everything up to date. Channels Connect supports iCal feeds across all major platforms for seamless syncing.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
  }, []);

  return (
    <div className="bg-white">
      <section className="bg-slate-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <RefreshCw className="w-16 h-16 mx-auto mb-6 text-blue-400" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            iCal Import and Export
          </h1>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto">
            Easily import and export your calendars to keep everything up to date. Channels Connect supports iCal feeds across all major platforms for seamless syncing.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">One-click iCal Import</h3>
                <p className="text-slate-600">Import existing bookings from any platform that supports iCal feeds.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <Download className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Instant Export to Partner Platforms</h3>
                <p className="text-slate-600">Export your availability to all connected channels automatically.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Support for Major Platforms</h3>
                <p className="text-slate-600">Works with Airbnb, Booking.com, Vrbo, and 100+ booking platforms.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to Sync Your Calendars?</h2>
            <p className="text-lg text-slate-600 mb-8">Start importing and exporting your bookings seamlessly.</p>
            <Link to={`${createPageUrl('Home')}#contact-form`}>
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

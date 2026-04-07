import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, Shield, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MultiCalendarSync() {
  React.useEffect(() => {
    document.title = "Multi-Calendar Sync for Vacation Rentals | Channels Connect";
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Keep all your booking channels in perfect sync. Channels Connect automatically updates your calendars across Airbnb, Booking.com, Vrbo, and 100+ platforms to eliminate double bookings.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
  }, []);

  return (
    <div className="bg-white">
      <section className="bg-slate-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-6 text-blue-400" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Multi-Calendar Sync for Vacation Rentals
          </h1>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto">
            Keep all your booking channels in perfect sync. Channels Connect automatically updates your calendars across Airbnb, Booking.com, Vrbo, and 100+ platforms to eliminate double bookings and manual updates.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Two-way Calendar Synchronization</h3>
                <p className="text-slate-600">Bookings sync instantly in both directions across all connected platforms.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Real-time Availability Updates</h3>
                <p className="text-slate-600">Prevent double bookings with instant availability updates across all channels.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Multi-property Support</h3>
                <p className="text-slate-600">Manage calendars for unlimited properties from one central dashboard.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to Sync Your Calendars?</h2>
            <p className="text-lg text-slate-600 mb-8">Start connecting your booking channels today.</p>
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
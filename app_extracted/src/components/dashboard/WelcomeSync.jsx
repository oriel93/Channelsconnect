/**
 * WelcomeSync.jsx
 * Shown on the Dashboard when a user has no listings yet.
 * Redirects to the ImportListings onboarding flow.
 * No "Channex" branding visible — all calls go through /connect/* endpoints.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, ArrowRight, BarChart2, Wifi } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function WelcomeSync({ onSyncComplete }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="max-w-xl w-full text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-blue-50 rounded-2xl p-4 w-fit mb-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png"
              alt="Channels Connect"
              className="w-12 h-12 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Channels Connect!</CardTitle>
          <CardDescription className="text-base text-slate-600 mt-2">
            Connect your booking channels and sync your listings to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              { icon: Wifi, title: 'Connect Channels', desc: 'Airbnb, Booking.com & more' },
              { icon: BarChart2, title: 'Sync Rates', desc: '500 days of ARI automatically' },
              { icon: Zap, title: 'Live Updates', desc: 'Real-time availability sync' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-xl p-3">
                <Icon className="w-5 h-5 text-blue-600 mb-1.5" />
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            onClick={() => navigate(createPageUrl('ImportListings'))}
            className="w-full max-w-sm mx-auto bg-blue-600 hover:bg-blue-700"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-slate-400">
            Takes about 2 minutes to connect your first channel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

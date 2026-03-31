import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AuthCallback() {
  useEffect(() => {
    // This page should ideally not be hit, but as a fallback,
    // we redirect to the dashboard. The platform's auth system
    // should handle the login and redirect before this page loads.
    const timer = setTimeout(() => {
      window.location.href = createPageUrl('Dashboard');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-full h-full object-contain" />
        </div>
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Completing Login...</h2>
        <p className="text-slate-600">Redirecting you to your account.</p>
      </div>
    </div>
  );
}
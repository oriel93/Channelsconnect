import React from 'react';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function ExternalAuth() {
  const handleGoogleLogin = async () => {
    try {
      const dashboardUrl = window.location.origin + createPageUrl('Dashboard');
      await User.loginWithRedirect(dashboardUrl);
    } catch (error) {
      console.error("Google login failed", error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-md overflow-hidden bg-white">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" 
              alt="Channels Connect Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to Channels Connect</h1>
          <p className="text-slate-600 mb-8">Sign in to manage your properties and boost your bookings</p>
          
          <Button 
            size="lg" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300" 
            onClick={handleGoogleLogin}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>
          
          <p className="text-xs text-slate-500 mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
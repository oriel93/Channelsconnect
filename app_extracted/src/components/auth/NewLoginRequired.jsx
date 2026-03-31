
import React, { useState, useEffect } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';

export default function NewLoginRequired({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAuth = async () => {
      setLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserAuth();
  }, []);

  const handleLogin = async () => {
    try {
      // CORRECT: Use the platform's built-in login system.
      // It will handle the redirect to Google and back correctly.
      await User.loginWithRedirect(window.location.href);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again. If the problem persists, please contact support.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 text-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to Channels Connect</h1>
            <p className="text-slate-600">
              Sign in or create an account to manage your properties and start getting more bookings.
            </p>
          </div>
          
          <Button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

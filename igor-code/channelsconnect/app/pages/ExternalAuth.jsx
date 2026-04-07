import React, { useState } from 'react';
import { User } from '@/api/entities';
import EmailSignup from '@/components/auth/EmailSignup';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function ExternalAuth() {
  const [showEmailSignup, setShowEmailSignup] = useState(true);

  const handleGoogleLogin = async () => {
    try {
      const dashboardUrl = window.location.origin + createPageUrl('Dashboard');
      await User.loginWithRedirect(dashboardUrl);
    } catch (error) {
      console.error("Google login failed", error);
    }
  };
  
  const handleSuccess = (userData) => {
    // Redirect to dashboard on successful lead creation
    window.location.href = createPageUrl('Dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showEmailSignup ? (
          <EmailSignup 
            onSuccess={handleSuccess}
            onSwitchToGoogle={() => setShowEmailSignup(false)} 
          />
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
             <h2 className="text-2xl font-bold text-slate-800 mb-2">Sign up with Google</h2>
             <p className="text-slate-600 mb-6">Create your account instantly using your Google credentials.</p>
             <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 mb-4" onClick={handleGoogleLogin}>
                Sign up with Google
             </Button>
             <p className="text-sm">
                Or go back to <button onClick={() => setShowEmailSignup(true)} className="text-blue-600 hover:underline">sign up with email</button>.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
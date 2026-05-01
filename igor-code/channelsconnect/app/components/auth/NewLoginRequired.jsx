/**
 * NewLoginRequired — gates app pages behind authentication.
 *
 * IMPORTANT: Uses useAuth() from AuthProvider (shared context) instead of a
 * direct authHelpers.getUser() call. This prevents the race condition where
 * Supabase's session hasn't restored yet and the component incorrectly
 * redirects an authenticated user to /Login.
 */
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function NewLoginRequired({ children }) {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect once auth has fully resolved — never while still loading
    if (!isLoadingAuth && !isAuthenticated) {
      navigate(`/Login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, navigate, location.pathname]);

  // Still resolving session — show spinner
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — render nothing (redirect fires in useEffect above)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

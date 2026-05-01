/**
 * NewLoginRequired — per-page authentication gate.
 *
 * Delegates entirely to the AuthProvider state machine (authState).
 * AuthGate in App.jsx already blocks rendering during INITIALIZING globally,
 * so by the time any page mounts, auth is always SYSTEM_READY or UNAUTHENTICATED.
 *
 * This component is kept for backward compatibility with pages that wrap
 * themselves in <NewLoginRequired>. It is now a thin pass-through.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AUTH_STATE } from '@/lib/authContext';
import { Loader2 } from 'lucide-react';

export default function NewLoginRequired({ children }) {
  const { authState } = useAuth();
  const location = useLocation();

  // AuthGate should have handled this, but defensive fallback
  if (authState === AUTH_STATE.INITIALIZING) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
      </div>
    );
  }

  // Not logged in — send to login with return path
  if (authState === AUTH_STATE.UNAUTHENTICATED) {
    return (
      <Navigate
        to={`/Login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // SYSTEM_READY or AUTHENTICATED_NO_PROFILE — render children
  // (AUTHENTICATED_NO_PROFILE shows its own error UI via ProfileErrorFallback in AuthGate)
  return <>{children}</>;
}

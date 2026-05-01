/**
 * authContext.jsx — React Context for authenticated user with DB profile
 *
 * Solves the Admin kick-out loop by:
 *   1. Listening to Supabase auth state changes
 *   2. On sign-in, immediately fetching the user's DB profile (including role)
 *      from GET /users/me — so role is available before any page renders
 *   3. Never redirecting to login on 403 (handled by the apiClient interceptor fix)
 *   4. Persisting session in Supabase's own storage (localStorage by default)
 *   5. ProtectedRoute waits for isLoadingAuth before rendering — no more kick-to-login race
 *
 * SAFE: Does not touch Channex sync, webhook, or ARI logic.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, authHelpers } from './supabase';
import { api } from './apiClient';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]       = useState(null);
  const [dbUser, setDbUser]         = useState(null);
  const [isLoadingAuth, setLoading] = useState(true);

  // Fetch the user's DB profile (has role, tosAcceptedAt, etc.)
  const fetchDbProfile = async (accessToken) => {
    try {
      const res = await api.users.me();
      return res.data || null;
    } catch (err) {
      // 401 after refresh attempt → not authenticated
      // 404 → user not in public.users yet (new signup)
      if (err.response?.status === 404 || err.response?.status === 401) return null;
      console.warn('[AuthProvider] Could not fetch DB profile:', err.message);
      return null;
    }
  };

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const profile = await fetchDbProfile(session.access_token);
        setDbUser(profile);
      }
      setLoading(false);
    });

    // Subscribe to auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const profile = await fetchDbProfile(session?.access_token);
          setDbUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setDbUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    // dbUser includes role, tosAcceptedAt, etc. from public.users
    user: dbUser,
    isLoadingAuth,
    isAdmin: dbUser?.role?.toLowerCase() === 'admin',
    isAuthenticated: !!session,
    signOut: async () => {
      await authHelpers.signOut();
      setDbUser(null);
      setSession(null);
    },
    // Force-refresh the DB profile (e.g. after role change)
    refreshProfile: async () => {
      if (!session) return;
      const profile = await fetchDbProfile(session.access_token);
      setDbUser(profile);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/**
 * ProtectedRoute — gate that waits for full auth resolution before rendering.
 *
 * While isLoadingAuth is true  → shows a centered spinner (no flash-to-login)
 * If not authenticated          → redirects to /Login
 * Otherwise                     → renders children
 *
 * Wrap any route that requires authentication (especially admin routes) with this
 * component in index.jsx to eliminate the race condition where the route guard
 * checks isAdmin before the DB profile has loaded.
 */
export function ProtectedRoute({ children, requireAdmin = false }) {
  const { isLoadingAuth, isAuthenticated, isAdmin } = useAuth();

  // Still resolving session + DB profile — show spinner, never redirect yet
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in → send to login
  if (!isAuthenticated) {
    return <Navigate to="/Login" replace />;
  }

  // Admin-gated route and user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
}

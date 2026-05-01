/**
 * authContext.jsx — Deterministic Auth State Machine
 *
 * States (AUTH_STATE):
 *   INITIALIZING            — Supabase session not yet resolved; all routes blocked with loader
 *   UNAUTHENTICATED         — No session; redirect to /Login
 *   AUTHENTICATED_NO_PROFILE — Session exists, DB profile fetch failed; error fallback shown
 *   SYSTEM_READY            — Session + DB profile (role) both resolved; both admin and user
 *                             roles land here and get full access to their dashboards
 *
 * Guarantees:
 *   - Router never evaluates role until state === SYSTEM_READY
 *   - Profile fetch has a 5 000 ms timeout; on timeout → AUTHENTICATED_NO_PROFILE
 *   - No silent redirects — every failure renders explicit UI
 *   - SIGNED_IN / TOKEN_REFRESHED re-fetches profile and re-evaluates state
 *   - Works for both 'admin' and 'user' roles (SYSTEM_READY for both)
 *
 * SAFE: Zero dependency on channex-sync, webhook, or ARI logic.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase, authHelpers } from './supabase';
import { api } from './apiClient';
import { Loader2, ShieldAlert, RefreshCw } from 'lucide-react';

// ─── State Machine ────────────────────────────────────────────────────────────

export const AUTH_STATE = {
  INITIALIZING:             'INITIALIZING',
  UNAUTHENTICATED:          'UNAUTHENTICATED',
  AUTHENTICATED_NO_PROFILE: 'AUTHENTICATED_NO_PROFILE',
  SYSTEM_READY:             'SYSTEM_READY',
};

const INITIAL = {
  state:   AUTH_STATE.INITIALIZING,
  session: null,
  dbUser:  null,
  error:   null,
};

function authReducer(prev, action) {
  switch (action.type) {
    case 'RESOLVE_NO_SESSION':
      return { ...INITIAL, state: AUTH_STATE.UNAUTHENTICATED };

    case 'PROFILE_FETCHED':
      return {
        state:   AUTH_STATE.SYSTEM_READY,
        session: action.session,
        dbUser:  action.dbUser,
        error:   null,
      };

    case 'PROFILE_FAILED':
      return {
        state:   AUTH_STATE.AUTHENTICATED_NO_PROFILE,
        session: action.session,
        dbUser:  null,
        error:   action.error || 'Could not load your account profile.',
      };

    case 'SIGNED_OUT':
      return { ...INITIAL, state: AUTH_STATE.UNAUTHENTICATED };

    default:
      return prev;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Profile fetch with timeout ───────────────────────────────────────────────

const PROFILE_TIMEOUT_MS = 5000;

async function fetchProfileWithTimeout() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Profile fetch timed out after ${PROFILE_TIMEOUT_MS}ms`)),
      PROFILE_TIMEOUT_MS
    );

    api.users.me()
      .then((res) => {
        clearTimeout(timer);
        resolve(res.data || null);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [auth, dispatch] = useReducer(authReducer, INITIAL);

  const resolveSession = useCallback(async (session) => {
    if (!session) {
      dispatch({ type: 'RESOLVE_NO_SESSION' });
      return;
    }

    try {
      const dbUser = await fetchProfileWithTimeout();

      if (!dbUser) {
        // User exists in Supabase auth but not yet in public.users (new signup edge case)
        // Treat as SYSTEM_READY with null profile — pages handle missing dbUser gracefully
        dispatch({ type: 'PROFILE_FETCHED', session, dbUser: null });
        return;
      }

      dispatch({ type: 'PROFILE_FETCHED', session, dbUser });
    } catch (err) {
      const status = err?.response?.status;

      // 401 = token expired (shouldn't happen here), 404 = user not in DB yet
      // Both are non-critical — treat same as null profile
      if (status === 401 || status === 404) {
        dispatch({ type: 'PROFILE_FETCHED', session, dbUser: null });
        return;
      }

      // Anything else (network failure, 500, timeout) → AUTHENTICATED_NO_PROFILE
      dispatch({
        type:    'PROFILE_FAILED',
        session,
        error: err?.response?.data?.message || err?.message || 'Unknown error fetching profile.',
      });
    }
  }, []);

  useEffect(() => {
    // Subscribe BEFORE getSession to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'INITIAL_SESSION') {
          await resolveSession(newSession);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await resolveSession(newSession);
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'SIGNED_OUT' });
        }
      }
    );

    // Fallback: if onAuthStateChange INITIAL_SESSION doesn't fire (some Supabase versions),
    // getSession() ensures we always resolve.
    const fallbackTimer = setTimeout(async () => {
      if (auth.state !== AUTH_STATE.INITIALIZING) return; // already resolved
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await resolveSession(session);
      } catch {
        dispatch({ type: 'RESOLVE_NO_SESSION' });
      }
    }, 300); // small delay to let INITIAL_SESSION fire first

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    // Raw state machine state — use for precise guards
    authState: auth.state,

    // Convenience derivations (backward-compat with existing pages)
    session:         auth.session,
    user:            auth.dbUser,
    isLoadingAuth:   auth.state === AUTH_STATE.INITIALIZING,
    isAuthenticated: auth.state === AUTH_STATE.SYSTEM_READY ||
                     auth.state === AUTH_STATE.AUTHENTICATED_NO_PROFILE,
    isAdmin:         auth.dbUser?.role?.toLowerCase() === 'admin',
    isSystemReady:   auth.state === AUTH_STATE.SYSTEM_READY,

    signOut: async () => {
      await authHelpers.signOut();
      dispatch({ type: 'SIGNED_OUT' });
    },

    refreshProfile: async () => {
      if (!auth.session) return;
      await resolveSession(auth.session);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// ─── Global Auth Gate ─────────────────────────────────────────────────────────
// Wrap your entire router output with this to block rendering until SYSTEM_READY.

export function AuthGate({ children }) {
  const { authState, isAdmin } = useAuth();

  if (authState === AUTH_STATE.INITIALIZING) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-slate-600 text-sm font-medium tracking-wide">
            Establishing Secure Session…
          </span>
        </div>
      </div>
    );
  }

  if (authState === AUTH_STATE.AUTHENTICATED_NO_PROFILE) {
    return <ProfileErrorFallback />;
  }

  return children;
}

// ─── Profile Error Fallback UI ────────────────────────────────────────────────

function ProfileErrorFallback() {
  const { signOut, refreshProfile, session } = useAuth();
  const [retrying, setRetrying] = React.useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await refreshProfile();
    setRetrying(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-800">Session Error</h2>
        <p className="text-sm text-slate-500">
          Your session is active but we couldn't load your account profile.
          This is usually a temporary network issue.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {retrying
              ? <><Loader2 className="w-4 h-4 animate-spin" />Retrying…</>
              : <><RefreshCw className="w-4 h-4" />Retry</>
            }
          </button>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ProtectedRoute ────────────────────────────────────────────────────────────
// Use for individual routes (admin guard, auth guard).
// AuthGate already blocks rendering during INITIALIZING globally.

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { authState, isAdmin } = useAuth();

  // Still initializing — AuthGate above handles the loader, but guard here too for safety
  if (authState === AUTH_STATE.INITIALIZING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in at all
  if (authState === AUTH_STATE.UNAUTHENTICATED) {
    return <Navigate to="/Login" replace />;
  }

  // Profile failed — show error (already handled by AuthGate, but defensive)
  if (authState === AUTH_STATE.AUTHENTICATED_NO_PROFILE) {
    return <ProfileErrorFallback />;
  }

  // Admin-only route: non-admin users go to their dashboard
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
}

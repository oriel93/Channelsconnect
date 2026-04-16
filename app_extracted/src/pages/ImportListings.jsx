/**
 * ImportListings.jsx
 * State-aware PM onboarding flow — white-label, no "Channex" visible.
 *
 * State machine:
 *   loading  → checking auth + connection status
 *   setup    → Step 1: Property details form → POST /connect/onboard
 *   connect  → Step 2: Connect Airbnb → GET /connect/oauth-link → branded modal
 *   sync     → Step 3: Full sync in progress (polling progress bar)
 *   complete → Listings loaded with photos + rates
 *   error    → Error message with retry
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/app/AppLayout';
import NewLoginRequired from '@/components/auth/NewLoginRequired';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle, AlertCircle, Wifi, Home, RefreshCw,
  ArrowRight, Zap, Image as ImageIcon, BarChart2, X,
} from 'lucide-react';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import {
  getConnectStatus, onboardProperty, getOAuthLink, startSync, getSyncProgress,
} from '@/api/connectApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthToken() {
  try {
    const me = await User.me();
    // Base44 SDK: token is accessible via the session
    if (me?.token) return me.token;
    // Fallback: try localStorage (some versions of the SDK store it there)
    return localStorage.getItem('sb-access-token') || localStorage.getItem('auth_token') || null;
  } catch {
    return null;
  }
}

const PHASE_LABELS = {
  starting: 'Initialising sync...',
  properties: 'Syncing properties',
  room_types: 'Syncing room configurations',
  photos: 'Importing photos',
  ari: 'Syncing 500 days of rates & availability',
  complete: 'Sync complete!',
  error: 'Sync encountered an error',
};

// ─── OAuth Modal ──────────────────────────────────────────────────────────────

function OAuthModal({ authUrl, onClose, onSuccess }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      // Listen for postMessage from the iframe on successful auth
      if (e.data?.type === 'oauth_success' || e.data?.channelsConnectAuth === 'success') {
        onSuccess();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">A</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Connect Your Airbnb Account</p>
              <p className="text-xs text-gray-500">Authorize Channels Connect to sync your listings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="relative">
          <iframe
            ref={iframeRef}
            src={authUrl}
            className="w-full"
            style={{ height: '480px', border: 'none' }}
            title="Connect Airbnb"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
          />
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t">
          <p className="text-xs text-center text-gray-500">
            Your Airbnb credentials are entered directly on Airbnb's servers.
            Channels Connect only receives read access to your listing data.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  const steps = ['Setup', 'Connect', 'Sync'];
  const stepIndex = { setup: 0, connect: 1, sync: 2, complete: 2 }[current] ?? 0;
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              i < stepIndex ? 'bg-green-500 text-white'
              : i === stepIndex ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === stepIndex ? 'text-blue-600' : 'text-gray-500'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded ${i < stepIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportListings() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState('loading'); // loading|setup|connect|sync|complete|error
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  // Setup form
  const [form, setForm] = useState({ title: '', city: '', country: 'US', currency: 'USD', address: '' });

  // OAuth modal
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');

  // Sync progress
  const [syncLogId, setSyncLogId] = useState(null);
  const [syncProgress, setSyncProgress] = useState({ phase: 'starting', done: 0, total: 0, taskIds: [], errors: [] });
  const pollRef = useRef(null);

  // ── Load user + status ──────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const me = await User.me();
      setUser(me);
      const t = await getAuthToken();
      setToken(t);

      if (!t) {
        setPageState('setup'); // Will be handled by NewLoginRequired
        return;
      }

      const res = await getConnectStatus(t);
      const s = res?.data;
      setStatus(s);

      if (!s?.hasProperty) {
        setForm((f) => ({ ...f, title: `${me?.full_name || me?.email?.split('@')[0] || 'My'}'s Property` }));
        setPageState('setup');
      } else if (!s?.hasChannel) {
        setPageState('connect');
      } else if (s?.syncStatus === 'active' || s?.syncStatus === 'pending') {
        setPageState('connect'); // Connected but not yet synced — show sync button
      } else {
        setPageState('complete');
        navigate(createPageUrl('Listings'));
      }
    } catch (err) {
      console.error('ImportListings: load failed', err);
      setPageState('setup');
    }
  }, [navigate]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Sync polling ────────────────────────────────────────────────────────

  const startPolling = useCallback((logId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await getSyncProgress(token, logId);
        const p = res?.data;
        if (p) setSyncProgress(p);
        if (p?.phase === 'complete') {
          clearInterval(pollRef.current);
          toast.success('Sync complete! Your listings are ready.');
          setTimeout(() => navigate(createPageUrl('Listings')), 1500);
        } else if (p?.phase === 'error') {
          clearInterval(pollRef.current);
          toast.error('Sync encountered an error. Some data may still have been imported.');
        }
      } catch (err) {
        console.warn('Sync poll error:', err);
      }
    }, 2000);
  }, [token, navigate]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Property name is required.'); return; }
    setIsWorking(true);
    try {
      await onboardProperty(token, form);
      toast.success('Property set up! Now connect your channel.');
      setPageState('connect');
    } catch (err) {
      toast.error(err.message || 'Setup failed. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleConnectAirbnb = async () => {
    setIsWorking(true);
    try {
      const res = await getOAuthLink(token, 'airbnb');
      const url = res?.data?.authUrl;
      if (!url) throw new Error('Could not generate connection link.');
      setAuthUrl(url);
      setShowOAuthModal(true);
    } catch (err) {
      toast.error(err.message || 'Failed to generate connection link.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleOAuthSuccess = () => {
    setShowOAuthModal(false);
    toast.success('Airbnb connected! Starting your sync now...');
    handleStartSync();
  };

  const handleStartSync = async () => {
    setIsWorking(true);
    setPageState('sync');
    try {
      const res = await startSync(token);
      const logId = res?.data?.syncLogId;
      if (!logId) throw new Error('Sync could not be started.');
      setSyncLogId(logId);
      startPolling(logId);
    } catch (err) {
      toast.error(err.message || 'Sync failed to start.');
      setPageState('connect');
    } finally {
      setIsWorking(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (pageState === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading your workspace...</p>
        </div>
      );
    }

    if (pageState === 'setup') {
      return (
        <Card className="max-w-lg mx-auto shadow-xl border-blue-100">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Home className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Property</CardTitle>
            <CardDescription>Tell us about your first property so we can connect it to booking channels.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <Label htmlFor="title">Property Name *</Label>
                <Input id="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Ocean View Villa" className="mt-1" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Miami" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="US" className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Ocean Drive" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="USD" className="mt-1" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" disabled={isWorking}>
                {isWorking ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <ArrowRight className="mr-2 w-4 h-4" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      );
    }

    if (pageState === 'connect') {
      return (
        <Card className="max-w-lg mx-auto shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Wifi className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Connect Your Airbnb</CardTitle>
            <CardDescription>
              Link your Airbnb account to start syncing listings, photos, and rates automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
              {[
                { icon: ImageIcon, text: 'All photos imported automatically' },
                { icon: BarChart2, text: '500 days of rates & availability synced' },
                { icon: Zap, text: 'Real-time booking notifications' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-rose-500 hover:bg-rose-600 h-11 text-white"
              onClick={handleConnectAirbnb}
              disabled={isWorking}
            >
              {isWorking ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
              Connect Airbnb Account
            </Button>

            {status?.hasChannel && (
              <Button variant="outline" className="w-full h-11" onClick={handleStartSync} disabled={isWorking}>
                <RefreshCw className="mr-2 w-4 h-4" />
                Already Connected — Sync Now
              </Button>
            )}

            <p className="text-xs text-center text-gray-400">
              Your Airbnb password is never seen by Channels Connect.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (pageState === 'sync') {
      const phaseLabel = PHASE_LABELS[syncProgress.phase] || 'Syncing...';
      const pct = syncProgress.total > 0
        ? Math.round((syncProgress.done / syncProgress.total) * 100)
        : (syncProgress.phase === 'complete' ? 100 : 30);

      return (
        <Card className="max-w-lg mx-auto shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              {syncProgress.phase === 'complete'
                ? <CheckCircle className="w-7 h-7 text-white" />
                : <Loader2 className="w-7 h-7 text-white animate-spin" />
              }
            </div>
            <CardTitle className="text-2xl">Syncing Your Properties</CardTitle>
            <CardDescription>This usually takes 1–3 minutes. You can leave this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">{phaseLabel}</span>
                <span className="text-gray-500">{pct}%</span>
              </div>
              <Progress value={pct} className="h-3" />
            </div>

            {syncProgress.total > 0 && (
              <p className="text-sm text-center text-gray-500">
                {syncProgress.done} of {syncProgress.total} properties processed
              </p>
            )}

            {syncProgress.phase === 'ari' && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <strong>Syncing 500 days</strong> of rates and availability...
              </div>
            )}

            {syncProgress.taskIds?.length > 0 && (
              <details className="text-xs text-gray-400 cursor-pointer">
                <summary>Sync details</summary>
                <p className="mt-1 font-mono break-all">
                  Task IDs: {syncProgress.taskIds.join(', ')}
                </p>
              </details>
            )}

            {syncProgress.errors?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700 font-medium">
                  {syncProgress.errors.length} item(s) had issues (non-critical)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <NewLoginRequired>
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Import Your Listings</h1>
            <p className="text-gray-500 mt-1">Connect your booking channels and sync everything automatically.</p>
          </div>

          {/* Step Indicator */}
          {pageState !== 'loading' && pageState !== 'complete' && (
            <StepIndicator current={pageState} />
          )}

          {/* Main content */}
          {renderContent()}
        </div>

        {/* OAuth Modal */}
        {showOAuthModal && authUrl && (
          <OAuthModal
            authUrl={authUrl}
            onClose={() => setShowOAuthModal(false)}
            onSuccess={handleOAuthSuccess}
          />
        )}
      </AppLayout>
    </NewLoginRequired>
  );
}

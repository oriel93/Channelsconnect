/**
 * ImportListings.jsx — Channels Connect onboarding state machine
 *
 * Strict three-state UI driven by GET /connect/status:
 *
 *   State A — hasProperty=false
 *     → "Step 1: Setup Your Property"
 *     → Shows ONLY the property form; no Connect or Sync buttons
 *
 *   State B — hasProperty=true, hasChannel=false
 *     → "Step 2: Connect Your Sales Channels"
 *     → Shows ONLY the "Connect Airbnb" button → branded modal → OAuth flow
 *     → Sync button is HIDDEN
 *
 *   State C — hasProperty=true, hasChannel=true
 *     → "Step 3: Import Your Listings"
 *     → Shows ONLY the "Sync All Properties" button with real-time progress
 *
 * No "Channex" branding anywhere — all external calls go through /connect/* API.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/app/AppLayout';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle, AlertCircle, Home,
  ArrowRight, Wifi, ImageIcon, BarChart2, Zap, X, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/apiClient';

// ─── Progress helpers ────────────────────────────────────────────────────────

const PHASE_COPY = {
  starting:   'Initialising sync…',
  properties: 'Importing your property details…',
  room_types: 'Configuring room types and capacity…',
  photos:     'Downloading high-resolution property photos…',
  ari:        'Importing 500 days of rates & availability…',
  complete:   'Sync complete!',
  error:      'Sync encountered an issue',
};

function phasePercent(phase, done, total) {
  if (phase === 'complete') return 100;
  const base = { starting: 5, properties: 20, room_types: 40, photos: 60, ari: 75 }[phase] ?? 5;
  return total > 0 ? Math.min(95, base + Math.round((done / total) * 20)) : base;
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepBar({ step }) {
  // step: 'setup' | 'connect' | 'sync' | 'syncing'
  const steps = [
    { id: 'setup',   label: 'Setup' },
    { id: 'connect', label: 'Connect' },
    { id: 'sync',    label: 'Import' },
  ];
  const active = steps.findIndex((s) => s.id === step || (step === 'syncing' && s.id === 'sync'));

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
              i < active  ? 'bg-green-500 text-white'
              : i === active ? 'bg-blue-600 text-white ring-4 ring-blue-100'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {i < active ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === active ? 'text-blue-700' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full ${i < active ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── OAuth Modal ─────────────────────────────────────────────────────────────

function OAuthModal({ authUrl, onClose, onSuccess }) {
  useEffect(() => {
    const handler = (e) => {
      if (
        e.data?.type === 'oauth_success' ||
        e.data?.channelsConnectAuth === 'success' ||
        (e.origin === 'https://api.channelsconnect.com' && e.data?.success)
      ) {
        onSuccess();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header — hard-coded "Connect Your Airbnb Account", Channels Connect logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png"
              alt="Channels Connect"
              className="w-8 h-8 object-contain rounded-lg border border-gray-100"
            />
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                Connect Your Airbnb Account
              </p>
              <p className="text-xs text-gray-500">
                Authorize Channels Connect to sync your listings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iframe — Channex OAuth page (user never sees "Channex") */}
        <iframe
          src={authUrl}
          className="w-full block"
          style={{ height: 460, border: 'none' }}
          title="Connect Airbnb"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        />

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t text-center space-y-1">
          <p className="text-xs text-gray-400">
            Your Airbnb password is entered directly on Airbnb's secure servers.
            Channels Connect never sees your credentials.
          </p>
          <button
            onClick={onSuccess}
            className="text-xs text-blue-600 hover:underline"
          >
            Already authorized? Click here to continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── State A: Property setup form ────────────────────────────────────────────

function SetupStep({ onComplete }) {
  const [form, setForm] = useState({
    title: '', city: '', country: 'US', currency: 'USD', address: '',
  });
  const [working, setWorking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Property name is required.'); return; }
    setWorking(true);
    try {
      await api.connect.onboard(form);
      toast.success('Property created! Now connect your booking channel.');
      onComplete();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Setup failed. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto shadow-xl border-blue-100">
      <CardHeader className="text-center pb-4">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Home className="w-7 h-7 text-white" />
        </div>
        <CardTitle className="text-2xl">Setup Your Property</CardTitle>
        <CardDescription>
          Tell us about your first property so we can connect it to booking channels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Property Name *</Label>
            <Input
              id="title" value={form.title} required className="mt-1"
              placeholder="e.g. Beachfront Villa"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} className="mt-1" placeholder="Miami"
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country} className="mt-1" placeholder="US"
                onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" value={form.address} className="mt-1" placeholder="123 Ocean Drive"
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={form.currency} className="mt-1" placeholder="USD" maxLength={3}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 h-11 mt-2 font-semibold"
            disabled={working}
          >
            {working
              ? <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              : <ArrowRight className="mr-2 w-4 h-4" />}
            Continue to Connect Your Channel
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── State B: Connect channel ─────────────────────────────────────────────────

function ConnectStep({ onConnected }) {
  const [working, setWorking] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const { data } = await api.connect.getOAuthLink('airbnb');
      const url = data?.authUrl || data?.data?.authUrl;
      if (!url) throw new Error('Could not generate a connection link. Please try again.');
      setOauthUrl(url);
      setShowModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start Airbnb connection.');
    } finally {
      setWorking(false);
    }
  };

  const handleOAuthSuccess = () => {
    setShowModal(false);
    toast.success('Airbnb connected! You can now sync your properties.');
    onConnected();
  };

  return (
    <>
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Connect Your Sales Channels</CardTitle>
          <CardDescription>
            Link your Airbnb account to start syncing listings, photos, and rates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Feature list */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {[
              { icon: Home,      text: 'Full property details imported automatically' },
              { icon: ImageIcon, text: 'All high-resolution photos synced' },
              { icon: BarChart2, text: '500 days of rates & availability imported' },
              { icon: Zap,       text: 'Real-time booking updates across all channels' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>

          {/* Primary CTA — the only button visible in State B */}
          <Button
            className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-base"
            onClick={handleConnect}
            disabled={working}
          >
            {working
              ? <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              : <span className="mr-2 text-lg">🏠</span>}
            Connect Airbnb Account
          </Button>

          <p className="text-xs text-center text-gray-400">
            Your Airbnb password is entered directly on Airbnb's secure servers.
            Channels Connect never sees your credentials.
          </p>
        </CardContent>
      </Card>

      {showModal && oauthUrl && (
        <OAuthModal
          authUrl={oauthUrl}
          onClose={() => setShowModal(false)}
          onSuccess={handleOAuthSuccess}
        />
      )}
    </>
  );
}

// ─── State C: Sync step ───────────────────────────────────────────────────────

function SyncStep({ onSyncComplete }) {
  const [phase, setPhase]         = useState('idle'); // idle | syncing | complete | error
  const [progress, setProgress]   = useState({ phase: 'starting', done: 0, total: 0, taskIds: [], errors: [] });
  const [syncLogId, setSyncLogId] = useState(null);
  const [working, setWorking]     = useState(false);
  const pollRef                   = useRef(null);

  const stopPolling = () => { if (pollRef.current) clearInterval(pollRef.current); };

  useEffect(() => () => stopPolling(), []);

  const startPolling = (logId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.connect.getSyncProgress(logId);
        const p = data?.data || data;
        if (p) setProgress(p);

        if (p?.phase === 'complete') {
          stopPolling();
          setPhase('complete');
          toast.success('Sync complete! Your listings are ready.');
          setTimeout(() => onSyncComplete?.(), 1500);
        } else if (p?.phase === 'error') {
          stopPolling();
          setPhase('error');
          toast.error('Sync had some issues. Partial data may be available.');
        }
      } catch { /* transient poll failure — keep going */ }
    }, 2000);
  };

  const handleSync = async () => {
    setWorking(true);
    setPhase('syncing');
    setProgress({ phase: 'starting', done: 0, total: 0, taskIds: [], errors: [] });
    try {
      const { data } = await api.connect.startSync();
      const logId = data?.data?.syncLogId || data?.syncLogId;
      if (!logId) throw new Error('Sync could not be started. Please try again.');
      setSyncLogId(logId);
      startPolling(logId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Sync failed to start.');
      setPhase('error');
    } finally {
      setWorking(false);
    }
  };

  const pct = phasePercent(progress.phase, progress.done, progress.total);
  const phaseLabel = PHASE_COPY[progress.phase] || 'Syncing…';
  const isSyncing = phase === 'syncing';
  const isComplete = phase === 'complete';

  return (
    <Card className="max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${
          isComplete ? 'bg-green-500' : isSyncing ? 'bg-blue-600' : 'bg-indigo-600'
        }`}>
          {isComplete
            ? <CheckCircle className="w-7 h-7 text-white" />
            : isSyncing
            ? <Loader2 className="w-7 h-7 text-white animate-spin" />
            : <RefreshCw className="w-7 h-7 text-white" />}
        </div>
        <div className="flex items-center justify-center gap-2">
          <CardTitle className="text-2xl">Import Your Listings</CardTitle>
          {/* Badge only shows after sync is confirmed — not prematurely */}
          {isComplete && (
            <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
              ✓ Complete
            </Badge>
          )}
        </div>
        <CardDescription>
          {isComplete
            ? 'All properties, photos, and rates have been imported.'
            : isSyncing
            ? 'Sync in progress. You can close this page — it runs in the background.'
            : 'Pull in all your properties, rates, and availability from your connected channel.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Only show sync button when NOT syncing */}
        {!isSyncing && !isComplete && (
          <Button
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base"
            onClick={handleSync}
            disabled={working}
          >
            <RefreshCw className="mr-2 w-5 h-5" />
            Sync All Properties
          </Button>
        )}

        {/* Progress UI — only when syncing or complete */}
        {(isSyncing || isComplete) && (
          <>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">{phaseLabel}</span>
                <span className="text-gray-400 tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="h-3" />
            </div>

            {progress.total > 0 && (
              <p className="text-sm text-center text-gray-500">
                {progress.done} of {progress.total} properties processed
              </p>
            )}

            {/* Phase-specific descriptive messages */}
            {progress.phase === 'photos' && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-sm text-purple-700">
                📸 Downloading high-resolution property photos…
              </div>
            )}
            {progress.phase === 'ari' && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                📅 Importing <strong>500 days</strong> of rates, availability &amp; minimum stays…
              </div>
            )}

            {/* Certification audit trail */}
            {progress.taskIds?.length > 0 && (
              <details className="text-xs text-gray-400 cursor-pointer select-none">
                <summary className="hover:text-gray-600">
                  Sync audit ({progress.taskIds.length} task{progress.taskIds.length !== 1 ? 's' : ''})
                </summary>
                <div className="mt-2 font-mono bg-gray-50 rounded p-2 break-all leading-5">
                  {progress.taskIds.map((id, i) => (
                    <div key={id}>Task {i + 1}: {id}</div>
                  ))}
                </div>
              </details>
            )}

            {progress.errors?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium">
                  {progress.errors.length} item(s) had minor issues and will retry automatically.
                </p>
              </div>
            )}
          </>
        )}

        {phase === 'error' && !isSyncing && (
          <Button variant="outline" className="w-full" onClick={handleSync}>
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry Sync
          </Button>
        )}

        {/* Certification note — always visible in State C */}
        {!isSyncing && !isComplete && (
          <p className="text-xs text-center text-gray-400">
            Properties, rates, and availability will be imported automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportListings() {
  const navigate = useNavigate();
  const [uiState, setUiState] = useState('loading'); // loading | setup | connect | sync | error
  const [errorMsg, setErrorMsg] = useState('');

  const checkStatus = useCallback(async () => {
    setUiState('loading');
    try {
      const { data } = await api.connect.getStatus();
      const s = data?.data || data;

      if (!s?.hasProperty) {
        setUiState('setup');
      } else if (!s?.hasChannel) {
        setUiState('connect');
      } else {
        setUiState('sync');
      }
    } catch (err) {
      // Backend unreachable or user has no property yet — start at setup
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        // Not authenticated — NewLoginRequired will handle it
        setUiState('setup');
      } else {
        // API error — assume fresh start
        setUiState('setup');
      }
    }
  }, []);

  useEffect(() => {
    document.title = 'Import Listings | Channels Connect';
    checkStatus();
  }, [checkStatus]);

  const step = { setup: 'setup', connect: 'connect', sync: 'sync', syncing: 'sync' }[uiState] ?? 'setup';

  const renderContent = () => {
    switch (uiState) {
      case 'loading':
        return (
          <div className="flex items-center justify-center h-64 gap-4 flex-col">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-gray-500">Checking your connection status…</p>
          </div>
        );

      case 'setup':
        return (
          <SetupStep
            onComplete={() => setUiState('connect')}
          />
        );

      case 'connect':
        return (
          <ConnectStep
            onConnected={() => setUiState('sync')}
          />
        );

      case 'sync':
        return (
          <SyncStep
            onSyncComplete={() => navigate('/Listings')}
          />
        );

      case 'error':
        return (
          <div className="max-w-lg mx-auto">
            <Card className="border-red-200">
              <CardContent className="pt-6 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-gray-700">{errorMsg || 'Something went wrong. Please try again.'}</p>
                <Button onClick={checkStatus}>Retry</Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <NewLoginRequired>
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Import Your Listings</h1>
            <p className="text-gray-500 mt-1">
              Connect your booking channels and sync properties, photos, and rates — automatically.
            </p>
          </div>

          {uiState !== 'loading' && <StepBar step={step} />}

          {renderContent()}
        </div>
      </AppLayout>
    </NewLoginRequired>
  );
}

/**
 * ImportListings.jsx — Channels Connect onboarding state machine
 *
 * States:
 *   loading  → checking auth + API connection status
 *   setup    → Step 1: Property name/city form → POST /connect/onboard
 *   connect  → Step 2: "Connect Airbnb" → branded OAuth modal (no Channex visible)
 *   syncing  → Step 3: Deep sync running (real-time progress bar with descriptive text)
 *   complete → redirect to /Listings
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/app/AppLayout';
import NewLoginRequired from '@/components/auth/NewLoginRequired';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle, Home, RefreshCw,
  ArrowRight, Zap, ImageIcon, BarChart2, X, Wifi,
} from 'lucide-react';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import {
  getConnectStatus,
  onboardProperty,
  getOAuthLink,
  startSync,
  getSyncProgress,
} from '@/api/connectApi';

// ─── Descriptive progress text ────────────────────────────────────────────────

const PHASE_COPY = {
  starting:    { label: 'Initialising sync...',                         icon: Loader2 },
  properties:  { label: 'Importing your property details...',           icon: Home },
  room_types:  { label: 'Configuring room types and capacity...',       icon: Home },
  photos:      { label: 'Downloading property photos...',               icon: ImageIcon },
  ari:         { label: 'Importing 500 days of rates & availability...', icon: BarChart2 },
  complete:    { label: 'Sync complete!',                               icon: CheckCircle },
  error:       { label: 'Sync encountered an issue',                    icon: Zap },
};

function phaseProgress(phase, done, total) {
  if (phase === 'complete') return 100;
  if (phase === 'error') return 100;
  const baseMap = { starting: 5, properties: 15, room_types: 35, photos: 55, ari: 75 };
  const base = baseMap[phase] ?? 5;
  if (total > 0) return Math.min(95, base + Math.round((done / total) * 20));
  return base;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }) {
  const steps = [
    { id: 'setup',   label: 'Setup' },
    { id: 'connect', label: 'Connect' },
    { id: 'syncing', label: 'Sync' },
  ];
  const idx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < idx  ? 'bg-green-500 text-white'
              : i === idx ? 'bg-blue-600 text-white ring-4 ring-blue-100'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {i < idx ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === idx ? 'text-blue-700' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all ${i < idx ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── OAuth modal ──────────────────────────────────────────────────────────────

function OAuthModal({ authUrl, channelName, onClose, onSuccess }) {
  useEffect(() => {
    const handler = (e) => {
      if (
        e.data?.type === 'oauth_success' ||
        e.data?.channelsConnectAuth === 'success' ||
        e.origin === 'https://api.channelsconnect.com'
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-lg font-bold">A</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Connect {channelName}</p>
              <p className="text-xs text-gray-500">Authorize Channels Connect to sync your listings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iframe */}
        <iframe
          src={authUrl}
          className="w-full"
          style={{ height: 460, border: 'none', display: 'block' }}
          title={`Connect ${channelName}`}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        />

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t text-center">
          <p className="text-xs text-gray-400">
            Your {channelName} password is entered directly on {channelName}'s servers.
            Channels Connect only receives read access to sync your listing data.
          </p>
          <button
            onClick={onSuccess}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Already authorized? Click here →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportListings() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading');
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState({ title: '', city: '', country: 'US', currency: 'USD', address: '' });
  const [oauthUrl, setOauthUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [syncLogId, setSyncLogId] = useState(null);
  const [progress, setProgress] = useState({ phase: 'starting', done: 0, total: 0, taskIds: [], errors: [] });
  const pollRef = useRef(null);

  // ── Load status ─────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const me = await User.me();
      if (!me) { setState('setup'); return; }

      // Pre-fill form with user name
      const firstName = me.full_name?.split(' ')[0] || me.email?.split('@')[0] || 'My';
      setForm((f) => ({ ...f, title: `${firstName}'s Property` }));

      try {
        const res = await getConnectStatus();
        const s = res?.data;

        if (!s?.hasProperty) {
          setState('setup');
        } else if (!s?.hasChannel) {
          setState('connect');
        } else if (s?.syncStatus === 'active' || s?.syncStatus === 'pending') {
          setState('connect'); // Connected, but not yet synced
        } else {
          navigate(createPageUrl('Listings'));
        }
      } catch {
        // Backend unreachable or not yet set up — start at setup
        setState('setup');
      }
    } catch {
      setState('setup');
    }
  }, [navigate]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Sync polling ─────────────────────────────────────────────────────────

  const startPolling = useCallback((logId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await getSyncProgress(logId);
        const p = res?.data;
        if (p) setProgress(p);
        if (p?.phase === 'complete') {
          clearInterval(pollRef.current);
          toast.success('Sync complete! Your listings are ready.');
          setTimeout(() => navigate(createPageUrl('Listings')), 1500);
        } else if (p?.phase === 'error') {
          clearInterval(pollRef.current);
          toast.error('Sync had some issues. Partial data may be available in My Listings.');
          setTimeout(() => navigate(createPageUrl('Listings')), 3000);
        }
      } catch { /* polling can fail transiently */ }
    }, 2000);
  }, [navigate]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Property name is required.'); return; }
    setWorking(true);
    try {
      await onboardProperty(form);
      toast.success('Property created! Now connect your channel.');
      setState('connect');
    } catch (err) {
      toast.error(err.message || 'Setup failed. Please try again.');
    } finally { setWorking(false); }
  };

  const handleConnectAirbnb = async () => {
    setWorking(true);
    try {
      const res = await getOAuthLink('airbnb');
      const url = res?.data?.authUrl;
      if (!url) throw new Error('Could not generate a connection link. Please try again.');
      setOauthUrl(url);
      setShowModal(true);
    } catch (err) {
      toast.error(err.message || 'Failed to start Airbnb connection.');
    } finally { setWorking(false); }
  };

  const handleOAuthSuccess = () => {
    setShowModal(false);
    toast.success('Channel connected! Starting your sync...');
    handleStartSync();
  };

  const handleStartSync = async () => {
    setWorking(true);
    setState('syncing');
    setProgress({ phase: 'starting', done: 0, total: 0, taskIds: [], errors: [] });
    try {
      const res = await startSync();
      const logId = res?.data?.syncLogId;
      if (!logId) throw new Error('Sync could not be started. Please try again.');
      setSyncLogId(logId);
      startPolling(logId);
    } catch (err) {
      toast.error(err.message);
      setState('connect');
    } finally { setWorking(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <NewLoginRequired>
        <AppLayout>
          <div className="flex items-center justify-center h-64 gap-4 flex-col">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-gray-500">Loading your workspace...</p>
          </div>
        </AppLayout>
      </NewLoginRequired>
    );
  }

  const renderStep = () => {
    // ── Step 1: Setup ────────────────────────────────────────────────────
    if (state === 'setup') {
      return (
        <Card className="max-w-lg mx-auto shadow-xl border-blue-100">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Home className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Property</CardTitle>
            <CardDescription>
              Tell us about your first property so we can connect it to booking channels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <Label htmlFor="title">Property Name *</Label>
                <Input
                  id="title" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Beachfront Villa" className="mt-1" required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Miami" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="US" className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Ocean Drive" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    placeholder="USD" className="mt-1" maxLength={3} />
                </div>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 mt-2" disabled={working}>
                {working
                  ? <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  : <ArrowRight className="mr-2 w-4 h-4" />}
                Continue to Channel Connection
              </Button>
            </form>
          </CardContent>
        </Card>
      );
    }

    // ── Step 2: Connect channel ──────────────────────────────────────────
    if (state === 'connect') {
      return (
        <Card className="max-w-lg mx-auto shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Wifi className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Connect Your Airbnb Account</CardTitle>
            <CardDescription>
              We'll import your listings, photos, and pricing — automatically, in one click.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Benefits */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {[
                { icon: Home,       text: 'Full property details imported automatically' },
                { icon: ImageIcon,  text: 'All high-resolution photos synced' },
                { icon: BarChart2,  text: '500 days of rates & availability imported' },
                { icon: Zap,        text: 'Real-time booking updates across all channels' },
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
              className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-base"
              onClick={handleConnectAirbnb}
              disabled={working}
            >
              {working
                ? <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                : <span className="mr-2 text-lg">🏠</span>}
              Connect Airbnb Account
            </Button>

            {/* Already connected — just sync */}
            <div className="text-center">
              <button
                onClick={handleStartSync}
                disabled={working}
                className="text-sm text-gray-500 hover:text-blue-600 underline underline-offset-2 transition-colors"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Already connected? Sync now
              </button>
            </div>

            <p className="text-xs text-center text-gray-400">
              Your Airbnb credentials are entered directly on Airbnb's secure servers.
              Channels Connect never sees your password.
            </p>
          </CardContent>
        </Card>
      );
    }

    // ── Step 3: Syncing ──────────────────────────────────────────────────
    if (state === 'syncing') {
      const { phase, done, total, taskIds = [], errors = [] } = progress;
      const phaseCopy = PHASE_COPY[phase] || PHASE_COPY.starting;
      const PIcon = phaseCopy.icon;
      const pct = phaseProgress(phase, done, total);
      const isComplete = phase === 'complete';

      return (
        <Card className="max-w-lg mx-auto shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${
              isComplete ? 'bg-green-500' : 'bg-blue-600'
            }`}>
              <PIcon className={`w-7 h-7 text-white ${!isComplete && phase !== 'complete' ? 'animate-pulse' : ''}`} />
            </div>
            <CardTitle className="text-2xl">
              {isComplete ? 'Sync Complete!' : 'Syncing Your Properties'}
            </CardTitle>
            <CardDescription>
              {isComplete
                ? 'Your listings are ready. Redirecting...'
                : 'This usually takes 1–3 minutes. You can close this page.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">{phaseCopy.label}</span>
                <span className="text-gray-400 tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="h-3" />
            </div>

            {/* Count */}
            {total > 0 && (
              <p className="text-sm text-center text-gray-500">
                {done} of {total} {phase === 'ari' ? 'properties with 500-day ARI' : 'properties'} processed
              </p>
            )}

            {/* Phase-specific messages */}
            {phase === 'photos' && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-sm text-purple-700">
                📸 Downloading high-resolution property photos...
              </div>
            )}
            {phase === 'ari' && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                📅 Importing <strong>500 days</strong> of rates, availability, and minimum stays...
              </div>
            )}

            {/* Audit trail */}
            {taskIds.length > 0 && (
              <details className="text-xs text-gray-400 cursor-pointer select-none">
                <summary className="hover:text-gray-600">
                  Sync audit trail ({taskIds.length} task{taskIds.length !== 1 ? 's' : ''} completed)
                </summary>
                <div className="mt-2 font-mono bg-gray-50 rounded p-2 break-all leading-5">
                  {taskIds.map((id, i) => <div key={id}>Task {i + 1}: {id}</div>)}
                </div>
              </details>
            )}

            {/* Non-critical errors */}
            {errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium">
                  {errors.length} item(s) had minor issues and will be retried automatically.
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Connect Your Channels</h1>
            <p className="text-gray-500 mt-1">
              Import listings, photos, and rates from your booking channels — automatically.
            </p>
          </div>

          {state !== 'loading' && <Steps current={state} />}

          {renderStep()}
        </div>

        {/* Branded OAuth modal */}
        {showModal && oauthUrl && (
          <OAuthModal
            authUrl={oauthUrl}
            channelName="Airbnb"
            onClose={() => setShowModal(false)}
            onSuccess={handleOAuthSuccess}
          />
        )}
      </AppLayout>
    </NewLoginRequired>
  );
}

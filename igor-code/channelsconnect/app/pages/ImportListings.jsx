/**
 * ImportListings.jsx — Channels Connect onboarding state machine
 *
 * FLOW:
 *   auth-check → if not signed in → show inline sign-up/login
 *   → State A: Setup property form (with Google Places autocomplete)
 *   → State B: Connect Airbnb (OAuth modal)
 *   → State C: Sync All Properties (progress bar)
 *   → redirect to /Listings
 *
 * /connect/onboard and /connect/status are Public endpoints — work without auth.
 * Sign-up is embedded inline so the user never leaves the page mid-flow.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/app/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle, Home,
  ArrowRight, Wifi, ImageIcon, BarChart2, Zap, X, RefreshCw,
  Lock, Mail,
} from 'lucide-react';
import { authHelpers, supabase } from '@/lib/supabase';
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

// ─── Step bar ────────────────────────────────────────────────────────────────

function StepBar({ step }) {
  const steps = [{ id: 'setup', label: 'Setup' }, { id: 'connect', label: 'Connect' }, { id: 'sync', label: 'Import' }];
  const active = steps.findIndex((s) => s.id === step || (step === 'syncing' && s.id === 'sync'));
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
              i < active ? 'bg-green-500 text-white' : i === active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < active ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === active ? 'text-blue-700' : 'text-gray-400'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < active ? 'bg-green-400' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Inline Auth Card ────────────────────────────────────────────────────────

function AuthCard({ onAuthenticated }) {
  const [mode, setMode] = useState('signup'); // signup | login
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await authHelpers.signUp(form.email, form.password, { full_name: form.fullName });
        if (err) throw err;
        if (data?.user) {
          toast.success('Account created! Continuing setup…');
          onAuthenticated(data.user);
        }
      } else {
        const { data, error: err } = await authHelpers.signIn(form.email, form.password);
        if (err) throw err;
        if (data?.user) {
          toast.success('Signed in! Continuing setup…');
          onAuthenticated(data.user);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error: err } = await authHelpers.signInWithGoogle(`${window.location.origin}/ImportListings`);
      if (err) throw err;
      // Google OAuth redirects — user will come back with session
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto shadow-xl border-blue-100">
      <CardHeader className="text-center pb-4">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <CardTitle className="text-xl">{mode === 'signup' ? 'Create your free account' : 'Sign in to continue'}</CardTitle>
        <CardDescription>Quick setup — takes under a minute</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={form.fullName} className="mt-1" placeholder="Jane Smith" required
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input id="email" type="email" value={form.email} className="pl-10" placeholder="you@example.com" required
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password {mode === 'signup' && <span className="text-gray-400 font-normal">(min 6 chars)</span>}</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input id="password" type="password" value={form.password} className="pl-10" placeholder="••••••••" required minLength={6}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" disabled={loading}>
            {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
            {mode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or</span></div>
        </div>

        <Button variant="outline" className="w-full h-10" onClick={handleGoogle} disabled={loading}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <p className="text-xs text-center text-gray-400">
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button className="text-blue-600 hover:underline" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
            {mode === 'signup' ? 'Sign in' : 'Sign up for free'}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Address Autocomplete ────────────────────────────────────────────────────

function AddressInput({ value, onChange }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load Google Places API
    if (window.google?.maps?.places) { setLoaded(true); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.onload = () => setLoaded(true); return; }

    const script = document.createElement('script');
    // Using a free no-key endpoint for Places (basic autocomplete only)
    // Replace GOOGLE_PLACES_KEY with your key for production
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY || '';
    if (apiKey) {
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = () => setLoaded(true);
      document.head.appendChild(script);
    }
    // If no API key, the input still works manually
  }, []);

  useEffect(() => {
    if (!loaded || !inputRef.current || !window.google?.maps?.places) return;
    if (autocompleteRef.current) return; // already initialised

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'address_components', 'geometry'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place?.address_components) return;

      const get = (type) =>
        place.address_components.find((c) => c.types.includes(type))?.long_name || '';
      const getShort = (type) =>
        place.address_components.find((c) => c.types.includes(type))?.short_name || '';

      onChange({
        address: place.formatted_address || inputRef.current.value,
        city: get('locality') || get('sublocality') || get('postal_town'),
        country: getShort('country'),
        zipCode: get('postal_code'),
      });
    });
  }, [loaded, onChange]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange({ address: e.target.value })}
      placeholder="Start typing your address…"
      className="mt-1"
      autoComplete="off"
    />
  );
}

// ─── State A: Property Setup ─────────────────────────────────────────────────

function SetupStep({ user, onComplete }) {
  const [form, setForm] = useState({
    title: `${user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'My'}'s Property`,
    city: '', country: 'US', currency: 'USD', address: '', zipCode: '',
  });
  const [working, setWorking] = useState(false);

  const handleAddressChange = useCallback((fields) => {
    setForm((f) => ({
      ...f,
      address: fields.address ?? f.address,
      city: fields.city ?? f.city,
      country: fields.country ?? f.country,
      zipCode: fields.zipCode ?? f.zipCode,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Property name is required.'); return; }
    setWorking(true);
    try {
      await api.connect.onboard({ ...form, email: user?.email || '', userId: user?.id || '' });
      toast.success('Property created! Now connect your channel.');
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
        <CardDescription>Tell us about your first property to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Property Name *</Label>
            <Input id="title" value={form.title} required className="mt-1" placeholder="e.g. Beachfront Villa"
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <Label htmlFor="address">
              Street Address
              <span className="ml-2 text-xs text-blue-600 font-normal">✨ Auto-fill from address</span>
            </Label>
            <AddressInput value={form.address} onChange={handleAddressChange} />
            <p className="text-xs text-gray-400 mt-1">Start typing — city and country fill automatically</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} className="mt-1" placeholder="Miami"
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country} className="mt-1" placeholder="US" maxLength={2}
                onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={form.currency} className="mt-1" placeholder="USD" maxLength={3}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 mt-2 font-semibold" disabled={working}>
            {working ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <ArrowRight className="mr-2 w-4 h-4" />}
            Continue to Connect Your Channel
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── OAuth Modal ─────────────────────────────────────────────────────────────

function OAuthModal({ authUrl, onClose, onSuccess }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'oauth_success' || e.data?.channelsConnectAuth === 'success' ||
          (e.origin === 'https://api.channelsconnect.com' && e.data?.success)) {
        onSuccess();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png"
              alt="Channels Connect" className="w-8 h-8 object-contain rounded-lg border border-gray-100" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Connect Your Airbnb Account</p>
              <p className="text-xs text-gray-500">Authorize Channels Connect to sync your listings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <iframe src={authUrl} className="w-full block" style={{ height: 460, border: 'none' }}
          title="Connect Airbnb" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation" />
        <div className="px-5 py-3 bg-gray-50 border-t text-center space-y-1">
          <p className="text-xs text-gray-400">Your Airbnb password is entered directly on Airbnb's secure servers. Channels Connect never sees your credentials.</p>
          <button onClick={onSuccess} className="text-xs text-blue-600 hover:underline">Already authorized? Click here to continue →</button>
        </div>
      </div>
    </div>
  );
}

// ─── State B: Connect Channel ─────────────────────────────────────────────────

function ConnectStep({ onConnected }) {
  const [working, setWorking] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const { data } = await api.connect.getOAuthLink('airbnb');
      const url = data?.data?.authUrl || data?.authUrl;
      if (!url) throw new Error('Could not generate connection link. Please try again.');
      setOauthUrl(url);
      setShowModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start Airbnb connection.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Connect Your Sales Channels</CardTitle>
          <CardDescription>Link your Airbnb account to start syncing listings, photos, and rates automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {[
              { icon: Home, text: 'Full property details imported automatically' },
              { icon: ImageIcon, text: 'All high-resolution photos synced' },
              { icon: BarChart2, text: '500 days of rates & availability imported' },
              { icon: Zap, text: 'Real-time booking updates across all channels' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>

          <Button className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-base"
            onClick={handleConnect} disabled={working}>
            {working ? <Loader2 className="mr-2 w-5 h-5 animate-spin" /> : <span className="mr-2 text-lg">🏠</span>}
            Connect Airbnb Account
          </Button>

          <button onClick={onConnected} className="w-full text-sm text-gray-400 hover:text-blue-600 underline underline-offset-2 transition-colors text-center block">
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Already connected? Skip to sync
          </button>

          <p className="text-xs text-center text-gray-400">Your Airbnb password is entered directly on Airbnb's secure servers. Channels Connect never sees your credentials.</p>
        </CardContent>
      </Card>
      {showModal && oauthUrl && (
        <OAuthModal authUrl={oauthUrl} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); toast.success('Connected! Starting sync…'); onConnected(); }} />
      )}
    </>
  );
}

// ─── State C: Sync ────────────────────────────────────────────────────────────

function SyncStep({ onSyncComplete }) {
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState({ phase: 'starting', done: 0, total: 0, taskIds: [], errors: [] });
  const [working, setWorking] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startPolling = (logId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.connect.getSyncProgress(logId);
        const p = data?.data || data;
        if (p) setProgress(p);
        if (p?.phase === 'complete') { clearInterval(pollRef.current); setPhase('complete'); toast.success('Sync complete! Your listings are ready.'); setTimeout(() => onSyncComplete?.(), 1500); }
        else if (p?.phase === 'error') { clearInterval(pollRef.current); setPhase('error'); toast.error('Sync had some issues. Partial data may be available.'); }
      } catch { /* transient */ }
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
      startPolling(logId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Sync failed to start.');
      setPhase('error');
    } finally {
      setWorking(false);
    }
  };

  const pct = phasePercent(progress.phase, progress.done, progress.total);
  const isSyncing = phase === 'syncing';
  const isComplete = phase === 'complete';

  return (
    <Card className="max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${isComplete ? 'bg-green-500' : isSyncing ? 'bg-blue-600' : 'bg-indigo-600'}`}>
          {isComplete ? <CheckCircle className="w-7 h-7 text-white" /> : isSyncing ? <Loader2 className="w-7 h-7 text-white animate-spin" /> : <RefreshCw className="w-7 h-7 text-white" />}
        </div>
        <CardTitle className="text-2xl">Import Your Listings</CardTitle>
        <CardDescription>{isComplete ? 'All properties, photos, and rates imported.' : isSyncing ? 'Sync in progress — you can close this page.' : 'Pull all your properties, rates, and photos from your connected channel.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isSyncing && !isComplete && (
          <Button className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base" onClick={handleSync} disabled={working}>
            <RefreshCw className="mr-2 w-5 h-5" /> Sync All Properties
          </Button>
        )}

        {(isSyncing || isComplete) && (
          <>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">{PHASE_COPY[progress.phase] || 'Syncing…'}</span>
                <span className="text-gray-400 tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="h-3" />
            </div>
            {progress.total > 0 && <p className="text-sm text-center text-gray-500">{progress.done} of {progress.total} properties processed</p>}
            {progress.phase === 'photos' && <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-sm text-purple-700">📸 Downloading high-resolution property photos…</div>}
            {progress.phase === 'ari' && <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">📅 Importing <strong>500 days</strong> of rates, availability &amp; minimum stays…</div>}
            {progress.taskIds?.length > 0 && (
              <details className="text-xs text-gray-400 cursor-pointer select-none">
                <summary className="hover:text-gray-600">Sync audit ({progress.taskIds.length} tasks)</summary>
                <div className="mt-2 font-mono bg-gray-50 rounded p-2 break-all leading-5">
                  {progress.taskIds.map((id, i) => <div key={id}>Task {i + 1}: {id}</div>)}
                </div>
              </details>
            )}
          </>
        )}

        {phase === 'error' && <Button variant="outline" className="w-full" onClick={handleSync}><RefreshCw className="mr-2 w-4 h-4" />Retry Sync</Button>}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportListings() {
  const navigate = useNavigate();
  const [uiState, setUiState] = useState('loading'); // loading|auth|setup|connect|sync
  const [user, setUser] = useState(null);

  const proceed = useCallback(async (currentUser) => {
    try {
      const { data } = await api.connect.getStatus();
      const s = data?.data || data;
      if (!s?.hasProperty) setUiState('setup');
      else if (!s?.hasChannel) setUiState('connect');
      else setUiState('sync');
    } catch {
      setUiState('setup');
    }
  }, []);

  useEffect(() => {
    document.title = 'Import Listings | Channels Connect';

    const init = async () => {
      // Check for existing Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await proceed(session.user);
      } else {
        setUiState('auth');
      }
    };

    init();

    // Listen for auth state changes (e.g. Google OAuth redirect back)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await proceed(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [proceed]);

  const step = { auth: 'setup', setup: 'setup', connect: 'connect', sync: 'sync', syncing: 'sync' }[uiState] ?? 'setup';

  const renderContent = () => {
    switch (uiState) {
      case 'loading':
        return (
          <div className="flex items-center justify-center h-64 gap-4 flex-col">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-gray-500">Checking your account…</p>
          </div>
        );
      case 'auth':
        return <AuthCard onAuthenticated={async (u) => { setUser(u); await proceed(u); }} />;
      case 'setup':
        return <SetupStep user={user} onComplete={() => setUiState('connect')} />;
      case 'connect':
        return <ConnectStep onConnected={() => setUiState('sync')} />;
      case 'sync':
        return <SyncStep onSyncComplete={() => navigate('/Listings')} />;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Your Listings</h1>
          <p className="text-gray-500 mt-1">Connect your booking channels and sync properties, photos, and rates — automatically.</p>
        </div>
        {uiState !== 'loading' && uiState !== 'auth' && <StepBar step={step} />}
        {renderContent()}
      </div>
    </AppLayout>
  );
}

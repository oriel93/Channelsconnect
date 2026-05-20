/**
 * PropertyIngestionHub.jsx — 4-Tier "Concierge" Property Onboarding
 *
 * Tier 1: Import via OTA URL (Airbnb / VRBO)
 * Tier 2: Import via Excel bulk upload
 * Tier 3: Import from Website (consent gateway)
 * Tier 4: Create Manually (form + Google Places + iCal connections)
 *
 * Auth: All API calls go through the axios interceptor in apiClient.js which
 * injects `Authorization: Bearer <token>` on every request. The Excel template
 * download uses an explicit supabase.auth.getSession() + fetch() so the browser
 * download also carries the token (window.open() would bypass the interceptor).
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Link2, FileSpreadsheet, Globe, PlusCircle,
  Upload, Download, CheckCircle2, Loader2, ExternalLink,
  CalendarDays, Trash2, Copy, AlertCircle,
  Sparkles, ArrowRight, X, Wifi,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';

// ─── Pre-flight: ensure DB user row exists ────────────────────────────────────
// GET /users/me now auto-creates the row if missing (ensureUserExists on backend).
// Call before any listing mutation so the FK constraint never fires.
async function ensureProfileExists() {
  try {
    await api.users.me();
  } catch (err) {
    // 401 = session expired, let the call below fail naturally
    // Any other error — log and continue (don't block the submission)
    if (err?.response?.status !== 401) {
      console.warn('[PropertyIngestionHub] ensureProfileExists soft error:', err?.message);
    }
  }
}

// ─── Tier cards config ────────────────────────────────────────────────────────

const TIERS = [
  {
    id:    'airbnb',
    icon:  Link2,
    color: 'blue',
    label: 'Connect Airbnb',
    sub:   'Link your Airbnb account',
    desc:  'Connect your Airbnb account and we\'ll import your listing details, photos, and rooms automatically.',
    badge: 'Fastest',
  },
  {
    id:    'excel',
    icon:  FileSpreadsheet,
    color: 'purple',
    label: 'Import via Excel',
    sub:   'Bulk upload — up to 200 properties',
    desc:  'Download our template, fill in your property details, and upload. Our team handles the rest.',
    badge: 'Best for bulk',
  },
  {
    id:    'website',
    icon:  Globe,
    color: 'violet',
    label: 'Import from Website',
    sub:   'Your own property website',
    desc:  'Give us your website URL. Our team extracts and sets up your listing for you.',
    badge: 'White-glove',
  },
  {
    id:    'manual',
    icon:  PlusCircle,
    color: 'indigo',
    label: 'Create Manually',
    sub:   'Build your listing step by step',
    desc:  'Enter your property details manually with address autocomplete and calendar connections.',
    badge: 'Full control',
  },
];

const colorMap = {
  blue:   { ring: 'focus:ring-blue-500',   icon: 'text-blue-600',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700 border-blue-200',   border: 'border-blue-400',   hoverBorder: 'hover:border-blue-400' },
  purple: { ring: 'focus:ring-purple-500', icon: 'text-purple-600', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700 border-purple-200', border: 'border-purple-400', hoverBorder: 'hover:border-purple-400' },
  violet: { ring: 'focus:ring-violet-500', icon: 'text-violet-600', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700 border-violet-200', border: 'border-violet-400', hoverBorder: 'hover:border-violet-400' },
  indigo: { ring: 'focus:ring-indigo-500', icon: 'text-indigo-600', bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', border: 'border-indigo-400', hoverBorder: 'hover:border-indigo-400' },
};

// ─── Shared success overlay ───────────────────────────────────────────────────

function SuccessOverlay({ title, message, onClose, onViewListings }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="overflow-y-auto flex-1 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
          <Button onClick={onViewListings} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md">
            View My Listings
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tier 1: Airbnb Connect (iFrame OAuth flow) ───────────────────────────────
//
// Flow:
//   1. User clicks "Connect My Airbnb"
//   2. Backend: POST /connect/airbnb/init
//      → creates blank Channex property + pending listing
//      → generates one_time_token
//      → returns iframeUrl (headless, ABB-only, no Channex branding)
//   3. Frontend: renders the iFrame in a modal
//   4. User completes Airbnb OAuth inside the iFrame
//   5. On iFrame load event / postMessage → backend harvest called
//      POST /connect/airbnb/harvest → reads real listing data back from Channex
//   6. DB updated with real Airbnb title/rooms/photos → pending_admin_review
//   7. Success overlay shown to user

function AirbnbConnectForm({ onSuccess }) {
  const [phase, setPhase]     = useState('idle'); // idle | loading | iframe | harvesting | done
  const [iframeUrl, setIframeUrl]           = useState('');
  const [listingId, setListingId]           = useState(null);
  const [channexPropertyId, setChannexPropertyId] = useState(null);
  const iframeRef = useRef(null);

  // Listen for postMessage from the Channex iFrame (headless mode sends window.parent.postMessage)
  const handleMessage = useCallback(async (event) => {
    // Accept messages from Channex domains
    const trusted = ['channex.io', 'app.channex.io', 'staging.channex.io'];
    const fromTrusted = trusted.some(d => event.origin.includes(d));
    if (!fromTrusted) return;

    // Channex headless mode sends { type: 'channel_connected' } or similar
    const isConnected =
      event.data?.type === 'channel_connected' ||
      event.data?.type === 'oauth_success' ||
      event.data?.connected === true;

    if (isConnected && listingId && channexPropertyId) {
      await runHarvest();
    }
  }, [listingId, channexPropertyId]); // eslint-disable-line

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleInit = async () => {
    setPhase('loading');
    try {
      await ensureProfileExists();
      const res = await api.connect.airbnbInit();
      const { iframeUrl: url, listingId: lid, channexPropertyId: pid } = res.data?.data || res.data || {};
      if (!url) throw new Error('Could not generate connection link. Please try again.');
      setIframeUrl(url);
      setListingId(lid);
      setChannexPropertyId(pid);
      setPhase('iframe');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Connection failed — please try again';
      toast.error(msg);
      setPhase('idle');
    }
  };

  const runHarvest = async () => {
    if (!listingId || !channexPropertyId) return;
    setPhase('harvesting');

    // Multi-listing import: the Channex webhook (activate_channel) does the
    // actual harvest server-side. We poll /connect/airbnb/status to detect
    // when at least one listing has been populated, then advance the wizard.
    // Falls back to the legacy one-shot harvest if status stays empty for
    // more than the timeout (means webhook didn't fire — single-listing case).
    const POLL_INTERVAL_MS = 2500;
    const MAX_POLLS = 40;          // 100s total before we fall back
    let polls = 0;
    let importedListings = [];

    try {
      while (polls < MAX_POLLS) {
        polls += 1;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const res = await api.connect.airbnbStatus(channexPropertyId);
          const data = res.data?.data || res.data || {};
          const status = data.status || res.data?.status;
          if (status === 'ready') {
            importedListings = res.data?.listings || data.listings || [];
            break;
          }
          if (status === 'failed') {
            throw new Error('Connection failed — please try again or contact support.');
          }
          // 'waiting' or 'harvesting' — keep polling
        } catch (pollErr) {
          // Transient — keep polling unless we've burned through MAX_POLLS
          if (polls === MAX_POLLS) throw pollErr;
        }
      }

      if (importedListings.length === 0) {
        // Fallback: webhook never fired (could be a single-listing OAuth where
        // Channex skipped the activate_channel event). Try the one-shot harvest
        // so we don't leave the user staring at a spinner forever.
        try {
          const fallback = await api.connect.airbnbHarvest(listingId, channexPropertyId);
          const fbData = fallback.data?.data || fallback.data || {};
          importedListings = [{ id: listingId, title: fbData.title || 'Airbnb Property' }];
        } catch (fbErr) {
          throw new Error('Import timed out. Please refresh and check your listings.');
        }
      }

      onSuccess({
        listingId: importedListings[0]?.id || listingId,
        title: importedListings[0]?.title || 'Airbnb Property',
        count: importedListings.length,
        listings: importedListings,
        message:
          importedListings.length > 1
            ? `Imported ${importedListings.length} listings from your Airbnb account.`
            : 'Your Airbnb listing has been imported successfully.',
      });
    } catch (err) {
      toast.error(err?.message || 'Could not retrieve your listing data — please contact support.');
      console.error('[AirbnbConnect] harvest error:', err?.response?.data ?? err?.message ?? err);
      setPhase('iframe'); // let user try again
    }
  };

  // Idle state — call-to-action
  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto border border-blue-100">
            <svg className="w-9 h-9" viewBox="0 0 32 32" fill="none">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z" fill="#FF5A5F"/>
              <path d="M16 8c-1.5 0-2.7 1.2-2.7 2.7 0 1 .56 1.88 1.4 2.34L11 20h10l-3.7-6.96c.84-.46 1.4-1.34 1.4-2.34C18.7 9.2 17.5 8 16 8z" fill="white"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Connect Your Airbnb Account</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              We'll securely link your Airbnb account and automatically import your
              listing details, photos, and room configuration.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-600">
            {['Photos imported', 'Rooms configured', 'Live in minutes'].map(f => (
              <div key={f} className="bg-white rounded-lg p-3 border border-blue-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800 flex gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            You'll be asked to log into your Airbnb account to authorise the connection.
            Make sure you're logged into the correct account before proceeding.
          </span>
        </div>

        <Button
          onClick={handleInit}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md hover:shadow-lg"
        >
          Connect My Airbnb <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // Loading — creating property + token
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="text-slate-600 text-sm">Setting up your connection…</p>
      </div>
    );
  }

  // iFrame phase — user completes Airbnb OAuth
  if (phase === 'iframe') {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-blue-800 font-medium">
            Log into your Airbnb account below to authorise the connection.
          </p>
          <button
            type="button"
            onClick={() => setPhase('idle')}
            className="text-slate-400 hover:text-slate-700 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The channel connection iFrame — headless mode hides all channel branding */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm" style={{ height: 560 }}>
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            title="Connect Airbnb"
            className="w-full h-full border-0"
            allow="same-origin"
          />
        </div>

        {/* Manual trigger after user completes OAuth */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500">
            Once you've connected your Airbnb account above, click the button below.
          </p>
          <Button
            onClick={runHarvest}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            I've Connected My Airbnb
          </Button>
        </div>
      </div>
    );
  }

  // Harvesting — reading data back
  if (phase === 'harvesting') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="text-slate-600 text-sm">Importing your listing details…</p>
        <p className="text-xs text-slate-400">This usually takes just a few seconds.</p>
      </div>
    );
  }

  return null;
}

// ─── Tier 2: Excel Import ─────────────────────────────────────────────────────
// Template download: uses supabase.auth.getSession() + fetch() to carry
// Authorization: Bearer <token> on the download request.
// Upload: api.ingestion.uploadExcel → axios interceptor → Bearer token auto-injected.

function ExcelImportForm({ onSuccess }) {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  // downloading state removed — template endpoint is @Public(), direct link download
  const [result, setResult]     = useState(null);
  const fileRef                 = useRef();

  // ── TASK 4: Authenticated template download ───────────────────────────────
  // Uses fetch() with explicit Authorization header — window.open() would bypass
  // the axios interceptor and produce a 401.
  // GET /listings/bulk-import/template is @Public() — no auth needed, direct browser download
  const handleDownload = () => {
    const base   = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    const anchor = document.createElement('a');
    anchor.href     = `${base}/listings/bulk-import/template`;
    anchor.download = 'channels-connect-property-template.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  // ── Upload: api.ingestion.uploadExcel → axios interceptor injects token ───
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // api.ingestion.uploadExcel goes through axios interceptor → Bearer auto-attached
      const res = await api.ingestion.uploadExcel(formData);
      setResult(res.data);
      onSuccess(res.data, false);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.errors?.length) {
        setResult({ type: 'error', errors: errData.errors, message: errData.message });
      } else {
        toast.error(errData?.message || 'Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step 1: Download template */}
      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
        <p className="text-sm font-semibold text-purple-800 mb-2">Step 1 — Download the template</p>
        <p className="text-xs text-emerald-700 mb-3">
          Our template includes a Field Guide sheet. No lat/long needed — addresses are geocoded automatically.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
        >
          <Download className="w-4 h-4 mr-2" />Download Channels Connect Template
        </Button>
      </div>

      {/* Step 2: Upload */}
      <form onSubmit={handleUpload} className="space-y-4">
        <div className="space-y-2">
          <Label>Step 2 — Upload your completed spreadsheet</Label>
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Click to select your .xlsx file</p>
                <p className="text-xs text-slate-400 mt-1">Max 200 rows · 10 MB</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading || !file} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md hover:shadow-lg">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading & geocoding…</>
            : <>Upload & Import <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </form>

      {/* Inline result */}
      {result && (
        <div className={`rounded-lg border p-4 text-sm space-y-2 ${
          result.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          {result.type === 'error' ? (
            <>
              <p className="font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />Validation errors — nothing saved
              </p>
              <ul className="list-disc list-inside text-red-600 text-xs space-y-0.5">
                {result.errors?.slice(0, 15).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors?.length > 15 && (
                  <li>…and {result.errors.length - 15} more</li>
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />{result.message}
              </p>
              {result.geocodeFailed > 0 && (
                <p className="text-orange-600 text-xs">
                  ⚠ {result.geocodeFailed} row(s) could not be geocoded — rows {result.geocodeFailRows?.join(', ')}.
                  You can set coordinates later in the Admin Portal.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tier 3: Website Import ───────────────────────────────────────────────────
// All API calls go through api.ingestion.ingestWebsite → axios interceptor.
// Checkbox: plain <input type="checkbox"> — no custom CSS fill.
// Consent copy: exact mandated US-English string.

function WebsiteImportForm({ onSuccess }) {
  const [url, setUrl]         = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) {
      toast.error('Please provide your authorisation to proceed');
      return;
    }
    setLoading(true);
    try {
      await ensureProfileExists(); // guarantee FK row exists before listing insert
      // Capture client-side timestamp at the moment the user checked the box + clicked Submit.
      // Server overwrites with its own authoritative clock; this is advisory/belt-and-suspenders.
      const consentTimestamp = new Date().toISOString();
      // 20 s timeout set in apiClient.js — will never hang indefinitely
      const res = await api.ingestion.ingestWebsite({
        url:              url.trim(),
        consentGiven:     true,
        consentTimestamp, // advisory; server uses server-side clock
      });
      onSuccess(res.data);
    } catch (err) {
      // Surface the exact server message so the user knows what happened
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err?.code === 'ECONNABORTED' ? 'Request timed out — please try again' : null) ||
        err?.message ||
        'Submission failed — please try again';
      toast.error(msg);
      console.error('[WebsiteImport] submit error:', err?.response?.data ?? err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="websiteUrl">
          Your property website URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="websiteUrl"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.yourvilla.com"
          required
        />
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 text-sm text-violet-800 flex gap-3">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Our concierge team will extract property details, photos, and room descriptions from the page
          you provide. This is a human-assisted process and typically takes 1–2 business days.
        </span>
      </div>

      {/* TASK 2: Native checkbox — no custom CSS fill; exact mandated consent copy */}
      <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5 cursor-pointer shrink-0"
          required
        />
        <label htmlFor="consent" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
          I authorize Channels Connect to extract property data and media from the URL I have provided, for the purpose of creating my listing and boosting it across multiple channels.
        </label>
      </div>

      <Button
        type="submit"
        disabled={loading || !url.trim() || !consent}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md hover:shadow-lg"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</>
          : <>Submit to Concierge Team <ArrowRight className="w-4 h-4 ml-2" /></>}
      </Button>
    </form>
  );
}

// ─── Tier 4 helpers — defined at module scope so their identity is stable ───────
// IMPORTANT: do NOT move these back inside ManualCreateForm. Defining component
// functions inside a render function gives them a new identity on every render,
// which causes React to unmount+remount the DOM node for every child on each
// state update — making inputs lose focus and caret position after one character.
function FieldWrapper({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

function YesNoToggle({ label, field, state, setState }) {
  return (
    <FieldWrapper>
      <Label>{label}</Label>
      <div className="flex gap-2">
        {['Yes', 'No'].map(v => (
          <button key={v} type="button"
            onClick={() => setState(s => ({ ...s, [field]: v }))}
            className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
              state[field] === v
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
            }`}>{v}</button>
        ))}
      </div>
    </FieldWrapper>
  );
}

// ─── Tier 4: Manual Form — Channex-complete ──────────────────────────────────
// 4 tabs: Property Details | Room Type | Rate Plan | Calendar
// All fields match Channex POST /properties + POST /room_types + POST /rate_plans requirements.
// On completion → status: pending_admin_review → admin pushes to Channex.

const PROPERTY_TYPES = [
  'Private vacation Home','Apartment','Villa','Condo','Studio','Suite',
  'Cabin','Cottage','Bungalow','Townhouse','Loft','Penthouse',
  'Hotel','Boutique Hotel','Hostel','Bed and Breakfast','Other',
];

const ROOM_TYPE_CATEGORIES = [
  'House','Apartment','Studio','Suite','Villa','Condo',
  'Cabin','Cottage','Bungalow','Loft','Penthouse','Room',
];

const BED_TYPES = [
  '1 King','1 Queen','2 Twin','1 Double','1 Twin','2 Queen',
  '1 King + 1 Twin','1 Queen + 1 Twin','1 Bunk Bed','1 Sofa Bed',
];

const AMENITY_OPTIONS = [
  'WiFi','Pool','Air Conditioning','Heating','Parking','Kitchen',
  'Full Kitchen','Kitchenette','Washer/Dryer','Dishwasher','Oven',
  'Microwave','Refrigerator','BBQ','Hot Tub','Gym','Pet Friendly',
  'Wheelchair Accessible','EV Charger','Beach Access','Mountain View',
  'City View','Elevator','24h Front Desk','Concierge',
];

const COUNTRY_CODES = [
  ['USA','United States'],['GBR','United Kingdom'],['AUS','Australia'],
  ['CAN','Canada'],['DEU','Germany'],['FRA','France'],['ESP','Spain'],
  ['ITA','Italy'],['JPN','Japan'],['MEX','Mexico'],['BRA','Brazil'],
  ['ZAF','South Africa'],['SGP','Singapore'],['NZL','New Zealand'],
  ['NLD','Netherlands'],['PRT','Portugal'],['GRC','Greece'],['THA','Thailand'],
  ['IDN','Indonesia'],['ARE','United Arab Emirates'],['Other','Other'],
];

const CURRENCIES = [
  'USD','EUR','GBP','AUD','CAD','JPY','CHF','NZD','SGD','HKD',
  'NOK','SEK','DKK','ZAR','AED','THB','IDR','MXN','BRL',
];

const ManualCreateForm = memo(function ManualCreateForm({ onSuccess }) {
  const [activeTab, setActiveTab] = useState('property');

  // ── Property fields (Channex /properties requirements) ──────────────────────
  const [form, setForm] = useState({
    title: '', address: '', city: '', state: '', postalCode: '',
    country: 'USA', currency: 'USD', phone: '', email: '',
    propertyType: '', timezone: 'America/New_York',
    checkInTimeStart: '', checkInTimeEnd: '', checkOutTime: '',
    cutOffDays: '', selfCheckIn: '', frontDesk: '',
    taxId: '', billingName: '', billingEmail: '',
    wheelchairAccessible: '', elevator: '', petsAllowed: '',
    damageDeposit: '', damageDepositAmount: '',
    parking: '', cleaningFee: '', cleaningFeeAmount: '',
    partiesPolicy: '', description: '', totalUnits: '1',
  });

  // ── Room type fields (Channex /room_types requirements) ─────────────────────
  const [room, setRoom] = useState({
    roomName: '', roomCategory: '', maxOccupancy: '',
    bedrooms: '', bathrooms: '', minAdultAge: '18',
    amenities: [],
    bed1: '', bed2: '', bed3: '', bed4: '',
  });

  // ── Rate plan fields ─────────────────────────────────────────────────────────
  const [rate, setRate] = useState({
    planName: 'Standard Rate',
    cancellationPolicy: 'Free cancellation',
    freeCancelDays: '30',
    penaltyAfterFreeCancel: '100% Cost of Stay',
    minNights: '1', maxNights: '', minAdvanceDays: '', maxAdvanceDays: '',
    basePrice: '',
  });

  // ── Calendar / iCal ──────────────────────────────────────────────────────────
  const [icalLinks, setIcalLinks] = useState([]);
  const [newIcal, setNewIcal]     = useState({ name: '', url: '', direction: 'import' });
  const [exportUrl, setExportUrl] = useState('');

  const [loading, setLoading]               = useState(false);
  const [savedListingId, setSavedListingId] = useState(null);
  const addressRef = useRef(null);

  // Google Places autocomplete
  useEffect(() => {
    if (!window.google?.maps?.places || !addressRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(addressRef.current, { types: ['address'] });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.address_components) return;
      let streetNo = '', street = '', city = '', state = '', zip = '', country = '';
      place.address_components.forEach((c) => {
        if (c.types.includes('street_number'))              streetNo = c.long_name;
        if (c.types.includes('route'))                       street   = c.long_name;
        if (c.types.includes('locality'))                    city     = c.long_name;
        if (c.types.includes('administrative_area_level_1')) state    = c.short_name;
        if (c.types.includes('postal_code'))                 zip      = c.long_name;
        if (c.types.includes('country'))                     country  = c.long_name;
      });
      setForm(f => ({
        ...f,
        address: streetNo ? `${streetNo} ${street}` : street,
        city, state, postalCode: zip, country,
      }));
    });
  }, []);

  const toggleRoomAmenity = (a) => setRoom(r => ({
    ...r,
    amenities: r.amenities.includes(a)
      ? r.amenities.filter(x => x !== a)
      : [...r.amenities, a],
  }));

  // Step 1: Save property → advance to room type
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ensureProfileExists();
      const res = await api.listings.create({
        title:              form.title,
        address:            form.address    || undefined,
        city:               form.city       || undefined,
        state:              form.state      || undefined,
        postalCode:         form.postalCode || undefined,
        country:            form.country    || undefined,
        currency:           form.currency,
        propertyType:       form.propertyType || undefined,
        checkInTime:        form.checkInTimeStart || undefined,
        checkOutTime:       form.checkOutTime || undefined,
        description:        form.description || undefined,
        minNights:          parseInt(rate.minNights) || 1,
        basePrice:          parseFloat(rate.basePrice) || undefined,
        cancellationPolicy: rate.cancellationPolicy || undefined,
        source:             'manual',
        isActive:           false,
        reviewStatus:       'pending_admin_review',
        // Channex-required extras stored for admin reference
        houseRules: [
          form.phone        ? `phone:${form.phone}`               : '',
          form.taxId        ? `taxId:${form.taxId}`               : '',
          form.billingName  ? `billing:${form.billingName}`       : '',
          form.billingEmail ? `billingEmail:${form.billingEmail}` : '',
          form.partiesPolicy ? `parties:${form.partiesPolicy}`    : '',
          form.cleaningFeeAmount ? `cleaningFee:${form.cleaningFeeAmount}` : '',
          form.damageDepositAmount ? `damageDeposit:${form.damageDepositAmount}` : '',
        ].filter(Boolean).join(' | ') || undefined,
      });
      const listingId = res.data?.id || res.data?.listing?.id;
      setSavedListingId(listingId);
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      setExportUrl(`${base}/ical/export/${listingId}.ics`);
      toast.success('Property saved! Now add your room details.');
      setActiveTab('room');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed — please try again');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Room saved locally → advance to rate plan
  const handleSaveRoom = () => {
    if (!room.roomCategory || !room.maxOccupancy) {
      toast.error('Room category and max occupancy are required');
      return;
    }
    toast.success('Room details saved! Now set your rate plan.');
    setActiveTab('rate');
  };

  // Step 3: Rate plan saved locally → advance to calendar
  const handleSaveRate = () => {
    if (!rate.basePrice) {
      toast.error('Base nightly rate is required');
      return;
    }
    toast.success('Rate plan saved! Optionally connect your calendars.');
    setActiveTab('calendar');
  };

  const addIcal = async () => {
    if (!newIcal.url.trim() || !newIcal.name.trim()) return;
    const item = { ...newIcal };
    setIcalLinks(prev => [...prev, item]);
    if (savedListingId) {
      await api.ingestion.createIcalConnection({
        listingId: savedListingId, name: item.name,
        icalUrl: item.url, syncDirection: item.direction,
      }).catch(() => {});
    }
    setNewIcal({ name: '', url: '', direction: 'import' });
    toast.success('Calendar connection added');
  };
  const removeIcal = (i) => setIcalLinks(prev => prev.filter((_, idx) => idx !== i));
  const copyExport = () => { navigator.clipboard.writeText(exportUrl); toast.success('URL copied!'); };

  const TABS = [
    { id: 'property', label: 'Property' },
    { id: 'room',     label: 'Room Type' },
    { id: 'rate',     label: 'Rate Plan' },
    { id: 'calendar', label: 'Calendar' },
  ];

  // F and YN are now FieldWrapper / YesNoToggle at module scope (see above).
  // Aliases kept here only so the JSX below needs zero changes.
  const F  = FieldWrapper;
  const YN = YesNoToggle;

  return (
    <div>
      {/* Tab nav */}
      <div className="flex items-center border-b border-slate-100 mb-6 gap-1 overflow-x-auto">
        {TABS.map((t, idx) => {
          const isActive   = activeTab === t.id;
          const isDisabled = idx > 0 && !savedListingId;
          return (
            <button key={t.id} type="button" disabled={isDisabled}
              onClick={() => !isDisabled && setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive ? 'border-purple-600 text-purple-700'
                : isDisabled ? 'border-transparent text-slate-300 cursor-not-allowed'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                isActive ? 'bg-purple-600 text-white'
                : isDisabled ? 'bg-slate-100 text-slate-300'
                : 'bg-slate-100 text-slate-500'
              }`}>{idx + 1}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROPERTY DETAILS */}
      {activeTab === 'property' && (
        <form onSubmit={handleSaveProperty} className="space-y-6">
          {/* Basic identity */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Basic Information</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <F><Label>Property Name <span className="text-red-500">*</span></Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Beachfront Villa Miami" required /></F>

              <F><Label>Property Type <span className="text-red-500">*</span></Label>
                <Select value={form.propertyType} onValueChange={v => setForm(f => ({ ...f, propertyType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></F>

              <div className="sm:col-span-2">
                <F><Label>Street Address <span className="text-red-500">*</span></Label>
                  <Input ref={addressRef} value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Start typing — Google will autocomplete…" required /></F>
              </div>

              <F><Label>City <span className="text-red-500">*</span></Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required /></F>

              <F><Label>State / Province <span className="text-red-500">*</span></Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required /></F>

              <F><Label>Postal Code <span className="text-red-500">*</span></Label>
                <Input value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} required /></F>

              <F><Label>Country <span className="text-red-500">*</span></Label>
                <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRY_CODES.map(([code, name]) => <SelectItem key={code} value={code}>{name} ({code})</SelectItem>)}</SelectContent>
                </Select></F>

              <F><Label>Currency <span className="text-red-500">*</span></Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></F>

              <F><Label>Phone Number <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="1-305-555-0100" required /></F>
            </div>
          </div>

          {/* Check-in / Check-out */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Check-in / Check-out</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <F><Label>Check-in From</Label>
                <Input value={form.checkInTimeStart} onChange={e => setForm(f => ({ ...f, checkInTimeStart: e.target.value }))} placeholder="3:00 PM" /></F>
              <F><Label>Check-in Until</Label>
                <Input value={form.checkInTimeEnd} onChange={e => setForm(f => ({ ...f, checkInTimeEnd: e.target.value }))} placeholder="10:00 PM" /></F>
              <F><Label>Check-out Time</Label>
                <Input value={form.checkOutTime} onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} placeholder="11:00 AM" /></F>
              <F><Label>Cut-off Days</Label>
                <Input type="number" min="0" value={form.cutOffDays}
                  onChange={e => setForm(f => ({ ...f, cutOffDays: e.target.value }))} placeholder="0" /></F>
              <F><Label>Self Check-in</Label>
                <Select value={form.selfCheckIn} onValueChange={v => setForm(f => ({ ...f, selfCheckIn: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['Yes - Lockbox with keys', 'Yes - Access code (numeric pad)', 'Yes - Smart lock', 'No'].map(o =>
                      <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select></F>
              <F><Label>Front Desk</Label>
                <Select value={form.frontDesk} onValueChange={v => setForm(f => ({ ...f, frontDesk: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['24 hours', 'Limited hours', 'No Front desk'].map(o =>
                      <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select></F>
            </div>
          </div>

          {/* Guest Policies */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Guest Policies</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <YN label="Wheelchair Accessible" field="wheelchairAccessible" state={form} setState={setForm} />
              <YN label="Elevator" field="elevator" state={form} setState={setForm} />
              <YN label="Pets Allowed" field="petsAllowed" state={form} setState={setForm} />
              <F><Label>Parties / Events</Label>
                <Select value={form.partiesPolicy} onValueChange={v => setForm(f => ({ ...f, partiesPolicy: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['Parties/events allowed', 'Parties/events not allowed'].map(o =>
                      <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select></F>
              <YN label="Damage Deposit Required" field="damageDeposit" state={form} setState={setForm} />
              {form.damageDeposit === 'Yes' && (
                <F><Label>Damage Deposit Amount</Label>
                  <Input type="number" min="0" value={form.damageDepositAmount}
                    onChange={e => setForm(f => ({ ...f, damageDepositAmount: e.target.value }))} placeholder="500" /></F>
              )}
            </div>
          </div>

          {/* Fees & Parking */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fees &amp; Parking</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <F><Label>Parking</Label>
                <Select value={form.parking} onValueChange={v => setForm(f => ({ ...f, parking: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{['Free', 'Paid', 'Not available'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select></F>
              <YN label="Cleaning Fee" field="cleaningFee" state={form} setState={setForm} />
              {form.cleaningFee === 'Yes' && (
                <F><Label>Cleaning Fee Amount</Label>
                  <Input type="number" min="0" value={form.cleaningFeeAmount}
                    onChange={e => setForm(f => ({ ...f, cleaningFeeAmount: e.target.value }))} placeholder="75" /></F>
              )}
              <F><Label>Total Units / Rooms</Label>
                <Input type="number" min="1" value={form.totalUnits}
                  onChange={e => setForm(f => ({ ...f, totalUnits: e.target.value }))} /></F>
            </div>
          </div>

          {/* Billing & Tax */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Billing &amp; Tax (Admin Use)</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <F><Label>Tax ID Number</Label>
                <Input value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="12-3456789" /></F>
              <F><Label>Billing Contact Name</Label>
                <Input value={form.billingName} onChange={e => setForm(f => ({ ...f, billingName: e.target.value }))} /></F>
              <F><Label>Billing Contact Email</Label>
                <Input type="email" value={form.billingEmail} onChange={e => setForm(f => ({ ...f, billingEmail: e.target.value }))} /></F>
            </div>
          </div>

          {/* Description */}
          <F><Label>Property Description</Label>
            <Textarea rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe your property for guests…" /></F>

          <Button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
              : <>Save Property &amp; Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        </form>
      )}

      {/* TAB 2: ROOM TYPE */}
      {activeTab === 'room' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Room Identity</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <F><Label>Room Type Name</Label>
                <Input value={room.roomName}
                  onChange={e => setRoom(r => ({ ...r, roomName: e.target.value }))}
                  placeholder="Beachfront King Suite" /></F>

              <F><Label>Room Category <span className="text-red-500">*</span></Label>
                <Select value={room.roomCategory} onValueChange={v => setRoom(r => ({ ...r, roomCategory: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{ROOM_TYPE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></F>

              <F><Label>Max Occupancy <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" value={room.maxOccupancy}
                  onChange={e => setRoom(r => ({ ...r, maxOccupancy: e.target.value }))} /></F>

              <F><Label>Bedrooms</Label>
                <Input type="number" min="0" value={room.bedrooms}
                  onChange={e => setRoom(r => ({ ...r, bedrooms: e.target.value }))} /></F>

              <F><Label>Bathrooms</Label>
                <Input type="number" min="0" step="0.5" value={room.bathrooms}
                  onChange={e => setRoom(r => ({ ...r, bathrooms: e.target.value }))} /></F>

              <F><Label>Min Adult Age</Label>
                <Input type="number" min="0" value={room.minAdultAge}
                  onChange={e => setRoom(r => ({ ...r, minAdultAge: e.target.value }))} /></F>
            </div>
          </div>

          {/* Bed configuration */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bed Configuration</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {['bed1', 'bed2', 'bed3', 'bed4'].map((k, i) => (
                <F key={k}><Label>Bedroom {i + 1}</Label>
                  <Select value={room[k]} onValueChange={v => setRoom(r => ({ ...r, [k]: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select bed type…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None / Not used</SelectItem>
                      {BED_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select></F>
              ))}
            </div>
          </div>

          {/* Room amenities */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Room Amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggleRoomAmenity(a)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-all ${
                    room.amenities.includes(a)
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                  }`}>
                  {room.amenities.includes(a) ? '✓ ' : ''}{a}
                </button>
              ))}
            </div>
          </div>

          <Button type="button" onClick={handleSaveRoom}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md">
            Save Room Type &amp; Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* TAB 3: RATE PLAN */}
      {activeTab === 'rate' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <F><Label>Rate Plan Name <span className="text-red-500">*</span></Label>
              <Input value={rate.planName}
                onChange={e => setRate(r => ({ ...r, planName: e.target.value }))}
                placeholder="Standard Rate" required /></F>

            <F><Label>Base Nightly Rate <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={rate.basePrice}
                onChange={e => setRate(r => ({ ...r, basePrice: e.target.value }))}
                placeholder="150" /></F>

            <F><Label>Cancellation Policy</Label>
              <Select value={rate.cancellationPolicy} onValueChange={v => setRate(r => ({ ...r, cancellationPolicy: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Free cancellation', 'Non-refundable', 'Partial penalty'].map(o =>
                    <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select></F>

            {rate.cancellationPolicy === 'Free cancellation' && (
              <F><Label>Free Cancel Until (days before arrival)</Label>
                <Input type="number" min="0" value={rate.freeCancelDays}
                  onChange={e => setRate(r => ({ ...r, freeCancelDays: e.target.value }))} /></F>
            )}

            <F><Label>Min Length of Stay (nights)</Label>
              <Input type="number" min="1" value={rate.minNights}
                onChange={e => setRate(r => ({ ...r, minNights: e.target.value }))} /></F>

            <F><Label>Max Length of Stay (nights)</Label>
              <Input type="number" min="0" value={rate.maxNights}
                onChange={e => setRate(r => ({ ...r, maxNights: e.target.value }))} placeholder="Optional" /></F>

            <F><Label>Min Advance Booking Days</Label>
              <Input type="number" min="0" value={rate.minAdvanceDays}
                onChange={e => setRate(r => ({ ...r, minAdvanceDays: e.target.value }))} placeholder="Optional" /></F>

            <F><Label>Max Advance Booking Days</Label>
              <Input type="number" min="0" value={rate.maxAdvanceDays}
                onChange={e => setRate(r => ({ ...r, maxAdvanceDays: e.target.value }))} placeholder="Optional" /></F>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Our team will review your rate plan and configure it across your connected channels.</span>
          </div>

          <Button type="button" onClick={handleSaveRate}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md">
            Save Rate Plan &amp; Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* TAB 4: CALENDAR CONNECTIONS */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />Connect a Calendar (Optional)
            </h3>
            <p className="text-xs text-slate-500">
              Paste iCal links to sync availability automatically.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input placeholder="Label (e.g. My Calendar)"
                value={newIcal.name} onChange={e => setNewIcal(n => ({ ...n, name: e.target.value }))} />
              <Input placeholder="https://…/calendar.ics"
                value={newIcal.url} onChange={e => setNewIcal(n => ({ ...n, url: e.target.value }))}
                className="sm:col-span-2" />
            </div>
            <div className="flex items-center gap-3">
              <Select value={newIcal.direction} onValueChange={v => setNewIcal(n => ({ ...n, direction: v }))}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="import">Import (inbound)</SelectItem>
                  <SelectItem value="export">Export (outbound)</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" onClick={addIcal}
                disabled={!newIcal.url.trim() || !newIcal.name.trim()} size="sm">
                Add
              </Button>
            </div>
            {icalLinks.length > 0 && (
              <div className="space-y-2">
                {icalLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <Badge variant="outline" className="text-xs shrink-0">{link.direction}</Badge>
                    <span className="font-medium text-sm text-slate-700 shrink-0">{link.name}</span>
                    <span className="text-xs text-slate-400 truncate flex-1">{link.url}</span>
                    <button type="button" onClick={() => removeIcal(i)} className="text-slate-400 hover:text-red-500 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {exportUrl && (
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600" />Your Calendar Export URL
              </h3>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <code className="text-xs text-slate-700 truncate flex-1">{exportUrl}</code>
                <Button size="sm" variant="ghost" onClick={copyExport} className="shrink-0">
                  <Copy className="w-4 h-4 mr-1" />Copy
                </Button>
              </div>
            </div>
          )}

          <Button type="button" onClick={() => onSuccess({ listingId: savedListingId })}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md">
            <CheckCircle2 className="w-4 h-4 mr-2" />Submit My Property
          </Button>
        </div>
      )}
    </div>
  );
}); // end memo(ManualCreateForm)

// ─── Main Page ────────────────────────────────────────────────────────────────

function PropertyIngestionHubContent() {
  const navigate                        = useNavigate();
  const [activeTier, setActiveTier]     = useState(null);
  const [success, setSuccess]           = useState(null);

  const handleSuccess = useCallback((data, showOverlay = true) => {
    if (!showOverlay) return; // Excel shows inline result instead
    setSuccess(data);
    setActiveTier(null);
  }, []);

  const handleViewListings = useCallback(() => {
    setSuccess(null);
    navigate(createPageUrl('Listings'));
  }, [navigate]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Your Properties</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Choose how you'd like to bring your properties into Channels Connect.
        </p>
      </div>

      {/* Tier selection grid */}
      {!activeTier && (
        <div className="grid sm:grid-cols-2 gap-4">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const c    = colorMap[tier.color];
            return (
              <div key={tier.id} className="flex">
                <button
                  onClick={() => setActiveTier(tier.id)}
                  className={`relative text-left p-5 bg-white border border-slate-200 rounded-2xl shadow-sm
                    w-full flex flex-col
                    hover:shadow-lg hover:border-purple-300 hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-sm
                    transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-purple-400`}
                >
                  {/* Top row: icon + badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md group-hover:shadow-lg transition-shadow shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.badge} border tracking-wide uppercase`}>
                      {tier.badge}
                    </span>
                  </div>
                  {/* Text */}
                  <div className="flex flex-col">
                    <p className="font-bold text-slate-900 text-[15px] leading-snug">{tier.label}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-1 leading-normal">{tier.sub}</p>
                  </div>
                  <p className="text-[13px] text-slate-500 mt-2 leading-relaxed flex-1">{tier.desc}</p>
                  {/* CTA arrow */}
                  <div className="flex items-center gap-1 mt-4 text-[11px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-0 group-hover:translate-x-1">
                    Get started <ArrowRight className="w-3 h-3" />
                  </div>
                  {/* Bottom gradient bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Active tier form */}
      {activeTier && (() => {
        const tier = TIERS.find(t => t.id === activeTier);
        const Icon = tier.icon;
        const c    = colorMap[tier.color];
        return (
          <div className="space-y-5">
            <button
              onClick={() => setActiveTier(null)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Back to options
            </button>
            <Card className="border border-slate-200 shadow-md">
              <CardHeader className="border-b border-slate-100 rounded-t-xl bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 leading-snug">{tier.label}</CardTitle>
                    <CardDescription className="text-xs mt-1 text-slate-500 leading-normal">{tier.sub}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {activeTier === 'airbnb'  && <AirbnbConnectForm  onSuccess={handleSuccess} />}
                {activeTier === 'excel'   && <ExcelImportForm    onSuccess={handleSuccess} />}
                {activeTier === 'website' && <WebsiteImportForm  onSuccess={handleSuccess} />}
                {activeTier === 'manual'  && <ManualCreateForm   onSuccess={handleSuccess} />}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Success overlay */}
      {success && (
        <SuccessOverlay
          title="🎉 You're connected!"
          message={
            success.message ||
            'Your property has been submitted to Channels Connect. Our team will review and activate it within 1 business day.'
          }
          onClose={() => setSuccess(null)}
          onViewListings={handleViewListings}
        />
      )}
    </div>
  );
}

export default function PropertyIngestionHub() {
  return (
    <NewLoginRequired>
      <AppLayout>
        <PropertyIngestionHubContent />
      </AppLayout>
    </NewLoginRequired>
  );
}

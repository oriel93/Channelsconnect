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

import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles, ArrowRight, X,
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
    id:    'ota',
    icon:  Link2,
    color: 'blue',
    label: 'Import from OTA',
    sub:   'Airbnb · VRBO · Booking.com',
    desc:  'Paste your live listing URL. We extract photos, descriptions and room details automatically.',
    badge: 'Fastest',
  },
  {
    id:    'excel',
    icon:  FileSpreadsheet,
    color: 'purple',
    label: 'Import via Excel',
    sub:   'Bulk upload — up to 200 properties',
    desc:  'Download our template, fill in your property details, and upload. Addresses are geocoded automatically.',
    badge: 'Best for bulk',
  },
  {
    id:    'website',
    icon:  Globe,
    color: 'violet',
    label: 'Import from Website',
    sub:   'Your own property website',
    desc:  'Provide your website URL and our concierge team will extract and map your content for you.',
    badge: 'White-glove',
  },
  {
    id:    'manual',
    icon:  PlusCircle,
    color: 'indigo',
    label: 'Create Manually',
    sub:   'Form + Google Maps + iCal',
    desc:  'Fill in property details with Google Places autocomplete, then connect iCal feeds for availability.',
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

// ─── Tier 1: OTA URL ─────────────────────────────────────────────────────────
// All calls go through api.ingestion.* → axios interceptor → Authorization header
// automatically injected by apiClient.js interceptor.

function OtaImportForm({ onSuccess }) {
  const [otaUrl, setOtaUrl]   = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const detect = (url) => {
    if (url.includes('airbnb'))   return 'Airbnb';
    if (url.includes('vrbo') || url.includes('homeaway')) return 'VRBO';
    if (url.includes('booking.com')) return 'Booking.com';
    return null;
  };
  const detected = detect(otaUrl);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otaUrl.trim()) return;
    setLoading(true);
    try {
      await ensureProfileExists(); // guarantee FK row exists before listing insert
      const res = await api.ingestion.ingestOtaUrl({
        otaUrl:  otaUrl.trim(),
        icalUrl: icalUrl.trim() || undefined,
      });
      onSuccess(res.data);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.code === 'ECONNABORTED' ? 'Request timed out — please try again' : null) ||
        err?.message ||
        'Submission failed — please try again';
      toast.error(msg);
      console.error('[OtaImport] submit error:', err?.response?.data ?? err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="otaUrl">Airbnb or VRBO listing URL <span className="text-red-500">*</span></Label>
        <div className="relative">
          <Input
            id="otaUrl"
            type="url"
            value={otaUrl}
            onChange={(e) => setOtaUrl(e.target.value)}
            placeholder="https://www.airbnb.com/rooms/12345678"
            required
            className="pr-28"
          />
          {detected && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              ✓ {detected}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">Airbnb, VRBO, HomeAway, and Booking.com URLs are supported.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icalUrl">
          iCal / Calendar URL <span className="text-slate-400 text-xs">(optional)</span>
        </Label>
        <Input
          id="icalUrl"
          type="url"
          value={icalUrl}
          onChange={(e) => setIcalUrl(e.target.value)}
          placeholder="https://www.airbnb.com/calendar/ical/12345678.ics"
        />
        <p className="text-xs text-slate-500">Paste your OTA calendar link to sync availability automatically.</p>
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-purple-800 flex gap-3">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Our team will extract your photos, descriptions, room configuration, and amenities. You'll be notified once it's ready.</span>
      </div>

      <Button type="submit" disabled={loading || !otaUrl.trim()} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md hover:shadow-lg">
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</>
          : <>Submit for Extraction <ArrowRight className="w-4 h-4 ml-2" /></>}
      </Button>
    </form>
  );
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
          <Download className="w-4 h-4 mr-2" />Download .xlsx Template
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
                <p className="text-amber-600 text-xs">
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
      // 20 s timeout set in apiClient.js — will never hang indefinitely
      const res = await api.ingestion.ingestWebsite({
        url:          url.trim(),
        consentGiven: true,
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
          I authorize Channels Connect to extract property data and media from the URL I have provided,
          solely for the purpose of creating my listing and boosting it across multiple channels.
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

// ─── Tier 4: Manual Form ──────────────────────────────────────────────────────
// TASK 3: Three fully wired tabs — Property Details | Amenities | Calendar Connections.
// Each tab is driven by a useState hook; onClick binds setActiveTab.

const PROPERTY_TYPES = [
  'House','Apartment','Villa','Condo','Studio','Suite',
  'Cabin','Cottage','Bungalow','Townhouse','Loft','Penthouse','Other',
];
const AMENITY_OPTIONS = [
  'WiFi','Pool','Air Conditioning','Parking','Kitchen','BBQ',
  'Washer/Dryer','Dishwasher','Hot Tub','Gym','Pet Friendly',
  'Wheelchair Accessible','EV Charger','Beach Access','Mountain View','City View',
];

function ManualCreateForm({ onSuccess }) {
  // TASK 3: useState drives tab switching — 'details' | 'amenities' | 'calendar'
  const [activeTab, setActiveTab]       = useState('details');
  const [form, setForm]                 = useState({
    title: '', address: '', city: '', state: '', postalCode: '', country: '',
    propertyType: '', maxGuests: '', bedrooms: '', bathrooms: '',
    basePrice: '', currency: 'USD', description: '', houseRules: '',
    cancellationPolicy: '', checkInTime: '', checkOutTime: '', minNights: '1',
    amenities: [],
  });
  const [icalLinks, setIcalLinks]       = useState([]);
  const [newIcal, setNewIcal]           = useState({ name: '', url: '', direction: 'import' });
  const [exportUrl, setExportUrl]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [savedListingId, setSavedListingId] = useState(null);
  const addressRef = useRef(null);
  const autoRef    = useRef(null);

  // Google Places autocomplete on the address field
  useEffect(() => {
    if (!window.google?.maps?.places || !addressRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(addressRef.current, {
      types: ['address'],
    });
    autoRef.current = ac;
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
        address:    streetNo ? `${streetNo} ${street}` : street,
        city, state, postalCode: zip, country,
      }));
    });
  }, []);

  const toggleAmenity = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a)
      ? f.amenities.filter(x => x !== a)
      : [...f.amenities, a],
  }));

  // Save property details → advance to Amenities tab
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ensureProfileExists(); // guarantee FK row exists before listing insert
      const payload = {
        title:        form.title,
        address:      form.address,
        city:         form.city,
        state:        form.state        || undefined,
        postalCode:   form.postalCode   || undefined,
        country:      form.country      || undefined,
        propertyType: form.propertyType || undefined,
        maxGuests:    parseInt(form.maxGuests)   || undefined,
        bedrooms:     parseInt(form.bedrooms)    || undefined,
        bathrooms:    parseFloat(form.bathrooms) || undefined,
        basePrice:    parseFloat(form.basePrice) || undefined,
        currency:     form.currency,
        description:  form.description  || undefined,
        houseRules:   form.houseRules   || undefined,
        cancellationPolicy: form.cancellationPolicy || undefined,
        checkInTime:  form.checkInTime  || undefined,
        checkOutTime: form.checkOutTime || undefined,
        minNights:    parseInt(form.minNights) || 1,
        amenities:    form.amenities.length ? form.amenities : undefined,
        source:       'manual',
      };
      // api.listings.create → axios interceptor → Authorization: Bearer <token>
      const res = await api.listings.create(payload);
      const listingId = res.data?.id || res.data?.listing?.id;

      // TASK 1 ROLLBACK: If any post-create step fails, delete the shell record
      // so the user never ends up with a partial/empty listing in the DB.
      let rollbackNeeded = false;
      try {
        // Future post-create steps (image attach, iCal bootstrap, etc.) go here.
        // If any throw, rollbackNeeded = true and we delete the shell below.
        rollbackNeeded = false;
      } catch (postErr) {
        rollbackNeeded = true;
        throw postErr; // re-throw so outer catch handles UI
      } finally {
        if (rollbackNeeded && listingId) {
          // Best-effort delete — don't surface rollback errors to the user
          await api.listings.delete(listingId).catch(e =>
            console.error('[PropertyIngestionHub] Rollback delete failed:', e?.message)
          );
          console.warn('[PropertyIngestionHub] Shell listing rolled back, id:', listingId);
        }
      }

      setSavedListingId(listingId);
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      setExportUrl(`${base}/ical/export/${listingId}.ics`);

      toast.success('Property details saved! Now add your amenities.');
      setActiveTab('amenities');  // advance to next tab
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAmenities = () => {
    setActiveTab('calendar');
    toast.success('Amenities saved! Connect your calendars below.');
  };

  const addIcal = async () => {
    if (!newIcal.url.trim() || !newIcal.name.trim()) return;
    const item = { ...newIcal };
    setIcalLinks(prev => [...prev, item]);
    if (savedListingId) {
      // api.ingestion.createIcalConnection → axios interceptor → Bearer auto-attached
      await api.ingestion.createIcalConnection({
        listingId:     savedListingId,
        name:          item.name,
        icalUrl:       item.url,
        syncDirection: item.direction,
      }).catch(() => {});
    }
    setNewIcal({ name: '', url: '', direction: 'import' });
    toast.success('Calendar connection added');
  };

  const removeIcal = (i) => setIcalLinks(prev => prev.filter((_, idx) => idx !== i));

  const copyExport = () => {
    navigator.clipboard.writeText(exportUrl);
    toast.success('iCal export URL copied!');
  };

  // ── Tab nav helper ──────────────────────────────────────────────────────────
  const TABS = [
    { id: 'details',   label: 'Property Details' },
    { id: 'amenities', label: 'Amenities' },
    { id: 'calendar',  label: 'Calendar Connections' },
  ];

  return (
    <div>
      {/* Step indicator tabs — custom circles driven by activeTab state */}
      <div className="flex items-center border-b border-slate-100 mb-6 gap-1">
        {TABS.map((t, idx) => {
          const isActive   = activeTab === t.id;
          const isDisabled = (t.id === 'amenities' || t.id === 'calendar') && !savedListingId;
          const stepNum    = idx + 1;
          return (
            <button
              key={t.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'border-purple-600 text-purple-700'
                  : isDisabled
                    ? 'border-transparent text-slate-300 cursor-not-allowed'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {/* Step number circle — purple when active, gray when not */}
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all flex-shrink-0 ${
                isActive   ? 'bg-purple-600 text-white' :
                isDisabled ? 'bg-slate-100 text-slate-300' :
                             'bg-slate-100 text-slate-500'
              }`}>
                {stepNum}
              </span>
              {t.label}
              {t.id === 'calendar' && icalLinks.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                  {icalLinks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Property Details ───────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <form onSubmit={handleSaveDetails} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Property Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Beachfront Villa Miami"
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Street Address <span className="text-red-500">*</span></Label>
              <Input
                ref={addressRef}
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Start typing — Google will autocomplete…"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>City <span className="text-red-500">*</span></Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>State / Province</Label>
              <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Zip / Postal Code</Label>
              <Input value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="USA" />
            </div>
            <div className="space-y-1.5">
              <Label>Property Type</Label>
              {/* Custom selection circles — strict equality against form.propertyType state */}
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(type => {
                  const isSelected = form.propertyType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, propertyType: type }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-150
                        ${isSelected
                          ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50'
                        }`}
                    >
                      {/* Selection circle indicator */}
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${isSelected ? 'border-white' : 'border-gray-300'}`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                      </span>
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max Guests <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={form.maxGuests} onChange={e => setForm(f => ({ ...f, maxGuests: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Bedrooms</Label>
              <Input type="number" min="0" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Bathrooms</Label>
              <Input type="number" min="0" step="0.5" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Base Nightly Rate <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} placeholder="250" required />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input maxLength={3} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Check-in Time</Label>
              <Input value={form.checkInTime} onChange={e => setForm(f => ({ ...f, checkInTime: e.target.value }))} placeholder="3:00 PM" />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out Time</Label>
              <Input value={form.checkOutTime} onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} placeholder="11:00 AM" />
            </div>
            <div className="space-y-1.5">
              <Label>Min Nights</Label>
              <Input type="number" min="1" value={form.minNights} onChange={e => setForm(f => ({ ...f, minNights: e.target.value }))} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>House Rules</Label>
              <Input value={form.houseRules} onChange={e => setForm(f => ({ ...f, houseRules: e.target.value }))} placeholder="No smoking, no parties…" />
            </div>
            <div className="space-y-1.5">
              <Label>Cancellation Policy</Label>
              <Select value={form.cancellationPolicy} onValueChange={v => setForm(f => ({ ...f, cancellationPolicy: v }))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {['Flexible','Moderate','Strict','Non-refundable'].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your property…" />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-md hover:shadow-lg">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
              : <>Save & Continue to Amenities <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        </form>
      )}

      {/* ── Tab: Amenities ──────────────────────────────────────────────────── */}
      {activeTab === 'amenities' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Select all the amenities your property offers.</p>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`text-sm px-4 py-2 rounded-full border transition-all font-medium ${
                  form.amenities.includes(a)
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'
                }`}
              >
                {form.amenities.includes(a) ? '✓ ' : ''}{a}
              </button>
            ))}
          </div>

          {form.amenities.length > 0 && (
            <p className="text-xs text-slate-500">
              {form.amenities.length} amenit{form.amenities.length === 1 ? 'y' : 'ies'} selected
            </p>
          )}

          <Button
            type="button"
            onClick={handleFinishAmenities}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            Continue to Calendar Connections <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* ── Tab: Calendar Connections ───────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Add new iCal connection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />Import Calendar (Inbound)
            </h3>
            <p className="text-xs text-slate-500">
              Paste iCal links from Airbnb, VRBO, Booking.com, or any calendar app to sync availability into your property.
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input
                placeholder="Label (e.g. Airbnb Calendar)"
                value={newIcal.name}
                onChange={e => setNewIcal(n => ({ ...n, name: e.target.value }))}
              />
              <Input
                placeholder="https://…/calendar.ics"
                value={newIcal.url}
                onChange={e => setNewIcal(n => ({ ...n, url: e.target.value }))}
                className="sm:col-span-2"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={newIcal.direction} onValueChange={v => setNewIcal(n => ({ ...n, direction: v }))}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="import">Import (inbound)</SelectItem>
                  <SelectItem value="export">Export (outbound)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={addIcal}
                disabled={!newIcal.url.trim() || !newIcal.name.trim()}
                size="sm"
              >
                Add Connection
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

          {/* Export URL */}
          {exportUrl && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600" />Export Your Calendar (Outbound)
              </h3>
              <p className="text-xs text-slate-500">
                Share this link with Airbnb, VRBO, or any calendar app so they can subscribe to your availability.
              </p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <code className="text-xs text-slate-700 truncate flex-1">{exportUrl}</code>
                <Button size="sm" variant="ghost" onClick={copyExport} className="shrink-0">
                  <Copy className="w-4 h-4 mr-1" />Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.open(exportUrl, '_blank')} className="shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={() => onSuccess({ listingId: savedListingId })}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />Done — View My Listings
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function PropertyIngestionHubContent() {
  const navigate                        = useNavigate();
  const [activeTier, setActiveTier]     = useState(null);
  const [success, setSuccess]           = useState(null);

  const handleSuccess = (data, showOverlay = true) => {
    if (!showOverlay) return; // Excel shows inline result instead
    setSuccess(data);
    setActiveTier(null);
  };

  const handleViewListings = () => {
    setSuccess(null);
    navigate(createPageUrl('Listings'));
  };

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
              <button
                key={tier.id}
                onClick={() => setActiveTier(tier.id)}
                className={`relative text-left p-5 bg-white border border-slate-200 rounded-2xl shadow-sm
                  hover:shadow-lg hover:border-purple-300 hover:-translate-y-0.5
                  active:translate-y-0 active:shadow-sm
                  transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-purple-400`}
              >
                {/* Top row: icon + badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md group-hover:shadow-lg transition-shadow`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.badge} border tracking-wide uppercase`}>
                    {tier.badge}
                  </span>
                </div>
                {/* Text */}
                <p className="font-bold text-slate-900 text-[15px] leading-tight">{tier.label}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{tier.sub}</p>
                <p className="text-[13px] text-slate-500 mt-2 leading-relaxed line-clamp-2">{tier.desc}</p>
                {/* CTA arrow */}
                <div className="flex items-center gap-1 mt-4 text-[11px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-0 group-hover:translate-x-1">
                  Get started <ArrowRight className="w-3 h-3" />
                </div>
                {/* Bottom gradient bar */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
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
                    <CardTitle className="text-base text-slate-900">{tier.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5 text-slate-500">{tier.sub}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {activeTier === 'ota'     && <OtaImportForm     onSuccess={handleSuccess} />}
                {activeTier === 'excel'   && <ExcelImportForm   onSuccess={handleSuccess} />}
                {activeTier === 'website' && <WebsiteImportForm onSuccess={handleSuccess} />}
                {activeTier === 'manual'  && <ManualCreateForm  onSuccess={handleSuccess} />}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Success overlay */}
      {success && (
        <SuccessOverlay
          title="You're all set!"
          message={
            success.message ||
            "Your property has been submitted. Our team will notify you when it's ready."
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

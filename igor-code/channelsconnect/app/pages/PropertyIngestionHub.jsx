/**
 * PropertyIngestionHub.jsx — 4-Tier "Concierge" Property Onboarding
 *
 * Tier 1: Import via OTA URL (Airbnb / VRBO)
 * Tier 2: Import via Excel bulk upload
 * Tier 3: Import from Website (consent gateway)
 * Tier 4: Create Manually (form + Google Places + iCal connections)
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Link2, FileSpreadsheet, Globe, PlusCircle,
  Upload, Download, CheckCircle2, Loader2, ExternalLink,
  CalendarDays, Trash2, RefreshCw, Copy, AlertCircle,
  Sparkles, ArrowRight, X,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { createPageUrl } from '@/utils';

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
    color: 'emerald',
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
    color: 'amber',
    label: 'Create Manually',
    sub:   'Form + Google Maps + iCal',
    desc:  'Fill in property details with Google Places autocomplete, then connect iCal feeds for availability.',
    badge: 'Full control',
  },
];

const colorMap = {
  blue:   { ring: 'ring-blue-200',   icon: 'text-blue-600',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  emerald:{ ring: 'ring-emerald-200',icon: 'text-emerald-600',bg: 'bg-emerald-50',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  violet: { ring: 'ring-violet-200', icon: 'text-violet-600', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  amber:  { ring: 'ring-amber-200',  icon: 'text-amber-600',  bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700 border-amber-200' },
};

// ─── Shared success overlay ───────────────────────────────────────────────────

function SuccessOverlay({ title, message, onClose, onViewListings }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
          <Button onClick={onViewListings} className="flex-1 bg-blue-600 hover:bg-blue-700">
            View My Listings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tier 1: OTA URL ─────────────────────────────────────────────────────────

function OtaImportForm({ onSuccess }) {
  const [otaUrl, setOtaUrl]   = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const detect = (url) => {
    if (url.includes('airbnb')) return { label: 'Airbnb', color: 'rose' };
    if (url.includes('vrbo') || url.includes('homeaway')) return { label: 'VRBO', color: 'blue' };
    if (url.includes('booking.com')) return { label: 'Booking.com', color: 'blue' };
    return null;
  };
  const detected = detect(otaUrl);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otaUrl.trim()) return;
    setLoading(true);
    try {
      const res = await api.ingestion.ingestOtaUrl({ otaUrl: otaUrl.trim(), icalUrl: icalUrl.trim() || undefined });
      onSuccess(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed — please try again');
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
              ✓ {detected.label}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">Airbnb, VRBO, HomeAway URLs are supported.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icalUrl">iCal / Calendar URL <span className="text-slate-400 text-xs">(optional)</span></Label>
        <Input
          id="icalUrl"
          type="url"
          value={icalUrl}
          onChange={(e) => setIcalUrl(e.target.value)}
          placeholder="https://www.airbnb.com/calendar/ical/12345678.ics"
        />
        <p className="text-xs text-slate-500">Paste your OTA calendar link to sync availability automatically.</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Our team will extract your photos, descriptions, room configuration, and amenities. You'll be notified once it's ready.</span>
      </div>

      <Button type="submit" disabled={loading || !otaUrl.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : <>Submit for Extraction <ArrowRight className="w-4 h-4 ml-2" /></>}
      </Button>
    </form>
  );
}

// ─── Tier 2: Excel Import ─────────────────────────────────────────────────────

function ExcelImportForm({ onSuccess }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const fileRef               = useRef();

  const handleDownload = () => {
    window.open(`${import.meta.env.VITE_API_URL?.replace(/\/+$/, '')}/listings/bulk-import/template`, '_blank');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.ingestion.uploadExcel(formData);
      setResult(res.data);
      onSuccess(res.data, false); // false = don't show full overlay, show inline result
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
      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <p className="text-sm font-semibold text-emerald-800 mb-2">Step 1 — Download the template</p>
        <p className="text-xs text-emerald-700 mb-3">Our template includes a Field Guide sheet. No lat/long needed — addresses are geocoded automatically.</p>
        <Button variant="outline" size="sm" onClick={handleDownload} className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
          <Download className="w-4 h-4 mr-2" />Download .xlsx Template
        </Button>
      </div>

      {/* Step 2: Upload */}
      <form onSubmit={handleUpload} className="space-y-4">
        <div className="space-y-2">
          <Label>Step 2 — Upload your completed spreadsheet</Label>
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{file.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
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

        <Button type="submit" disabled={loading || !file} className="w-full bg-emerald-600 hover:bg-emerald-700">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading & geocoding…</> : <>Upload & Import <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </form>

      {/* Inline result */}
      {result && (
        <div className={`rounded-lg border p-4 text-sm space-y-2 ${result.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          {result.type === 'error' ? (
            <>
              <p className="font-semibold text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Validation errors — nothing saved</p>
              <ul className="list-disc list-inside text-red-600 text-xs space-y-0.5">
                {result.errors?.slice(0, 15).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors?.length > 15 && <li>…and {result.errors.length - 15} more</li>}
              </ul>
            </>
          ) : (
            <>
              <p className="font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{result.message}</p>
              {result.geocodeFailed > 0 && (
                <p className="text-amber-600 text-xs">⚠ {result.geocodeFailed} row(s) could not be geocoded — rows {result.geocodeFailRows?.join(', ')}. You can set coordinates later in the Admin Portal.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tier 3: Website Import ───────────────────────────────────────────────────

function WebsiteImportForm({ onSuccess }) {
  const [url, setUrl]           = useState('');
  const [consent, setConsent]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) { toast.error('Please provide your authorisation first'); return; }
    setLoading(true);
    try {
      const res = await api.ingestion.ingestWebsite({ url: url.trim(), consentGiven: true });
      onSuccess(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Your property website URL <span className="text-red-500">*</span></Label>
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
        <span>Our concierge team will extract property details, photos, and room descriptions from the page you provide. This is a human-assisted process and typically takes 1–2 business days.</span>
      </div>

      <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <Checkbox
          id="consent"
          checked={consent}
          onCheckedChange={(v) => setConsent(!!v)}
          className="mt-0.5"
        />
        <label htmlFor="consent" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
          I authorise Channels Connect to extract property data and media from the URL I have provided, solely for the purpose of creating my listing on this platform.
        </label>
      </div>

      <Button type="submit" disabled={loading || !url.trim() || !consent} className="w-full bg-violet-600 hover:bg-violet-700">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : <>Submit to Concierge Team <ArrowRight className="w-4 h-4 ml-2" /></>}
      </Button>
    </form>
  );
}

// ─── Tier 4: Manual Form ──────────────────────────────────────────────────────

const PROPERTY_TYPES = ['House','Apartment','Villa','Condo','Studio','Suite','Cabin','Cottage','Bungalow','Townhouse','Loft','Penthouse','Other'];
const AMENITY_OPTIONS = ['WiFi','Pool','Air Conditioning','Parking','Kitchen','BBQ','Washer/Dryer','Dishwasher','Hot Tub','Gym','Pet Friendly','Wheelchair Accessible','EV Charger','Beach Access','Mountain View','City View'];

function ManualCreateForm({ onSuccess }) {
  const [tab, setTab]     = useState('details');
  const [form, setForm]   = useState({
    title: '', address: '', city: '', state: '', postalCode: '', country: '',
    propertyType: '', maxGuests: '', bedrooms: '', bathrooms: '',
    basePrice: '', currency: 'USD', description: '', houseRules: '',
    cancellationPolicy: '', checkInTime: '', checkOutTime: '', minNights: '1',
    amenities: [],
  });
  const [icalLinks, setIcalLinks]   = useState([]); // { name, url, direction }
  const [newIcal, setNewIcal]       = useState({ name: '', url: '', direction: 'import' });
  const [exportUrl, setExportUrl]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [savedListingId, setSavedListingId] = useState(null);
  const addressRef = useRef(null);
  const autoRef    = useRef(null);

  // Google Places autocomplete
  useEffect(() => {
    if (!window.google?.maps?.places || !addressRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(addressRef.current, { types: ['address'] });
    autoRef.current = ac;
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.address_components) return;
      let street = '', city = '', state = '', zip = '', country = '';
      let streetNo = '';
      place.address_components.forEach((c) => {
        if (c.types.includes('street_number')) streetNo = c.long_name;
        if (c.types.includes('route')) street = c.long_name;
        if (c.types.includes('locality')) city = c.long_name;
        if (c.types.includes('administrative_area_level_1')) state = c.short_name;
        if (c.types.includes('postal_code')) zip = c.long_name;
        if (c.types.includes('country')) country = c.long_name;
      });
      setForm(f => ({
        ...f,
        address: streetNo ? `${streetNo} ${street}` : street,
        city, state, postalCode: zip, country,
      }));
    });
  }, []);

  const toggleAmenity = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
  }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title:        form.title,
        address:      form.address,
        city:         form.city,
        state:        form.state || undefined,
        postalCode:   form.postalCode || undefined,
        country:      form.country || undefined,
        propertyType: form.propertyType || undefined,
        maxGuests:    parseInt(form.maxGuests) || undefined,
        bedrooms:     parseInt(form.bedrooms) || undefined,
        bathrooms:    parseFloat(form.bathrooms) || undefined,
        basePrice:    parseFloat(form.basePrice) || undefined,
        currency:     form.currency,
        description:  form.description || undefined,
        houseRules:   form.houseRules || undefined,
        cancellationPolicy: form.cancellationPolicy || undefined,
        checkInTime:  form.checkInTime || undefined,
        checkOutTime: form.checkOutTime || undefined,
        minNights:    parseInt(form.minNights) || 1,
        amenities:    form.amenities.length ? form.amenities : undefined,
        source:       'manual',
      };
      const res = await api.listings.create(payload);
      const listingId = res.data?.id || res.data?.listing?.id;
      setSavedListingId(listingId);

      // Save iCal connections
      for (const link of icalLinks) {
        await api.ingestion.createIcalConnection({ listingId, name: link.name, icalUrl: link.url, syncDirection: link.direction }).catch(() => {});
      }

      // Compute export URL
      const base = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
      setExportUrl(`${base}/ical/export/${listingId}.ics`);

      setTab('calendar');
      toast.success('Property saved! Add your calendar connections below.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const addIcal = async () => {
    if (!newIcal.url.trim() || !newIcal.name.trim()) return;
    const item = { ...newIcal };
    setIcalLinks(prev => [...prev, item]);
    if (savedListingId) {
      await api.ingestion.createIcalConnection({ listingId: savedListingId, name: item.name, icalUrl: item.url, syncDirection: item.direction }).catch(() => {});
    }
    setNewIcal({ name: '', url: '', direction: 'import' });
    toast.success('Calendar connection added');
  };

  const removeIcal = (i) => setIcalLinks(prev => prev.filter((_, idx) => idx !== i));

  const copyExport = () => {
    navigator.clipboard.writeText(exportUrl);
    toast.success('iCal export URL copied!');
  };

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="details">Property Details</TabsTrigger>
          <TabsTrigger value="calendar" disabled={!savedListingId}>
            <CalendarDays className="w-4 h-4 mr-1.5" />Calendar Connections
            {icalLinks.length > 0 && <Badge className="ml-1.5 text-xs bg-blue-100 text-blue-700 border-blue-200">{icalLinks.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Details ── */}
        <TabsContent value="details">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Property Name <span className="text-red-500">*</span></Label>
                <Input value={form.title} onChange={e => setForm(f=>({...f, title: e.target.value}))} placeholder="Beachfront Villa Miami" required />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Street Address <span className="text-red-500">*</span></Label>
                <Input ref={addressRef} value={form.address} onChange={e => setForm(f=>({...f, address: e.target.value}))} placeholder="Start typing — Google will autocomplete…" required />
              </div>
              <div className="space-y-1.5">
                <Label>City <span className="text-red-500">*</span></Label>
                <Input value={form.city} onChange={e => setForm(f=>({...f, city: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label>State / Province</Label>
                <Input value={form.state} onChange={e => setForm(f=>({...f, state: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Zip / Postal Code</Label>
                <Input value={form.postalCode} onChange={e => setForm(f=>({...f, postalCode: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country} onChange={e => setForm(f=>({...f, country: e.target.value}))} placeholder="USA" />
              </div>
              <div className="space-y-1.5">
                <Label>Property Type</Label>
                <Select value={form.propertyType} onValueChange={v => setForm(f=>({...f, propertyType: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Max Guests <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" value={form.maxGuests} onChange={e => setForm(f=>({...f, maxGuests: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Bedrooms</Label>
                <Input type="number" min="0" value={form.bedrooms} onChange={e => setForm(f=>({...f, bedrooms: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Bathrooms</Label>
                <Input type="number" min="0" step="0.5" value={form.bathrooms} onChange={e => setForm(f=>({...f, bathrooms: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Base Nightly Rate <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" value={form.basePrice} onChange={e => setForm(f=>({...f, basePrice: e.target.value}))} placeholder="250" required />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input maxLength={3} value={form.currency} onChange={e => setForm(f=>({...f, currency: e.target.value.toUpperCase()}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Check-in Time</Label>
                <Input value={form.checkInTime} onChange={e => setForm(f=>({...f, checkInTime: e.target.value}))} placeholder="3:00 PM" />
              </div>
              <div className="space-y-1.5">
                <Label>Check-out Time</Label>
                <Input value={form.checkOutTime} onChange={e => setForm(f=>({...f, checkOutTime: e.target.value}))} placeholder="11:00 AM" />
              </div>
              <div className="space-y-1.5">
                <Label>Min Nights</Label>
                <Input type="number" min="1" value={form.minNights} onChange={e => setForm(f=>({...f, minNights: e.target.value}))} />
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(a => (
                  <button
                    key={a} type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.amenities.includes(a) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'}`}
                  >
                    {form.amenities.includes(a) ? '✓ ' : ''}{a}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={e => setForm(f=>({...f, description: e.target.value}))} placeholder="Describe your property…" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>House Rules</Label>
                <Input value={form.houseRules} onChange={e => setForm(f=>({...f, houseRules: e.target.value}))} placeholder="No smoking, No parties…" />
              </div>
              <div className="space-y-1.5">
                <Label>Cancellation Policy</Label>
                <Select value={form.cancellationPolicy} onValueChange={v => setForm(f=>({...f, cancellationPolicy: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['Flexible','Moderate','Strict','Non-refundable'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : <>Save Property & Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </form>
        </TabsContent>

        {/* ── Calendar Connections ── */}
        <TabsContent value="calendar" className="space-y-5">
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Import Calendar (Inbound)</h3>
            <p className="text-xs text-slate-500">Paste iCal links from Airbnb, VRBO, Booking.com, or any calendar app to sync availability into your property.</p>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input placeholder="Label (e.g. Airbnb Calendar)" value={newIcal.name} onChange={e => setNewIcal(n=>({...n, name: e.target.value}))} />
              <Input placeholder="https://…/calendar.ics" value={newIcal.url} onChange={e => setNewIcal(n=>({...n, url: e.target.value}))} className="sm:col-span-2" />
            </div>
            <div className="flex items-center gap-3">
              <Select value={newIcal.direction} onValueChange={v => setNewIcal(n=>({...n, direction: v}))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="import">Import (inbound)</SelectItem>
                  <SelectItem value="export">Export (outbound)</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" onClick={addIcal} disabled={!newIcal.url.trim() || !newIcal.name.trim()} size="sm">
                Add Connection
              </Button>
            </div>

            {icalLinks.length > 0 && (
              <div className="space-y-2">
                {icalLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <Badge variant="outline" className="text-xs">{link.direction}</Badge>
                    <span className="font-medium text-sm text-slate-700 shrink-0">{link.name}</span>
                    <span className="text-xs text-slate-400 truncate flex-1">{link.url}</span>
                    <button type="button" onClick={() => removeIcal(i)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export section */}
          {exportUrl && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600" />Export Your Calendar (Outbound)
              </h3>
              <p className="text-xs text-slate-500">Share this link with Airbnb, VRBO, or any calendar app so they can subscribe to your availability.</p>
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

          <Button onClick={() => onSuccess({ listingId: savedListingId })} className="w-full">
            <CheckCircle2 className="w-4 h-4 mr-2" />Done — View My Listings
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function PropertyIngestionHubContent() {
  const navigate     = useNavigate();
  const [activeTier, setActiveTier] = useState(null);
  const [success, setSuccess]       = useState(null);

  const handleSuccess = (data, showOverlay = true) => {
    if (!showOverlay) return; // Excel shows inline result
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
        <p className="text-slate-500 mt-1 text-sm">Choose how you'd like to bring your properties into Channels Connect.</p>
      </div>

      {/* Tier selection grid */}
      {!activeTier && (
        <div className="grid sm:grid-cols-2 gap-5">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const c = colorMap[tier.color];
            return (
              <button
                key={tier.id}
                onClick={() => setActiveTier(tier.id)}
                className={`text-left p-6 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:${c.ring} hover:ring-2 transition-all group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 ${c.bg} rounded-xl`}>
                    <Icon className={`w-6 h-6 ${c.icon}`} />
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${c.badge}`}>{tier.badge}</span>
                </div>
                <p className="font-bold text-slate-900 text-base">{tier.label}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{tier.sub}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{tier.desc}</p>
                <div className={`flex items-center gap-1 mt-4 text-xs font-semibold ${c.icon} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </div>
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
            <button onClick={() => setActiveTier(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
              ← Back to options
            </button>
            <Card className={`border-2 ${c.ring}`}>
              <CardHeader className={`${c.bg} border-b border-slate-100`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-white rounded-lg shadow-sm`}>
                    <Icon className={`w-5 h-5 ${c.icon}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tier.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{tier.sub}</CardDescription>
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
          message={success.message || 'Your property has been submitted. Our team will notify you when it\'s ready.'}
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

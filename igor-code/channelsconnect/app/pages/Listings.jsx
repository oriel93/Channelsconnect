
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Listing } from '@/api/entities';
import { Loader2, Home, MapPin, Users, Plus, Download, X, Upload, FileSpreadsheet, Map as MapIcon, Calendar, Sparkles, ChevronRight } from 'lucide-react';
import { downloadListingsCSV } from '../lib/exportListings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import apiClient, { api } from '@/lib/apiClient';
import * as XLSX from 'xlsx';

// ─── Google Maps Places Autocomplete hook ────────────────────────────────────
// Loads the Maps JS API lazily; degrades gracefully if key is missing.
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function useMapsLoaded() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!MAPS_KEY) return;
    if (window.google?.maps?.places) { setLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
    return () => {};
  }, []);
  return loaded;
}

// ─── Tab 1: iCal / PMS Import ────────────────────────────────────────────────
function ICalTab({ onImported }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!url.trim()) { setError('Please enter a URL'); return; }
    setLoading(true); setError(''); setEvents(null);
    try {
      const res = await apiClient.post('/listings/import/ical', { url: url.trim() });
      setEvents(res.data.events || []);
      toast.success(`Parsed ${res.data.count} events from iCal feed`);
      onImported?.(res.data.events);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Import failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Paste an iCal (.ics) URL from Airbnb, VRBO, Google Calendar, or any PMS that exports iCal.
      </p>
      <div className="space-y-2">
        <Label htmlFor="ical-url">iCal URL</Label>
        <div className="flex gap-2">
          <Input
            id="ical-url"
            placeholder="https://airbnb.com/calendar/ical/..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleImport} disabled={loading || !url.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {events !== null && (
        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-800">
            ✓ {events.length} events parsed successfully
          </p>
          {events.slice(0, 5).map((ev, i) => (
            <div key={i} className="text-xs text-green-700 mt-1">
              • {ev.summary} — {new Date(ev.dtstart).toLocaleDateString()} → {new Date(ev.dtend).toLocaleDateString()}
            </div>
          ))}
          {events.length > 5 && <div className="text-xs text-green-600 mt-1">…and {events.length - 5} more</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Excel Bulk Upload ─────────────────────────────────────────────────
const EXCEL_COLUMN_MAP = {
  'Title':                     'title',
  'Property Type':             'propertyType',
  'Address':                   'address',
  'City':                      'city',
  'Country':                   'country',
  'Zip':                       'postalCode',
  'Latitude':                  'latitude',
  'Longitude':                 'longitude',
  'Max Occupancy':             'maxGuests',
  'Bedrooms':                  'bedrooms',
  'Bathrooms':                 'bathrooms',
  'Bed Breakdown':             'beds',
  'Base Price':                'basePrice',
  'Amenities (comma-separated)': 'amenities',
  'Description':               'description',
};

function ExcelTab({ onImported }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/listings/bulk-template`;
  };

  const handleFileSelect = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please select an .xlsx, .xls, or .csv file');
      return;
    }
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headers = data[0] || [];
        const parsed = data.slice(1)
          .filter((row) => row.some((cell) => cell !== '' && cell != null))
          .map((row) => {
            const obj = {};
            headers.forEach((h, i) => {
              const key = EXCEL_COLUMN_MAP[h];
              if (key) obj[key] = row[i] != null ? String(row[i]).trim() : '';
            });
            return obj;
          });
        setRows(parsed);
      } catch (err) {
        setError(`Could not parse file: ${err?.message}`);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleImport = async () => {
    if (!rows?.length) return;
    setLoading(true); setResults(null); setError('');
    try {
      const res = await apiClient.post('/listings/bulk-import', rows);
      setResults(res.data);
      toast.success(`Imported ${res.data.created} listing(s)`);
      onImported?.(res.data.created);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Import failed';
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Upload an Excel file with your property data.</p>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="w-4 h-4 mr-1" /> Download Template
        </Button>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
        <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-green-700">{file.name} — {rows?.length ?? 0} rows detected</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-blue-600">Click to browse or drag &amp; drop</p>
            <p className="text-xs text-slate-500 mt-1">.xlsx / .xls / .csv</p>
          </>
        )}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {rows?.length > 0 && !results && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">{rows.length} listings ready to import.</p>
          <Button onClick={handleImport} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing…</> : <><Upload className="w-4 h-4 mr-2" />Import {rows.length} Listings</>}
          </Button>
        </div>
      )}

      {results && (
        <div className="border rounded-lg p-4 bg-green-50 border-green-200 space-y-1">
          <p className="text-sm font-medium text-green-800">✓ {results.created} listing(s) created</p>
          {results.failed?.map((f, i) => (
            <p key={i} className="text-xs text-red-600">Row {f.index + 1}: {f.error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Manual Entry with Google Maps ────────────────────────────────────
const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Condo', 'Townhouse', 'Studio', 'Loft', 'Cabin', 'Cottage', 'Other'];

function ManualTab({ onImported }) {
  const mapsLoaded = useMapsLoaded();
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', propertyType: '', address: '', city: '', country: '',
    postalCode: '', latitude: '', longitude: '', maxGuests: '', bedrooms: '',
    bathrooms: '', basePrice: '',
  });

  // Wire up Google Maps Places Autocomplete on the address field
  useEffect(() => {
    if (!mapsLoaded || !addressInputRef.current) return;
    if (autocompleteRef.current) return; // already set up
    const ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      types: ['address'],
    });
    autocompleteRef.current = ac;
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry) return;

      const comps = place.address_components || [];
      const get = (type) => comps.find((c) => c.types.includes(type))?.long_name || '';
      const getShort = (type) => comps.find((c) => c.types.includes(type))?.short_name || '';

      setForm((prev) => ({
        ...prev,
        address: place.formatted_address || prev.address,
        city: get('locality') || get('sublocality') || get('postal_town'),
        country: get('country'),
        postalCode: get('postal_code'),
        latitude: place.geometry.location.lat().toFixed(6),
        longitude: place.geometry.location.lng().toFixed(6),
      }));
    });
  }, [mapsLoaded]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        maxGuests:  form.maxGuests  ? Number(form.maxGuests)  : undefined,
        bedrooms:   form.bedrooms   ? Number(form.bedrooms)   : undefined,
        bathrooms:  form.bathrooms  ? Number(form.bathrooms)  : undefined,
        basePrice:  form.basePrice  ? Number(form.basePrice)  : undefined,
        latitude:   form.latitude   ? Number(form.latitude)   : undefined,
        longitude:  form.longitude  ? Number(form.longitude)  : undefined,
      };
      const res = await apiClient.post('/listings', payload);
      toast.success(`Listing "${res.data?.title}" created!`);
      onImported?.(res.data);
      setForm({ title:'', propertyType:'', address:'', city:'', country:'', postalCode:'', latitude:'', longitude:'', maxGuests:'', bedrooms:'', bathrooms:'', basePrice:'' });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create listing';
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!MAPS_KEY && (
        <Alert>
          <AlertDescription className="text-xs">
            Google Maps autocomplete is unavailable (VITE_GOOGLE_MAPS_API_KEY not set). You can still fill in the address manually.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <Label>Title *</Label>
          <Input placeholder="Beachfront Villa in Malibu" value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Property Type</Label>
          <Select value={form.propertyType} onValueChange={(v) => handleChange('propertyType', v)}>
            <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Base Price (per night)</Label>
          <Input type="number" placeholder="150" value={form.basePrice} onChange={(e) => handleChange('basePrice', e.target.value)} />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label>Address {mapsLoaded && <span className="text-xs text-green-600 ml-1">✓ Maps autocomplete ready</span>}</Label>
          <Input
            ref={addressInputRef}
            placeholder="123 Ocean Drive, Malibu, CA"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>City</Label>
          <Input placeholder="Malibu" value={form.city} onChange={(e) => handleChange('city', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Country</Label>
          <Input placeholder="United States" value={form.country} onChange={(e) => handleChange('country', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Zip / Postal Code</Label>
          <Input placeholder="90265" value={form.postalCode} onChange={(e) => handleChange('postalCode', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Max Guests</Label>
          <Input type="number" placeholder="6" value={form.maxGuests} onChange={(e) => handleChange('maxGuests', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Bedrooms</Label>
          <Input type="number" placeholder="3" value={form.bedrooms} onChange={(e) => handleChange('bedrooms', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Bathrooms</Label>
          <Input type="number" placeholder="2" value={form.bathrooms} onChange={(e) => handleChange('bathrooms', e.target.value)} />
        </div>

        {(form.latitude || form.longitude) && (
          <div className="sm:col-span-2 text-xs text-green-600 bg-green-50 rounded px-3 py-2">
            📍 Coordinates auto-filled: {form.latitude}, {form.longitude}
          </div>
        )}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Button onClick={handleSubmit} disabled={loading || !form.title.trim()} className="w-full">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating…</> : <><Plus className="w-4 h-4 mr-2" />Create Listing</>}
      </Button>
    </div>
  );
}

// ─── Onboarding Modal ────────────────────────────────────────────────────────
function OnboardingModal({ open, onClose, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Add Properties
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ical" className="mt-2">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="ical" className="text-xs sm:text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              PMS / iCal
            </TabsTrigger>
            <TabsTrigger value="excel" className="text-xs sm:text-sm">
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Excel Bulk
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-xs sm:text-sm">
              <MapIcon className="w-4 h-4 mr-1" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ical">
            <ICalTab onImported={() => { onSuccess?.(); }} />
          </TabsContent>

          <TabsContent value="excel">
            <ExcelTab onImported={() => { onSuccess?.(); onClose(); }} />
          </TabsContent>

          <TabsContent value="manual">
            <ManualTab onImported={() => { onSuccess?.(); onClose(); }} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main listings grid ──────────────────────────────────────────────────────
const ListingsContent = () => {
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const userListings = await Listing.find();
            setListings(userListings || []);
        } catch (error) {
            console.error("Failed to fetch listings", error);
            setListings([]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Your Properties</h1>
                <div className="flex gap-2">
                    {listings.length > 0 && (
                        <Button variant="outline" onClick={() => downloadListingsCSV(listings)}>
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    )}
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Properties
                    </Button>
                </div>
            </div>

            {listings.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <Home className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No properties yet</h3>
                    <p className="text-slate-500 mb-4">Import your first property to get started.</p>
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Properties
                    </Button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listings.map(listing => (
                        <div key={listing.id} className="relative group">
                            <Link to={createPageUrl(`ListingDetail?id=${listing.id}`)} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg">
                                <Card className="h-full flex flex-col overflow-hidden">
                                <div className="aspect-video bg-slate-100 overflow-hidden relative group flex items-center justify-center">
                                    <Home className="w-12 h-12 text-slate-300" />
                                    {listing.beds24RoomId && (
                                        <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                                            Channels Connect
                                        </div>
                                    )}
                                </div>

                                <CardHeader className="pb-3 flex-grow">
                                    <CardTitle className="text-base line-clamp-2 flex-1">{listing.title}</CardTitle>
                                    {(listing.city || listing.country) && (
                                        <CardDescription className="flex items-center gap-1 text-slate-500 pt-1">
                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                            <span className="line-clamp-1 text-xs">
                                                {[listing.city, listing.state, listing.country].filter(Boolean).join(', ')}
                                            </span>
                                        </CardDescription>
                                    )}
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex gap-3 text-sm text-slate-600">
                                            {listing.maxGuests && (
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    <span>{listing.maxGuests}</span>
                                                </div>
                                            )}
                                        </div>
                                        <Badge variant={listing.isActive ? "default" : "secondary"} className="text-xs">
                                            {listing.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    {/* Listing status indicator — Channex sync is handled by Admin Portal */}
                                    {listing.isActive && (
                                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                                            <span>🚀</span>
                                            <span>Your listing is being boosted!</span>
                                        </div>
                                    )}
                                </CardContent>
                                </Card>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            <OnboardingModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={() => {
                    fetchData();
                }}
            />
        </div>
    );
};

export default function Listings() {
    useEffect(() => {
        document.title = "My Listings | Channels Connect";
    }, []);

    return (
        <NewLoginRequired>
            <AppLayout>
                <ListingsContent />
            </AppLayout>
        </NewLoginRequired>
    );
}

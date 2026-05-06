/**
 * AdminDashboard.jsx - Super Admin Portal
 *
 * Protected by role check: only renders useful content when user.role === 'admin'.
 * Non-admin users see a 403 screen.
 *
 * Features:
 *   - Platform stats (total users, listings, bookings)
 *   - Global user table with listing/booking counts
 *   - Global listings table with owner email
 *   - "Download Global CSV" button → hits GET /admin/export/listings
 *
 * SAFE: Zero changes to Channex sync, webhook, or ARI logic.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Building2,
  BookOpen,
  TrendingUp,
  Download,
  Loader2,
  ShieldAlert,
  RefreshCw,
  Search,
  Crown,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  Save,
  ClipboardList,
  ImageIcon,
  ArrowLeft,
  Zap,
  Power,
  AlertTriangle,
  Sparkles,
  Globe,
  Link2,
  ExternalLink,
  CheckCircle,
  Loader,
  Shield,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/apiClient';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">
            {value ?? <Loader2 className="w-6 h-6 animate-spin inline text-slate-400" />}
          </p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-full`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── SyncButton — smart Publish vs Sync Updates ────────────────────────────────
/**
 * Lazy-loads sync state on first render, then shows:
 *   - "Publish to Channex"  when no channex record exists
 *   - "Sync Updates"        when one already exists
 *   - Loading spinner       while state is being fetched or sync running
 */
const SyncButton = ({ listingId, syncStates, syncingListingId, onSync, onLoadState, listingTitle, compact }) => {
  const [loading, setLoading] = React.useState(false);
  const state = syncStates[listingId];
  const isSyncing = syncingListingId === listingId;

  React.useEffect(() => {
    if (!state && !loading) {
      setLoading(true);
      onLoadState(listingId).finally(() => setLoading(false));
    }
  }, [listingId]); // eslint-disable-line

  const isPublished  = state?.hasChannexRecord;
  const statusColor  = isPublished
    ? (state?.syncStatus === 'error' ? 'bg-red-600 hover:bg-red-700'
       : state?.syncStatus === 'partial_sync' ? 'bg-blue-500 hover:bg-blue-600'
       : 'bg-violet-600 hover:bg-violet-700')
    : 'bg-blue-600 hover:bg-blue-700';

  const label = loading || !state
    ? null
    : isPublished ? 'Sync Updates' : 'Publish to Channex';

  const icon = isPublished ? <Zap className="w-3.5 h-3.5 mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />;

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        className={`${statusColor} text-white text-xs`}
        disabled={isSyncing || loading}
        onClick={() => onSync(listingId, listingTitle)}
      >
        {isSyncing || loading
          ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />{isSyncing ? 'Syncing…' : ''}</>
          : <>{icon}{label}</>}
      </Button>
      {!compact && isPublished && state?.channexPropertyId && (
        <span className="text-xs text-slate-400 font-mono truncate max-w-[140px]" title={state.channexPropertyId}>
          ID: {state.channexPropertyId.slice(0, 8)}…
        </span>
      )}
    </div>
  );
};


// ─── Markup Panel (admin-only) ────────────────────────────────────────────────
function MarkupPanel() {
  const [users,   setUsers]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving,  setSaving]  = React.useState({});
  const [drafts,  setDrafts]  = React.useState({});

  React.useEffect(() => {
    api.admin.getMarkupSettings()
      .then(r => {
        setUsers(r.data.users || []);
        const d = {};
        (r.data.users || []).forEach(u => { d[u.id] = String(Number(u.adminMarkup ?? 0)); });
        setDrafts(d);
      })
      .catch(() => toast.error('Failed to load markup settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (userId) => {
    const val = parseFloat(drafts[userId]);
    if (isNaN(val) || val < -100 || val > 500) { toast.error('Markup must be -100 to 500'); return; }
    setSaving(s => ({ ...s, [userId]: true }));
    try {
      await api.admin.setUserMarkup(userId, val);
      setUsers(u => u.map(x => x.id === userId ? { ...x, adminMarkup: val } : x));
      toast.success(`Markup set to ${val >= 0 ? '+' : ''}${val}%`);
    } catch (e) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(s => ({ ...s, [userId]: false })); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading markup settings…</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          💹 Rate Markup
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Set a percentage markup applied to <strong>all rates before they are pushed to Channex</strong>.
          The rate stored in your database is never changed — only what Channex receives is adjusted.
          Use this to bake your management fee into the channel price per client.
        </p>
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 max-w-2xl">
          <strong>⚠️ Admin only — users never see this.</strong> A markup of 10% means a stored $100 rate
          is pushed to Channex as $110. A value of 0 means no change (pass-through).
          Negative values are allowed for discounts.
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Listings</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-52">Markup</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[160px]">
                    <span className="block truncate" title={u.name || ''}>{u.name || <em className="text-slate-400 font-normal">No name</em>}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[220px]">
                    <span className="block truncate" title={u.email}>{u.email}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{u._count?.listings ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                        Number(u.adminMarkup) > 0 ? 'bg-emerald-100 text-emerald-700' :
                        Number(u.adminMarkup) < 0 ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {Number(u.adminMarkup) > 0 ? '+' : ''}{Number(u.adminMarkup ?? 0).toFixed(1)}% live
                      </span>
                      <div className="relative w-24 shrink-0">
                        <input
                          type="number" min="-100" max="500" step="0.5"
                          value={drafts[u.id] ?? '0'}
                          onChange={e => setDrafts(d => ({ ...d, [u.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && save(u.id)}
                          className="w-full border border-slate-200 rounded-lg px-3 pr-7 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-sans"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                      </div>
                      <Button size="sm" onClick={() => save(u.id)} disabled={saving[u.id]}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3 shrink-0">
                        {saving[u.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="text-center text-slate-400 py-10 text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  // Auth from shared AuthProvider - no extra round-trip, role available immediately
  const { user: currentUser, isAdmin, isLoadingAuth } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [mediaListingId, setMediaListingId] = useState(null);
  const [mediaListingTitle, setMediaListingTitle] = useState('');
  const [listingImages, setListingImages] = useState([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [syncingListingId, setSyncingListingId] = useState(null);
  const [updatingRoleId, setUpdatingRoleId]     = useState(null); // userId whose role is being updated

  // ── Review Queue state ───────────────────────────────────────────────────────────
  const [pendingListings, setPendingListings] = useState([]);
  const [conciergeQueue, setConciergeQueue]   = useState([]);
  const [isLoadingConcierge, setIsLoadingConcierge] = useState(false);
  const [conciergeDraft, setConciergeDraft]   = useState({}); // listingId → patch fields
  const [completingId, setCompletingId]       = useState(null);
  const [reviewListing, setReviewListing]     = useState(null);  // currently open in edit modal
  const [reviewForm, setReviewForm]           = useState({});    // live-edited fields
  const [savingReview, setSavingReview]       = useState(false);
  const [approvingId, setApprovingId]         = useState(null);
  const [rejectingId, setRejectingId]         = useState(null);
  const [rejectReason, setRejectReason]       = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTarget, setRejectTarget]       = useState(null);
  const [isLoadingQueue, setIsLoadingQueue]   = useState(false);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const [statsRes, usersRes, listingsRes] = await Promise.allSettled([
        api.admin.getStats(),
        api.admin.getUsers(),
        api.admin.getListings(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data || []);
      if (listingsRes.status === 'fulfilled') setListings(listingsRes.value.data || []);

      if (statsRes.status === 'rejected') toast.error('Could not load platform stats');
    } catch (err) {
      toast.error('Failed to load admin data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const fetchPendingQueue = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingQueue(true);
    try {
      const res = await api.admin.getPendingReview();
      setPendingListings(res.data || []);
    } catch (err) {
      toast.error('Could not load review queue');
    } finally {
      setIsLoadingQueue(false);
    }
  }, [isAdmin]);

  const fetchConciergeQueue = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingConcierge(true);
    try {
      const res = await api.admin.getConciergeQueue();
      setConciergeQueue(res.data || []);
    } catch (err) {
      toast.error('Could not load concierge queue');
    } finally {
      setIsLoadingConcierge(false);
    }
  }, [isAdmin]);

  const handleCompleteConciergeListing = async (listingId) => {
    const draft = conciergeDraft[listingId] || {};
    if (!draft.title) { toast.error('Title is required before approving'); return; }
    setCompletingId(listingId);
    try {
      await api.admin.completeConciergeListing(listingId, draft);
      setConciergeQueue(prev => prev.filter(l => l.id !== listingId));
      setConciergeDraft(prev => { const n = {...prev}; delete n[listingId]; return n; });
      toast.success('Listing approved and sent to user!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not complete listing');
    } finally {
      setCompletingId(null);
    }
  };

  const handleOpenReview = (listing) => {
    setReviewListing(listing);
    setReviewForm({
      title:        listing.title || '',
      description:  listing.description || '',
      address:      listing.address || '',
      city:         listing.city || '',
      state:        listing.state || '',
      country:      listing.country || '',
      postalCode:   listing.postalCode || '',
      propertyType: listing.propertyType || '',
      bedrooms:     listing.bedrooms ?? '',
      bathrooms:    listing.bathrooms ?? '',
      maxGuests:    listing.maxGuests ?? '',
      basePrice:    listing.basePrice ?? '',
      amenities:    Array.isArray(listing.amenities) ? listing.amenities.join(', ') : '',
      houseRules:   listing.houseRules || '',
    });
  };

  const handleSaveReview = async () => {
    if (!reviewListing) return;
    setSavingReview(true);
    try {
      const payload = {
        ...reviewForm,
        bedrooms:  reviewForm.bedrooms  !== '' ? Number(reviewForm.bedrooms)  : undefined,
        bathrooms: reviewForm.bathrooms !== '' ? Number(reviewForm.bathrooms) : undefined,
        maxGuests: reviewForm.maxGuests !== '' ? Number(reviewForm.maxGuests) : undefined,
        basePrice: reviewForm.basePrice !== '' ? Number(reviewForm.basePrice) : undefined,
        amenities: reviewForm.amenities
          ? reviewForm.amenities.split(',').map(a => a.trim()).filter(Boolean)
          : [],
      };
      await api.admin.updateReviewListing(reviewListing.id, payload);
      toast.success('Changes saved');
      // Update local state
      setPendingListings(prev => prev.map(l => l.id === reviewListing.id ? { ...l, ...payload } : l));
      setReviewListing(prev => ({ ...prev, ...payload }));
    } catch (err) {
      toast.error('Save failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSavingReview(false);
    }
  };

  const handleApprove = async (listingId) => {
    setApprovingId(listingId);
    try {
      const res = await api.admin.approveListing(listingId);
      toast.success(`" ${res.data.title} " approved and is now live ✓`);
      setPendingListings(prev => prev.filter(l => l.id !== listingId));
      if (reviewListing?.id === listingId) setReviewListing(null);
      fetchData(); // refresh stats
    } catch (err) {
      toast.error('Approval failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejectingId(rejectTarget.id);
    try {
      await api.admin.rejectListing(rejectTarget.id, rejectReason || undefined);
      toast.success(`" ${rejectTarget.title} " rejected`);
      setPendingListings(prev => prev.filter(l => l.id !== rejectTarget.id));
      if (reviewListing?.id === rejectTarget.id) setReviewListing(null);
    } catch (err) {
      toast.error('Rejection failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setRejectingId(null);
      setShowRejectDialog(false);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      fetchPendingQueue();
    }
  }, [isAdmin, fetchData, fetchPendingQueue]);

  // ── Channex Sync Engine ───────────────────────────────────────────────────
  // syncStates: Map<listingId, { hasChannexRecord, channexPropertyId, syncStatus, lastSyncAt }>
  const [syncStates, setSyncStates]       = useState({});
  const [syncError, setSyncError]         = useState(null); // { listingId, message }
  const [deactivatingId, setDeactivatingId] = useState(null);

  /** Fetch sync state for a single listing and cache it */
  const loadSyncState = useCallback(async (listingId) => {
    try {
      const res = await api.admin.getListingSyncState(listingId);
      setSyncStates(prev => ({ ...prev, [listingId]: res.data }));
      return res.data;
    } catch {
      return null;
    }
  }, []);

  /** Intelligent sync: POST if new, PUT if exists. Surfaces Channex errors verbatim. */
  const handleSyncToChannex = async (listingId, listingTitle) => {
    if (syncingListingId === listingId) return;
    setSyncingListingId(listingId);
    setSyncError(null);
    try {
      const res = await api.admin.syncListingToChannex(listingId);
      const result = res.data;

      if (result.outcome === 'synced') {
        const op = result.operation === 'created' ? 'Published' : 'Updated';
        toast.success(
          `${op} "${listingTitle}" on Channex ✓ - ID: ${result.channexPropertyId}`
        );
        // Refresh sync state badge
        await loadSyncState(listingId);
        fetchData();
      } else if (result.outcome === 'partial_sync') {
        toast.warning(`"${listingTitle}" partially synced - property created but room type failed`);
        setSyncError({ listingId, message: result.errorMessage || 'Room type creation failed' });
        await loadSyncState(listingId);
      } else {
        // outcome === 'error'
        const msg = result.errorMessage || 'Channex sync failed';
        setSyncError({ listingId, message: msg });
        toast.error(`Sync Failed: ${msg}`);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Sync failed';
      setSyncError({ listingId, message: msg });
      toast.error(`Sync Failed: ${msg}`);
    } finally {
      setSyncingListingId(null);
    }
  };

  /** Deactivate on Channex and archive locally */
  const handleDeactivate = async (listingId, listingTitle) => {
    if (!confirm(`Deactivate "${listingTitle}" on Channex? This will set it inactive and archive it locally.`)) return;
    setDeactivatingId(listingId);
    setSyncError(null);
    try {
      await api.admin.deactivateListing(listingId);
      toast.success(`"${listingTitle}" deactivated on Channex and archived locally.`);
      await loadSyncState(listingId);
      fetchData();
      // Remove from review queue if present
      setPendingListings(prev => prev.filter(l => l.id !== listingId));
      if (reviewListing?.id === listingId) setReviewListing(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Deactivation failed';
      setSyncError({ listingId, message: msg });
      toast.error(`Deactivation Failed: ${msg}`);
    } finally {
      setDeactivatingId(null);
    }
  };

  /** Compute smart button label from cached sync state */
  const getSyncButtonLabel = (listingId) => {
    const state = syncStates[listingId];
    if (!state) return null; // not yet loaded
    return state.hasChannexRecord ? 'Sync Updates' : 'Publish to Channex';
  };

  // ── Role management ─────────────────────────────────────────────────────────
  const SUPER_ADMIN_EMAIL = 'oriel@erorentals.com';

  const handleRoleChange = async (userId, newRole, userEmail) => {
    if (userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return;
    setUpdatingRoleId(userId);
    try {
      await api.admin.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update role: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await api.admin.exportListingsBlob();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `channels_connect_global_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 150);
      toast.success('Global CSV downloaded.');
    } catch (err) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>You must be logged in to access the Admin Portal.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>403 - Access Denied.</strong> Admin role required.
            <br />
            <span className="text-sm">Your current role: <code>{currentUser.role || 'user'}</code></span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Admin UI ───────────────────────────────────────────────────────────────

  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredListings = listings.filter(
    (l) =>
      !listingSearch ||
      l.title?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.city?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.user?.email?.toLowerCase().includes(listingSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Crown className="w-7 h-7 text-purple-500" />
            Admin Portal
          </h1>
          <p className="text-slate-500 mt-1">
            Global platform management - logged in as{' '}
            <span className="font-medium">{currentUser.email}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Download Global CSV</>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.userCount} icon={Users} color="blue" />
        <StatCard title="Total Listings" value={stats?.listingCount} icon={Building2} color="green"
          subtitle={`${stats?.activeListings ?? '-'} active`} />
        <StatCard title="Total Bookings" value={stats?.bookingCount} icon={BookOpen} color="purple" />
        <StatCard title="Active Listings" value={stats?.activeListings} icon={TrendingUp} color="purple"
          subtitle={stats ? `${Math.round((stats.activeListings / Math.max(stats.listingCount, 1)) * 100)}% of total` : null} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
          <TabsTrigger value="media">Media Manager</TabsTrigger>
          <TabsTrigger value="concierge" onClick={fetchConciergeQueue} className="relative">
            <Sparkles className="w-4 h-4 mr-1" />
            Concierge Queue
            {conciergeQueue.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-white text-xs font-bold">
                {conciergeQueue.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="markup">Rate Markup</TabsTrigger>
          <TabsTrigger value="review" onClick={fetchPendingQueue} className="relative">
            <ClipboardList className="w-4 h-4 mr-1" />
            Review Queue
            {pendingListings.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {pendingListings.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Users Tab ── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Platform Users</span>
                <SearchInput
                    className="w-64"
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onClear={() => setUserSearch('')}
                  />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Name</TableHead>
                        <TableHead className="w-48">Email</TableHead>
                        <TableHead className="w-28">Role</TableHead>
                        <TableHead className="text-right w-16">Listings</TableHead>
                        <TableHead className="text-right w-16">Bookings</TableHead>
                        <TableHead className="w-24">Sync Status</TableHead>
                        <TableHead className="w-24">Joined</TableHead>
                        <TableHead className="w-10" title="Terms of Service consent">ToS</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium max-w-[128px]"><span className="block truncate" title={u.name || ''}>{u.name || '-'}</span></TableCell>
                            <TableCell className="text-slate-600 max-w-[192px]"><span className="block truncate" title={u.email || ''}>{u.email}</span></TableCell>
                            <TableCell>
                              {/* Role selector — locked for super-admin */}
                              {u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-300 rounded-full px-2.5 py-0.5">
                                  🔒 super-admin
                                </span>
                              ) : (
                                <select
                                  value={u.role || 'user'}
                                  disabled={updatingRoleId === u.id}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value, u.email)}
                                  className="font-sans text-gray-900 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                >
                                  <option value="user">user</option>
                                  <option value="admin">admin</option>
                                </select>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{u._count?.listings ?? 0}</TableCell>
                            <TableCell className="text-right">{u._count?.bookings ?? 0}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {u.syncStatus || 'idle'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                            </TableCell>
                            {/* ToS consent status */}
                            <TableCell>
                              {u.tosAcceptedAt ? (
                                <span title={`ToS accepted at: ${new Date(u.tosAcceptedAt).toLocaleString()}`} className="flex items-center gap-1">
                                  <Shield className="w-4 h-4 text-emerald-500" />
                                </span>
                              ) : (
                                <span title="No consent recorded">
                                  <Shield className="w-4 h-4 text-slate-300" />
                                </span>
                              )}
                            </TableCell>
                            {/* Extract data */}
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtractUserData(u.id, u.email)}
                              >
                                <Download className="w-3.5 h-3.5 mr-1" />Extract
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Media Manager Tab ── */}
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {mediaListingId ? (
                  <>
                    <Button variant="ghost" size="sm"
                      onClick={() => { setActiveTab('listings'); setMediaListingId(null); setListingImages([]); }}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                    Media: <span className="font-normal text-slate-600 ml-1">{mediaListingTitle}</span>
                  </>
                ) : (
                  <><ImageIcon className="w-5 h-5" /> Admin Image Converter</>
                )}
              </CardTitle>
              {mediaListingId && (
                <p className="text-sm text-slate-500">
                  Images are converted server-side via <strong>sharp</strong> (max 1920×1080, JPEG 92%).
                  Click <em>Convert to High-Res</em> on any image.
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!mediaListingId ? (
                <div className="text-center py-12 text-slate-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">Go to the <strong>Listings</strong> tab and click <strong>Media</strong> on any listing.</p>
                </div>
              ) : isLoadingImages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : listingImages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No images found for this listing.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {listingImages.map((img) => (
                    <div key={img.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                      <div className="aspect-video relative bg-slate-100">
                        <img
                          src={img.highResUrl || img.url}
                          alt={img.filename || 'Property image'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {img.highResConvertedAt && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-emerald-500 text-white text-xs px-1.5 py-0.5">
                              <Sparkles className="w-3 h-3 mr-1" />Hi-Res
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-medium truncate">{img.filename || `Image #${img.id}`}</p>
                        {img.highResConvertedAt && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Converted {new Date(img.highResConvertedAt).toLocaleDateString()}
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="w-full"
                          variant={img.highResConvertedAt ? 'outline' : 'default'}
                          onClick={() => handleConvertImage(img.id)}
                          disabled={convertingId === img.id}
                        >
                          {convertingId === img.id ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Converting...</>
                          ) : img.highResConvertedAt ? (
                            <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Re-Convert</>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Convert to High-Res</>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Listings Tab ── */}
        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Platform Listings</span>
                <SearchInput
                    className="w-64"
                    placeholder="Title, city, or owner email…"
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    onClear={() => setListingSearch('')}
                  />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">ID</TableHead>
                        <TableHead className="w-44">Title</TableHead>
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead className="w-24">City</TableHead>
                        <TableHead className="w-40">Owner</TableHead>
                        <TableHead className="w-20">Source</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="text-right w-16">Photos</TableHead>
                        <TableHead className="w-24">Created</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                        <TableHead className="w-24">Distribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredListings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                            No listings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredListings.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono text-xs text-slate-400">{l.id}</TableCell>
                            <TableCell className="font-medium max-w-[176px]"><span className="block truncate" title={l.title || ''}>{l.title}</span></TableCell>
                            <TableCell className="text-slate-600 capitalize max-w-[96px]"><span className="block truncate">{l.propertyType || '-'}</span></TableCell>
                            <TableCell className="text-slate-600 max-w-[96px]"><span className="block truncate">{l.city || '-'}</span></TableCell>
                            <TableCell className="text-slate-600 text-sm max-w-[160px]"><span className="block truncate" title={l.user?.email || ''}>{l.user?.email || '-'}</span></TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{l.source || '-'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={l.isActive ? 'default' : 'secondary'}
                                className={l.isActive ? 'bg-emerald-500' : ''}>
                                {l.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{l._count?.propertyImages ?? 0}</TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenMediaManager(l.id, l.title)}
                              >
                                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                                Media
                              </Button>
                            </TableCell>
                            <TableCell>
                              <SyncButton
                                listingId={l.id}
                                syncStates={syncStates}
                                syncingListingId={syncingListingId}
                                onSync={handleSyncToChannex}
                                onLoadState={loadSyncState}
                                listingTitle={l.title}
                                compact
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Concierge Queue Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="concierge">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                Concierge Extraction Queue
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchConciergeQueue} disabled={isLoadingConcierge}>
                {isLoadingConcierge ? <Loader className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingConcierge ? (
                <div className="flex justify-center py-8"><Loader className="w-8 h-8 animate-spin text-violet-400" /></div>
              ) : conciergeQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No pending extractions</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {conciergeQueue.map(listing => {
                    const draft = conciergeDraft[listing.id] || {
                      title: listing.title || '',
                      description: '',
                      address: listing.address || '',
                      city: listing.city || '',
                      state: listing.state || '',
                      country: listing.country || '',
                      propertyType: listing.propertyType || '',
                      maxGuests: listing.maxGuests || '',
                      bedrooms: listing.bedrooms || '',
                      bathrooms: listing.bathrooms || '',
                      basePrice: listing.basePrice || '',
                      currency: listing.currency || 'USD',
                    };
                    const setDraft = (fields) => setConciergeDraft(prev => ({ ...prev, [listing.id]: { ...draft, ...fields } }));
                    const isOta     = listing.reviewStatus === 'pending_ota_scrape';
                    const isWeb     = listing.reviewStatus === 'pending_website_extract';

                    return (
                      <div key={listing.id} className="border border-slate-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {isOta  ? <Link2 className="w-4 h-4 text-blue-500" />  : <Globe className="w-4 h-4 text-violet-500" />}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${isOta ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                                {isOta ? 'OTA Scrape' : 'Website Extract'}
                              </span>
                              <span className="text-xs text-slate-400">#{listing.id}</span>
                            </div>
                            <p className="font-semibold text-slate-800">{listing.user?.email}</p>
                            <a href={listing.captureUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                              {listing.captureUrl} <ExternalLink className="w-3 h-3" />
                            </a>
                            {/* Consent audit badge */}
                            {listing.houseRules?.startsWith('[WEBSITE_CONSENT]') && (() => {
                              const m = listing.houseRules.match(/authorized_at=([^|]+)/);
                              const ipM = listing.houseRules.match(/ip=([^|]+)/);
                              const ts = m ? new Date(m[1].trim()).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' }) : null;
                              return ts ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 mt-1">
                                  ✓ Consent: {ts} ET {ipM ? `· ${ipM[1].trim()}` : ''}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">{listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : ''}</span>
                        </div>

                        {/* Editable fields */}
                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-slate-500">Title *</label>
                            <input className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.title} onChange={e => setDraft({ title: e.target.value })} placeholder="Property title" />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-slate-500">Description</label>
                            <textarea rows={3} className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.description} onChange={e => setDraft({ description: e.target.value })} placeholder="Property description" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Address</label>
                            <input className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.address} onChange={e => setDraft({ address: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">City</label>
                            <input className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.city} onChange={e => setDraft({ city: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">State</label>
                            <input className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.state} onChange={e => setDraft({ state: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Country</label>
                            <input className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.country} onChange={e => setDraft({ country: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Property Type</label>
                            <input className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.propertyType} onChange={e => setDraft({ propertyType: e.target.value })} placeholder="House / Apartment / Villa…" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Max Guests</label>
                            <input type="number" min="1" className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.maxGuests} onChange={e => setDraft({ maxGuests: parseInt(e.target.value) || '' })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Bedrooms</label>
                            <input type="number" min="0" className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.bedrooms} onChange={e => setDraft({ bedrooms: parseInt(e.target.value) || 0 })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Bathrooms</label>
                            <input type="number" min="0" step="0.5" className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.bathrooms} onChange={e => setDraft({ bathrooms: parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Base Price</label>
                            <input type="number" min="1" className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.basePrice} onChange={e => setDraft({ basePrice: parseFloat(e.target.value) || '' })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Currency</label>
                            <input maxLength={3} className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={draft.currency} onChange={e => setDraft({ currency: e.target.value.toUpperCase() })} />
                          </div>
                        </div>

                        <Button
                          onClick={() => handleCompleteConciergeListing(listing.id)}
                          disabled={completingId === listing.id || !draft.title}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          {completingId === listing.id
                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Approving…</>
                            : <><CheckCircle className="w-4 h-4 mr-2" />Map Data & Send to User</>
                          }
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Review Queue Tab ─────────────────────────────────────────────────────────── */}
        <TabsContent value="review">
          {reviewListing ? (
            <div className="font-sans antialiased text-gray-900 bg-gray-50 min-h-screen p-0">
              {/* Breadcrumb / back nav */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setReviewListing(null)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />Back to Queue
                </button>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{reviewListing.title || 'Untitled Listing'}</span>
                <span className="ml-auto text-xs text-gray-400">ID #{reviewListing.id} · {reviewListing.user?.email}</span>
              </div>

              {/* Media strip */}
              {reviewListing.propertyImages?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
                  <p className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Media <span className="normal-case font-normal text-gray-400 ml-1">{reviewListing.propertyImages.length} images</span>
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1 mt-3">
                    {reviewListing.propertyImages.map(img => (
                      <img
                        key={img.id}
                        src={img.highResUrl || img.url}
                        alt=""
                        className="w-32 h-24 object-cover rounded-lg border border-gray-100 flex-shrink-0 shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Property details card ─────────────────────────────────────── */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
                <p className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-5">Property Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* Title — full width */}
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</label>
                    <input
                      type="text"
                      value={reviewForm.title ?? ''}
                      onChange={e => setReviewForm(f => ({...f, title: e.target.value}))}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="Property title"
                    />
                  </div>

                  {[
                    {label:'Address',    key:'address',      placeholder:'Street address'},
                    {label:'City',       key:'city',         placeholder:'City'},
                    {label:'State',      key:'state',        placeholder:'State / Province'},
                    {label:'Country',    key:'country',      placeholder:'Country'},
                    {label:'Postal Code',key:'postalCode',   placeholder:'ZIP / Postal code'},
                    {label:'Property Type',key:'propertyType',placeholder:'House / Apartment / Villa…'},
                  ].map(({label, key, placeholder}) => (
                    <div key={key}>
                      <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
                      <input
                        type="text"
                        value={reviewForm[key] ?? ''}
                        onChange={e => setReviewForm(f => ({...f, [key]: e.target.value}))}
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}

                  {[
                    {label:'Bedrooms',  key:'bedrooms',  placeholder:'0'},
                    {label:'Bathrooms', key:'bathrooms', placeholder:'0'},
                    {label:'Max Guests',key:'maxGuests', placeholder:'1'},
                    {label:'Base Price (USD)', key:'basePrice', placeholder:'0.00'},
                  ].map(({label, key, placeholder}) => (
                    <div key={key}>
                      <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
                      <input
                        type="number"
                        min="0"
                        step={key === 'bathrooms' ? '0.5' : key === 'basePrice' ? '0.01' : '1'}
                        value={reviewForm[key] ?? ''}
                        onChange={e => setReviewForm(f => ({...f, [key]: e.target.value}))}
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Content card ─────────────────────────────────────────────── */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
                <p className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-5">Content & Policies</p>
                <div className="space-y-5">
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</label>
                    <textarea
                      rows={4}
                      value={reviewForm.description ?? ''}
                      onChange={e => setReviewForm(f => ({...f, description: e.target.value}))}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm resize-y"
                      placeholder="Describe the property…"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">House Rules</label>
                    <textarea
                      rows={2}
                      value={reviewForm.houseRules ?? ''}
                      onChange={e => setReviewForm(f => ({...f, houseRules: e.target.value}))}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm resize-y"
                      placeholder="No smoking, no parties…"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amenities <span className="normal-case font-normal text-gray-400">(comma-separated)</span></label>
                    <input
                      type="text"
                      value={reviewForm.amenities ?? ''}
                      onChange={e => setReviewForm(f => ({...f, amenities: e.target.value}))}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="WiFi, Pool, AC, Parking…"
                    />
                  </div>
                </div>
              </div>

              {/* Source URL + Consent Audit Trail */}
              {reviewListing.captureUrl && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider shrink-0">Source URL</span>
                    <a
                      href={reviewListing.captureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate flex-1"
                    >
                      {reviewListing.captureUrl}
                    </a>
                  </div>
                  {/* Consent audit record — parsed from notes field */}
                  {reviewListing.houseRules?.startsWith('[WEBSITE_CONSENT]') && (() => {
                    const parts = {};
                    reviewListing.houseRules.replace('[WEBSITE_CONSENT] ', '').split(' | ').forEach(p => {
                      const [k, ...v] = p.split('=');
                      parts[k.trim()] = v.join('=').trim();
                    });
                    return (
                      <div className="flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                        <span className="text-purple-500 mt-0.5 flex-shrink-0">✓</span>
                        <div className="text-xs text-purple-800 space-y-0.5">
                          <p className="font-semibold">User Consent Recorded</p>
                          {parts.authorized_at && <p>Date/Time: <span className="font-mono">{new Date(parts.authorized_at).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET</span></p>}
                          {parts.ip && <p>IP Address: <span className="font-mono">{parts.ip}</span></p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sync error banner */}
              {syncError?.listingId === reviewListing.id && (
                <Alert className="border-red-200 bg-red-50 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-700">
                    <strong>Sync Failed:</strong> {syncError.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* ── Action bar ───────────────────────────────────────────────── */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3">
                {/* Save */}
                <button
                  onClick={handleSaveReview}
                  disabled={savingReview || syncingListingId === reviewListing.id}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {savingReview
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                    : <><Save className="w-4 h-4" />Save Changes</>}
                </button>

                {/* Approve */}
                <button
                  onClick={() => handleApprove(reviewListing.id)}
                  disabled={approvingId === reviewListing.id || savingReview}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {approvingId === reviewListing.id
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Approving…</>
                    : <><CheckCircle2 className="w-4 h-4" />Approve & Go Live</>}
                </button>

                {/* Smart sync */}
                <SyncButton
                  listingId={reviewListing.id}
                  syncStates={syncStates}
                  syncingListingId={syncingListingId}
                  onSync={handleSyncToChannex}
                  onLoadState={loadSyncState}
                  listingTitle={reviewListing.title}
                />

                {/* Deactivate — only shown if published */}
                {syncStates[reviewListing.id]?.hasChannexRecord && (
                  <button
                    disabled={deactivatingId === reviewListing.id}
                    onClick={() => handleDeactivate(reviewListing.id, reviewListing.title)}
                    className="px-6 py-2.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {deactivatingId === reviewListing.id
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Deactivating…</>
                      : <><Power className="w-4 h-4" />Deactivate on Channex</>}
                  </button>
                )}

                {/* Reject */}
                <button
                  onClick={() => { setRejectTarget(reviewListing); setShowRejectDialog(true); }}
                  disabled={savingReview}
                  className="px-6 py-2.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2 ml-auto"
                >
                  <XCircle className="w-4 h-4" />Reject
                </button>
              </div>
            </div>
          ) : (
            // ─ Queue List ────────────────────────────────────────────────────────────────
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-purple-500" />
                    Pending Review
                    {pendingListings.length > 0 && (
                      <Badge className="bg-red-500 text-white">{pendingListings.length}</Badge>
                    )}
                  </span>
                  <Button variant="outline" size="sm" onClick={fetchPendingQueue} disabled={isLoadingQueue}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingQueue ? 'animate-spin' : ''}`} />Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingQueue ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                ) : pendingListings.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                    <p className="text-sm font-medium">Queue is empty</p>
                    <p className="text-xs mt-1">All imported properties have been reviewed.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Photos</TableHead>
                          <TableHead>Review</TableHead>
                          <TableHead>Approve</TableHead>
                          <TableHead>Reject</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingListings.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono text-xs text-slate-400">{l.id}</TableCell>
                            <TableCell className="font-medium max-w-[160px] truncate">{l.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-xs">{l.source || 'manual'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-500 max-w-[140px] truncate">{l.user?.email || '-'}</TableCell>
                            <TableCell className="text-sm text-slate-500">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="text-center">{l._count?.propertyImages ?? 0}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => handleOpenReview(l)}>
                                <Eye className="w-3.5 h-3.5 mr-1" />Review
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={approvingId === l.id}
                                onClick={() => handleApprove(l.id)}
                              >
                                {approvingId === l.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</>}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={rejectingId === l.id}
                                onClick={() => { setRejectTarget(l); setShowRejectDialog(true); }}
                              >
                                {rejectingId === l.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <XCircle className="w-3.5 h-3.5" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Markup Tab ───────────────────────────────────────────────────────────── */}
        <TabsContent value="markup">
          <MarkupPanel />
        </TabsContent>

      </Tabs>

      {/* ─ Reject Reason Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={showRejectDialog} onOpenChange={open => { if (!open) { setShowRejectDialog(false); setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Rejecting: <strong>{rejectTarget?.title}</strong>
          </p>
          <div className="space-y-2 mt-2">
            <Label>Reason (optional - shown in internal logs)</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Missing address, duplicate listing, invalid images..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectTarget(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectingId === rejectTarget?.id}
            >
              {rejectingId === rejectTarget?.id
                ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Rejecting...</>
                : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

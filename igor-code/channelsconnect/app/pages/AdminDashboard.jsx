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
  Sparkles,
  ArrowLeft,
  Zap,
  Power,
  AlertTriangle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authContext';
import api from '@/lib/apiClient';

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
       : state?.syncStatus === 'partial_sync' ? 'bg-amber-600 hover:bg-amber-700'
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
            <Crown className="w-7 h-7 text-yellow-500" />
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
        <StatCard title="Active Listings" value={stats?.activeListings} icon={TrendingUp} color="orange"
          subtitle={stats ? `${Math.round((stats.activeListings / Math.max(stats.listingCount, 1)) * 100)}% of total` : null} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
          <TabsTrigger value="media">Media Manager</TabsTrigger>
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
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
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
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Listings</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead>Sync Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead title="Terms of Service consent">ToS</TableHead>
                        <TableHead>Actions</TableHead>
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
                            <TableCell className="font-medium">{u.name || '-'}</TableCell>
                            <TableCell className="text-slate-600">{u.email}</TableCell>
                            <TableCell>
                              {/* Role selector — locked for super-admin */}
                              {u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2.5 py-0.5">
                                  🔒 super-admin
                                </span>
                              ) : (
                                <select
                                  value={u.role || 'user'}
                                  disabled={updatingRoleId === u.id}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value, u.email)}
                                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Title, city, or owner email..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                  />
                </div>
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
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Photos</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>Distribution</TableHead>
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
                            <TableCell className="font-medium max-w-[180px] truncate">{l.title}</TableCell>
                            <TableCell className="text-slate-600 capitalize">{l.propertyType || '-'}</TableCell>
                            <TableCell className="text-slate-600">{l.city || '-'}</TableCell>
                            <TableCell className="text-slate-600 text-sm max-w-[140px] truncate">
                              {l.user?.email || '-'}
                            </TableCell>
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

        {/* ── Review Queue Tab ─────────────────────────────────────────────────────────── */}
        <TabsContent value="review">
          {reviewListing ? (
            // ─ Edit Modal View ────────────────────────────────────────────────────────
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setReviewListing(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  Editing: <span className="font-normal text-slate-600 ml-1 truncate max-w-xs">{reviewListing.title}</span>
                  <span className="ml-auto text-xs text-slate-400">ID #{reviewListing.id} • {reviewListing.user?.email}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Images preview */}
                {reviewListing.propertyImages?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">Media ({reviewListing.propertyImages.length} images)</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {reviewListing.propertyImages.map(img => (
                        <img
                          key={img.id}
                          src={img.highResUrl || img.url}
                          alt=""
                          className="w-28 h-20 object-cover rounded-lg border flex-shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Editable fields - 2 column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[{label:'Title',key:'title'},{label:'Address',key:'address'},{label:'City',key:'city'},
                    {label:'State',key:'state'},{label:'Country',key:'country'},{label:'Postal Code',key:'postalCode'},
                    {label:'Property Type',key:'propertyType'},{label:'Bedrooms',key:'bedrooms',type:'number'},
                    {label:'Bathrooms',key:'bathrooms',type:'number'},{label:'Max Guests',key:'maxGuests',type:'number'},
                    {label:'Base Price (USD)',key:'basePrice',type:'number'},
                  ].map(({label, key, type}) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-slate-500">{label}</Label>
                      <Input
                        type={type || 'text'}
                        value={reviewForm[key] ?? ''}
                        onChange={e => setReviewForm(f => ({...f, [key]: e.target.value}))}
                        className="text-sm"
                      />
                    </div>
                  ))}

                  {/* Amenities - full width */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-slate-500">Amenities (comma-separated)</Label>
                    <Input
                      value={reviewForm.amenities ?? ''}
                      onChange={e => setReviewForm(f => ({...f, amenities: e.target.value}))}
                      placeholder="WiFi, Pool, AC, Parking..."
                    />
                  </div>

                  {/* Description - full width */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-slate-500">Description</Label>
                    <Textarea
                      rows={4}
                      value={reviewForm.description ?? ''}
                      onChange={e => setReviewForm(f => ({...f, description: e.target.value}))}
                    />
                  </div>

                  {/* House Rules - full width */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-slate-500">House Rules</Label>
                    <Textarea
                      rows={2}
                      value={reviewForm.houseRules ?? ''}
                      onChange={e => setReviewForm(f => ({...f, houseRules: e.target.value}))}
                    />
                  </div>
                </div>

                {/* Source / import URL */}
                {reviewListing.captureUrl && (
                  <div className="text-xs text-slate-400">
                    Source URL: <a href={reviewListing.captureUrl} target="_blank" rel="noreferrer" className="underline text-blue-500 truncate">{reviewListing.captureUrl}</a>
                  </div>
                )}

                {/* Sync error banner — verbatim Channex error message */}
                {syncError?.listingId === reviewListing.id && (
                  <Alert className="border-red-300 bg-red-50">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-700">
                      <strong>Sync Failed:</strong> {syncError.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action bar */}
                <div className="flex flex-wrap gap-3 pt-2 border-t">
                  {/* Save edits */}
                  <Button onClick={handleSaveReview} disabled={savingReview || syncingListingId === reviewListing.id} variant="outline">
                    {savingReview
                      ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</>
                      : <><Save className="w-4 h-4 mr-1" />Save Edits</>}
                  </Button>

                  {/* Approve & Go Live */}
                  <Button
                    onClick={() => handleApprove(reviewListing.id)}
                    disabled={approvingId === reviewListing.id || savingReview}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {approvingId === reviewListing.id
                      ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Approving…</>
                      : <><CheckCircle2 className="w-4 h-4 mr-1" />Approve & Go Live</>}
                  </Button>

                  {/* Smart Channex sync button — lazy-loads sync state on first render */}
                  <SyncButton
                    listingId={reviewListing.id}
                    syncStates={syncStates}
                    syncingListingId={syncingListingId}
                    onSync={handleSyncToChannex}
                    onLoadState={loadSyncState}
                    listingTitle={reviewListing.title}
                  />

                  {/* Deactivate on Channex (only shown if already published) */}
                  {syncStates[reviewListing.id]?.hasChannexRecord && (
                    <Button
                      variant="outline"
                      className="border-orange-400 text-orange-700 hover:bg-orange-50"
                      disabled={deactivatingId === reviewListing.id}
                      onClick={() => handleDeactivate(reviewListing.id, reviewListing.title)}
                    >
                      {deactivatingId === reviewListing.id
                        ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Deactivating…</>
                        : <><Power className="w-4 h-4 mr-1" />Deactivate on Channex</>}
                    </Button>
                  )}

                  {/* Reject */}
                  <Button
                    variant="destructive"
                    onClick={() => { setRejectTarget(reviewListing); setShowRejectDialog(true); }}
                    disabled={savingReview}
                  >
                    <XCircle className="w-4 h-4 mr-1" />Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // ─ Queue List ────────────────────────────────────────────────────────────────
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-amber-500" />
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

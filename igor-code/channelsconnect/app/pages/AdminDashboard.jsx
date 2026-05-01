/**
 * AdminDashboard.jsx — Super Admin Portal
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

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  // Auth from shared AuthProvider — no extra round-trip, role available immediately
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

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // ── Sync listing to Channex (admin-only) ──────────────────────────────────────────
  const handleSyncToChannex = async (listingId, listingTitle) => {
    if (syncingListingId === listingId) return;
    setSyncingListingId(listingId);
    try {
      const res = await api.connect.pushPropertyContent(listingId);
      const propertyId = res.data?.data?.propertyId;
      toast.success(
        propertyId
          ? `“${listingTitle}” synced ✓ — ID: ${propertyId}`
          : `“${listingTitle}” synced to distribution network.`
      );
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Sync failed';
      toast.error(`Sync failed: ${msg}`);
    } finally {
      setSyncingListingId(null);
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
            <strong>403 — Access Denied.</strong> Admin role required.
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
            Global platform management — logged in as{' '}
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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting…</>
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
          subtitle={`${stats?.activeListings ?? '—'} active`} />
        <StatCard title="Total Bookings" value={stats?.bookingCount} icon={BookOpen} color="purple" />
        <StatCard title="Active Listings" value={stats?.activeListings} icon={TrendingUp} color="orange"
          subtitle={stats ? `${Math.round((stats.activeListings / Math.max(stats.listingCount, 1)) * 100)}% of total` : null} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
          <TabsTrigger value="media">Media Manager</TabsTrigger>
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
                    placeholder="Search by name or email…"
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
                            <TableCell className="font-medium">{u.name || '—'}</TableCell>
                            <TableCell className="text-slate-600">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role?.toLowerCase() === 'admin' ? 'default' : 'outline'}
                                className={u.role?.toLowerCase() === 'admin' ? 'bg-yellow-500 text-white' : ''}>
                                {u.role || 'user'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{u._count?.listings ?? 0}</TableCell>
                            <TableCell className="text-right">{u._count?.bookings ?? 0}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {u.syncStatus || 'idle'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
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
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Converting…</>
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
                    placeholder="Title, city, or owner email…"
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
                            <TableCell className="text-slate-600 capitalize">{l.propertyType || '—'}</TableCell>
                            <TableCell className="text-slate-600">{l.city || '—'}</TableCell>
                            <TableCell className="text-slate-600 text-sm max-w-[140px] truncate">
                              {l.user?.email || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{l.source || '—'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={l.isActive ? 'default' : 'secondary'}
                                className={l.isActive ? 'bg-emerald-500' : ''}>
                                {l.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{l._count?.propertyImages ?? 0}</TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}
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
                              <Button
                                size="sm"
                                className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
                                disabled={syncingListingId === l.id}
                                onClick={() => handleSyncToChannex(l.id, l.title)}
                              >
                                {syncingListingId === l.id ? (
                                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Syncing…</>
                                ) : (
                                  <>🚀 Sync</>  
                                )}
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
      </Tabs>
    </div>
  );
}

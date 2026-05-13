/**
 * AdminDashboard.jsx — Channels Connect Admin Portal
 *
 * UI/UX overhaul: dark glass-morphism sidebar + sleek data tables.
 * Channex certification: Full Sync (500 days), Webhook Logs, Property Mapping, Task IDs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown, Users, Building2, BookOpen, TrendingUp,
  Download, Loader2, ShieldAlert, RefreshCw,
  Zap, Globe, CheckCircle2, XCircle, AlertTriangle,
  Terminal, Copy, CheckCheck, Settings, Activity,
  ClipboardList, Sparkles, ImageIcon, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/apiClient';
import AdminLayout from '@/components/dashboard/admin/AdminLayout';
import ChannexSyncPanel from '@/components/dashboard/admin/ChannexSyncPanel';

import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, subtitle, accent = 'indigo' }) {
  const styles = {
    indigo: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/20 text-indigo-300',
    emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-300',
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-300',
    violet: 'from-violet-500/20 to-purple-500/10 border-violet-500/20 text-violet-300',
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border bg-gradient-to-br bg-slate-900/60
      backdrop-blur-sm p-5 hover:bg-slate-900/80 transition-all duration-200
      ${styles[accent] || styles.indigo}
    `}>
      <div className={`flex items-start justify-between`}>
        <div>
          <p className={`text-[10px] font-semibold text-slate-500 uppercase tracking-widest`}>{title}</p>
          <p className={`text-3xl font-bold text-white mt-2`}>
            {value ?? <Loader2 className={`w-6 h-6 animate-spin text-slate-600 inline`} />}
          </p>
          {subtitle && <p className={`text-xs text-slate-500 mt-1`}>{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-white/5`}>
          <Icon className={`w-5 h-5 text-slate-500`} />
        </div>
      </div>
    </div>
  );
}

// ── Sync badge ─────────────────────────────────────────────────────────────────
function SyncBadge({ state }) {
  if (!state) return <Badge className={`bg-slate-800 text-slate-400 border-slate-700 text-xs`}>Pending</Badge>;
  if (state.channexPropertyId) return (
    <Badge className={`bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-xs font-semibold`}>
      <CheckCircle2 className={`w-3 h-3 mr-1`} />Mapped
    </Badge>
  );
  return (
    <Badge className={`bg-amber-500/15 text-amber-400 border-amber-500/25 text-xs font-semibold`}>
      <AlertTriangle className={`w-3 h-3 mr-1`} />Unmapped
    </Badge>
  );
}

// ── JSON code block ─────────────────────────────────────────────────────────────
function JsonBlock({ data, maxHeight = '180px' }) {
  const [copied, setCopied] = useState(false);
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`relative group`}>
      <pre className={`bg-[#0d1117] border border-white/[0.06] rounded-lg p-4 text-xs text-slate-300 overflow-auto font-mono leading-relaxed`}
        style={{ maxHeight }}>
        {json}
      </pre>
      <button onClick={copy}
        className={`absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100`}>
        {copied ? <CheckCheck className={`w-3.5 h-3.5 text-emerald-400`} /> : <Copy className={`w-3.5 h-3.5`} />}
      </button>
    </div>
  );
}

// ── Page header ─────────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, actions }) {
  return (
    <div className={`flex items-center justify-between px-8 py-5 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-sm sticky top-0 z-30`}>
      <div>
        <h1 className={`text-xl font-bold text-white`}>{title}</h1>
        {subtitle && <p className={`text-sm text-slate-500 mt-0.5`}>{subtitle}</p>}
      </div>
      {actions && <div className={`flex items-center gap-2`}>{actions}</div>}
    </div>
  );
}

// ── Markup Panel ───────────────────────────────────────────────────────────────
function MarkupPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
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
    <div className={`flex items-center justify-center py-16 gap-3 text-slate-500`}>
      <Loader2 className={`w-5 h-5 animate-spin`} /><span className={`text-sm`}>Loading markup settings…</span>
    </div>
  );

  return (
    <Card className={`border-slate-800 bg-slate-900/50`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 text-base`}>
          <Settings className={`w-4 h-4 text-violet-400`} />
          Rate Markup Settings
        </CardTitle>
        <p className={`text-xs text-slate-500 mt-1`}>
          Markup % applied to <strong className={`text-slate-300`}>all rates before they are pushed to channels</strong>.
          The database rate is never changed.
        </p>
        <div className={`mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400`}>
          ⚠️ Admin only. +10% → $100 stored = $110 to Channex. 0 = pass-through.
        </div>
      </CardHeader>
      <CardContent className={`p-0`}>
        <Table>
          <TableHeader>
            <TableRow className={`border-slate-800/60`}>
              <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>User</TableHead>
              <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Email</TableHead>
              <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Listings</TableHead>
              <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Live %</TableHead>
              <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Set New %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} className={`border-slate-800/60 hover:bg-white/[0.02] transition-colors`}>
                <TableCell className={`max-w-[140px]`}>
                  <p className={`text-sm font-medium text-slate-200 truncate`}>{u.name || '—'}</p>
                </TableCell>
                <TableCell className={`max-w-[200px]`}>
                  <p className={`text-sm text-slate-400 truncate`}>{u.email}</p>
                </TableCell>
                <TableCell className={`text-right text-sm text-slate-400`}>{u._count?.listings ?? 0}</TableCell>
                <TableCell className={`text-right`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    Number(u.adminMarkup) > 0 ? 'bg-emerald-500/15 text-emerald-400' :
                    Number(u.adminMarkup) < 0 ? 'bg-red-500/15 text-red-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {Number(u.adminMarkup) > 0 ? '+' : ''}{Number(u.adminMarkup ?? 0).toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center justify-end gap-2`}>
                    <div className={`relative w-24 shrink-0`}>
                      <input
                        type={'number'} min={'-100'} max={'500'} step={'0.5'}
                        value={drafts[u.id] ?? '0'}
                        onChange={e => setDrafts(d => ({ ...d, [u.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && save(u.id)}
                        className={`w-full border border-slate-700 rounded-lg px-3 pr-7 py-1.5 text-sm text-right
                          bg-slate-800 text-slate-200 font-mono
                          focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
                          transition-all`}
                      />
                      <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none`}>%</span>
                    </div>
                    <Button size={`sm`} onClick={() => save(u.id)} disabled={saving[u.id]}
                      className={`bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-3 shrink-0 font-semibold`}>
                      {saving[u.id] ? <Loader2 className={`w-3 h-3 animate-spin`} /> : 'Save'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className={`text-center text-slate-500 py-10 text-sm`}>No users found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Export Section ─────────────────────────────────────────────────────────────
function ExportSection({ listings, users }) {
  const [exporting, setExporting] = useState(false);

  const handleDownload = async (type) => {
    setExporting(true);
    try {
      let blob;
      let filename;

      if (type === 'listings') {
        const res = await api.admin.exportPropertiesBlob();
        blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8' });
        filename = `listings-export_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        const res = await api.admin.exportUsersJson();
        const json = JSON.stringify(res.data, null, 2);
        blob = new Blob([json], { type: 'application/json' });
        filename = `channels_connect_users_${new Date().toISOString().slice(0, 10)}.json`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
      toast.success(`${type === 'listings' ? 'Listings CSV' : 'Users JSON'} downloaded ✓`);
    } catch (err) {
      toast.error('Export failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
      {/* Properties CSV */}
      <Card className={`border-slate-800 bg-slate-900/50`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 text-base`}>
            <Building2 className={`w-4 h-4 text-indigo-400`} />
            Export Properties
          </CardTitle>
          <p className={`text-xs text-slate-500 mt-1`}>
            {listings.length} listings · CSV · owner email, Channex mapping status, sync state
          </p>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800`}>
            <div className={`flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center`}>
                <Building2 className={`w-5 h-5 text-indigo-400`} />
              </div>
              <div>
                <p className={`text-sm font-semibold text-slate-200`}>Properties CSV</p>
                <p className={`text-xs text-slate-500`}>{listings.length} records</p>
              </div>
            </div>
            <Button
              onClick={() => handleDownload('listings')}
              disabled={exporting}
              className={`bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md shadow-indigo-500/20`}>
              {exporting ? <Loader2 className={`w-4 h-4 mr-2 animate-spin`} /> : <Download className={`w-4 h-4 mr-2`} />}
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users JSON */}
      <Card className={`border-slate-800 bg-slate-900/50`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 text-base`}>
            <Users className={`w-4 h-4 text-emerald-400`} />
            Export Users
          </CardTitle>
          <p className={`text-xs text-slate-500 mt-1`}>
            {users.length} users · JSON · roles, listing/booking counts, consent status
          </p>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800`}>
            <div className={`flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center`}>
                <Users className={`w-5 h-5 text-emerald-400`} />
              </div>
              <div>
                <p className={`text-sm font-semibold text-slate-200`}>Users JSON</p>
                <p className={`text-xs text-slate-500`}>{users.length} records</p>
              </div>
            </div>
            <Button
              variant={`outline`}
              onClick={() => handleDownload('users')}
              disabled={exporting}
              className={`border-slate-700 text-slate-300 hover:text-white hover:border-slate-600`}>
              <Download className={`w-4 h-4 mr-2`} />
              Download JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user: currentUser, isAdmin, isLoadingAuth } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Data
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');

  // Sync
  const [syncStates, setSyncStates] = useState({});
  const [syncingListingId, setSyncingListingId] = useState(null);

  // Review
  const [pendingListings, setPendingListings] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  // Media
  const [mediaListingId, setMediaListingId] = useState(null);
  const [mediaListingTitle, setMediaListingTitle] = useState('');
  const [listingImages, setListingImages] = useState([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [convertingId, setConvertingId] = useState(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (isLoadingAuth) return (
    <div className={`min-h-screen bg-slate-950 flex items-center justify-center`}>
      <Loader2 className={`w-10 h-10 animate-spin text-indigo-500`} />
    </div>
  );
  if (!currentUser) return (
    <div className={`min-h-screen bg-slate-950 flex items-center justify-center`}>
      <Alert className={`max-w-md border-slate-800 bg-slate-900`}>
        <ShieldAlert className={`h-4 w-4 text-red-400`} />
        <AlertDescription className={`text-slate-300`}>You must be logged in to access the Admin Portal.</AlertDescription>
      </Alert>
    </div>
  );
  if (!isAdmin) return (
    <div className={`min-h-screen bg-slate-950 flex items-center justify-center`}>
      <Alert className={`max-w-md border-red-500/20 bg-red-500/10`}>
        <ShieldAlert className={`h-4 w-4 text-red-400`} />
        <AlertDescription className={`text-red-300`}>
          <strong>403 — Access Denied.</strong> Admin role required.
          <br /><span className={`text-sm text-slate-500`}>Your current role: <code>{currentUser.role || 'user'}</code></span>
        </AlertDescription>
      </Alert>
    </div>
  );

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
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
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPendingQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const res = await api.admin.getPendingReview();
      setPendingListings(res.data || []);
    } catch {
      toast.error('Failed to load review queue');
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (activeSection === 'review') fetchPendingQueue(); }, [activeSection, fetchPendingQueue]);

  // ── Sync engine ─────────────────────────────────────────────────────────────
  const loadSyncState = useCallback(async (listingId) => {
    try {
      const res = await api.admin.getListingSyncState(listingId);
      setSyncStates(prev => ({ ...prev, [listingId]: res.data }));
    } catch { /* swallow */ }
  }, []);

  const handleSync = async (listing) => {
    if (syncingListingId === listing.id) return;
    setSyncingListingId(listing.id);
    try {
      const res = await api.admin.syncListingToChannex(listing.id);
      const result = res.data;
      if (result.outcome === 'synced') {
        const op = result.operation === 'created' ? 'Published' : 'Updated';
        toast.success(`${op} “${listing.title}” on Channex ✓ — ${result.channexPropertyId}`);
        await loadSyncState(listing.id);
        fetchData();
      } else {
        toast.error(`Sync failed: ${result.errorMessage || 'unknown error'}`);
      }
    } catch (err) {
      toast.error('Sync failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSyncingListingId(null);
    }
  };

  const handleDeactivate = async (listing) => {
    if (!confirm(`Deactivate “${listing.title}” on Channex?`)) return;
    try {
      await api.admin.deactivateListing(listing.id);
      toast.success(`Deactivated on Channex`);
      await loadSyncState(listing.id);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    }
  };

  const handleApprove = async (listingId) => {
    setApprovingId(listingId);
    try {
      const res = await api.admin.approveListing(listingId);
      toast.success(`Approved — ${res.data.title} is now live ✓`);
      setPendingListings(prev => prev.filter(l => l.id !== listingId));
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (listing) => {
    const reason = window.prompt(`Reason for rejecting “${listing.title}” (optional):`);
    setRejectingId(listing.id);
    try {
      await api.admin.rejectListing(listing.id, reason || undefined);
      toast.success(`Rejected — ${listing.title}`);
      setPendingListings(prev => prev.filter(l => l.id !== listingId));
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setRejectingId(null);
    }
  };

  const handleConvertImage = async (imageId) => {
    if (!mediaListingId) return;
    setConvertingId(imageId);
    try {
      const res = await api.admin.convertImageToHighRes(mediaListingId, imageId);
      setListingImages(prev => prev.map(img => img.id === imageId
        ? { ...img, highResUrl: res.data.highResUrl, highResConvertedAt: new Date().toISOString() }
        : img
      ));
      toast.success('Image converted to hi-res ✓');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Conversion failed');
    } finally {
      setConvertingId(null);
    }
  };

  const handleOpenMedia = async (listing) => {
    setMediaListingId(listing.id);
    setMediaListingTitle(listing.title);
    setIsLoadingImages(true);
    try {
      const res = await api.admin.getListingImages(listing.id);
      setListingImages(res.data || []);
      setActiveSection('media');
    } catch {
      toast.error('Failed to load images');
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleRoleChange = async (userId, newRole, email) => {
    if (email?.toLowerCase() === 'oriel@erorentals.com') { toast.error('Super-admin cannot be demoted'); return; }
    try {
      await api.admin.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Role update failed');
    }
  };

  const handleExtractUserData = (userId, email) => {
    toast.info(`User data extraction for ${email} — coming soon`);
  };

  // ── Filtered data ───────────────────────────────────────────────────────────
  const filteredUsers = users.filter(
    u => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || (u.name || '').toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredListings = listings.filter(
    l => !listingSearch
      || l.title?.toLowerCase().includes(listingSearch.toLowerCase())
      || (l.city || '').toLowerCase().includes(listingSearch.toLowerCase())
      || (l.user?.email || '').toLowerCase().includes(listingSearch.toLowerCase())
  );

  // ── Section content ─────────────────────────────────────────────────────────
  const sectionContent = (section) => {
    switch (section) {
      case 'overview': return (
        <div className={`px-8 py-6 space-y-6`}>
          {/* Stats */}
          <div className={`grid grid-cols-2 xl:grid-cols-4 gap-4`}>
            <StatCard title={'Total Users'} value={stats?.userCount} icon={Users} accent={'indigo'} />
            <StatCard title={'Total Listings'} value={stats?.listingCount} icon={Building2} accent={'emerald'} subtitle={`${stats?.activeListings ?? 0} active`} />
            <StatCard title={'Total Bookings'} value={stats?.bookingCount} icon={BookOpen} accent={'violet'} />
            <StatCard title={'Active Rate'} value={`${stats ? Math.round((stats.activeListings / Math.max(stats.listingCount, 1)) * 100) : 0}%`} icon={TrendingUp} accent={'amber'} subtitle={`active / total`} />
          </div>
          {/* Quick nav cards */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
            {[
              { icon: Users, label: 'Users', section: 'users', count: users.length },
              { icon: Building2, label: 'Listings', section: 'listings', count: listings.length },
              { icon: Zap, label: 'Channex Sync', section: 'channels', count: null },
              { icon: ClipboardList, label: 'Review Queue', section: 'review', count: pendingListings.length },
            ].map(({ icon: Icon, label, section: s, count }) => (
              <button key={s}
                onClick={() => setActiveSection(s)}
                className={`group p-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all text-left`}>
                <Icon className={`w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2`} />
                <p className={`text-sm font-semibold text-slate-300 group-hover:text-white transition-colors`}>{label}</p>
                {count !== null && <p className={`text-xs text-slate-600 mt-0.5`}>{count} total</p>}
              </button>
            ))}
          </div>
          {/* Channex Sync preview */}
          <ChannexSyncPanel listings={listings} syncStates={syncStates} onSync={handleSync} onDeactivate={handleDeactivate} />
        </div>
      );

      case 'users': return (
        <div className={`px-8 py-6 space-y-4`}>
          <div className={`flex items-center justify-between`}>
            <p className={`text-sm text-slate-400`}>{filteredUsers.length} of {users.length} users</p>
            <Input
              className={`max-w-xs bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600`}
              placeholder={`Search by name or email…`} value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>
          <Card className={`border-slate-800 bg-slate-900/50`}>
            <CardContent className={`p-0`}>
              <Table>
                <TableHeader>
                  <TableRow className={`border-slate-800/60`}>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Name</TableHead>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Email</TableHead>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Role</TableHead>
                    <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Listings</TableHead>
                    <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Bookings</TableHead>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Joined</TableHead>
                    <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className={`text-center text-slate-500 py-12 text-sm`}>No users found</TableCell>
                    </TableRow>
                  ) : filteredUsers.map(u => {
                    const isSuperAdmin = u.email?.toLowerCase() === 'oriel@erorentals.com';
                    return (
                      <TableRow key={u.id} className={`border-slate-800/60 hover:bg-white/[0.02] transition-colors`}>
                        <TableCell className={`max-w-[140px]`}>
                          <p className={`text-sm font-medium text-slate-200 truncate`} title={u.name || ''}>{u.name || '—'}</p>
                        </TableCell>
                        <TableCell className={`max-w-[200px]`}>
                          <p className={`text-sm text-slate-400 truncate`} title={u.email}>{u.email}</p>
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5`}>
                              🔒 super-admin
                            </span>
                          ) : (
                            <select value={u.role || 'user'}
                              onChange={(e) => handleRoleChange(u.id, e.target.value, u.email)}
                              className={`font-sans text-xs font-medium border rounded-lg px-2.5 py-1 cursor-pointer
                                bg-slate-800 border-slate-700 text-slate-300
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all`}>
                              <option value={'user'}>user</option>
                              <option value={'admin'}>admin</option>
                            </select>
                          )}
                        </TableCell>
                        <TableCell className={`text-right text-sm text-slate-400`}>{u._count?.listings ?? 0}</TableCell>
                        <TableCell className={`text-right text-sm text-slate-400`}>{u._count?.bookings ?? 0}</TableCell>
                        <TableCell className={`text-sm text-slate-500`}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className={`text-right`}>
                          <Button size={`sm`} variant={`outline`}
                            className={`h-7 text-xs border-slate-700 text-slate-400 hover:text-white hover:border-slate-600`}
                            onClick={() => handleExtractUserData(u.id, u.email)}>
                            <Download className={`w-3 h-3 mr-1`} />Extract
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );

      case 'listings': return (
        <div className={`px-8 py-6 space-y-4`}>
          <div className={`flex items-center justify-between`}>
            <p className={`text-sm text-slate-400`}>{filteredListings.length} of {listings.length} listings</p>
            <Input
              className={`max-w-xs bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600`}
              placeholder={`Title, city, or owner…`} value={listingSearch}
              onChange={e => setListingSearch(e.target.value)}
            />
          </div>
          <Card className={`border-slate-800 bg-slate-900/50`}>
            <CardContent className={`p-0`}>
              <Table>
                <TableHeader>
                  <TableRow className={`border-slate-800/60`}>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Property</TableHead>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Owner</TableHead>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Status</TableHead>
                    <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Channex</TableHead>
                    <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Bookings</TableHead>
                    <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className={`text-center text-slate-500 py-12 text-sm`}>No listings found</TableCell>
                    </TableRow>
                  ) : filteredListings.map(listing => (
                    <TableRow key={listing.id} className={`border-slate-800/60 hover:bg-white/[0.02] transition-colors`}>
                      <TableCell className={`max-w-[180px]`}>
                        <p className={`font-medium text-slate-200 truncate text-sm`} title={listing.title}>{listing.title}</p>
                        <p className={`text-xs text-slate-500 truncate`}>{listing.city}, {listing.country}</p>
                      </TableCell>
                      <TableCell className={`max-w-[160px]`}>
                        <p className={`text-sm text-slate-300 truncate`} title={listing.user?.email}>{listing.user?.email || '—'}</p>
                        <p className={`text-xs text-slate-600 truncate`}>{listing.user?.name || ''}</p>
                      </TableCell>
                      <TableCell>
                        {listing.isActive
                          ? <Badge className={`bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-xs`}>Active</Badge>
                          : <Badge className={`bg-slate-800 text-slate-400 border-slate-700 text-xs`}>Inactive</Badge>
                        }
                      </TableCell>
                      <TableCell><SyncBadge state={syncStates[listing.id]} /></TableCell>
                      <TableCell className={`text-right text-sm text-slate-400`}>{listing._count?.bookings ?? 0}</TableCell>
                      <TableCell>
                        <div className={`flex items-center justify-end gap-1.5`}>
                          <Button size={`sm`} variant={`outline`}
                            className={`h-7 text-xs border-slate-700 text-slate-400 hover:text-white hover:border-slate-600`}
                            onClick={() => handleOpenMedia(listing)}>
                            <ImageIcon className={`w-3 h-3 mr-1`} />Media
                          </Button>
                          <Button size={`sm`}
                            className={`h-7 text-xs bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md shadow-indigo-500/10`}
                            disabled={syncingListingId === listing.id}
                            onClick={() => handleSync(listing)}>
                            {syncingListingId === listing.id ? <Loader2 className={`w-3 h-3 mr-1 animate-spin`} /> : <Zap className={`w-3 h-3 mr-1`} />}
                            {syncStates[listing.id]?.channexPropertyId ? 'Sync' : 'Publish'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );

      case 'channels': return (
        <div className={`px-8 py-6`}>
          <ChannexSyncPanel listings={listings} syncStates={syncStates} onSync={handleSync} onDeactivate={handleDeactivate} />
        </div>
      );

      case 'review': return (
        <div className={`px-8 py-6`}>
          {isLoadingQueue ? (
            <div className={`flex items-center justify-center py-16 gap-3 text-slate-500`}>
              <Loader2 className={`w-5 h-5 animate-spin`} /><span className={`text-sm`}>Loading review queue…</span>
            </div>
          ) : pendingListings.length === 0 ? (
            <Card className={`border-slate-800 bg-slate-900/50`}>
              <CardContent className={`py-16 text-center`}>
                <CheckCircle2 className={`w-12 h-12 text-emerald-500/30 mx-auto mb-3`} />
                <p className={`text-slate-500 text-sm`}>No listings pending review — you're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <Card className={`border-slate-800 bg-slate-900/50`}>
              <CardContent className={`p-0`}>
                <Table>
                  <TableHeader>
                    <TableRow className={`border-slate-800/60`}>
                      <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Property</TableHead>
                      <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Owner</TableHead>
                      <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Status</TableHead>
                      <TableHead className={`text-xs text-slate-500 uppercase tracking-widest`}>Images</TableHead>
                      <TableHead className={`text-right text-xs text-slate-500 uppercase tracking-widest`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingListings.map(l => (
                      <TableRow key={l.id} className={`border-slate-800/60 hover:bg-white/[0.02] transition-colors`}>
                        <TableCell className={`max-w-[160px]`}>
                          <p className={`text-sm font-medium text-slate-200 truncate`}>{l.title}</p>
                          <p className={`text-xs text-slate-500`}>{l.city}, {l.country}</p>
                        </TableCell>
                        <TableCell className={`text-sm text-slate-400 max-w-[140px]`}>
                          <p className={`truncate`}>{l.user?.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={`bg-amber-500/15 text-amber-400 border-amber-500/25 text-xs`}>
                            {l.reviewStatus || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm text-slate-400`}>{l._count?.propertyImages ?? 0} imgs</TableCell>
                        <TableCell>
                          <div className={`flex items-center justify-end gap-2`}>
                            <Button size={`sm`} className={`h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white`}
                              disabled={approvingId === l.id} onClick={() => handleApprove(l.id)}>
                              {approvingId === l.id ? <Loader2 className={`w-3 h-3 mr-1 animate-spin`} /> : <CheckCircle2 className={`w-3 h-3 mr-1`} />}
                              Approve
                            </Button>
                            <Button size={`sm`} variant={`outline`}
                              className={`h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10`}
                              disabled={rejectingId === l.id} onClick={() => handleReject(l)}>
                              {rejectingId === l.id ? <Loader2 className={`w-3 h-3 mr-1 animate-spin`} /> : <XCircle className={`w-3 h-3 mr-1`} />}
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      );

      case 'concierge': return (
        <div className={`px-8 py-6`}>
          <Card className={`border-slate-800 bg-slate-900/50`}>
            <CardContent className={`py-16 text-center`}>
              <Sparkles className={`w-12 h-12 text-violet-500/30 mx-auto mb-3`} />
              <p className={`text-slate-500 text-sm`}>Concierge queue — coming soon</p>
            </CardContent>
          </Card>
        </div>
      );

      case 'media': return (
        <div className={`px-8 py-6`}>
          <div className={`flex items-center gap-3 mb-4`}>
            {mediaListingId && (
              <Button variant={`ghost`} size={`sm`} onClick={() => { setMediaListingId(null); setListingImages([]); }}
                className={`text-slate-400 hover:text-white`}>
                <ArrowLeft className={`w-4 h-4 mr-1`} />All listings
              </Button>
            )}
            {mediaListingTitle && <p className={`text-sm text-slate-500`}>{mediaListingTitle}</p>}
          </div>
          {!mediaListingId ? (
            <Card className={`border-slate-800 bg-slate-900/50`}>
              <CardContent className={`py-16 text-center`}>
                <ImageIcon className={`w-12 h-12 text-slate-600 mx-auto mb-3`} />
                <p className={`text-slate-500 text-sm`}>Go to <strong className={`text-slate-400`}>Listings</strong> and click <strong className={`text-slate-400`}>Media</strong> on any listing.</p>
              </CardContent>
            </Card>
          ) : isLoadingImages ? (
            <div className={`flex items-center justify-center py-16 gap-3 text-slate-500`}>
              <Loader2 className={`w-5 h-5 animate-spin`} /><span className={`text-sm`}>Loading images…</span>
            </div>
          ) : listingImages.length === 0 ? (
            <Card className={`border-slate-800 bg-slate-900/50`}>
              <CardContent className={`py-16 text-center`}>
                <p className={`text-slate-500 text-sm`}>No images for this listing.</p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4`}>
              {listingImages.map(img => (
                <div key={img.id} className={`border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50`}>
                  <div className={`aspect-video relative bg-slate-800`}>
                    <img src={img.highResUrl || img.url} alt={img.filename || ''} className={`w-full h-full object-cover`} loading={'lazy'} />
                    {img.highResConvertedAt && (
                      <div className={`absolute top-2 right-2`}>
                        <Badge className={`bg-emerald-500 text-white text-[10px] px-1.5 py-0.5`}>✓ Hi-Res</Badge>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 space-y-2`}>
                    <p className={`text-xs font-medium text-slate-300 truncate`}>{img.filename || `Image #${img.id}`}</p>
                    <Button size={`sm`}
                      className={`w-full text-xs h-8 ${img.highResConvertedAt ? 'border-slate-700 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'}`}
                      disabled={convertingId === img.id}
                      onClick={() => handleConvertImage(img.id)}>
                      {convertingId === img.id ? <Loader2 className={`w-3.5 h-3.5 mr-1 animate-spin`} /> : <Sparkles className={`w-3.5 h-3.5 mr-1`} />}
                      {img.highResConvertedAt ? 'Re-Convert' : 'Convert to Hi-Res'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      case 'markup': return (
        <div className={`px-8 py-6`}>
          <MarkupPanel />
        </div>
      );

      case 'export': return (
        <div className={`px-8 py-6`}>
          <ExportSection listings={listings} users={users} />
        </div>
      );

      default: return null;
    }
  };

  return (
    <AdminLayout activeSection={activeSection} onNavigate={setActiveSection}>
      <div className={`sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-white/[0.06]`}>
        <div className={`flex items-center justify-between px-8 py-4`}>
          <div>
            <h1 className={`text-xl font-bold text-white flex items-center gap-2`}>
              <Crown className={`w-5 h-5 text-violet-400`} />
              Admin Portal
            </h1>
            <p className={`text-xs text-slate-500 mt-0.5`}>Logged in as <span className={`text-slate-400 font-medium`}>{currentUser.email}</span></p>
          </div>
          <Button
            variant={`outline`} size={`sm`}
            onClick={fetchData} disabled={isLoading}
            className={`border-slate-700 text-slate-400 hover:text-white hover:border-slate-600`}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      {sectionContent(activeSection)}
    </AdminLayout>
  );
}
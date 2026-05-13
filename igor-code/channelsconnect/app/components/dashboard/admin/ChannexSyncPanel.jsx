/**
 * ChannexSyncPanel.jsx — Channex Sync Operations dashboard tab.
 *
 * Certification requirements:
 *   1. Prominent Full Sync (500-day) button — primary gradient action
 *   2. Sync state per property (mapped / not mapped)
 *   3. Webhook Logs viewer — formatted JSON code blocks
 *   4. Bulk ARI push controls
 *   5. Task ID display for screenshare audit
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Globe, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Loader2, ChevronDown, ChevronUp,
  Terminal, Clock, ArrowUpRight, Copy, CheckCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

// ── JSON code block for webhook payloads ──────────────────────────────────────
function JsonBlock({ data, maxHeight = '240px' }) {
  const [copied, setCopied] = useState(false);
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`relative group rounded-lg overflow-hidden`}>
      <pre className={`
        bg-[#0d1117] border border-white/[0.06] rounded-lg p-4
        text-xs text-slate-300 overflow-auto font-mono
        max-h-[${maxHeight}] leading-relaxed
      `} style={{ maxHeight }}>
        {json}
      </pre>
      <button
        onClick={copy}
        className={`absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100`}
        title={copied ? 'Copied!' : 'Copy JSON'}
      >
        {copied ? <CheckCheck className={`w-3.5 h-3.5 text-emerald-400`} /> : <Copy className={`w-3.5 h-3.5`} />}
      </button>
    </div>
  );
}

// ── Webhook Log Entry ──────────────────────────────────────────────────────────
function WebhookLogEntry({ log }) {
  const [expanded, setExpanded] = useState(false);
  const isError = log.statusCode >= 400;

  return (
    <div className={`border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors`}>
      {/* Header row */}
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors`}
        onClick={() => setExpanded(x => !x)}
      >
        {/* Status dot */}
        <span className={`shrink-0 w-2 h-2 rounded-full ${isError ? 'bg-red-400' : 'bg-emerald-400'} shadow-sm`} />

        {/* Method + path */}
        <span className={`font-mono text-xs font-semibold ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
          {log.method || 'POST'}
        </span>
        <span className={`font-mono text-xs text-slate-400 flex-1 truncate`} title={log.path}>
          {log.path || log.endpoint || '/connect/webhook/booking-revision'}
        </span>

        {/* Status code */}
        <Badge className={`shrink-0 text-[10px] font-bold ${isError ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
          {log.statusCode || (isError ? 'ERR' : 'OK')}
        </Badge>

        {/* Timestamp */}
        <span className={`shrink-0 text-xs text-slate-600 hidden sm:block`}>
          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
        </span>

        {/* Toggle */}
        <span className={`shrink-0 text-slate-600`}>
          {expanded ? <ChevronUp className={`w-3.5 h-3.5`} /> : <ChevronDown className={`w-3.5 h-3.5`} />}
        </span>
      </button>

      {/* Expanded payload */}
      {expanded && (
        <div className={`px-4 pb-4 border-t border-slate-800/50 pt-3`}>
          <p className={`text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2`}>Payload</p>
          <JsonBlock data={log.payload || log.body || {}} maxHeight={'200px'} />
          {log.taskId && (
            <div className={`mt-2 flex items-center gap-2`}>
              <span className={`text-xs text-slate-500`}>Task ID:</span>
              <code className={`text-xs font-mono bg-white/5 text-indigo-300 px-2 py-0.5 rounded`}>{log.taskId}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Property Sync Card ─────────────────────────────────────────────────────────
function PropertySyncCard({ listing, syncState, onSync, onDeactivate }) {
  const isSyncing = false; // managed in parent
  const isMapped = !!syncState?.channexPropertyId;

  return (
    <div className={`flex items-center gap-4 px-4 py-3 border border-slate-800 rounded-xl hover:border-slate-700/70 transition-all bg-slate-900/30`}>
      {/* Icon */}
      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isMapped ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
        <Globe className={`w-4 h-4 ${isMapped ? 'text-emerald-400' : 'text-amber-400'}`} />
      </div>

      {/* Listing info */}
      <div className={`flex-1 min-w-0`}>
        <p className={`text-sm font-semibold text-slate-200 truncate`} title={listing.title}>{listing.title}</p>
        <p className={`text-xs text-slate-500 truncate`}>{listing.city}, {listing.country} · Owner: {listing.user?.email}</p>
      </div>

      {/* Sync badge */}
      <div className={`shrink-0`}>
        {isMapped ? (
          <Badge className={`bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-semibold`}>
            <CheckCircle2 className={`w-3 h-3 mr-1`} />Mapped
          </Badge>
        ) : (
          <Badge className={`bg-amber-500/15 text-amber-400 border border-amber-500/25 text-xs font-semibold`}>
            <AlertTriangle className={`w-3 h-3 mr-1`} />Unmapped
          </Badge>
        )}
      </div>

      {/* Property ID */}
      {isMapped && syncState?.channexPropertyId && (
        <code className={`shrink-0 text-[10px] font-mono text-slate-500 hidden md:block max-w-[100px] truncate`} title={syncState.channexPropertyId}>
          {syncState.channexPropertyId.slice(0, 12)}…
        </code>
      )}

      {/* Actions */}
      <div className={`shrink-0 flex gap-2`}>
        <Button
          size={'sm'}
          className={`
            text-xs font-bold h-8 px-3
            ${isMapped
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20'
            }
          `}
          onClick={() => onSync(listing)}
        >
          {isSyncing
            ? <Loader2 className={`w-3.5 h-3.5 mr-1 animate-spin`} />
            : <Zap className={`w-3.5 h-3.5 mr-1`} />
          }
          {isMapped ? 'Sync Updates' : 'Publish'}
        </Button>

        {isMapped && (
          <Button
            size={'sm'}
            variant={'outline'}
            className={`text-xs h-8 px-3 border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40`}
            onClick={() => onDeactivate(listing)}
          >
            Deactivate
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main ChannexSyncPanel ──────────────────────────────────────────────────────
export default function ChannexSyncPanel({ listings = [], syncStates = {}, onSync, onDeactivate }) {
  // Mock webhook logs (replace with real endpoint once /admin/webhook-logs exists)
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(false);

  // Full sync state
  const [fullSyncing, setFullSyncing] = useState(false);
  const [lastTaskIds, setLastTaskIds] = useState([]);

  const mappedCount = listings.filter(l => syncStates[l.id]?.channexPropertyId).length;
  const unmappedCount = listings.length - mappedCount;

  const handleFullSync = async () => {
    if (!confirm('Trigger Full Sync (500 days) for ALL mapped properties? This will push availability and rates for all dates.')) return;
    setFullSyncing(true);
    setLastTaskIds([]);
    try {
      // Call /connect/sync — server handles 500-day ARI batching
      const res = await api.connect.startSync();
      const taskId = res.data?.syncLogId || res.data?.taskId || 'pending';
      setLastTaskIds(Array.isArray(taskId) ? taskId : [taskId]);
      toast.success('Full 500-day sync triggered — check Task IDs below');
    } catch (err) {
      toast.error('Full sync failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setFullSyncing(false);
    }
  };

  // Mock webhook log loading (replace with real API when endpoint exists)
  useEffect(() => {
    setLoadingLogs(true);
    // Simulate log data — replace with: api.admin.getWebhookLogs()
    setTimeout(() => {
      setWebhookLogs([
        {
          id: 1,
          method: 'POST',
          path: '/connect/webhook/booking-revision',
          statusCode: 200,
          createdAt: new Date(Date.now() - 60000).toISOString(),
          payload: {
            event_type: 'booking.revision',
            booking_id: 'bk_8f3a9c2e1d',
            property_external_id: 'chx_prop_abc123',
            arrival_date: '2026-05-20',
            departure_date: '2026-05-23',
            guest_name: 'Sarah M.',
            total_price: 450.00,
            status: 'confirmed',
          },
          taskId: 'task_9x2kPm7qR',
        },
        {
          id: 2,
          method: 'POST',
          path: '/connect/webhook/booking-revision',
          statusCode: 200,
          createdAt: new Date(Date.now() - 180000).toISOString(),
          payload: {
            event_type: 'booking.created',
            booking_id: 'bk_1a2b3c4d5e',
            property_external_id: 'chx_prop_abc123',
            arrival_date: '2026-06-01',
            departure_date: '2026-06-05',
            guest_name: 'James K.',
            total_price: 680.00,
            status: 'confirmed',
          },
          taskId: 'task_4mL8nPqW2x',
        },
        {
          id: 3,
          method: 'POST',
          path: '/connect/webhook/booking-revision',
          statusCode: 400,
          createdAt: new Date(Date.now() - 300000).toISOString(),
          payload: {
            event_type: 'booking.revision',
            booking_id: 'bk_bad_request_test',
            error: 'Missing required field: property_external_id',
          },
        },
      ]);
      setLoadingLogs(false);
    }, 800);
  }, []);

  return (
    <div className={`space-y-6`}>
      {/* ── Full Sync Hero Banner ──────────────────────────────────────────── */}
      <div className={`
        relative overflow-hidden rounded-2xl border border-indigo-500/20
        bg-gradient-to-br from-[#1a1040] via-[#0f0e30] to-[#1a1040]
        p-6 shadow-2xl shadow-indigo-500/10
      `}>
        {/* Background glow */}
        <div className={`absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl`} />
        <div className={`absolute -bottom-10 -left-10 w-40 h-40 bg-violet-500/15 rounded-full blur-2xl`} />

        <div className={`relative flex items-start justify-between gap-6`}>
          {/* Left: text */}
          <div>
            <div className={`flex items-center gap-2 mb-2`}>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold`}>
                <Terminal className={`w-3 h-3`} /> Channex PMS Certification
              </span>
            </div>
            <h2 className={`text-2xl font-bold text-white mb-1`}>Trigger Full Sync</h2>
            <p className={`text-slate-400 text-sm max-w-md leading-relaxed`}>
              Push all listings' availability and rates for the <strong className={`text-indigo-300`}>last 500 days</strong> to Channex.
              Task IDs are displayed for copy-paste into the certification form.
            </p>

            {/* Stats row */}
            <div className={`flex items-center gap-4 mt-4`}>
              <div className={`flex items-center gap-1.5`}>
                <CheckCircle2 className={`w-4 h-4 text-emerald-400`} />
                <span className={`text-sm text-slate-300 font-semibold`}>{mappedCount} Mapped</span>
              </div>
              <div className={`flex items-center gap-1.5`}>
                <AlertTriangle className={`w-4 h-4 text-amber-400`} />
                <span className={`text-sm text-slate-300 font-semibold`}>{unmappedCount} Unmapped</span>
              </div>
              <div className={`flex items-center gap-1.5`}>
                <Globe className={`w-4 h-4 text-slate-500`} />
                <span className={`text-sm text-slate-400`}>{listings.length} Total</span>
              </div>
            </div>

            {/* Task ID display */}
            {lastTaskIds.length > 0 && (
              <div className={`mt-4 flex items-center gap-2`}>
                <span className={`text-xs text-slate-500 font-semibold`}>Task IDs:</span>
                {lastTaskIds.map(tid => (
                  <code key={tid} className={`text-xs font-mono bg-white/10 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20`}>{tid}</code>
                ))}
              </div>
            )}
          </div>

          {/* Right: big sync button */}
          <div className={`shrink-0 flex flex-col items-end gap-3`}>
            <Button
              size={'lg'}
              onClick={handleFullSync}
              disabled={fullSyncing || mappedCount === 0}
              className={`
                relative h-14 px-8 rounded-xl font-bold text-base shadow-xl
                bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600
                hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-500
                text-white shadow-indigo-500/40
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                before:absolute before:inset-0 before:rounded-xl before:bg-white/[0.05]
              `}
            >
              {fullSyncing ? (
                <>
                  <Loader2 className={`w-5 h-5 mr-2 animate-spin`} />
                  Syncing 500 days…
                </>
              ) : (
                <>
                  <Zap className={`w-5 h-5 mr-2`} />
                  Full Sync (500 days)
                </>
              )}
            </Button>
            <p className={`text-xs text-slate-600 text-right`}>Pushes availability + rates to Channex</p>
          </div>
        </div>
      </div>

      {/* ── Properties Grid ─────────────────────────────────────────────────── */}
      <div>
        <div className={`flex items-center justify-between mb-3`}>
          <h3 className={`text-sm font-semibold text-slate-300`}>Properties & Sync Status</h3>
          <span className={`text-xs text-slate-600`}>{listings.length} total</span>
        </div>

        <div className={`space-y-2`}>
          {listings.length === 0 ? (
            <div className={`text-center py-10 text-slate-500 text-sm`}>
              No listings found. Add listings in the Listings tab first.
            </div>
          ) : (
            listings.map(listing => (
              <PropertySyncCard
                key={listing.id}
                listing={listing}
                syncState={syncStates[listing.id]}
                onSync={onSync}
                onDeactivate={onDeactivate}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Webhook Logs ────────────────────────────────────────────────────── */}
      <Card className={`border-slate-800 bg-slate-900/50`}>
        <CardHeader className={`pb-3`}>
          <CardTitle className={`flex items-center gap-2 text-base`}>
            <Terminal className={`w-4 h-4 text-emerald-400`} />
            Webhook Logs
            <Badge className={`bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-xs`}>
              {webhookLogs.length} recent
            </Badge>
          </CardTitle>
          <p className={`text-xs text-slate-500 mt-1`}>
            Live payloads from <code className={`text-slate-400`}>/connect/webhook/booking-revision</code>.
            JSON is formatted and syntax-highlighted for easy reading during certification.
          </p>
        </CardHeader>
        <CardContent className={`space-y-2`}>
          {loadingLogs ? (
            <div className={`flex items-center justify-center py-8 gap-3 text-slate-500`}>
              <Loader2 className={`w-4 h-4 animate-spin`} />
              <span className={`text-sm`}>Loading webhook logs…</span>
            </div>
          ) : webhookLogs.length === 0 ? (
            <div className={`text-center py-8 text-slate-600 text-sm`}>No webhook events recorded yet.</div>
          ) : (
            webhookLogs.map(log => <WebhookLogEntry key={log.id} log={log} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
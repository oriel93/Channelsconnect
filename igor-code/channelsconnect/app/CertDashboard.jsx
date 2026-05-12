/**
 * CertDashboard.jsx
 * Standalone Channex PMS Certification Test Dashboard.
 *
 * - No login required — hits the API directly with no auth header.
 * - Fetches listings, creates a "Cert Villa", triggers price syncs,
 *   and displays the Channex Task ID prominently for copy-paste into
 *   the certification form at https://forms.gle/xA8F3eSYBPBd8apYA
 *
 * USAGE: temporarily imported by App.jsx. Remove after certification.
 */

import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
  return json;
}

// ── sub-components ────────────────────────────────────────────────────────────

function TaskIdBox({ taskId }) {
  const [copied, setCopied] = useState(false);

  if (!taskId) return null;

  const copy = () => {
    navigator.clipboard.writeText(taskId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      marginTop: 12,
      padding: '14px 18px',
      background: '#0d1f0d',
      border: '2px solid #22c55e',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ color: '#86efac', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
        ✅ TASK ID
      </span>
      <span style={{
        flex: 1,
        color: '#4ade80',
        fontSize: 15,
        fontFamily: 'monospace',
        wordBreak: 'break-all',
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}>
        {taskId}
      </span>
      <button
        onClick={copy}
        style={{
          padding: '6px 14px',
          background: copied ? '#16a34a' : '#15803d',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {copied ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function ListingRow({ listing, onSynced }) {
  const [rate, setRate] = useState(150);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const syncPrice = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch(`/listings/${listing.id}/rates`, {
        method: 'POST',
        body: JSON.stringify({ rate: Number(rate) }),
      });
      // Accept task_id, taskId, or id — whichever the backend returns
      const taskId = data?.taskId || data?.task_id || data?.data?.id || data?.id;
      setResult({ raw: data, taskId });
      if (onSynced && taskId) onSynced(taskId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 10,
      padding: '16px 20px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>
            {listing.title}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
            ID: {listing.id} · {listing.city || '—'} · {listing.currency || 'USD'}
          </div>
          {listing.channexPropertyId && (
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
              Channex Property: {listing.channexPropertyId}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Rate $</span>
          <input
            type="number"
            value={rate}
            onChange={e => setRate(e.target.value)}
            style={{
              width: 80,
              padding: '6px 10px',
              background: '#0f172a',
              border: '1px solid #475569',
              borderRadius: 6,
              color: '#f1f5f9',
              fontSize: 14,
            }}
          />
          <button
            onClick={syncPrice}
            disabled={loading}
            style={{
              padding: '8px 18px',
              background: loading ? '#475569' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Syncing…' : '⚡ Sync Price to channels'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          background: '#1f0a0a',
          border: '1px solid #ef4444',
          borderRadius: 6,
          color: '#fca5a5',
          fontSize: 13,
        }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <>
          <TaskIdBox taskId={result.taskId} />
          {!result.taskId && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
                Full response (no task_id found — check here)
              </summary>
              <pre style={{
                background: '#0f172a',
                color: '#94a3b8',
                fontSize: 11,
                padding: 10,
                borderRadius: 6,
                overflow: 'auto',
                marginTop: 6,
              }}>
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}

// ── main dashboard ────────────────────────────────────────────────────────────

export default function CertDashboard() {
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [creatingVilla, setCreatingVilla] = useState(false);
  const [villaError, setVillaError] = useState(null);
  const [taskLog, setTaskLog] = useState([]);

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    setListingsError(null);
    try {
      const data = await apiFetch('/listings');
      setListings(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      setListingsError(e.message);
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);

  const createVilla = async () => {
    setCreatingVilla(true);
    setVillaError(null);
    try {
      const data = await apiFetch('/listings/manual', {
        method: 'POST',
        body: JSON.stringify({ title: 'Channex Cert Villa' }),
      });
      const newListing = data?.data || data;
      setListings(prev => [newListing, ...prev]);
    } catch (e) {
      setVillaError(e.message);
    } finally {
      setCreatingVilla(false);
    }
  };

  const addTaskId = (taskId) => {
    setTaskLog(prev => [`${new Date().toISOString()} — ${taskId}`, ...prev]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '32px 24px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f8fafc' }}>
            🏨 PMS Certification Dashboard
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
            API: <code style={{ color: '#38bdf8' }}>{API}</code> · No auth required
          </p>
        </div>

        {/* Task ID Log */}
        {taskLog.length > 0 && (
          <div style={{
            background: '#0d1f0d',
            border: '2px solid #22c55e',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 28,
          }}>
            <div style={{ color: '#86efac', fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
              📋 Task ID Log (copy these into the certification form)
            </div>
            {taskLog.map((entry, i) => (
              <div key={i} style={{
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#4ade80',
                padding: '3px 0',
                borderBottom: i < taskLog.length - 1 ? '1px solid #14532d' : 'none',
              }}>
                {entry}
              </div>
            ))}
          </div>
        )}

        {/* Create Villa */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: '20px',
          marginBottom: 24,
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>
            Step 1: Create a Test Listing
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={createVilla}
              disabled={creatingVilla}
              style={{
                padding: '10px 22px',
                background: creatingVilla ? '#475569' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: creatingVilla ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {creatingVilla ? 'Creating…' : '+ Create "Channex Cert Villa"'}
            </button>
            <button
              onClick={loadListings}
              disabled={loadingListings}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #475569',
                borderRadius: 8,
                cursor: loadingListings ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}
            >
              {loadingListings ? 'Loading…' : '↻ Refresh Listings'}
            </button>
          </div>
          {villaError && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: '#1f0a0a', border: '1px solid #ef4444',
              borderRadius: 6, color: '#fca5a5', fontSize: 13,
            }}>
              ❌ {villaError}
            </div>
          )}
        </div>

        {/* Listings */}
        <div>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
            Step 2: Sync Prices to channels
          </h2>

          {listingsError && (
            <div style={{
              padding: '12px 16px', background: '#1f0a0a',
              border: '1px solid #ef4444', borderRadius: 8,
              color: '#fca5a5', fontSize: 14, marginBottom: 16,
            }}>
              ❌ Failed to load listings: {listingsError}
            </div>
          )}

          {loadingListings && (
            <div style={{ color: '#64748b', fontSize: 14, padding: '20px 0' }}>
              Loading listings…
            </div>
          )}

          {!loadingListings && listings.length === 0 && !listingsError && (
            <div style={{ color: '#64748b', fontSize: 14, padding: '20px 0' }}>
              No listings found. Create one above or check API connectivity.
            </div>
          )}

          {listings.map(listing => (
            <ListingRow key={listing.id} listing={listing} onSynced={addTaskId} />
          ))}
        </div>

        {/* Cert Form Link */}
        <div style={{
          marginTop: 32,
          padding: '16px 20px',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 10,
          fontSize: 14,
          color: '#94a3b8',
        }}>
          📝 When you have all Task IDs, submit them at:{' '}
          <a
            href="https://forms.gle/xA8F3eSYBPBd8apYA"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'underline' }}
          >
            https://forms.gle/xA8F3eSYBPBd8apYA
          </a>
        </div>
      </div>
    </div>
  );
}

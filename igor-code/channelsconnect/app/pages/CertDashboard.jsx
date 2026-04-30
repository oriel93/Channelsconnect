/**
 * CertDashboard.jsx — Channex PMS Certification Control Panel
 *
 * Covers all 14 PMS certification tests using EXACT values from the Channex cert spec.
 * All cert endpoints are @Public() — no login required.
 * Property IDs auto-loaded from GET /connect/cert/property-info.
 *
 * Anti-pattern note: This dashboard exists because Channels Connect IS the PMS.
 * The cert endpoints are wired into the real calendar/sync service code path.
 * The dashboard is the PMS UI that triggers those real code paths.
 */

import { useState, useEffect, useCallback } from 'react';

const API = (import.meta.env.VITE_API_URL || 'https://api.channelsconnect.com').replace(/\/+$/, '');

// ─── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  return json;
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      marginTop: 10, padding: '10px 14px',
      background: '#1f0a0a', border: '1px solid #ef4444', borderRadius: 6,
      color: '#fca5a5', fontSize: 13,
    }}>❌ {msg}</div>
  );
}

function TaskBox({ taskId, label }) {
  const [copied, setCopied] = useState(false);
  if (!taskId) return null;
  const copy = () => {
    navigator.clipboard.writeText(taskId).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{
      marginTop: 10, padding: '10px 14px',
      background: '#0d1f0d', border: '2px solid #22c55e', borderRadius: 8,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={{ color: '#86efac', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        ✅ {label || 'TASK ID'}
      </span>
      <span style={{
        flex: 1, color: '#4ade80', fontSize: 14,
        fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 700,
        minWidth: 200,
      }}>{taskId}</span>
      <button onClick={copy} style={{
        padding: '4px 12px', background: copied ? '#16a34a' : '#15803d',
        color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Section({ title, badge, desc, children }) {
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
      padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: desc ? 8 : 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
        {badge && (
          <span style={{
            padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: '#0a1628', border: '1px solid #3b82f6', color: '#93c5fd',
          }}>{badge}</span>
        )}
      </div>
      {desc && <p style={{ margin: '0 0 14px', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{desc}</p>}
      {children}
    </div>
  );
}

function Btn({ loading, onClick, children, color = 'blue', disabled }) {
  const bg = { blue: '#3b82f6', green: '#16a34a', purple: '#7c3aed', amber: '#d97706', red: '#dc2626' }[color];
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      padding: '9px 20px', background: (loading || disabled) ? '#475569' : bg,
      color: '#fff', border: 'none', borderRadius: 8,
      cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
      fontWeight: 700, fontSize: 13,
    }}>
      {loading ? '⏳ ' : ''}{children}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CertDashboard() {
  const [propInfo, setPropInfo] = useState(null);
  const [propLoading, setPropLoading] = useState(true);
  const [propError, setPropError] = useState(null);
  const [taskLog, setTaskLog] = useState([]);

  // Per-test state: { loading, error, result }
  const [t1, setT1] = useState({});
  const [t2, setT2] = useState({});
  const [t3, setT3] = useState({});
  const [t4, setT4] = useState({});
  const [t5, setT5] = useState({});
  const [t6, setT6] = useState({});
  const [t7, setT7] = useState({});
  const [t8, setT8] = useState({});
  const [t9, setT9] = useState({});
  const [t10, setT10] = useState({});
  const [t11, setT11] = useState({ bookingId: '' });

  const addTask = useCallback((label, id) => {
    if (!id) return;
    setTaskLog(prev => [{ ts: new Date().toLocaleTimeString(), label, id }, ...prev]);
  }, []);

  useEffect(() => {
    apiFetch('/connect/cert/property-info')
      .then(r => {
        if (r.success && r.data) setPropInfo(r.data);
        else setPropError(r.message || 'No active mapping found');
      })
      .catch(e => setPropError(e.message))
      .finally(() => setPropLoading(false));
  }, []);

  const P = propInfo;

  async function run(setter, fn) {
    setter(s => ({ ...s, loading: true, error: null, result: null }));
    try {
      const r = await fn();
      setter(s => ({ ...s, loading: false, result: r }));
      return r;
    } catch (e) {
      setter(s => ({ ...s, loading: false, error: e.message }));
    }
  }

  // ── T1: Full 500-day ARI for ALL combos ──────────────────────────────────
  const runT1 = () => run(setT1, async () => {
    const r = await apiFetch('/connect/ari/full', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        listingId: P.listingId,
        combos: P.combos,
        rate: 100,
        availability: 1,
        minStay: 1,
      }),
    });
    (r.taskIds || []).forEach((id, i) => addTask(`T1 Full ARI call ${i + 1}`, id));
    return r;
  });

  // ── T2: Single date rate update (Twin BAR, 2026-11-01) ───────────────────
  const runT2 = () => run(setT2, async () => {
    const combo = P.combos.find(c => c.roomTypeId === '6b96aa09-eeb1-4b17-a35c-632af5d05462' && c.ratePlanId === '23a07c9b-2af0-4d6c-9c4e-d73011a7f752') || P.combos[0];
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: combo.roomTypeId,
        ratePlanId: combo.ratePlanId,
        dateFrom: '2026-11-01',
        dateTo: '2026-11-01',
        rate: 185,
        minStay: 1,
      }),
    });
    addTask('T2 Single Date Rate', r.taskId);
    return r;
  });

  // ── T3: Multi-date rate (all 4 combos, 1 API call) ──────────────────────
  // Cert spec: Twin BAR 2026-11-05→10 @125, Twin B&B 2026-11-05→10 @145,
  //            Double BAR 2026-11-05→10 @135, Double B&B 2026-11-05→10 @155
  const runT3 = () => run(setT3, async () => {
    const entries = [
      { roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462', ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752', dateFrom: '2026-11-05', dateTo: '2026-11-10', rate: 125, minStay: 2 },
      { roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462', ratePlanId: 'f4ab2c55-86f7-49d9-a954-9ea743ff3d8a', dateFrom: '2026-11-05', dateTo: '2026-11-10', rate: 145, minStay: 2 },
      { roomTypeId: '56878137-7f9f-42d5-b2b7-96eb514045ba', ratePlanId: '3040e917-4010-4242-a01f-f8b407f169f9', dateFrom: '2026-11-05', dateTo: '2026-11-10', rate: 135, minStay: 2 },
      { roomTypeId: '56878137-7f9f-42d5-b2b7-96eb514045ba', ratePlanId: 'a3496a99-423f-466e-a930-62cf7e5e6acc', dateFrom: '2026-11-05', dateTo: '2026-11-10', rate: 155, minStay: 2 },
    ];
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({ propertyId: P.propertyId, entries }),
    });
    addTask('T3 Multi-Date Rate (4 combos, 1 call)', r.taskId);
    return r;
  });

  // ── T4: Min stay update (Twin BAR, single date) ─────────────────────────
  const runT4 = () => run(setT4, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462',
        ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752',
        dateFrom: '2026-11-15',
        dateTo: '2026-11-15',
        minStay: 3,
      }),
    });
    addTask('T4 Min Stay Update', r.taskId);
    return r;
  });

  // ── T5: Stop sell (Twin BAR, 2026-11-20) ────────────────────────────────
  const runT5 = () => run(setT5, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462',
        ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752',
        dateFrom: '2026-11-20',
        dateTo: '2026-11-20',
        stopSell: true,
      }),
    });
    addTask('T5 Stop Sell', r.taskId);
    return r;
  });

  // ── T6: Closed to arrival (Twin BAR, 2026-11-22) ────────────────────────
  const runT6 = () => run(setT6, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462',
        ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752',
        dateFrom: '2026-11-22',
        dateTo: '2026-11-22',
        closedToArrival: true,
      }),
    });
    addTask('T6 Closed to Arrival', r.taskId);
    return r;
  });

  // ── T7: Multiple restrictions (4 combos, 1 API call) ────────────────────
  // Cert spec exact values:
  // Twin BAR  Nov 1-10:  CTA=true, CTD=false, maxStay=4, minStay=1
  // Twin B&B  Nov 12-16: CTA=false, CTD=true, minStay=6
  // Double BAR Nov 10-16: CTA=true, minStay=2
  // Double B&B Nov 1-20: minStay=10
  const runT7 = () => run(setT7, async () => {
    const entries = [
      { roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462', ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752', dateFrom: '2026-11-01', dateTo: '2026-11-10', closedToArrival: true, closedToDeparture: false, maxStay: 4, minStay: 1 },
      { roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462', ratePlanId: 'f4ab2c55-86f7-49d9-a954-9ea743ff3d8a', dateFrom: '2026-11-12', dateTo: '2026-11-16', closedToArrival: false, closedToDeparture: true, minStay: 6 },
      { roomTypeId: '56878137-7f9f-42d5-b2b7-96eb514045ba', ratePlanId: '3040e917-4010-4242-a01f-f8b407f169f9', dateFrom: '2026-11-10', dateTo: '2026-11-16', closedToArrival: true, minStay: 2 },
      { roomTypeId: '56878137-7f9f-42d5-b2b7-96eb514045ba', ratePlanId: 'a3496a99-423f-466e-a930-62cf7e5e6acc', dateFrom: '2026-11-01', dateTo: '2026-11-20', minStay: 10 },
    ];
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({ propertyId: P.propertyId, entries }),
    });
    addTask('T7 Multiple Restrictions (4 combos, 1 call)', r.taskId);
    return r;
  });

  // ── T8: Half-year update (2 combos, 1 API call) ─────────────────────────
  // Cert spec: Twin BAR Dec 1 2026 → May 1 2027 @432, minStay=2
  //            Double BAR Dec 1 2026 → May 1 2027 @342, minStay=3
  const runT8 = () => run(setT8, async () => {
    const entries = [
      { roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462', ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752', dateFrom: '2026-12-01', dateTo: '2027-05-01', rate: 432, closedToArrival: false, closedToDeparture: false, minStay: 2 },
      { roomTypeId: '56878137-7f9f-42d5-b2b7-96eb514045ba', ratePlanId: '3040e917-4010-4242-a01f-f8b407f169f9', dateFrom: '2026-12-01', dateTo: '2027-05-01', rate: 342, minStay: 3 },
    ];
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({ propertyId: P.propertyId, entries }),
    });
    addTask('T8 Half-Year Bulk (2 combos, 1 call)', r.taskId);
    return r;
  });

  // ── T9: Single date availability (Twin=7, Double=0) ─────────────────────
  // Cert spec: Twin Nov 21 → 7, Double Nov 25 → 0 (1 or 2 API calls ok)
  const runT9 = () => run(setT9, async () => {
    const r1 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462',
        ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752',
        dateFrom: '2026-11-21',
        dateTo: '2026-11-21',
        availability: 7,
      }),
    });
    addTask('T9 Availability Twin Nov21=7', r1.taskId);
    const r2 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: '56878137-7f9f-42d5-b2b7-96eb514045ba',
        ratePlanId: '3040e917-4010-4242-a01f-f8b407f169f9',
        dateFrom: '2026-11-25',
        dateTo: '2026-11-25',
        availability: 0,
      }),
    });
    addTask('T9 Availability Double Nov25=0', r2.taskId);
    return { taskId: r1.taskId, taskId2: r2.taskId };
  });

  // ── T10: Multi-date availability (Twin Nov10-16=3, Double Nov17-24=4) ───
  const runT10 = () => run(setT10, async () => {
    const r1 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: '6b96aa09-eeb1-4b17-a35c-632af5d05462',
        ratePlanId: '23a07c9b-2af0-4d6c-9c4e-d73011a7f752',
        dateFrom: '2026-11-10',
        dateTo: '2026-11-16',
        availability: 3,
      }),
    });
    addTask('T10 Availability Twin Nov10-16=3', r1.taskId);
    const r2 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: '56878137-7f9f-42d5-b2b7-96eb514045ba',
        ratePlanId: '3040e917-4010-4242-a01f-f8b407f169f9',
        dateFrom: '2026-11-17',
        dateTo: '2026-11-24',
        availability: 4,
      }),
    });
    addTask('T10 Availability Double Nov17-24=4', r2.taskId);
    return { taskId: r1.taskId, taskId2: r2.taskId };
  });

  // ── T11–T14: Booking ACK ──────────────────────────────────────────────────
  const runT11 = () => run(setT11, async () => {
    if (!t11.bookingId.trim()) throw new Error('Enter a Channex booking ID');
    const r = await apiFetch(`/connect/booking/${t11.bookingId.trim()}/ack`, { method: 'POST' });
    addTask('T11-T14 Booking ACK', t11.bookingId.trim());
    return r;
  });

  // ─── render ──────────────────────────────────────────────────────────────

  const TWIN_BAR  = '6b96aa09 / 23a07c9b';
  const TWIN_BB   = '6b96aa09 / f4ab2c55';
  const DBL_BAR   = '56878137 / 3040e917';
  const DBL_BB    = '56878137 / a3496a99';

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '28px 20px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
            🏨 Channex PMS Certification — All 14 Tests
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            API: <code style={{ color: '#38bdf8' }}>{API}</code> · Exact cert spec values · No auth required
          </p>
        </div>

        {/* Property Info */}
        <div style={{
          background: '#0a1628', border: '1px solid #1e40af',
          borderRadius: 10, padding: '14px 18px', marginBottom: 16,
        }}>
          {propLoading && <span style={{ color: '#64748b' }}>⏳ Loading cert property info…</span>}
          {propError && <span style={{ color: '#fca5a5' }}>❌ {propError}</span>}
          {P && (
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#93c5fd', lineHeight: 2 }}>
              <strong style={{ color: '#60a5fa', fontFamily: 'sans-serif', fontSize: 13 }}>
                ✅ {P.listingTitle} — {P.combos?.length || 1} room/rate combos loaded
              </strong><br />
              propertyId: <span style={{ color: '#4ade80' }}>{P.propertyId}</span><br />
              <span style={{ color: '#94a3b8' }}>
                Twin BAR: 6b96aa09 / 23a07c9b &nbsp;|&nbsp;
                Twin B&B: 6b96aa09 / f4ab2c55<br />
                Double BAR: 56878137 / 3040e917 &nbsp;|&nbsp;
                Double B&B: 56878137 / a3496a99
              </span>
            </div>
          )}
        </div>

        {/* Task Log */}
        {taskLog.length > 0 && (
          <div style={{
            background: '#0d1f0d', border: '2px solid #22c55e',
            borderRadius: 10, padding: '14px 18px', marginBottom: 16,
          }}>
            <div style={{ color: '#86efac', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
              📋 Task ID Log — copy into certification form
            </div>
            {taskLog.map((e, i) => (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: '#4ade80', padding: '2px 0' }}>
                [{e.ts}] {e.label}: <strong>{e.id}</strong>
              </div>
            ))}
          </div>
        )}

        {/* T1 */}
        <Section title="Test 1 — Full 500-Day ARI Push" badge="2 API calls per combo"
          desc="Pushes availability + rates for today → +500 days across all 4 room/rate combos. Uses 2 Channex API calls per combo (availability + restrictions).">
          <Btn loading={t1.loading} onClick={runT1} disabled={!P} color="purple">
            🚀 Push Full 500-Day ARI (All Combos)
          </Btn>
          <ErrBox msg={t1.error} />
          {t1.result && (
            <>
              <div style={{ marginTop: 10, color: '#86efac', fontSize: 13 }}>✅ {t1.result.message}</div>
              {(t1.result.taskIds || []).map((id, i) => (
                <TaskBox key={id} taskId={id} label={`Call ${i + 1} Task ID`} />
              ))}
            </>
          )}
        </Section>

        {/* T2 */}
        <Section title="Test 2 — Single Date Rate Update" badge="1 API call"
          desc="Twin Room / Best Available Rate · 2026-11-01 · Rate: $185 · minStay: 1">
          <Btn loading={t2.loading} onClick={runT2} disabled={!P} color="blue">
            ⚡ Update Twin BAR — Nov 1 @ $185
          </Btn>
          <ErrBox msg={t2.error} />
          <TaskBox taskId={t2.result?.taskId} label="T2 Task ID" />
        </Section>

        {/* T3 */}
        <Section title="Test 3 — Multiple Dates Rate Update (All 4 combos)" badge="1 API call"
          desc="Twin BAR + Twin B&B + Double BAR + Double B&B · Nov 5–10 · Varied rates · Sent in a single POST /restrictions call.">
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, fontFamily: 'monospace', lineHeight: 1.8 }}>
            Twin BAR  Nov 5-10: $125, minStay=2<br/>
            Twin B&B  Nov 5-10: $145, minStay=2<br/>
            Double BAR Nov 5-10: $135, minStay=2<br/>
            Double B&B Nov 5-10: $155, minStay=2
          </div>
          <Btn loading={t3.loading} onClick={runT3} disabled={!P} color="blue">
            ⚡ Update All 4 Combos — Nov 5–10
          </Btn>
          <ErrBox msg={t3.error} />
          <TaskBox taskId={t3.result?.taskId} label="T3 Task ID (1 call)" />
        </Section>

        {/* T4 */}
        <Section title="Test 4 — Min Stay Restriction" badge="1 API call"
          desc="Twin Room / Best Available Rate · 2026-11-15 · minStay: 3 nights">
          <Btn loading={t4.loading} onClick={runT4} disabled={!P} color="amber">
            🔒 Set Min Stay 3 — Twin BAR Nov 15
          </Btn>
          <ErrBox msg={t4.error} />
          <TaskBox taskId={t4.result?.taskId} label="T4 Task ID" />
        </Section>

        {/* T5 */}
        <Section title="Test 5 — Stop Sell (Close Date)" badge="1 API call"
          desc="Twin Room / Best Available Rate · 2026-11-20 · stop_sell: true">
          <Btn loading={t5.loading} onClick={runT5} disabled={!P} color="amber">
            🔒 Close Nov 20 (Stop Sell)
          </Btn>
          <ErrBox msg={t5.error} />
          <TaskBox taskId={t5.result?.taskId} label="T5 Task ID" />
        </Section>

        {/* T6 */}
        <Section title="Test 6 — Closed to Arrival" badge="1 API call"
          desc="Twin Room / Best Available Rate · 2026-11-22 · closed_to_arrival: true">
          <Btn loading={t6.loading} onClick={runT6} disabled={!P} color="amber">
            🔒 Closed to Arrival — Nov 22
          </Btn>
          <ErrBox msg={t6.error} />
          <TaskBox taskId={t6.result?.taskId} label="T6 Task ID" />
        </Section>

        {/* T7 */}
        <Section title="Test 7 — Multiple Restrictions (All 4 combos)" badge="1 API call"
          desc="Exact values from cert spec — all 4 room/rate combos with different restrictions, sent in ONE API call.">
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, fontFamily: 'monospace', lineHeight: 1.8 }}>
            Twin BAR  Nov 1-10:  CTA=true, CTD=false, maxStay=4, minStay=1<br/>
            Twin B&B  Nov 12-16: CTA=false, CTD=true, minStay=6<br/>
            Double BAR Nov 10-16: CTA=true, minStay=2<br/>
            Double B&B Nov 1-20: minStay=10
          </div>
          <Btn loading={t7.loading} onClick={runT7} disabled={!P} color="amber">
            🔒 Apply All Restrictions (1 call)
          </Btn>
          <ErrBox msg={t7.error} />
          <TaskBox taskId={t7.result?.taskId} label="T7 Task ID (1 call)" />
        </Section>

        {/* T8 */}
        <Section title="Test 8 — Half-Year Bulk Update" badge="1 API call"
          desc="Twin BAR + Double BAR · Dec 1 2026 → May 1 2027 · Sent in ONE POST /restrictions call.">
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, fontFamily: 'monospace', lineHeight: 1.8 }}>
            Twin BAR  Dec 1 2026 → May 1 2027: $432, minStay=2, CTA=false, CTD=false<br/>
            Double BAR Dec 1 2026 → May 1 2027: $342, minStay=3
          </div>
          <Btn loading={t8.loading} onClick={runT8} disabled={!P} color="green">
            📅 Half-Year Bulk Update (1 call)
          </Btn>
          <ErrBox msg={t8.error} />
          <TaskBox taskId={t8.result?.taskId} label="T8 Task ID (1 call)" />
        </Section>

        {/* T9 */}
        <Section title="Test 9 — Single Date Availability" badge="2 API calls"
          desc="Twin Room Nov 21 → availability: 7 · Double Room Nov 25 → availability: 0">
          <Btn loading={t9.loading} onClick={runT9} disabled={!P} color="blue">
            📅 Update Availability (Twin Nov21=7, Double Nov25=0)
          </Btn>
          <ErrBox msg={t9.error} />
          <TaskBox taskId={t9.result?.taskId} label="T9 Twin Task ID" />
          <TaskBox taskId={t9.result?.taskId2} label="T9 Double Task ID" />
        </Section>

        {/* T10 */}
        <Section title="Test 10 — Multi-Date Availability" badge="2 API calls"
          desc="Twin Nov 10–16 → availability: 3 · Double Nov 17–24 → availability: 4">
          <Btn loading={t10.loading} onClick={runT10} disabled={!P} color="blue">
            📅 Update Multi-Date Availability
          </Btn>
          <ErrBox msg={t10.error} />
          <TaskBox taskId={t10.result?.taskId} label="T10 Twin Task ID" />
          <TaskBox taskId={t10.result?.taskId2} label="T10 Double Task ID" />
        </Section>

        {/* T11–T14 */}
        <Section title="Tests 11–14 — Booking Webhook" badge="auto-ACK"
          desc={`Channex sends booking webhooks (new / modify / cancel) via Booking.com test account to:\nPOST ${API}/connect/webhook/booking-revision\nEach webhook is automatically acknowledged with { ack: true }. After Channex sends a booking, enter its booking ID below to manually ACK it as well.`}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#f1f5f9', fontSize: 13, marginBottom: 6 }}>Webhook URL (configure in Channex staging):</div>
            <code style={{ color: '#38bdf8', fontSize: 13, background: '#0a1628', padding: '6px 12px', borderRadius: 6, display: 'block' }}>
              POST {API}/connect/webhook/booking-revision
            </code>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#f1f5f9', fontSize: 13, marginBottom: 6 }}>Manual ACK — Channex Booking ID:</div>
            <input
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={t11.bookingId}
              onChange={e => setT11(s => ({ ...s, bookingId: e.target.value }))}
              style={{
                width: '100%', maxWidth: 420, padding: '8px 12px',
                background: '#0f172a', border: '1px solid #475569',
                borderRadius: 6, color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box',
              }}
            />
          </div>
          <Btn loading={t11.loading} onClick={runT11} color="green" disabled={!t11.bookingId.trim()}>
            ✅ Send Booking ACK
          </Btn>
          <ErrBox msg={t11.error} />
          {t11.result && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#0d1f0d', border: '1px solid #22c55e', borderRadius: 8, color: '#4ade80', fontSize: 13 }}>
              ✅ Response: {JSON.stringify(t11.result)}
            </div>
          )}
        </Section>

        {/* Cert form */}
        <div style={{ padding: '16px 20px', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 14, color: '#94a3b8' }}>
          📝 Submit task IDs at:{' '}
          <a href="https://forms.gle/xA8F3eSYBPBd8apYA" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
            https://forms.gle/xA8F3eSYBPBd8apYA
          </a>
        </div>
      </div>
    </div>
  );
}

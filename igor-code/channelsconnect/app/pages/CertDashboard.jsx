/**
 * CertDashboard.jsx — PMS Certification Control Panel
 *
 * Uses EXACT values from the channel PMS Certification spec.
 *
 * T1  — Full 500-day ARI sync: EXACTLY 2 API calls
 *        Call 1: POST /availability  (ALL room types × 500 days)
 *        Call 2: POST /restrictions  (ALL rate plans × 500 days)
 * T2  — Single date / single rate  → 1 call
 * T3  — Single dates / multiple rates → 1 call (batch)
 * T4  — Date ranges / multiple rates → 1 call (batch)
 * T5  — Min stay update → 1 call
 * T6  — Stop sell update → 1 call
 * T7  — Multiple restrictions → 1 call (batch)
 * T8  — Half-year update → 1 call
 * T9  — Single date availability → 1-2 calls
 * T10 — Multi-date availability → 1-2 calls
 * T11-T14 — Booking receive (webhook auto-handles; Booking.com fires these)
 *
 * All cert endpoints are @Public() — no login required.
 * Property IDs auto-loaded from GET /connect/cert/property-info.
 *
 * NOTE: This dashboard IS the PMS UI for Channels Connect.
 * These buttons trigger real code paths in the production calendar/sync service.
 *
 * CTD support: Channels Connect supports closed_to_departure via the ARI batch
 * endpoint. See T7 which explicitly includes CTD=true for Twin B&B Nov 12-16.
 * Min Stay is sent as min_stay_arrival (channel standard field).
 */

import { useState, useEffect, useCallback } from 'react';

const API = (import.meta.env.VITE_API_URL || 'https://api.channelsconnect.com').replace(/\/+$/, '');

// Channel cert room/rate UUIDs (staging property 3db72f15)
const RT_TWIN   = '6b96aa09-eeb1-4b17-a35c-632af5d05462';
const RT_DOUBLE = '56878137-7f9f-42d5-b2b7-96eb514045ba';
const RP_TWIN_BAR  = '23a07c9b-2af0-4d6c-9c4e-d73011a7f752';
const RP_TWIN_BB   = 'f4ab2c55-86f7-49d9-a954-9ea743ff3d8a';
const RP_DBL_BAR   = '3040e917-4010-4242-a01f-f8b407f169f9';
const RP_DBL_BB    = 'a3496a99-423f-466e-a930-62cf7e5e6acc';

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

function Section({ title, badge, desc, children, warn }) {
  return (
    <div style={{
      background: '#1e293b', border: `1px solid ${warn ? '#92400e' : '#334155'}`, borderRadius: 12,
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
      {warn && <p style={{ margin: '0 0 14px', fontSize: 12, color: '#fcd34d', background: '#1c1007', padding: '8px 12px', borderRadius: 6 }}>{warn}</p>}
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

function SpecTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
      <thead>
        <tr>
          {Object.keys(rows[0]).map(k => (
            <th key={k} style={{ textAlign: 'left', padding: '4px 8px', color: '#64748b', borderBottom: '1px solid #334155' }}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {Object.values(row).map((v, j) => (
              <td key={j} style={{ padding: '4px 8px', color: '#cbd5e1', borderBottom: '1px solid #1e293b' }}>{String(v)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CertDashboard() {
  const [propInfo, setPropInfo] = useState(null);
  const [propLoading, setPropLoading] = useState(true);
  const [propError, setPropError] = useState(null);
  const [taskLog, setTaskLog] = useState([]);

  // Per-test state
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
  const [t11, setT11] = useState({ bookingId: '', revisionId: '' });

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

  // ── T1: Full 500-day ARI — EXACTLY 2 API calls (all rooms + all rates) ────
  const runT1 = () => run(setT1, async () => {
    const r = await apiFetch('/connect/ari/full', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        listingId:  P.listingId,
        roomTypes: [
          { roomTypeId: RT_TWIN },
          { roomTypeId: RT_DOUBLE },
        ],
        ratePlans: [
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BAR },
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BB  },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BAR  },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BB   },
        ],
      }),
    });
    addTask('T1 Call 1 — Availability (ALL rooms)', r.availabilityTaskId || r.taskIds?.[0]);
    addTask('T1 Call 2 — Restrictions (ALL rates)',  r.restrictionsTaskId  || r.taskIds?.[1]);
    return r;
  });

  // ── T2: Single Date Update for Single Rate
  const runT2 = () => run(setT2, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: RT_TWIN,
        ratePlanId: RP_TWIN_BAR,
        dateFrom:   '2026-11-22',
        dateTo:     '2026-11-22',
        stopSell:   false,
      }),
    });
    addTask('T2 Restriction: Twin BAR Nov 22 stop_sell=false', r.taskId);
    return r;
  });

  // ── T3: Single Date Update for Multiple Rates — 1 API call
  const runT3 = () => run(setT3, async () => {
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        entries: [
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BAR, dateFrom: '2026-11-21', dateTo: '2026-11-21', rate: 333 },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BAR,  dateFrom: '2026-11-25', dateTo: '2026-11-25', rate: 444 },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BB,   dateFrom: '2026-11-29', dateTo: '2026-11-29', rate: 456.23 },
        ],
      }),
    });
    addTask('T3 Multi-Rate Single Dates (3 rates, 1 call)', r.taskId);
    return r;
  });

  // ── T4: Multiple Date Update for Multiple Rates — 1 API call
  const runT4 = () => run(setT4, async () => {
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        entries: [
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BAR, dateFrom: '2026-11-01', dateTo: '2026-11-10', rate: 241    },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BAR,  dateFrom: '2026-11-10', dateTo: '2026-11-16', rate: 312.66 },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BB,   dateFrom: '2026-11-01', dateTo: '2026-11-20', rate: 111    },
        ],
      }),
    });
    addTask('T4 Multi-Rate Date Ranges (3 rates, 1 call)', r.taskId);
    return r;
  });

  // ── T5: Min Stay Update — 1 API call
  const runT5 = () => run(setT5, async () => {
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        entries: [
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BAR, dateFrom: '2026-11-23', dateTo: '2026-11-23', minStay: 3 },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BAR,  dateFrom: '2026-11-25', dateTo: '2026-11-25', minStay: 2 },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BB,   dateFrom: '2026-11-15', dateTo: '2026-11-15', minStay: 5 },
        ],
      }),
    });
    addTask('T5 Min Stay Update (3 rates, 1 call)', r.taskId);
    return r;
  });

  // ── T6: Stop Sell Update — 1 API call
  const runT6 = () => run(setT6, async () => {
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        entries: [
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BAR, dateFrom: '2026-11-14', dateTo: '2026-11-14', stopSell: true },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BAR,  dateFrom: '2026-11-16', dateTo: '2026-11-16', stopSell: true },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BB,   dateFrom: '2026-11-20', dateTo: '2026-11-20', stopSell: true },
        ],
      }),
    });
    addTask('T6 Stop Sell (3 rates, 1 call)', r.taskId);
    return r;
  });

  // ── T7: Multiple Restrictions — 1 API call
  const runT7 = () => run(setT7, async () => {
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        entries: [
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BAR, dateFrom: '2026-11-01', dateTo: '2026-11-10', closedToArrival: true,  closedToDeparture: false, maxStay: 4, minStay: 1 },
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BB,  dateFrom: '2026-11-12', dateTo: '2026-11-16', closedToArrival: false, closedToDeparture: true,  minStay: 6 },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BAR,  dateFrom: '2026-11-10', dateTo: '2026-11-16', closedToArrival: true,  minStay: 2 },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BB,   dateFrom: '2026-11-01', dateTo: '2026-11-20', minStay: 10 },
        ],
      }),
    });
    addTask('T7 Multiple Restrictions (4 combos, 1 call)', r.taskId);
    return r;
  });

  // ── T8: Half-Year Update — 1 API call
  const runT8 = () => run(setT8, async () => {
    const r = await apiFetch('/connect/ari/batch', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        entries: [
          { roomTypeId: RT_TWIN,   ratePlanId: RP_TWIN_BAR, dateFrom: '2026-12-01', dateTo: '2027-05-01', rate: 432, minStay: 2, closedToArrival: false, closedToDeparture: false },
          { roomTypeId: RT_DOUBLE, ratePlanId: RP_DBL_BAR,  dateFrom: '2026-12-01', dateTo: '2027-05-01', rate: 342, minStay: 3 },
        ],
      }),
    });
    addTask('T8 Half-Year (2 combos, 1 call)', r.taskId);
    return r;
  });

  // ── T9: Single Date Availability — 1 or 2 calls
  const runT9 = () => run(setT9, async () => {
    const r1 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: RT_TWIN,
        ratePlanId: RP_TWIN_BAR,
        dateFrom: '2026-11-21', dateTo: '2026-11-21',
        availability: 7,
      }),
    });
    addTask('T9 Availability Twin Nov21=7', r1.taskId);
    const r2 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: RT_DOUBLE,
        ratePlanId: RP_DBL_BAR,
        dateFrom: '2026-11-25', dateTo: '2026-11-25',
        availability: 0,
      }),
    });
    addTask('T9 Availability Double Nov25=0', r2.taskId);
    return { taskId: r1.taskId, taskId2: r2.taskId };
  });

  // ── T10: Multi-Date Availability — 1 or 2 calls
  const runT10 = () => run(setT10, async () => {
    const r1 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: RT_TWIN,
        ratePlanId: RP_TWIN_BAR,
        dateFrom: '2026-11-10', dateTo: '2026-11-16',
        availability: 3,
      }),
    });
    addTask('T10 Availability Twin Nov10-16=3', r1.taskId);
    const r2 = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: RT_DOUBLE,
        ratePlanId: RP_DBL_BAR,
        dateFrom: '2026-11-17', dateTo: '2026-11-24',
        availability: 4,
      }),
    });
    addTask('T10 Availability Double Nov17-24=4', r2.taskId);
    return { taskId: r1.taskId, taskId2: r2.taskId };
  });

  // ── T11–T14: Booking events (webhook auto-handles these)
  const runT11 = () => run(setT11, async () => {
    const revId = t11.revisionId?.trim() || t11.bookingId?.trim();
    if (!revId) throw new Error('Enter the channel booking_revision ID (from channel staging logs)');
    const r = await apiFetch(`/connect/booking/${revId}/ack`, { method: 'POST' });
    addTask('T11-T14 Booking Revision ACK', revId);
    return r;
  });

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '28px 20px',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
            🏨 PMS Certification — Tests T1–T14
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            API: <code style={{ color: '#38bdf8' }}>{API}</code>
            {' · '}Channel integration active
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
            <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span>Property: <code style={{ color: '#38bdf8' }}>{P.propertyId}</code></span>
              <span>Listing: <code style={{ color: '#38bdf8' }}>{P.listingId}</code></span>
              <span>Combos: <code style={{ color: '#38bdf8' }}>{P.combos?.length ?? 0}</code></span>
            </div>
          )}
        </div>

        {/* T1 ── Full 500-day ARI (EXACTLY 2 API calls) */}
        <Section
          title='T1 — Full 500-Day ARI Sync'
          badge='EXACTLY 2 API CALLS'
          desc='Spec: 1 × 500 days for Availability (All Rooms) + 1 × 500 days Rates & restrictions (All Rates). Data is realistic (varied by season, day-of-week, listing seed).'
        >
          <SpecTable rows={[
            { 'Call': '1', 'Endpoint': 'POST /availability', 'Covers': 'Twin + Double room types × 500 days' },
            { 'Call': '2', 'Endpoint': 'POST /restrictions', 'Covers': 'Twin BAR + Twin B&B + Double BAR + Double B&B × 500 days' },
          ]} />
          <Btn loading={t1.loading} onClick={runT1} color='purple'>Push Full 500-Day ARI</Btn>
          <ErrBox msg={t1.error} />
          {t1.result && (
            <>
              <TaskBox taskId={t1.result.availabilityTaskId || t1.result.taskIds?.[0]} label='T1 Call 1 — Availability (ALL rooms)' />
              <TaskBox taskId={t1.result.restrictionsTaskId  || t1.result.taskIds?.[1]} label='T1 Call 2 — Restrictions (ALL rates)' />
              <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                {t1.result.callCount === 2
                  ? '✅ Exactly 2 API calls sent'
                  : `⚠️ ${t1.result.callCount} calls sent (expected 2)`}
              </div>
            </>
          )}
        </Section>

        {/* T2 */}
        <Section
          title='T2 — Single Date Restriction (stop_sell)'
          badge='1 API call — /restrictions'
          desc='stop_sell restriction only — no rate, no property_id, no room_type_id. Payload: { rate_plan_id, date_from, date_to, stop_sell: false }'
        >
          <SpecTable rows={[{ 'Room Type': 'Twin', 'Rate Plan': 'Best Available', 'Date': '22 Nov 2026', 'Field': 'stop_sell', 'Value': 'false' }]} />
          <Btn loading={t2.loading} onClick={runT2}>Send T2</Btn>
          <ErrBox msg={t2.error} />
          <TaskBox taskId={t2.result?.taskId} label='T2 Restrictions Task ID' />
        </Section>

        {/* T3 */}
        <Section
          title='T3 — Single Date / Multiple Rates'
          badge='1 API call'
          desc='3 rate plan updates for different rooms/dates — batched into a single POST /restrictions.'
        >
          <SpecTable rows={[
            { 'Room': 'Twin',   'Rate Plan': 'Best Available', 'Date': '21 Nov 2026', 'Value': '$333'     },
            { 'Room': 'Double', 'Rate Plan': 'Best Available', 'Date': '25 Nov 2026', 'Value': '$444'     },
            { 'Room': 'Double', 'Rate Plan': 'Bed & Breakfast','Date': '29 Nov 2026', 'Value': '$456.23'  },
          ]} />
          <Btn loading={t3.loading} onClick={runT3}>Send T3</Btn>
          <ErrBox msg={t3.error} />
          <TaskBox taskId={t3.result?.taskId} label='T3 Batch Restrictions Task ID' />
        </Section>

        {/* T4 */}
        <Section
          title='T4 — Date Ranges / Multiple Rates'
          badge='1 API call'
          desc='3 rate plan updates with date ranges — single POST /restrictions.'
        >
          <SpecTable rows={[
            { 'Room': 'Twin',   'Rate Plan': 'Best Available', 'Dates': '01–10 Nov 2026', 'Value': '$241'    },
            { 'Room': 'Double', 'Rate Plan': 'Best Available', 'Dates': '10–16 Nov 2026', 'Value': '$312.66' },
            { 'Room': 'Double', 'Rate Plan': 'Bed & Breakfast','Dates': '01–20 Nov 2026', 'Value': '$111'    },
          ]} />
          <Btn loading={t4.loading} onClick={runT4}>Send T4</Btn>
          <ErrBox msg={t4.error} />
          <TaskBox taskId={t4.result?.taskId} label='T4 Batch Restrictions Task ID' />
        </Section>

        {/* T5 */}
        <Section
          title='T5 — Min Stay Update'
          badge='1 API call'
          desc='min_stay_arrival for 3 rate plans. Sent as closed=false, only min_stay_arrival changes.'
        >
          <SpecTable rows={[
            { 'Room': 'Twin',   'Rate Plan': 'Best Available', 'Date': '23 Nov 2026', 'Min Stay': '3' },
            { 'Room': 'Double', 'Rate Plan': 'Best Available', 'Date': '25 Nov 2026', 'Min Stay': '2' },
            { 'Room': 'Double', 'Rate Plan': 'Bed & Breakfast','Date': '15 Nov 2026', 'Min Stay': '5' },
          ]} />
          <Btn loading={t5.loading} onClick={runT5} color='amber'>Send T5</Btn>
          <ErrBox msg={t5.error} />
          <TaskBox taskId={t5.result?.taskId} label='T5 Min Stay Task ID' />
        </Section>

        {/* T6 */}
        <Section
          title='T6 — Stop Sell Update'
          badge='1 API call'
          desc='closed=true for 3 rate plans on specific dates.'
        >
          <SpecTable rows={[
            { 'Room': 'Twin',   'Rate Plan': 'Best Available', 'Date': '14 Nov 2026', 'Stop Sell': 'true' },
            { 'Room': 'Double', 'Rate Plan': 'Best Available', 'Date': '16 Nov 2026', 'Stop Sell': 'true' },
            { 'Room': 'Double', 'Rate Plan': 'Bed & Breakfast','Date': '20 Nov 2026', 'Stop Sell': 'true' },
          ]} />
          <Btn loading={t6.loading} onClick={runT6} color='red'>Send T6</Btn>
          <ErrBox msg={t6.error} />
          <TaskBox taskId={t6.result?.taskId} label='T6 Stop Sell Task ID' />
        </Section>

        {/* T7 */}
        <Section
          title='T7 — Multiple Restrictions'
          badge='1 API call'
          desc='4 combos with CTA/CTD/maxStay/minStay. Channels Connect supports all restriction types including closed_to_departure.'
        >
          <SpecTable rows={[
            { 'Room/Rate': 'Twin BAR',    'Dates': '01–10 Nov', 'CTA': 'true',  'CTD': 'false', 'maxStay': '4', 'minStay': '1'  },
            { 'Room/Rate': 'Twin B&B',    'Dates': '12–16 Nov', 'CTA': 'false', 'CTD': 'true',  'maxStay': '—', 'minStay': '6'  },
            { 'Room/Rate': 'Double BAR',  'Dates': '10–16 Nov', 'CTA': 'true',  'CTD': '—',     'maxStay': '—', 'minStay': '2'  },
            { 'Room/Rate': 'Double B&B',  'Dates': '01–20 Nov', 'CTA': '—',     'CTD': '—',     'maxStay': '—', 'minStay': '10' },
          ]} />
          <Btn loading={t7.loading} onClick={runT7} color='purple'>Send T7</Btn>
          <ErrBox msg={t7.error} />
          <TaskBox taskId={t7.result?.taskId} label='T7 Multiple Restrictions Task ID' />
        </Section>

        {/* T8 */}
        <Section
          title='T8 — Half-Year Update'
          badge='1 API call'
          desc='Dec 1 2026 → May 1 2027 for Twin BAR and Double BAR.'
        >
          <SpecTable rows={[
            { 'Room': 'Twin BAR',   'Dates': '01 Dec 2026 → 01 May 2027', 'Rate': '$432', 'minStay': '2', 'CTA': 'false', 'CTD': 'false' },
            { 'Room': 'Double BAR', 'Dates': '01 Dec 2026 → 01 May 2027', 'Rate': '$342', 'minStay': '3', 'CTA': '—',     'CTD': '—'     },
          ]} />
          <Btn loading={t8.loading} onClick={runT8} color='green'>Send T8</Btn>
          <ErrBox msg={t8.error} />
          <TaskBox taskId={t8.result?.taskId} label='T8 Half-Year Task ID' />
        </Section>

        {/* T9 */}
        <Section
          title='T9 — Single Date Availability'
          badge='1–2 API calls'
          desc='Twin Nov 21 = 7 units available | Double Nov 25 = 0 (sold out). Sent as 2 availability calls (1 per room type — within spec).'
        >
          <SpecTable rows={[
            { 'Room': 'Twin',   'Date': '21 Nov 2026', 'Availability': '7' },
            { 'Room': 'Double', 'Date': '25 Nov 2026', 'Availability': '0' },
          ]} />
          <Btn loading={t9.loading} onClick={runT9} color='blue'>Send T9</Btn>
          <ErrBox msg={t9.error} />
          <TaskBox taskId={t9.result?.taskId}  label='T9 Twin Availability Task ID' />
          <TaskBox taskId={t9.result?.taskId2} label='T9 Double Availability Task ID' />
        </Section>

        {/* T10 */}
        <Section
          title='T10 — Multi-Date Availability'
          badge='1–2 API calls'
          desc='Twin Nov10-16=3 | Double Nov17-24=4.'
        >
          <SpecTable rows={[
            { 'Room': 'Twin',   'Dates': '10–16 Nov 2026', 'Availability': '3' },
            { 'Room': 'Double', 'Dates': '17–24 Nov 2026', 'Availability': '4' },
          ]} />
          <Btn loading={t10.loading} onClick={runT10} color='blue'>Send T10</Btn>
          <ErrBox msg={t10.error} />
          <TaskBox taskId={t10.result?.taskId}  label='T10 Twin Availability Task ID' />
          <TaskBox taskId={t10.result?.taskId2} label='T10 Double Availability Task ID' />
        </Section>

        {/* T11–T14 */}
        <Section
          title='T11–T14 — Booking Events (Webhook + ACK)'
          badge='WEBHOOK + ACK'
          desc='T11=New / T12=Modify / T13/T14=Cancel. Triggered by Booking.com. Our webhook at /connect/webhook/booking-revision auto-ACKs each revision. Use this button for manual ACK (e.g. after T12/T13/T14).'
          warn='IMPORTANT: Enter the booking_revision ID (UUID), NOT the booking ID. Find it in the channel staging dashboard → Logs → click the event → copy the top-level id field.'
        >
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
            <strong style={{ color: '#f1f5f9' }}>Test booking URL:</strong>{' '}
            <a href='https://secure.booking.com/book.html?hotel_id=5868189&test=1'
              target='_blank' rel='noreferrer' style={{ color: '#38bdf8' }}>
              https://secure.booking.com/book.html?hotel_id=5868189&test=1
            </a>
            <br />
            <span style={{ fontSize: 12 }}>Card: 4111-1111-1111-1111 / CVC 123 / any future expiry</span>
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
            <strong style={{ color: '#f1f5f9' }}>How to get the revision ID:</strong><br />
            <span style={{ fontSize: 12 }}>1. Fire booking action on Booking.com test page</span><br />
            <span style={{ fontSize: 12 }}>2. Go to the channel staging dashboard → Logs tab</span><br />
            <span style={{ fontSize: 12 }}>3. Find the booking_revision event → click it → copy the <code style={{ color: '#fbbf24' }}>id</code> UUID (top level, not booking_id)</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <input
              type='text'
              value={t11.revisionId || ''}
              onChange={e => setT11(s => ({ ...s, revisionId: e.target.value }))}
              placeholder='booking_revision UUID (from Logs → event id field)'
              style={{
                flex: 1, minWidth: 320, padding: '8px 12px',
                background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
                color: '#f1f5f9', fontSize: 13,
              }}
            />
            <Btn loading={t11.loading} onClick={runT11} color='green'
              disabled={!t11.revisionId?.trim()}>
              Send ACK
            </Btn>
          </div>
          <ErrBox msg={t11.error} />
          {t11.result && <TaskBox taskId={t11.revisionId} label='T11-T14 Revision ACK' />}
        </Section>

        {/* Task Log */}
        {taskLog.length > 0 && (
          <div style={{
            background: '#0a1628', border: '1px solid #1e40af',
            borderRadius: 12, padding: '16px 20px',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#93c5fd' }}>
              📋 Task ID Log (copy to cert form)
            </h3>
            {taskLog.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '6px 0', borderBottom: i < taskLog.length - 1 ? '1px solid #1e293b' : 'none',
              }}>
                <span style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap' }}>{entry.ts}</span>
                <span style={{ color: '#64748b', fontSize: 12, minWidth: 220 }}>{entry.label}</span>
                <code style={{
                  flex: 1, color: '#4ade80', fontSize: 13,
                  fontFamily: 'monospace', wordBreak: 'break-all',
                }}>{entry.id}</code>
                <button onClick={() => navigator.clipboard.writeText(entry.id)} style={{
                  padding: '2px 8px', background: '#15803d', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                }}>Copy</button>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <a href='https://forms.gle/xA8F3eSYBPBd8apYA' target='_blank' rel='noreferrer'
                style={{
                  display: 'inline-block', padding: '9px 20px',
                  background: '#7c3aed', color: '#fff', borderRadius: 8,
                  textDecoration: 'none', fontWeight: 700, fontSize: 13,
                }}>
                → Submit Cert Form
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
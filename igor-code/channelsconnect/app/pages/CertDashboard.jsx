/**
 * CertDashboard.jsx — Channex PMS Certification Control Panel
 *
 * Covers all 14 PMS certification tests:
 *  T1  Full 500-day ARI push (2 API calls)
 *  T2  Single date rate update
 *  T3  Multi-date rate update
 *  T4  Restriction: min stay
 *  T5  Restriction: stop sell
 *  T6  Restriction: closed to arrival
 *  T7  Restriction: closed to departure + max stay
 *  T8  Half-year bulk range update (1 batched call)
 *  T9  Single date availability update
 *  T10 Multi-date availability update
 *  T11 Booking webhook — new booking received + ACK
 *  T12 Booking webhook — modification received + ACK
 *  T13 Booking webhook — cancellation received + ACK
 *  T14 ACK response body { ack: true }
 *
 * No login required — all cert endpoints are @Public().
 * Property IDs auto-loaded from GET /connect/cert/property-info.
 */

import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://api.channelsconnect.com';

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

const fmt = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const today = fmt(new Date());
const tomorrow = fmt(addDays(new Date(), 1));
const nextWeek = fmt(addDays(new Date(), 7));
const in6Months = fmt(addDays(new Date(), 182));

// ─── sub-components ───────────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }) {
  const colors = {
    green: { bg: '#0d1f0d', border: '#22c55e', text: '#4ade80' },
    red:   { bg: '#1f0a0a', border: '#ef4444', text: '#fca5a5' },
    blue:  { bg: '#0a1628', border: '#3b82f6', text: '#93c5fd' },
    gray:  { bg: '#1e293b', border: '#475569', text: '#94a3b8' },
    amber: { bg: '#1a1200', border: '#d97706', text: '#fbbf24' },
  };
  const c = colors[color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {children}
    </span>
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
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ color: '#86efac', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        ✅ {label || 'TASK ID'}
      </span>
      <span style={{
        flex: 1, color: '#4ade80', fontSize: 14,
        fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 700,
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

function Spinner() {
  return <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>;
}

function Section({ title, badge, children }) {
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
      padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
        {badge && <Badge color="blue">{badge}</Badge>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
      <span style={{ color: '#94a3b8', fontSize: 13, minWidth: 130 }}>{label}</span>
      {children}
    </div>
  );
}

function Input({ style = {}, ...props }) {
  return (
    <input style={{
      padding: '6px 10px', background: '#0f172a',
      border: '1px solid #475569', borderRadius: 6,
      color: '#f1f5f9', fontSize: 13, ...style,
    }} {...props} />
  );
}

function Btn({ loading, onClick, children, color = 'blue', disabled }) {
  const bg = {
    blue:   '#3b82f6',
    green:  '#16a34a',
    purple: '#7c3aed',
    amber:  '#d97706',
    red:    '#dc2626',
  }[color];
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      padding: '8px 18px', background: (loading || disabled) ? '#475569' : bg,
      color: '#fff', border: 'none', borderRadius: 8,
      cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
      fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {loading && <Spinner />}{children}
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function CertDashboard() {
  // Property IDs (auto-loaded)
  const [propInfo, setPropInfo] = useState(null);
  const [propLoading, setPropLoading] = useState(true);
  const [propError, setPropError] = useState(null);

  // Task log (all task IDs collected during session)
  const [taskLog, setTaskLog] = useState([]);

  // Per-test state
  const [t1, setT1] = useState({});
  const [t2, setT2] = useState({ date: tomorrow, rate: 150, minStay: 2 });
  const [t3, setT3] = useState({ dateFrom: tomorrow, dateTo: nextWeek, rate: 175, minStay: 3 });
  const [t5, setT5] = useState({ date: tomorrow, stopSell: true });
  const [t6, setT6] = useState({ date: tomorrow, cta: true });
  const [t7, setT7] = useState({ dateFrom: tomorrow, dateTo: nextWeek, ctd: true, maxStay: 7 });
  const [t8, setT8] = useState({ dateFrom: tomorrow, dateTo: in6Months, rate: 200, minStay: 2 });
  const [t9, setT9] = useState({ date: tomorrow, avail: 0 });
  const [t10, setT10] = useState({ dateFrom: tomorrow, dateTo: nextWeek, avail: 0 });
  const [t11, setT11] = useState({ bookingId: '' });

  const addTask = useCallback((label, id) => {
    if (!id) return;
    setTaskLog(prev => [{ ts: new Date().toLocaleTimeString(), label, id }, ...prev]);
  }, []);

  // Load cert property info
  useEffect(() => {
    apiFetch('/connect/cert/property-info')
      .then(r => {
        if (r.success && r.data) setPropInfo(r.data);
        else setPropError(r.message || 'No active mapping found');
      })
      .catch(e => setPropError(e.message))
      .finally(() => setPropLoading(false));
  }, []);

  const P = propInfo; // shorthand

  // ── test runners ──────────────────────────────────────────────────────────

  async function runTest(setter, fn) {
    setter(s => ({ ...s, loading: true, error: null, result: null }));
    try {
      const r = await fn();
      setter(s => ({ ...s, loading: false, result: r }));
      return r;
    } catch (e) {
      setter(s => ({ ...s, loading: false, error: e.message }));
    }
  }

  // T1: Full 500-day ARI
  const runT1 = () => runTest(setT1, async () => {
    const r = await apiFetch('/connect/ari/full', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        listingId: P.listingId,
        rate: 120,
        availability: 1,
        minStay: 2,
      }),
    });
    (r.taskIds || []).forEach((id, i) => addTask(`T1 Full ARI (call ${i + 1}/2)`, id));
    return r;
  });

  // T2: Single rate update
  const runT2 = () => runTest(setT2, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t2.date,
        dateTo: t2.date,
        rate: parseFloat(t2.rate),
        minStay: parseInt(t2.minStay),
      }),
    });
    addTask('T2 Single Rate Update', r.taskId);
    return r;
  });

  // T3: Multi-date rate update
  const runT3 = () => runTest(setT3, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t3.dateFrom,
        dateTo: t3.dateTo,
        rate: parseFloat(t3.rate),
        minStay: parseInt(t3.minStay),
      }),
    });
    addTask('T3 Multi-Date Rate Update', r.taskId);
    return r;
  });

  // T4: Min stay is included in T2/T3 — confirmed field min_stay_arrival

  // T5: Stop sell
  const runT5 = () => runTest(setT5, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t5.date,
        dateTo: t5.date,
        stopSell: t5.stopSell,
      }),
    });
    addTask('T5 Stop Sell', r.taskId);
    return r;
  });

  // T6: Closed to arrival
  const runT6 = () => runTest(setT6, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t6.date,
        dateTo: t6.date,
        closedToArrival: t6.cta,
      }),
    });
    addTask('T6 Closed to Arrival', r.taskId);
    return r;
  });

  // T7: CTD + max stay (multi-date)
  const runT7 = () => runTest(setT7, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t7.dateFrom,
        dateTo: t7.dateTo,
        closedToDeparture: t7.ctd,
        maxStay: parseInt(t7.maxStay),
      }),
    });
    addTask('T7 Closed to Departure + Max Stay', r.taskId);
    return r;
  });

  // T8: Half-year bulk (single batched call via calendar.bulkUpdateRatesAndSync)
  const runT8 = () => runTest(setT8, async () => {
    // Use /connect/ari/update with dateFrom→dateTo = 182-day range
    // This is 1 POST /restrictions call with date_from/date_to
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t8.dateFrom,
        dateTo: t8.dateTo,
        rate: parseFloat(t8.rate),
        minStay: parseInt(t8.minStay),
      }),
    });
    addTask('T8 Half-Year Bulk Update', r.taskId);
    return r;
  });

  // T9: Single date availability
  const runT9 = () => runTest(setT9, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t9.date,
        dateTo: t9.date,
        availability: parseInt(t9.avail),
      }),
    });
    addTask('T9 Single Availability', r.taskId);
    return r;
  });

  // T10: Multi-date availability
  const runT10 = () => runTest(setT10, async () => {
    const r = await apiFetch('/connect/ari/update', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: P.propertyId,
        roomTypeId: P.roomTypeId,
        ratePlanId: P.ratePlanId,
        dateFrom: t10.dateFrom,
        dateTo: t10.dateTo,
        availability: parseInt(t10.avail),
      }),
    });
    addTask('T10 Multi-Date Availability', r.taskId);
    return r;
  });

  // T11–T14: Booking webhook ACK
  const runT11 = () => runTest(setT11, async () => {
    if (!t11.bookingId.trim()) throw new Error('Enter a Channex booking ID');
    const r = await apiFetch(`/connect/booking/${t11.bookingId.trim()}/ack`, { method: 'POST' });
    addTask('T11-T14 Booking ACK', t11.bookingId.trim());
    return r;
  });

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '28px 20px',
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>
            🏨 Channex PMS Certification Dashboard
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            API: <code style={{ color: '#38bdf8' }}>{API}</code> · All 14 cert tests · No auth required
          </p>
        </div>

        {/* Property Info Banner */}
        <div style={{
          background: '#0a1628', border: '1px solid #1e40af',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
        }}>
          {propLoading && <span style={{ color: '#64748b' }}>⏳ Loading cert property info…</span>}
          {propError && <span style={{ color: '#fca5a5' }}>❌ {propError} — check CERT_USER_ID env and DB mapping</span>}
          {P && (
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#93c5fd', lineHeight: 1.8 }}>
              <strong style={{ color: '#60a5fa', fontFamily: 'sans-serif', fontSize: 13 }}>
                ✅ Cert Property Loaded — {P.listingTitle}
              </strong><br />
              propertyId: <span style={{ color: '#4ade80' }}>{P.propertyId}</span><br />
              roomTypeId: <span style={{ color: '#4ade80' }}>{P.roomTypeId}</span><br />
              ratePlanId: <span style={{ color: '#4ade80' }}>{P.ratePlanId}</span><br />
              listingId:  <span style={{ color: '#4ade80' }}>{P.listingId}</span>
            </div>
          )}
        </div>

        {/* Task Log */}
        {taskLog.length > 0 && (
          <div style={{
            background: '#0d1f0d', border: '2px solid #22c55e',
            borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          }}>
            <div style={{ color: '#86efac', fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
              📋 Task ID Log — paste into certification form
            </div>
            {taskLog.map((entry, i) => (
              <div key={i} style={{
                fontFamily: 'monospace', fontSize: 12, color: '#4ade80',
                padding: '3px 0',
                borderBottom: i < taskLog.length - 1 ? '1px solid #14532d' : 'none',
              }}>
                [{entry.ts}] {entry.label}: <strong>{entry.id}</strong>
              </div>
            ))}
          </div>
        )}

        {!P && !propLoading && (
          <div style={{
            background: '#1f0a0a', border: '1px solid #ef4444',
            borderRadius: 10, padding: 16, marginBottom: 20, color: '#fca5a5',
          }}>
            ⚠️ Cannot load cert property IDs. Run POST /connect/onboard first to create a ChannexMapping,
            then refresh this page.
          </div>
        )}

        {/* ── T1: Full 500-day ARI ── */}
        <Section title="Test 1 — Full 500-Day ARI Push" badge="2 API calls">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
            Sends availability + rates for today → +500 days in exactly 2 Channex API calls.
            Uses varied (weekday/weekend) rates from DB — not uniform flat values.
          </p>
          <Btn loading={t1.loading} onClick={runT1} disabled={!P} color="purple">
            🚀 Push Full 500-Day ARI to Channex
          </Btn>
          <ErrBox msg={t1.error} />
          {t1.result && (
            <>
              <div style={{ marginTop: 10, color: '#86efac', fontSize: 13 }}>
                ✅ {t1.result.message}
              </div>
              {(t1.result.taskIds || []).map((id, i) => (
                <TaskBox key={id} taskId={id} label={`Call ${i + 1}/2 Task ID`} />
              ))}
            </>
          )}
        </Section>

        {/* ── T2: Single rate + T4 min stay ── */}
        <Section title="Tests 2 & 4 — Single Date Rate + Min Stay" badge="1 API call">
          <Row label="Date">
            <Input type="date" value={t2.date}
              onChange={e => setT2(s => ({ ...s, date: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Rate (USD)">
            <Input type="number" value={t2.rate} min="1"
              onChange={e => setT2(s => ({ ...s, rate: e.target.value }))} style={{ width: 90 }} />
          </Row>
          <Row label="Min Stay (nights)">
            <Input type="number" value={t2.minStay} min="1"
              onChange={e => setT2(s => ({ ...s, minStay: e.target.value }))} style={{ width: 80 }} />
          </Row>
          <Btn loading={t2.loading} onClick={runT2} disabled={!P} color="blue">
            ⚡ Update Rate + Min Stay
          </Btn>
          <ErrBox msg={t2.error} />
          <TaskBox taskId={t2.result?.taskId} label="T2/T4 Task ID" />
        </Section>

        {/* ── T3: Multi-date rate ── */}
        <Section title="Test 3 — Multiple Dates Rate Update" badge="1 API call">
          <Row label="Date From">
            <Input type="date" value={t3.dateFrom}
              onChange={e => setT3(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Date To">
            <Input type="date" value={t3.dateTo}
              onChange={e => setT3(s => ({ ...s, dateTo: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Rate (USD)">
            <Input type="number" value={t3.rate} min="1"
              onChange={e => setT3(s => ({ ...s, rate: e.target.value }))} style={{ width: 90 }} />
          </Row>
          <Row label="Min Stay">
            <Input type="number" value={t3.minStay} min="1"
              onChange={e => setT3(s => ({ ...s, minStay: e.target.value }))} style={{ width: 80 }} />
          </Row>
          <Btn loading={t3.loading} onClick={runT3} disabled={!P} color="blue">
            ⚡ Update Multiple Dates
          </Btn>
          <ErrBox msg={t3.error} />
          <TaskBox taskId={t3.result?.taskId} label="T3 Task ID" />
        </Section>

        {/* ── T5: Stop sell ── */}
        <Section title="Test 5 — Stop Sell (Close Date)" badge="1 API call">
          <Row label="Date">
            <Input type="date" value={t5.date}
              onChange={e => setT5(s => ({ ...s, date: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Stop Sell">
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={t5.stopSell}
                onChange={e => setT5(s => ({ ...s, stopSell: e.target.checked }))} />
              <span style={{ color: '#f1f5f9' }}>Close this date (stop sell = true)</span>
            </label>
          </Row>
          <Btn loading={t5.loading} onClick={runT5} disabled={!P} color="amber">
            🔒 Apply Stop Sell
          </Btn>
          <ErrBox msg={t5.error} />
          <TaskBox taskId={t5.result?.taskId} label="T5 Task ID" />
        </Section>

        {/* ── T6: Closed to arrival ── */}
        <Section title="Test 6 — Closed to Arrival" badge="1 API call">
          <Row label="Date">
            <Input type="date" value={t6.date}
              onChange={e => setT6(s => ({ ...s, date: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="CTA">
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={t6.cta}
                onChange={e => setT6(s => ({ ...s, cta: e.target.checked }))} />
              <span style={{ color: '#f1f5f9' }}>Closed to Arrival = true</span>
            </label>
          </Row>
          <Btn loading={t6.loading} onClick={runT6} disabled={!P} color="amber">
            🔒 Apply Closed to Arrival
          </Btn>
          <ErrBox msg={t6.error} />
          <TaskBox taskId={t6.result?.taskId} label="T6 Task ID" />
        </Section>

        {/* ── T7: CTD + max stay ── */}
        <Section title="Test 7 — Closed to Departure + Max Stay" badge="1 API call">
          <Row label="Date From">
            <Input type="date" value={t7.dateFrom}
              onChange={e => setT7(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Date To">
            <Input type="date" value={t7.dateTo}
              onChange={e => setT7(s => ({ ...s, dateTo: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="CTD">
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={t7.ctd}
                onChange={e => setT7(s => ({ ...s, ctd: e.target.checked }))} />
              <span style={{ color: '#f1f5f9' }}>Closed to Departure = true</span>
            </label>
          </Row>
          <Row label="Max Stay (nights)">
            <Input type="number" value={t7.maxStay} min="1"
              onChange={e => setT7(s => ({ ...s, maxStay: e.target.value }))} style={{ width: 80 }} />
          </Row>
          <Btn loading={t7.loading} onClick={runT7} disabled={!P} color="amber">
            🔒 Apply CTD + Max Stay
          </Btn>
          <ErrBox msg={t7.error} />
          <TaskBox taskId={t7.result?.taskId} label="T7 Task ID" />
        </Section>

        {/* ── T8: Half-year bulk ── */}
        <Section title="Test 8 — Half-Year Bulk Range Update" badge="1 API call">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
            Single POST /restrictions with a 6-month date_from → date_to range.
            Channex accepts this as one API call.
          </p>
          <Row label="Date From">
            <Input type="date" value={t8.dateFrom}
              onChange={e => setT8(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Date To">
            <Input type="date" value={t8.dateTo}
              onChange={e => setT8(s => ({ ...s, dateTo: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Rate (USD)">
            <Input type="number" value={t8.rate} min="1"
              onChange={e => setT8(s => ({ ...s, rate: e.target.value }))} style={{ width: 90 }} />
          </Row>
          <Row label="Min Stay">
            <Input type="number" value={t8.minStay} min="1"
              onChange={e => setT8(s => ({ ...s, minStay: e.target.value }))} style={{ width: 80 }} />
          </Row>
          <Btn loading={t8.loading} onClick={runT8} disabled={!P} color="green">
            📅 Send Half-Year Bulk Update
          </Btn>
          <ErrBox msg={t8.error} />
          <TaskBox taskId={t8.result?.taskId} label="T8 Task ID" />
        </Section>

        {/* ── T9: Single availability ── */}
        <Section title="Test 9 — Single Date Availability Update" badge="1 API call">
          <Row label="Date">
            <Input type="date" value={t9.date}
              onChange={e => setT9(s => ({ ...s, date: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Availability">
            <select value={t9.avail} onChange={e => setT9(s => ({ ...s, avail: e.target.value }))}
              style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: 6, color: '#f1f5f9', fontSize: 13 }}>
              <option value={0}>0 — Unavailable (blocked)</option>
              <option value={1}>1 — Available</option>
            </select>
          </Row>
          <Btn loading={t9.loading} onClick={runT9} disabled={!P} color="blue">
            📅 Update Availability
          </Btn>
          <ErrBox msg={t9.error} />
          <TaskBox taskId={t9.result?.taskId} label="T9 Task ID" />
        </Section>

        {/* ── T10: Multi-date availability ── */}
        <Section title="Test 10 — Multi-Date Availability Update" badge="1 API call">
          <Row label="Date From">
            <Input type="date" value={t10.dateFrom}
              onChange={e => setT10(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Date To">
            <Input type="date" value={t10.dateTo}
              onChange={e => setT10(s => ({ ...s, dateTo: e.target.value }))} style={{ width: 150 }} />
          </Row>
          <Row label="Availability">
            <select value={t10.avail} onChange={e => setT10(s => ({ ...s, avail: e.target.value }))}
              style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: 6, color: '#f1f5f9', fontSize: 13 }}>
              <option value={0}>0 — Unavailable (blocked)</option>
              <option value={1}>1 — Available</option>
            </select>
          </Row>
          <Btn loading={t10.loading} onClick={runT10} disabled={!P} color="blue">
            📅 Update Multi-Date Availability
          </Btn>
          <ErrBox msg={t10.error} />
          <TaskBox taskId={t10.result?.taskId} label="T10 Task ID" />
        </Section>

        {/* ── T11–T14: Booking webhook ── */}
        <Section title="Tests 11–14 — Booking Webhook ACK" badge="new / modify / cancel + ack">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
            Channex will send a booking webhook (new / modified / cancelled) to
            <code style={{ color: '#38bdf8', marginLeft: 6 }}>
              POST {API}/connect/webhook/booking-revision
            </code>.
            The response will automatically include <code style={{ color: '#4ade80' }}>{`{ ack: true }`}</code>.
            <br /><br />
            To also manually ACK a specific booking by ID, enter its Channex booking UUID below.
          </p>
          <Row label="Channex Booking ID">
            <Input
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={t11.bookingId}
              onChange={e => setT11(s => ({ ...s, bookingId: e.target.value }))}
              style={{ width: 340 }}
            />
          </Row>
          <Btn loading={t11.loading} onClick={runT11} color="green" disabled={!t11.bookingId.trim()}>
            ✅ Send Booking ACK
          </Btn>
          <ErrBox msg={t11.error} />
          {t11.result && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#0d1f0d', border: '1px solid #22c55e', borderRadius: 8, color: '#4ade80', fontSize: 13 }}>
              ✅ ACK sent: {JSON.stringify(t11.result)}
            </div>
          )}
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#1a1200', border: '1px solid #d97706', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>
            📌 Webhook endpoint (no auth needed, HMAC validated):<br />
            <code style={{ color: '#fde68a' }}>POST {API}/connect/webhook/booking-revision</code><br />
            Channex should already have this configured on your staging property.
            Response always contains <code style={{ color: '#fde68a' }}>{`{ "ack": true }`}</code>.
          </div>
        </Section>

        {/* Cert form link */}
        <div style={{
          padding: '16px 20px', background: '#1e293b',
          border: '1px solid #334155', borderRadius: 10, fontSize: 14, color: '#94a3b8',
          marginTop: 8,
        }}>
          📝 Submit all Task IDs at:{' '}
          <a href="https://forms.gle/xA8F3eSYBPBd8apYA"
            target="_blank" rel="noopener noreferrer"
            style={{ color: '#38bdf8' }}>
            https://forms.gle/xA8F3eSYBPBd8apYA
          </a>
        </div>
      </div>
    </div>
  );
}

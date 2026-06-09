/**
 * MaintenanceOverlay.jsx
 *
 * Full-page overlay shown when the backend is in maintenance mode.
 * Listens for the global 'cc:maintenance' event (dispatched by apiClient on
 * any 503 response with body { maintenance: true }).
 *
 * Self-recovers: when the user gets a successful API response again, the
 * overlay auto-hides. Also exposes a manual "Try again" button that pings
 * /health every 10s while open.
 */
import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/apiClient';

export default function MaintenanceOverlay() {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  // Listen for maintenance signals from the API client.
  useEffect(() => {
    const onMaintenance = () => setOpen(true);
    const onSuccess = () => setOpen(false);
    window.addEventListener('cc:maintenance', onMaintenance);
    window.addEventListener('cc:api-ok', onSuccess);
    return () => {
      window.removeEventListener('cc:maintenance', onMaintenance);
      window.removeEventListener('cc:api-ok', onSuccess);
    };
  }, []);

  // While open, poll /health every 10s to auto-recover when maintenance ends.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await apiClient.get('/health', { _suppressAuthRedirect: true });
        if (res?.data?.status === 'ok') {
          // Health is up but we don't yet know if app endpoints are open. Ping
          // a real endpoint to confirm maintenance is OFF.
          try {
            await apiClient.get('/listings/active', { _suppressAuthRedirect: true });
            if (!cancelled) setOpen(false);
          } catch (probeErr) {
            const status = probeErr?.response?.status;
            // 401 means the API is fine; we're just logged out. Lift the overlay.
            if (status === 401) setOpen(false);
          }
        }
      } catch { /* keep polling */ }
    };
    const interval = setInterval(tick, 10_000);
    tick(); // immediate first ping
    return () => { cancelled = true; clearInterval(interval); };
  }, [open]);

  const tryNow = useCallback(async () => {
    setChecking(true);
    try {
      const res = await apiClient.get('/health', { _suppressAuthRedirect: true });
      if (res?.data?.status === 'ok') {
        try {
          await apiClient.get('/listings/active', { _suppressAuthRedirect: true });
          setOpen(false);
        } catch (err) {
          if (err?.response?.status === 401) setOpen(false);
        }
      }
    } finally {
      setChecking(false);
    }
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 480, width: '100%',
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          textAlign: 'center',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
          margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <h2 id="maintenance-title" style={{
          fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px',
        }}>
          We&rsquo;re briefly down for review
        </h2>
        <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.5, margin: '0 0 24px' }}>
          Channels Connect is undergoing a quick company review. We&rsquo;ll be back in a few minutes &mdash; existing bookings and incoming channel events keep flowing normally in the background.
        </p>
        <button
          onClick={tryNow}
          disabled={checking}
          style={{
            background: checking ? '#94a3b8' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
            color: 'white', fontWeight: 600, fontSize: 14,
            border: 'none', borderRadius: 10, padding: '10px 24px',
            cursor: checking ? 'wait' : 'pointer',
            transition: 'transform 0.1s',
          }}
        >
          {checking ? 'Checking…' : 'Try again'}
        </button>
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16 }}>
          This page checks automatically every 10 seconds.
        </p>
      </div>
    </div>
  );
}

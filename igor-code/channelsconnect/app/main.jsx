import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// ── Service Worker: unconditional unregister ──────────────────────────────────
// We are a Channel Manager, not a PWA. No offline caching is needed.
// This purges any lingering SW from prior builds (including blob:-URL based ones
// which browsers block and which caused silent fetch-interception bugs).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister any stale or blob-based Service Workers that may have been
// registered by a previous build. Browsers block SW registration from blob:
// URLs in production, causing console errors and — in some cases — blocking
// network requests through the SW fetch handler.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || '';
      if (scriptURL.startsWith('blob:') || scriptURL === '') {
        registration.unregister();
      }
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 
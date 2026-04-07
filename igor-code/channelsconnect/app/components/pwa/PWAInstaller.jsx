import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, X, Smartphone, Monitor, Zap, Shield, Wifi, Clock } from 'lucide-react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    // Check if app is already installed (running in standalone mode)
    setIsStandalone(window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
    
    // Check if iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show install prompt after 15 seconds if not installed and on dashboard
    const timer = setTimeout(() => {
      if (!isStandalone && 
          !localStorage.getItem('pwa-install-dismissed') && 
          (window.location.pathname.includes('Dashboard') || window.location.pathname.includes('Listings'))) {
        setShowInstallPrompt(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Channels Connect PWA installed');
        setShowInstallPrompt(false);
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleShowFeatures = () => {
    setShowFeatures(true);
  };

  // Don't show if already installed
  if (isStandalone) return null;

  // Don't show if user dismissed
  if (!showInstallPrompt) return null;

  if (showFeatures) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Install Channels Connect App</h3>
              <button onClick={() => setShowFeatures(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Lightning Fast Dashboard</h4>
                  <p className="text-sm text-gray-600">Your complete dashboard loads instantly with cached data, even faster than the website.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wifi className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Works Offline</h4>
                  <p className="text-sm text-gray-600">View your properties, analytics, and data even without internet connection.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Full-Screen Experience</h4>
                  <p className="text-sm text-gray-600">No browser bars or distractions - pure dashboard focused on your business.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">One-Tap Access</h4>
                  <p className="text-sm text-gray-600">Launch directly from your home screen - no more opening browsers or bookmarks.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {!isIOS && deferredPrompt && (
                <Button onClick={handleInstallClick} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  Install Dashboard App
                </Button>
              )}
              
              {isIOS && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-2">Install on iPhone/iPad:</p>
                  <p className="text-xs text-blue-700">
                    1. Tap the Share button (↗) at the bottom<br/>
                    2. Scroll down and tap "Add to Home Screen"<br/>
                    3. Tap "Add" to install your dashboard app
                  </p>
                </div>
              )}
              
              <Button onClick={() => setShowFeatures(false)} variant="outline" className="w-full">
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              {isIOS ? <Smartphone className="h-5 w-5 text-white" /> : <Download className="h-5 w-5 text-white" />}
            </div>
          </div>
          <div className="flex-1">
            <AlertDescription className="text-blue-900">
              <div className="font-semibold mb-1">Install Dashboard App</div>
              <div className="text-sm mb-3 text-blue-700">
                Get your complete Channels Connect dashboard as a lightning-fast app with offline access
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleShowFeatures} className="bg-blue-600 hover:bg-blue-700 text-white">
                  See Features
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-blue-700 hover:text-blue-900">
                  Not Now
                </Button>
              </div>
            </AlertDescription>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Alert>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, BarChart3, DollarSign, Zap, ShieldCheck, Users, Calendar, RefreshCw, Download, Upload, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User } from '@/api/entities';

export default function Features() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    document.title = "Powerful Channel Management Features | Channels Connect";
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Explore the tools that help you connect, automate, and grow your vacation rental business. Multi-calendar sync, dynamic pricing, iCal integration, and PMS connectivity.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]') || document.createElement('meta');
    metaKeywords.name = 'keywords';
    metaKeywords.content = 'channel manager features, multi-calendar sync, dynamic pricing tool, iCal import export, PMS integration, vacation rental automation';
    if (!document.querySelector('meta[name="keywords"]')) {
      document.head.appendChild(metaKeywords);
    }

    // PWA install prompt handling
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleGetStarted = async () => {
    if (user) {
      window.location.href = createPageUrl('ImportListings');
    } else {
      try {
        const importUrl = window.location.origin + createPageUrl('ImportListings');
        await User.loginWithRedirect(importUrl);
      } catch (error) {
        console.error('Login redirect error:', error);
        try {
          await User.login();
        } catch (loginError) {
          console.error('Basic login error:', loginError);
          window.location.href = '/auth/login';
        }
      }
    }
  };

  const handleAppDownload = async () => {
    if (isInstalled) {
      alert('The Channels Connect app is already installed on your device!');
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('User accepted the download prompt');
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error prompting for install:', error);
        showInstallInstructions();
      }
    } else {
      showInstallInstructions();
    }
  };

  const showInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = 'To install on iOS:\n1. Tap the Share button ⬆️ in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to download the app';
    } else if (isAndroid) {
      instructions = 'To install on Android:\n1. Tap the menu button ⋮ in Chrome\n2. Select "Add to Home screen" or "Install app"\n3. Tap "Add" to download the app';
    } else {
      instructions = 'To install on Desktop:\n1. Look for the install icon in your browser\'s address bar\n2. Click the install button\n3. Follow the prompts to add the app';
    }
    
    alert(instructions);
  };

  return (
    <div className="bg-white">
      {/* PWA App Showcase Section */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '80px 0'
      }}>
        <div className="absolute inset-0 opacity-10">
          <div style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
            width: '100%',
            height: '100%'
          }}></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* App Information Column */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full mb-6 backdrop-blur-sm border border-white border-opacity-30">
                <span className="text-xl">📱</span>
                <span className="text-sm font-semibold">New Mobile App Available</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Download the Channels Connect App
              </h1>
              
              <p className="text-lg lg:text-xl mb-8 opacity-95 leading-relaxed">
                Experience the full power of Channels Connect in a sleek, fast mobile app. 
                Download directly from your browser and enjoy <strong>offline access</strong>, 
                <strong>push notifications</strong>, and <strong>lightning-fast performance</strong> 
                that rivals native apps.
              </p>

              {/* Key Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex gap-3 p-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm border border-white border-opacity-20">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-xl">
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Lightning Fast Performance</h3>
                    <p className="text-sm opacity-90">Instant loading with advanced caching</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm border border-white border-opacity-20">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-xl">
                    🔄
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Works Offline</h3>
                    <p className="text-sm opacity-90">Access dashboard without internet</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm border border-white border-opacity-20">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-xl">
                    🔔
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Push Notifications</h3>
                    <p className="text-sm opacity-90">Real-time alerts for updates</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm border border-white border-opacity-20">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-xl">
                    📊
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Full Dashboard Access</h3>
                    <p className="text-sm opacity-90">Complete channel management</p>
                  </div>
                </div>
              </div>

              {/* Download Section */}
              <div className="text-center">
                <Button 
                  size="lg" 
                  onClick={handleAppDownload}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 mb-4"
                >
                  <Download className="w-5 h-5 mr-3" />
                  {isInstalled ? 'App Downloaded!' : 'Download App Now'}
                </Button>
                
                <div className="max-w-md mx-auto">
                  <p className="text-sm mb-4 opacity-90">
                    <strong>No app store required!</strong> Works on iPhone, Android, and desktop.
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white border-opacity-30">
                      🍎 iOS
                    </span>
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white border-opacity-30">
                      🤖 Android
                    </span>
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white border-opacity-30">
                      💻 Desktop
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* App Mockup Column */}
            <div className="flex justify-center items-center">
              <div className="relative">
                {/* Phone Frame */}
                <div className="w-72 h-[580px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[32px] p-3 shadow-2xl">
                  {/* Phone Screen */}
                  <div className="w-full h-full bg-white rounded-[20px] overflow-hidden relative">
                    {/* Phone Notch */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-800 rounded-full z-10"></div>
                    
                    {/* App Content Mockup */}
                    <div className="h-full flex flex-col bg-gray-50">
                      {/* App Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 pt-8">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold">Channels Connect</h3>
                          <span className="text-lg">🔔</span>
                        </div>
                      </div>
                      
                      {/* App Content */}
                      <div className="flex-1 p-5">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600 mb-1">24</div>
                            <div className="text-xs text-gray-600">Active Channels</div>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600 mb-1">1.2K</div>
                            <div className="text-xs text-gray-600">Total Views</div>
                          </div>
                        </div>
                        
                        {/* Chart Mockup */}
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="text-sm font-semibold mb-3 text-gray-800">Performance</div>
                          <div className="flex items-end gap-2 h-16">
                            <div className="bg-gradient-to-t from-blue-600 to-purple-600 rounded w-full" style={{height: '60%'}}></div>
                            <div className="bg-gradient-to-t from-blue-600 to-purple-600 rounded w-full" style={{height: '80%'}}></div>
                            <div className="bg-gradient-to-t from-blue-600 to-purple-600 rounded w-full" style={{height: '45%'}}></div>
                            <div className="bg-gradient-to-t from-blue-600 to-purple-600 rounded w-full" style={{height: '90%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transition to Existing Content */}
      <section className="py-16 bg-gray-50 text-center border-b border-gray-200">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Complete Platform Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Explore all the powerful capabilities that make Channels Connect the ultimate solution for vacation rental management
          </p>
        </div>
      </section>

      {/* Existing Hero Section */}
      <section className="bg-slate-700 py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Powerful Channel Management Features
          </h1>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto">
            Explore the tools that help you connect, automate, and grow your vacation rental business.
          </p>
        </div>
      </section>

      {/* Multi-Calendar Sync Section */}
      <section id="multi-calendar-sync" className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-800">Multi-Calendar Sync</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Keep all your booking calendars updated in real-time across Airbnb, Booking.com, Vrbo, and 100+ platforms.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Two-way calendar synchronization</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Real-time availability updates</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Multi-property support</span>
                </li>
              </ul>
            </div>
            <div>
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/c76bb758e_ChatGPTImageJul4202512_59_42AM.png" alt="Channels Connect dashboard demonstrating two-way calendar synchronization across multiple booking platforms" className="rounded-xl shadow-2xl"/>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Pricing Tool Section */}
      <section id="dynamic-pricing-tool" className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-800">Dynamic Pricing Tool</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Automatically adjust your rates to maximize occupancy and revenue based on seasonality, demand, and booking windows.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Automated rate optimization</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Last-minute discount rules</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Seasonal pricing strategies</span>
                </li>
              </ul>
            </div>
            <div className="lg:order-1">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop" alt="Dynamic pricing charts" className="rounded-xl shadow-2xl"/>
            </div>
          </div>
        </div>
      </section>

      {/* iCal Import & Export Section */}
      <section id="ical-import-export" className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <RefreshCw className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-800">iCal Import & Export</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Seamlessly import and export iCal feeds to sync your listings across all major booking channels.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">One-click iCal import</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Instant export to partner platforms</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Support for Airbnb, Booking.com, Vrbo, and more</span>
                </li>
              </ul>
            </div>
            <div>
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e2879cbe4_ChatGPTImageJul4202501_03_44AM.png" alt="Illustration of iCal import and export functionality with a calendar and sync arrows" className="rounded-xl shadow-2xl"/>
            </div>
          </div>
        </div>
      </section>

      {/* PMS Integration Section */}
      <section id="pms-integration" className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-800">PMS Integration</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Connect Channels Connect to your existing property management system without changing your workflows.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Works with Hostfully, OwnerRez, Guesty, and more</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">No migrations required</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span className="text-slate-700">Fast, secure setup</span>
                </li>
              </ul>

              {/* Add PMS Logos */}
              <div className="mt-6">
                <p className="text-sm text-slate-500 mb-3">Compatible with:</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d2146d81a_hostfully.png" alt="Hostfully" className="w-6 h-6 object-contain" />
                    <span className="text-sm text-slate-600">Hostfully</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691f17fe8_guesty-inc-logo-vector.png" alt="Guesty" className="w-6 h-6 object-contain" />
                    <span className="text-sm text-slate-600">Guesty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/7f8a2143c_ORFavicon512x512.png" alt="OwnerRez" className="w-6 h-6 object-contain" />
                    <span className="text-sm text-slate-600">OwnerRez</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/a6f3d40c6_Hospitableimages.png" alt="Hospitable" className="w-6 h-6 object-contain" />
                    <span className="text-sm text-slate-600">Hospitable</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:order-1">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dfd90b2c1_ChatGPTImageJul8202512_44_33PM.png" alt="PMS integration dashboard showing calendar and bookings management" className="rounded-xl shadow-2xl"/>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get More Bookings?</h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Start using these powerful features to automate your vacation rental business and increase revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg bg-white text-slate-900 hover:bg-slate-100"
              onClick={handleGetStarted}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Get More Bookings Now'}
            </Button>
            <Link to={`${createPageUrl('Compare')}#siteminder`}>
              <Button size="lg" className="text-lg bg-blue-600 border-2 border-blue-400 text-white hover:bg-blue-500">
                Compare vs SiteMinder
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

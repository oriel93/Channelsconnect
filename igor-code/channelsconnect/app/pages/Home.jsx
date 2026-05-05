
import React, { useState, useEffect } from 'react';
import { CheckCircle, Star, ArrowRight, DollarSign, Network, TrendingUp, Users, Globe, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HeroForm from '../components/marketing/HeroForm';
import { User } from '@/api/entities';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Declare all elements as let outside their conditional blocks for cleanup access
    let metaDesc = document.querySelector('meta[name="description"]');
    let ogType = document.querySelector('meta[property="og.type"]');
    let ogTitle = document.querySelector('meta[property="og.title"]');
    let ogDesc = document.querySelector('meta[property="og.description"]');
    let ogImage = document.querySelector('meta[property="og.image"]');
    let ogUrl = document.querySelector('meta[property="og.url"]');
    let ogSiteName = document.querySelector('meta[property="og.site_name"]');
    let twitterCard = document.querySelector('meta[name="twitter:card"]');
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    let twitterDesc = document.querySelector('meta[name="twitter:description"]');
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    let hreflangLink = document.querySelector('link[rel="alternate"][hreflang="en"]');
    let schema = document.querySelector('script[type="application/ld+json"]');
    // Ensure querying for preload link is specific to avoid conflicts if other preloads exist
    let preloadImageLink = document.querySelector('link[rel="preload"][as="image"][href="https://images.unsplash.com/photo-1615571022219-eb45cf7faa9d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"]');

    const heroImageUrl = "https://images.unsplash.com/photo-1615571022219-eb45cf7faa9d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";

    // Set Language
    document.documentElement.lang = 'en';
    
    // Meta Title
    document.title = "Channels Connect | Get FREE Instant Bookings for Your Vacation Rentals";
    
    // Meta Description
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = 'Get completely FREE instant bookings for your vacation rental properties. Channels Connect works with any PMS system, generates immediate guest payments, and has no hidden fees or commissions.';
    
    // OpenGraph Meta Tags
    if (!ogType) {
      ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og.type');
      document.head.appendChild(ogType);
    }
    ogType.content = 'website';

    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og.title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = 'Channels Connect | Get FREE Instant Bookings';

    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og.description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = 'The only completely FREE distribution platform that generates instant bookings with immediate guest payment. Works with ANY PMS system.';

    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og.image');
      document.head.appendChild(ogImage);
    }
    ogImage.content = heroImageUrl;

    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og.url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = 'https://channelsconnect.com/';

    if (!ogSiteName) {
      ogSiteName = document.createElement('meta');
      ogSiteName.setAttribute('property', 'og.site_name');
      document.head.appendChild(ogSiteName);
    }
    ogSiteName.content = 'Channels Connect';

    // Twitter Meta Tags
    if (!twitterCard) {
      twitterCard = document.createElement('meta');
      twitterCard.name = 'twitter:card';
      document.head.appendChild(twitterCard);
    }
    twitterCard.content = 'summary_large_image';

    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.name = 'twitter:title';
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.content = 'Channels Connect | Get FREE Instant Bookings';

    if (!twitterDesc) {
      twitterDesc = document.createElement('meta');
      twitterDesc.name = 'twitter:description';
      document.head.appendChild(twitterDesc);
    }
    twitterDesc.content = 'Generate instant bookings for your vacation rentals with Channels Connect – completely free, with immediate guest payments.';

    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.name = 'twitter:image';
      document.head.appendChild(twitterImage);
    }
    twitterImage.content = heroImageUrl;
    
    // Canonical Tag
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', 'https://channelsconnect.com/');
    
    // Hreflang Tag
    if (!hreflangLink) {
        hreflangLink = document.createElement('link');
        hreflangLink.setAttribute('rel', 'alternate');
        hreflangLink.setAttribute('hreflang', 'en');
        document.head.appendChild(hreflangLink);
    }
    hreflangLink.setAttribute('href', 'https://channelsconnect.com/');
    
    // JSON-LD Schema for Organization with Social Profiles
    if (!schema) {
      schema = document.createElement('script');
      schema.type = 'application/ld+json';
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Channels Connect",
      "url": "https://channelsconnect.com",
      "description": "Channels Connect is a vacation rental channel manager syncing Airbnb, Booking.com, and Vrbo listings.",
      "telephone": "+1-555-555-5555",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Miami",
        "addressRegion": "FL",
        "postalCode": "33131",
        "addressCountry": "US"
      },
      "sameAs": [
        "https://www.youtube.com/channel/UCI6tOo-_NPjGh2e3YMxEXPw",
        "https://www.facebook.com/profile.php?id=61577781673641",
        "https://www.instagram.com/channels_connect/"
      ]
    });

    // Preload hero image
    if (!preloadImageLink) {
      preloadImageLink = document.createElement('link');
      preloadImageLink.rel = 'preload';
      preloadImageLink.as = 'image';
      document.head.appendChild(preloadImageLink);
    }
    preloadImageLink.href = heroImageUrl;

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

    return () => {
      // Cleanup all managed elements on component unmount
      if (document.head.contains(metaDesc)) document.head.removeChild(metaDesc);
      if (document.head.contains(ogType)) document.head.removeChild(ogType);
      if (document.head.contains(ogTitle)) document.head.removeChild(ogTitle);
      if (document.head.contains(ogDesc)) document.head.removeChild(ogDesc);
      if (document.head.contains(ogImage)) document.head.removeChild(ogImage);
      if (document.head.contains(ogUrl)) document.head.removeChild(ogUrl);
      if (document.head.contains(ogSiteName)) document.head.removeChild(ogSiteName);
      if (document.head.contains(twitterCard)) document.head.removeChild(twitterCard);
      if (document.head.contains(twitterTitle)) document.head.removeChild(twitterTitle);
      if (document.head.contains(twitterDesc)) document.head.removeChild(twitterDesc);
      if (document.head.contains(twitterImage)) document.head.removeChild(twitterImage);
      if (document.head.contains(canonicalLink)) document.head.removeChild(canonicalLink);
      if (document.head.contains(hreflangLink)) document.head.removeChild(hreflangLink);
      if (document.head.contains(schema)) document.head.removeChild(schema);
      if (document.head.contains(preloadImageLink)) document.head.removeChild(preloadImageLink);
    };
  }, []);

  const handleGetStarted = async () => {
    try {
      // CORRECT: Use the platform's built-in login system.
      const finalRedirectUrl = window.location.origin + createPageUrl('ImportListings');
      await User.loginWithRedirect(finalRedirectUrl);
    } catch (error) {
       console.error('Login failed:', error);
       alert('Login failed. Please try again.');
    }
  };

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Hotel Manager, Seaside Resort",
      quote: "Channels Connect increased our bookings by 300% in 3 months. The free instant bookings filled our calendar without any extra work on our end.",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop",
      rating: 5
    },
    {
      name: "Mike Chen", 
      role: "Property Owner, Downtown Suites",
      quote: "Finally, a way to get more exposure for our properties without changing our existing systems. The additional bookings pay for themselves.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",
      rating: 5
    },
  ];

  const faqs = [
      {
        q: "What is Channels Connect?",
        a: "Channels Connect is a distribution platform that takes your existing vacation rental inventory and promotes it to get you more bookings. We work with any PMS system and offer free instant bookings to fill your calendar."
      },
      {
        q: "Do I need to change my current PMS system?",
        a: "No! Channels Connect works with your existing PMS system. We simply take your inventory and distribute it to get you more bookings. Keep using whatever system you're comfortable with."
      },
      {
        q: "What makes Channels Connect different?",
        a: "We offer free instant bookings. While other platforms charge fees or commissions, we help you get more bookings at no cost. We're not competing with your PMS - we're helping you get more revenue from your existing inventory."
      },
      {
        q: "How do the free instant bookings work?",
        a: "We take your available inventory and promote it across our network to generate instant bookings. When guests book, they pay instantly and you receive the booking in your existing system - completely free."
      },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Enhanced Mobile-First Hero Section — two-column layout */}
      <section className="relative min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
        {/* Subtle ambient background overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-indigo-900/95" />

        {/* Two-column hero content */}
        <div className="relative z-10 min-h-screen flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="flex flex-col md:flex-row items-center gap-10 lg:gap-16">

              {/* ── Left Column: copy ── */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 md:mb-6 leading-tight">
                  Get FREE
                  <span className="text-blue-300 block">Instant Bookings</span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-blue-100 mb-6 md:mb-8 max-w-2xl leading-relaxed">
                  The only completely FREE distribution platform that generates instant bookings with immediate guest payment.
                  <span className="text-white font-semibold block sm:inline"> Works with ANY PMS system.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold"
                    onClick={handleGetStarted}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Connect Your Airbnb'}
                    <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  <a
                    href="https://calendly.com/channelsconnect/demo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-md border-2 border-white text-white hover:bg-white hover:text-blue-900 transition-colors"
                  >
                    Book a Demo
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 text-white text-sm md:text-base">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0" />
                      <span className="font-medium">100% Free Forever</span>
                    </div>
                    <span className="text-blue-200 text-xs ml-7 md:ml-8 mt-0.5">No credit card needed</span>
                  </div>
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0" />
                    <span className="font-medium">Instant Guest Payment</span>
                  </div>
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0" />
                    <span className="font-medium">Works with ANY PMS</span>
                  </div>
                </div>
              </div>

              {/* ── Right Column: hero image ── */}
              <div className="flex-shrink-0 w-full md:w-[420px] lg:w-[520px] mt-8 md:mt-0">
                <img
                  src="/assets/channels-hero.png"
                  alt="Channels Connect — connect to 100s of booking channels"
                  className="w-full h-auto object-cover rounded-2xl shadow-2xl ring-1 ring-white/10"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="animate-bounce">
            <div className="w-5 h-8 md:w-6 md:h-10 border-2 border-white rounded-full flex justify-center">
              <div className="w-1 h-2 md:h-3 bg-white rounded-full mt-1 md:mt-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-Optimized PMS System Logos */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
            <p className="text-center text-xs md:text-sm font-semibold text-slate-500 tracking-wider uppercase mb-6 md:mb-8">
              WORKS WITH ALL MAJOR PMS SYSTEMS
            </p>
            <div className="flex justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 flex-wrap">
              <div className="flex items-center gap-2 md:gap-3 bg-white px-3 md:px-4 py-2 rounded-lg shadow-sm">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d2146d81a_hostfully.png" alt="Hostfully" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                <span className="text-sm md:text-lg font-semibold text-slate-700">Hostfully</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 bg-white px-3 md:px-4 py-2 rounded-lg shadow-sm">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691f17fe8_guesty-inc-logo-vector.png" alt="Guesty" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                <span className="text-sm md:text-lg font-semibold text-slate-700">Guesty</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 bg-white px-3 md:px-4 py-2 rounded-lg shadow-sm">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/7f8a2143c_ORFavicon512x512.png" alt="OwnerRez" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                <span className="text-sm md:text-lg font-semibold text-slate-700">OwnerRez</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 bg-white px-3 md:px-4 py-2 rounded-lg shadow-sm">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/a6f3d40c6_Hospitableimages.png" alt="Hospitable" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                <span className="text-sm md:text-lg font-semibold text-slate-700">Hospitable</span>
              </div>
            </div>
            <p className="text-center text-xs md:text-sm text-slate-500 mt-4 md:mt-6">
              Plus 100+ more booking channels including Airbnb, Booking.com, and Vrbo
            </p>
        </div>
      </section>
      
      {/* Why Property Managers Choose Section - Enhanced (Existing Section) */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-8 md:mb-12 text-center">
              Why Property Managers Choose Channels Connect
            </h2>
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 md:mb-6">
                  <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 md:mb-4">
                  We Build Property Pages For You
                </h3>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-4 md:mb-6">
                  No more manual listing creation. We replicate your existing Airbnb listings and create professional property pages across 100+ booking channels. Keep your rates, keep your availability control - we just get you more exposure.
                </p>
                <div className="bg-emerald-50 p-3 md:p-4 rounded-lg">
                  <p className="text-emerald-800 font-semibold text-sm md:text-base">Commission Model:</p>
                  <p className="text-emerald-700 text-sm md:text-base">Small booking fee charged to guests only. You keep 100% of your listed rates.</p>
                </div>
              </div>
              
              <div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4 md:mb-6">
                  <Network className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 md:mb-4">
                  Keep Your Existing Systems
                </h3>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-4 md:mb-6">
                   We're not here to replace your PMS or change how you work. Channels Connect simply replicates your property listings and distributes them to get you more bookings. Keep using Hostfully, Guesty, OwnerRez, or whatever system you prefer.
                </p>
                <ul className="space-y-2 md:space-y-3">
                  {["No software to learn or install", "Works with any PMS or calendar system", "Bookings appear in your existing workflow"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 md:gap-3 text-sm md:text-base">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Channel Comparison Section */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 md:mb-4">
              Compare Against Other Booking Channels
            </h2>
            <p className="text-base md:text-lg text-slate-600">See how we stack up against the competition</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left font-semibold text-slate-900 text-sm md:text-base">Feature</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-center font-semibold text-emerald-600 text-sm md:text-base">Channels Connect</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-center font-semibold text-slate-600 text-sm md:text-base">Airbnb</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-center font-semibold text-slate-600 text-sm md:text-base">Booking.com</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-center font-semibold text-slate-600 text-sm md:text-base">Vrbo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-sm md:text-base">Setup Cost</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-emerald-600 font-bold text-sm md:text-base">$0</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">$0</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">$0</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">$0</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-sm md:text-base">Commission</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-emerald-600 font-bold text-sm md:text-base">Small guest fee only</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">3% host fee</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">15% commission</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">5% commission</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-sm md:text-base">Channel Reach</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-emerald-600 font-bold text-sm md:text-base">100+ channels</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">1 channel</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">1 channel</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">1 channel</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-sm md:text-base">Keep Your Rates</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-emerald-600 text-sm md:text-base">✅</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">✅</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">✅</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">✅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-sm md:text-base">Control Availability</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-emerald-600 text-sm md:text-base">✅</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">✅</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">✅</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center text-slate-600 text-sm md:text-base">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 20+ Features Showcase */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 md:mb-4">
              20+ Powerful Features Included
            </h2>
            <p className="text-base md:text-lg text-slate-600">Everything you need to maximize your rental income</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[
              "Multi-channel distribution", "Real-time calendar sync", "Dynamic pricing", "Professional property pages",
              "Guest messaging automation", "Revenue optimization", "Channel performance analytics", "Booking management dashboard",
              "Mobile app access", "Multi-property support", "Custom branding", "SEO optimization",
              "24/7 customer support", "API integrations", "Rate guarantee protection", "Instant booking capabilities",
              "Guest review management", "Payment processing", "Expense tracking", "Tax reporting tools",
              "Market analysis reports", "Competitor pricing insights", "Automated guest communications", "Property maintenance scheduling"
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-lg p-3 md:p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" />
                  </div>
                  <span className="font-medium text-slate-700 text-sm md:text-base">{feature}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-16 md:py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">More Bookings, Zero Hassle</h2>
            <p className="text-base md:text-lg text-slate-300">See why property owners trust us to fill their calendars.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="bg-slate-800 p-6 md:p-8 rounded-xl">
                <div className="flex items-center mb-3 md:mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-base md:text-lg text-slate-200 mb-4 md:mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3 md:gap-4">
                  <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover"/>
                  <div>
                    <p className="font-semibold text-white text-base md:text-lg">{testimonial.name}</p>
                    <p className="text-slate-400 text-sm md:text-base">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              Why Property Owners Choose Channels Connect
            </h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto">
              We're the only platform that's completely FREE while generating MORE bookings than expensive alternatives
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Shield className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">100% Free</h3>
              <p className="text-sm md:text-base text-gray-600">No monthly fees, no commissions, no hidden costs. Ever.</p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Zap className="w-7 h-7 md:w-8 md:h-8 text-green-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Instant Bookings</h3>
              <p className="text-sm md:text-base text-gray-600">Guests pay immediately. Money in your account right away.</p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Globe className="w-7 h-7 md:w-8 md:h-8 text-purple-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Universal Integration</h3>
              <p className="text-sm md:text-base text-gray-600">Works with Guesty, Siteminder, Rentals United, and 200+ PMS systems.</p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <TrendingUp className="w-7 h-7 md:w-8 md:h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">More Revenue</h3>
              <p className="text-sm md:text-base text-gray-600">15-30% more bookings within 30 days. Guaranteed results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Advantage Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              Stop Paying Expensive Monthly Fees
            </h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto">
              See how much you'll save compared to traditional channel managers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-gray-200">
              <CardContent className="p-5 md:p-6 text-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Guesty</h3>
                <div className="text-2xl md:text-3xl font-bold text-red-600 mb-2">$2.40+</div>
                <p className="text-xs md:text-sm text-gray-600 mb-4">per unit monthly + transaction fees</p>
                <div className="text-xs md:text-sm text-gray-500">
                  <div>❌ Monthly subscription required</div>
                  <div>❌ Transaction fees apply</div>
                  <div>❌ Limited free features</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200">
              <CardContent className="p-5 md:p-6 text-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Siteminder</h3>
                <div className="text-2xl md:text-3xl font-bold text-red-600 mb-2">$50+</div>
                <p className="text-xs md:text-sm text-gray-600 mb-4">monthly + setup fees</p>
                <div className="text-xs md:text-sm text-gray-500">
                  <div>❌ Enterprise pricing only</div>
                  <div>❌ Setup and training costs</div>
                  <div>❌ Complex implementation</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Best Value</Badge>
              </div>
              <CardContent className="p-5 md:p-6 text-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Channels Connect</h3>
                <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">FREE</div>
                <p className="text-xs md:text-sm text-gray-600 mb-4">forever + instant bookings</p>
                <div className="text-xs md:text-sm text-gray-700">
                  <div>✅ 100% free forever</div>
                  <div>✅ Instant guest payment</div>
                  <div>✅ Works with ANY PMS</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-6 md:mt-8">
            <p className="text-base md:text-lg text-gray-700 mb-3 md:mb-4">
              <strong>Save $600-2,400+ per year</strong> while getting MORE bookings
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg"
              onClick={handleGetStarted} disabled={loading}
            >
              {loading ? 'Loading...' : 'Start Saving Today - It\'s Free!'}
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              Trusted by 10,000+ Property Owners Worldwide
            </h2>
            <p className="text-base md:text-xl text-gray-600">
              Join property managers who've increased their revenue by 15-30%
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center mb-3 md:mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 md:w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <blockquote className="text-sm md:text-base text-gray-700 mb-3 md:mb-4">
                  "Channels Connect increased our bookings by 25% in the first month. The fact that it's completely free is incredible!"
                </blockquote>
                <div className="font-semibold text-gray-900 text-sm md:text-base">Sarah Johnson</div>
                <div className="text-xs md:text-sm text-gray-600">Miami Beach Properties</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center mb-3 md:mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 md:w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <blockquote className="text-sm md:text-base text-gray-700 mb-3 md:mb-4">
                  "We saved over $2,000 per year switching from Guesty to Channels Connect. Same functionality, zero cost."
                </blockquote>
                <div className="font-semibold text-gray-900 text-sm md:text-base">Mike Chen</div>
                <div className="text-xs md:text-sm text-gray-600">NYC Vacation Rentals</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center mb-3 md:mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 md:w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <blockquote className="text-sm md:text-base text-gray-700 mb-3 md:mb-4">
                  "Integration with our PMS was seamless. Bookings appear automatically with instant payment confirmation."
                </blockquote>
                <div className="font-semibold text-gray-900 text-sm md:text-base">Lisa Rodriguez</div>
                <div className="text-xs md:text-sm text-gray-600">Austin Property Group</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-3 md:space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="p-4 md:p-6 bg-white rounded-lg shadow-sm group">
                  <summary className="font-semibold cursor-pointer list-none flex justify-between items-center text-base md:text-lg">
                    {faq.q}
                    <div className="transform transition-transform duration-200 group-open:rotate-45">
                      <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24" className="w-5 h-5 md:w-6 md:h-6"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
                    </div>
                  </summary>
                  <p className="mt-3 md:mt-4 text-slate-600 leading-relaxed text-sm md:text-base">{faq.a}</p>
                </details>
              ))}
            </div>
        </div>
      </section>

      {/* CTA Section */}
       <section className="py-16 md:py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
            Ready to Get More Bookings for FREE?
          </h2>
          <p className="text-lg md:text-xl text-blue-100 mb-6 md:mb-8 max-w-3xl mx-auto">
            Join thousands of property owners who've stopped paying expensive monthly fees and started getting MORE bookings
          </p>
          
          <div className="max-w-md mx-auto mb-6 md:mb-8">
            <HeroForm />
          </div>

          <div className="mb-6">
            <a
              href="https://calendly.com/channelsconnect/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-md border-2 border-white text-white hover:bg-white hover:text-blue-700 transition-colors"
            >
              Book a Demo
            </a>
          </div>

          <div className="text-blue-100 text-xs md:text-sm">
            <p>✅ Setup takes 5 minutes • ✅ No credit card required • ✅ Cancel anytime (but you won't want to!)</p>
          </div>
        </div>
      </section>

    </div>
  );
}

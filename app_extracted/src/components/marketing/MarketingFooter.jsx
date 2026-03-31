
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Twitter, Linkedin, Facebook, Instagram, Youtube, Mail, Phone } from 'lucide-react';

export default function MarketingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-white">Channels Connect</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-md mb-4">
              More than a channel manager—we're your revenue booster. The ultimate vacation rental platform for Airbnb, Booking.com, Vrbo, and 100+ booking channels. Free setup, no monthly minimums, no commissions.
            </p>
            
            {/* Contact Information */}
            <div className="space-y-2 mb-4">
              <a href="tel:+17866462233" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <Phone size={16} />
                <span>(786) 646-2233</span>
              </a>
              <a href="mailto:info@channelsconnect.com" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <Mail size={16} />
                <span>info@channelsconnect.com</span>
              </a>
            </div>
            
            <div className="flex items-center gap-4">
              <a 
                href="https://www.youtube.com/channel/UCI6tOo-_NPjGh2e3YMxEXPw" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Visit our YouTube channel"
              >
                <Youtube size={20} />
              </a>
              <a 
                href="https://www.facebook.com/profile.php?id=61577781673641" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Visit our Facebook page"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="https://www.instagram.com/channels_connect/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://www.linkedin.com/company/channels-connect" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Connect with us on LinkedIn"
              >
                <Linkedin size={20} />
              </a>
              <a 
                href="https://twitter.com/channelsconnect" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Follow us on Twitter"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Features</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to={`${createPageUrl('Features')}#multi-calendar-sync`} className="hover:text-white transition-colors">Multi-Calendar Sync</Link></li>
              <li><Link to={`${createPageUrl('Features')}#dynamic-pricing-tool`} className="hover:text-white transition-colors">Dynamic Pricing Tool</Link></li>
              <li><Link to={`${createPageUrl('Features')}#ical-import-export`} className="hover:text-white transition-colors">iCal Import/Export</Link></li>
              <li><Link to={`${createPageUrl('Features')}#pms-integration`} className="hover:text-white transition-colors">PMS Integration</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Compare</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to={`${createPageUrl('Compare')}#guesty`} className="hover:text-white transition-colors">vs Guesty</Link></li>
              <li><Link to={`${createPageUrl('Compare')}#rentals-united`} className="hover:text-white transition-colors">vs Rentals United</Link></li>
              <li><Link to={`${createPageUrl('Compare')}#siteminder`} className="hover:text-white transition-colors">vs SiteMinder</Link></li>
              <li><Link to={createPageUrl('Pricing')} className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Legal & Compliance</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to={createPageUrl('PrivacyPolicy')} className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to={createPageUrl('TermsOfService')} className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to={createPageUrl('CookiePolicy')} className="hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link to={createPageUrl('AcceptableUsePolicy')} className="hover:text-white transition-colors">Acceptable Use Policy</Link></li>
              <li><Link to={createPageUrl('DataProcessingAgreement')} className="hover:text-white transition-colors">Data Processing Agreement</Link></li>
              <li><Link to={createPageUrl('RefundPolicy')} className="hover:text-white transition-colors">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-slate-500 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Channels Connect. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <Link to={createPageUrl('PrivacyPolicy')} className="hover:text-white transition-colors">Privacy</Link>
              <Link to={createPageUrl('TermsOfService')} className="hover:text-white transition-colors">Terms</Link>
              <Link to={createPageUrl('CookiePolicy')} className="hover:text-white transition-colors">Cookies</Link>
              <Link to={createPageUrl('AcceptableUsePolicy')} className="hover:text-white transition-colors">Acceptable Use</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

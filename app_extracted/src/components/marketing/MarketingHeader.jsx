
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, LayoutDashboard, Rocket, Calendar, LogIn } from 'lucide-react';
import { User } from '@/api/entities';

const navLinks = [
  { name: 'Features', path: createPageUrl('Features') },
  { name: 'Pricing', path: createPageUrl('Pricing') },
  { name: 'Team', path: createPageUrl('Team') },
  { name: 'Resources', path: createPageUrl('Resources') },
];

export default function MarketingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
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

  const handleLogout = async () => {
    try {
      await User.logout();
      setUser(null);
      window.location.href = createPageUrl('Home');
    } catch (error) {
      console.error("Logout failed:", error);
      setUser(null);
      window.location.href = createPageUrl('Home');
    }
  };

  const handleLogin = async () => {
    try {
      const finalRedirectUrl = window.location.origin + createPageUrl('Dashboard');
      await User.loginWithRedirect(finalRedirectUrl);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 md:py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg md:text-xl font-bold text-slate-800">Channels Connect</span>
            </Link>

            {/* Desktop Navigation + CTA Buttons */}
            <div className="hidden lg:flex items-center gap-6">
              <nav className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>

              {/* CTA Buttons */}
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                <Link to={createPageUrl('LeadCapture')}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full flex items-center gap-2 px-6">
                    <Rocket className="w-5 h-5" />
                    JOIN FREE TODAY
                  </Button>
                </Link>
                <a href="https://calendly.com/oriel-erorentals/intro-channels-connect" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="font-semibold rounded-full flex items-center gap-2 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
                    <Calendar className="w-5 h-5" />
                    Book Demo
                  </Button>
                </a>
              </div>

              {/* User Menu */}
              {!loading && (
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  {user ? (
                    <>
                      <Link to={createPageUrl('Dashboard')}>
                        <Button variant="outline" size="sm">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                      <Button onClick={handleLogout} size="sm" className="bg-slate-900 hover:bg-slate-800 rounded-full">
                        Log Out
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleLogin} variant="outline" size="sm" className="rounded-full">
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile: Just Menu Button */}
            <div className="lg:hidden flex items-center">
              <button
                className="p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile CTA Bar - Fixed at bottom on mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Link to={createPageUrl('LeadCapture')} className="flex-1">
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full flex items-center justify-center gap-1 py-2.5">
                <Rocket className="w-4 h-4" />
                <span className="text-xs sm:text-sm">JOIN FREE</span>
              </Button>
            </Link>
            <a href="https://calendly.com/oriel-erorentals/intro-channels-connect" target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full font-semibold rounded-full flex items-center justify-center gap-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-2.5">
                <Calendar className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Book Demo</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white fixed top-[64px] left-0 right-0 z-40 shadow-lg max-h-[calc(100vh-64px-80px)] overflow-y-auto">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {user ? (
              <div className="pt-3 border-t border-slate-200 space-y-1">
                <Link
                  to={createPageUrl('Dashboard')}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                >
                  <LayoutDashboard className="w-4 h-4 inline mr-2" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    handleLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                >
                  <LogIn className="w-4 h-4 inline mr-2" />
                  Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add padding to body to account for fixed bottom bar on mobile */}
      <style>{`
        @media (max-width: 1023px) { /* Corresponds to lg:hidden */
          body {
            padding-bottom: 80px !important; /* Adjust as needed based on bottom bar height */
          }
        }
      `}</style>
    </>
  );
}

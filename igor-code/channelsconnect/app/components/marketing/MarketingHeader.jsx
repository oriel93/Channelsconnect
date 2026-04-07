
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { authHelpers } from '@/lib/supabase';

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
        const { user: currentUser, error } = await authHelpers.getUser();
        if (currentUser && !error) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
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
      await authHelpers.signOut();
      setUser(null);
      window.location.href = createPageUrl('Home');
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails on server, clear local user state and redirect
      setUser(null);
      window.location.href = createPageUrl('Home');
    }
  };

  const handleLogin = () => {
    // Redirect to the login page
    const currentPath = window.location.pathname;
    // If on home page, redirect to dashboard after login, otherwise return to current page
    const redirect = currentPath === '/' || currentPath === '/Home' 
      ? createPageUrl('Dashboard') 
      : currentPath;
    window.location.href = `${createPageUrl('Login')}?redirect=${encodeURIComponent(redirect)}`;
  };

  const AuthButtons = () => {
    if (loading) {
      return <div className="w-24 h-8 bg-slate-200 rounded animate-pulse"></div>;
    }

    if (user) {
      return (
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('Dashboard')} className="hidden md:inline-flex">
            <Button variant="outline" size="sm">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Button onClick={handleLogout} size="sm" className="bg-slate-900 hover:bg-slate-800 rounded-full">
            Log Out
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleLogin} 
          size="sm" 
          variant="outline"
          className="rounded-full"
        >
          Sign In
        </Button>
        <Button 
          onClick={handleLogin} 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700 rounded-full"
        >
          Get Started
        </Button>
      </div>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 py-3 md:py-4">
        <div className="flex justify-between items-center">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg md:text-xl font-bold text-slate-800">Channels Connect</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
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

          {/* Combined Auth Buttons and Mobile Menu Trigger */}
          <div className="flex items-center gap-4">
            <AuthButtons />
            <button
              className="md:hidden" // Button visible only on screens smaller than md
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu Content (conditionally rendered) */}
      {isMobileMenuOpen && (
        <div className="md:hidden"> {/* Mobile menu content visible only on screens smaller than md */}
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
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
             {user && ( // Dashboard link for logged-in users in mobile menu
                <Link
                  to={createPageUrl('Dashboard')}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
              )}
          </div>
        </div>
      )}
    </header>
  );
}

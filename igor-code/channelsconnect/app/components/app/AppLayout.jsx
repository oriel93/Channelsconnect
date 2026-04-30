
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, Calendar, Upload, Settings, Image as ImageIcon, Briefcase, Network, Menu, X, Bot, BarChart3, Crown } from 'lucide-react';

const BASE_NAV_ITEMS = [
  { name: 'Import Listings', href: createPageUrl('ImportListings'), icon: Upload },
  { name: 'Dashboard', href: createPageUrl('Dashboard'), icon: Calendar },
  { name: 'Financial Reports', href: createPageUrl('FinancialReports'), icon: BarChart3 },
  { name: 'My Listings', href: createPageUrl('Listings'), icon: Briefcase },
  // { name: 'Channels', href: createPageUrl('ChannelsDashboard'), icon: Network },
  { name: 'Image Manager', href: createPageUrl('ImageManager'), icon: ImageIcon },
  // { name: 'AI Assistant', href: createPageUrl('Agent'), icon: Bot },
  { name: 'Settings', href: createPageUrl('Settings'), icon: Settings },
];

const ADMIN_NAV_ITEM = {
  name: 'Admin Portal',
  href: '/admin',
  icon: Crown,
  adminOnly: true,
};

function getNavItems(user) {
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  return isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;
}

function Sidebar({ user }) {
  const location = useLocation();
  const navItems = getNavItems(user);

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b">
             <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-full h-full object-contain" />
              </div>
            <span className="ml-3 text-xl font-bold text-slate-800">Channels Connect</span>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto bg-white">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    location.pathname === item.href
                      ? 'bg-slate-100 text-slate-900'
                      : item.adminOnly
                        ? 'text-yellow-700 hover:bg-yellow-50 hover:text-yellow-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="mr-3 flex-shrink-0 h-6 w-6" aria-hidden="true" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNavigation({ isOpen, setIsOpen, user }) {
  const location = useLocation();
  const navItems = getNavItems(user);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center h-16 px-4 bg-white border-b">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Channels Connect Logo" className="w-full h-full object-contain" />
            </div>
            <span className="ml-3 text-lg font-bold text-slate-800">Channels Connect</span>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2 bg-white">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === item.href
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : item.adminOnly
                      ? 'text-yellow-700 hover:bg-yellow-50 border border-yellow-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AppLayout({ children, headerActions }) {
  const { user, signOut } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };
  
  return (
     <div className="h-screen flex overflow-hidden bg-slate-100">
      <Sidebar user={user} />
      <MobileNavigation isOpen={isMobileNavOpen} setIsOpen={setIsMobileNavOpen} user={user} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
         {/* Mobile Header */}
         <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-sm md:hidden border-b">
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileNavOpen(true)}
                  className="mr-2"
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <div className="flex items-center">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="ml-2 text-lg font-bold text-slate-800">Channels</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
         </div>
         
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
           {/* Desktop Header Actions */}
           <div className="absolute top-4 right-6 hidden md:flex items-center gap-2">
             {headerActions}
             <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
           </div>
          <div className="py-4 md:py-6">
            <div className="w-full px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

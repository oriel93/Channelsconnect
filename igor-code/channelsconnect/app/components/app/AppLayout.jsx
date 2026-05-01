/**
 * AppLayout.jsx — Shell layout with RBAC-enforced navigation
 *
 * RBAC contract:
 *   role='user'   — sees Dashboard, Tape Chart, Financial Reports,
 *                   My Listings, Image Manager, Import Listings, Settings
 *   role='admin'  — all of the above PLUS Admin Portal
 *
 * isAdmin is read from AuthContext (dbUser.role), NOT re-derived from
 * user.role inline — single source of truth, no stale-closure risk.
 *
 * Route-level fencing is handled separately by ProtectedRoute in authContext.jsx.
 * This file handles VISUAL fencing only (what items appear in nav).
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  LogOut, Calendar, Upload, Settings, Image as ImageIcon,
  Briefcase, Menu, BarChart3, Crown, LayoutGrid,
} from 'lucide-react';

// ─── Nav item definitions ─────────────────────────────────────────────────────

/** Items visible to ALL authenticated users */
const USER_NAV = [
  { name: 'Add Properties',    href: createPageUrl('PropertyIngestionHub'), icon: Upload  },
  { name: 'Dashboard',         href: createPageUrl('Dashboard'),        icon: Calendar    },
  { name: 'Tape Chart',        href: createPageUrl('TapeChart'),        icon: LayoutGrid  },
  { name: 'Financial Reports', href: createPageUrl('FinancialReports'), icon: BarChart3   },
  { name: 'My Listings',       href: createPageUrl('Listings'),         icon: Briefcase   },
  { name: 'Image Manager',     href: createPageUrl('ImageManager'),     icon: ImageIcon   },
  { name: 'Settings',          href: createPageUrl('Settings'),         icon: Settings    },
];

/** Items visible ONLY to admins */
const ADMIN_NAV = [
  { name: 'Admin Portal', href: '/admin', icon: Crown, adminOnly: true },
];

// ─── Nav link component ───────────────────────────────────────────────────────

function NavLink({ item, active, onClick }) {
  const base = 'flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors';
  const activeStyle  = 'bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-l-2 border-purple-600';
  const adminStyle   = 'text-purple-700 hover:bg-purple-50 hover:text-purple-900';
  const defaultStyle = 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';

  const style = active ? activeStyle : item.adminOnly ? adminStyle : defaultStyle;

  return (
    <Link to={item.href} onClick={onClick} className={`${base} ${style}`}>
      <item.icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
      {item.name}
      {item.adminOnly && (
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide
          bg-purple-100 text-purple-700 rounded px-1 py-0.5">
          Admin
        </span>
      )}
    </Link>
  );
}

// ─── Logo mark ────────────────────────────────────────────────────────────────

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png';

function LogoBar({ mobile }) {
  return (
    <div className={`flex items-center flex-shrink-0 px-4 bg-gradient-to-r from-blue-600 to-purple-600 border-b border-purple-700 ${mobile ? 'h-14' : 'h-16'}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm overflow-hidden bg-white/20 border border-white/30">
        <img src={LOGO_URL} alt="Channels Connect" className="w-full h-full object-contain" />
      </div>
      <span className={`ml-3 font-bold text-white ${mobile ? 'text-base' : 'text-xl'}`}>
        Channels Connect
      </span>
    </div>
  );
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────

function Sidebar({ navItems }) {
  const location = useLocation();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1">
          <LogoBar />
          <div className="flex-1 flex flex-col overflow-y-auto bg-white">
            <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Main navigation">
              {navItems.map(item => (
                <NavLink
                  key={item.name}
                  item={item}
                  active={location.pathname === item.href || location.pathname.startsWith(item.href + '?')}
                />
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

function MobileDrawer({ open, onClose, navItems }) {
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full">
          <LogoBar mobile />
          <nav className="flex-1 px-2 py-4 space-y-0.5 bg-white overflow-y-auto" aria-label="Mobile navigation">
            {navItems.map(item => (
              <NavLink
                key={item.name}
                item={item}
                active={location.pathname === item.href}
                onClick={onClose}
              />
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function AppLayout({ children, headerActions }) {
  const { user, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Build nav list: always show user nav; append admin nav only for admins
  // isAdmin is derived from dbUser.role in AuthContext — authoritative single source
  const navItems = isAdmin ? [...USER_NAV, ...ADMIN_NAV] : USER_NAV;

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      <Sidebar navItems={navItems} />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} navItems={navItems} />

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="relative z-10 flex-shrink-0 flex h-14 bg-white shadow-sm md:hidden border-b">
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMobileOpen(true)} className="p-1.5">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded overflow-hidden border border-slate-100">
                  <img src={LOGO_URL} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-bold text-slate-800">Channels</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="p-1.5">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {/* Desktop header actions */}
          <div className="absolute top-4 right-6 hidden md:flex items-center gap-2 z-10">
            {headerActions}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />Logout
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

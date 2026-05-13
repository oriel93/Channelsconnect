/**
 * AdminLayout.jsx — Sleek dark-sidebar layout for the Admin Portal.
 *
 * Design:
 *   - Fixed left sidebar: dark glass-morphism (#0f1117 bg, backdrop blur)
 *     with glowing active-state indicators and navigation groups.
 *   - Sticky top header with the admin's email and global actions.
 *   - Scrollable main content area with proper overflow handling.
 *
 * Navigation groups:
 *   Overview  → overview / stats
 *   Users     → users management
 *   Listings  → properties & listings
 *   Channels  → Channex Sync Operations (certification spotlight)
 *   Review    → admin review queue + concierge
 *   Settings  → markup, export
 */

import React from 'react';
import {
  Crown, Users, Building2, Zap, ClipboardList,
  Sparkles, Settings, Download, RefreshCw,
  ChevronRight, Globe, Database, Bell, Moon, Sun,
  Activity,
} from 'lucide-react';

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, badge, badgeColor = 'bg-red-500', active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-medium transition-all duration-200 text-left
        ${active
          ? 'bg-white/10 text-white shadow-inner'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }
      `}
    >
      {/* Active indicator bar */}
      {active && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-500`} />
      )}

      <span className={`p-1.5 rounded-lg ${active ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/10'} transition-colors`}>
        <Icon className={`w-4 h-4 ${active ? 'text-indigo-300' : ''}`} />
      </span>

      <span className={`flex-1 ${active ? 'text-white' : ''}`}>{label}</span>

      {badge != null && (
        <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white ${badgeColor}`}>
          {badge}
        </span>
      )}

      {active && <ChevronRight className={`w-3.5 h-3.5 text-indigo-400 opacity-60`} />}
    </button>
  );
}

// ── Group heading ─────────────────────────────────────────────────────────────
function NavGroup({ label }) {
  return (
    <p className={`px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600`}>
      {label}
    </p>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className={`
      fixed left-0 top-0 h-screen w-60 flex flex-col
      bg-[#0f1117] backdrop-blur-xl
      border-r border-white/[0.06]
      z-50
    `}>
      {/* Logo / brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]`}>
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25`}>
          <Crown className={`w-4 h-4 text-white`} />
        </div>
        <div>
          <p className={`text-sm font-bold text-white leading-tight`}>Channels Connect</p>
          <p className={`text-[10px] text-slate-500 font-medium`}>Admin Portal</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className={`flex-1 overflow-y-auto px-3 py-4 space-y-0.5`}>
        {/* Overview */}
        <NavGroup label={'Overview'} />
        <NavItem icon={Activity} label={'Dashboard'} active={activeSection === 'overview'} onClick={() => onNavigate('overview')} />

        {/* People */}
        <NavGroup label={'People'} />
        <NavItem icon={Users} label={'Users'} active={activeSection === 'users'} onClick={() => onNavigate('users')} />

        {/* Listings */}
        <NavGroup label={'Properties'} />
        <NavItem icon={Building2} label={'All Listings'} active={activeSection === 'listings'} onClick={() => onNavigate('listings')} />
        <NavItem icon={Database} label={'Media Manager'} active={activeSection === 'media'} onClick={() => onNavigate('media')} />

        {/* Channels — the Channex certification spotlight */}
        <NavGroup label={'Channels'} />
        <NavItem icon={Zap} label={'Channex Sync Ops'} active={activeSection === 'channels'} onClick={() => onNavigate('channels')}
          badgeColor={'bg-gradient-to-r from-indigo-500 to-violet-600'} />

        {/* Review */}
        <NavGroup label={'Review'} />
        <NavItem icon={ClipboardList} label={'Review Queue'} active={activeSection === 'review'} onClick={() => onNavigate('review')} badge={undefined} />
        <NavItem icon={Sparkles} label={'Concierge'} active={activeSection === 'concierge'} onClick={() => onNavigate('concierge')} />

        {/* Settings */}
        <NavGroup label={'Settings'} />
        <NavItem icon={Settings} label={'Rate Markup'} active={activeSection === 'markup'} onClick={() => onNavigate('markup')} />
        <NavItem icon={Download} label={'Export'} active={activeSection === 'export'} onClick={() => onNavigate('export')} />
      </nav>

      {/* Footer */}
      <div className={`px-4 py-4 border-t border-white/[0.06]`}>
        <p className={`text-[10px] text-slate-600 text-center`}>Channels Connect v3 · Admin</p>
      </div>
    </aside>
  );
}

// ── Main Layout component ──────────────────────────────────────────────────────
export default function AdminLayout({ activeSection, onNavigate, children }) {
  return (
    <div className={`min-h-screen bg-slate-950`}>
      <Sidebar activeSection={activeSection} onNavigate={onNavigate} />

      {/* Main content — offset by sidebar width (60 = 15rem = w-60) */}
      <div className={`ml-60 min-h-screen`}>
        {children}
      </div>
    </div>
  );
}
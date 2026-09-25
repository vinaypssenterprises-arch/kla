import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Shield, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import UserMenu from './UserMenu';

export default function Layout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  };

  const expandSidebar = () => {
    setCollapsed(false);
    localStorage.setItem('sidebarCollapsed', '0');
  };

  return (
    <div className="min-h-screen bg-parchment">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#000E89] border-r border-[#1B2B99] shadow-[4px_0_24px_rgba(0,14,137,0.35)] flex flex-col transition-all duration-300 ease-in-out w-[250px]
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[250px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <button
          type="button"
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute top-[33px] -right-3.5 -translate-y-1/2 w-7 h-7 rounded-full items-center justify-center
            bg-yellow-400 text-[#000E89] border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]
            hover:bg-yellow-300 hover:scale-110 active:scale-95 transition-all duration-200 z-50 font-bold"
        >
          {collapsed ? <ChevronRight className="w-[15px] h-[15px]" strokeWidth={2.5} /> : <ChevronLeft className="w-[15px] h-[15px]" strokeWidth={2.5} />}
        </button>

        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/20 flex-shrink-0 bg-white/[0.04]">
          <div className="topbar-seal flex-shrink-0 shadow-sm">
            <Shield className="w-[18px] h-[18px] text-[#000E89]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[13px] font-serif font-bold text-white leading-tight truncate">17-A Proposals</div>
              <div className="text-[9.5px] text-[#C4CFF5] uppercase tracking-[0.06em] truncate font-semibold">Status Register</div>
            </div>
          )}
          <button type="button" className="ml-auto icon-btn-dark lg:hidden flex-shrink-0 text-white" onClick={() => setMobileOpen(false)} title="Close menu">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <Sidebar
          collapsed={collapsed}
          onExpandSidebar={expandSidebar}
          onLinkClick={() => setMobileOpen(false)}
        />

        <div className="px-3 py-3.5 border-t border-white/20 flex-shrink-0 bg-white/[0.05]">
          <UserMenu collapsed={collapsed} onLogout={onLogout} />
        </div>
      </aside>

      <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[250px]'}`}>
        <Header onToggleMobile={() => setMobileOpen(true)} />
        <main className="p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

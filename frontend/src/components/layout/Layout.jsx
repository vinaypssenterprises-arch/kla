import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import UserMenu from './UserMenu';
import {
  MODULES, getModuleForPath, getStoredModule, storeModule, getAllowedModules, hasAccessSnapshot, refreshAccess
} from '../../lib/modules';

export default function Layout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [accessReady, setAccessReady] = useState(hasAccessSnapshot);
  const [, setAccessVersion] = useState(0);

  // Check if current route is a full-screen entry/edit form across any of the 3 modules
  const isFormPage = (
    location.pathname === '/court-cases/new' || /^\/court-cases\/[^/]+\/edit$/.test(location.pathname) ||
    location.pathname === '/officers/new' || /^\/officers\/[^/]+\/edit$/.test(location.pathname) ||
    location.pathname === '/register/new' || /^\/register\/[^/]+\/edit$/.test(location.pathname)
  );

  // Re-read module access from the server so an admin's permission change applies mid-session
  useEffect(() => {
    let alive = true;
    refreshAccess().then(() => {
      if (!alive) return;
      setAccessReady(true);
      setAccessVersion(v => v + 1);
    });
    return () => { alive = false; };
  }, []);

  const allowedModules = getAllowedModules();
  const pathModule = getModuleForPath(location.pathname);
  const pathAllowed = !pathModule || allowedModules.includes(pathModule);
  // Shared pages (Users, Masters) keep the sidebar of whichever module the user came from
  const storedModule = getStoredModule();
  const moduleKey = pathModule || (allowedModules.includes(storedModule) ? storedModule : allowedModules[0]) || 'petitions';
  const activeModule = MODULES[moduleKey];
  const ModuleIcon = activeModule.icon;

  useEffect(() => {
    if (pathModule && pathAllowed) storeModule(pathModule);
  }, [pathModule, pathAllowed]);

  if (!accessReady) return <div className="min-h-screen bg-parchment" />;
  if (!pathAllowed) return <Navigate to="/home" replace state={{ deniedModule: pathModule }} />;

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
      {mobileOpen && !isFormPage && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar is completely hidden when on full-screen form pages */}
      {!isFormPage && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-[#000E89] border-r border-[#1B2B99] shadow-[4px_0_24px_rgba(0,14,137,0.35)] flex flex-col transition-all duration-300 ease-in-out w-[250px]
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

          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/20 flex-shrink-0 bg-white/[0.04]">
            <div className="w-[38px] h-[38px] rounded-full p-[1.5px] bg-gradient-to-b from-[#FFF2D6] via-[#C9A15E] to-[#0015A8] flex-shrink-0 shadow-md overflow-hidden flex items-center justify-center bg-white" title="ಕರ್ನಾಟಕ ಲೋಕಾಯುಕ್ತ · Karnataka Lokayukta">
              <img 
                src="/lokayukta-emblem.png" 
                alt="Lokayukta" 
                className="w-[30px] h-[30px] object-contain select-none pointer-events-none" 
              />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[13px] font-serif font-bold text-white leading-tight truncate">ಕರ್ನಾಟಕ ಲೋಕಾಯುಕ್ತ</div>
                <div className="text-[10.5px] text-yellow-300 font-semibold leading-tight truncate mt-0.5">{activeModule.label} · {activeModule.kannada}</div>
              </div>
            )}
            <button type="button" className="ml-auto icon-btn-dark lg:hidden flex-shrink-0 text-white" onClick={() => setMobileOpen(false)} title="Close menu">
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          <Sidebar
            moduleKey={moduleKey}
            collapsed={collapsed}
            onExpandSidebar={expandSidebar}
            onLinkClick={() => setMobileOpen(false)}
          />

          <div className="px-3 py-3.5 border-t border-white/20 flex-shrink-0 bg-white/[0.05]">
            <UserMenu collapsed={collapsed} onLogout={onLogout} />
          </div>
        </aside>
      )}

      {/* Main Container: pl-0 on full-screen form pages, otherwise padded for sidebar */}
      <div className={`transition-all duration-300 ease-in-out ${isFormPage ? 'pl-0' : (collapsed ? 'lg:pl-[76px]' : 'lg:pl-[250px]')}`}>
        <Header moduleKey={moduleKey} onToggleMobile={() => setMobileOpen(true)} isFormPage={isFormPage} />
        <main className={isFormPage ? "p-4 sm:p-6 lg:p-8 w-full max-w-full" : "p-5 lg:p-7"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

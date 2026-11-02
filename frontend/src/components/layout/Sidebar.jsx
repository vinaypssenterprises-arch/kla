import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, UserCog, Gavel,
  Users, Settings, BarChart3, ArrowRightLeft, LayoutGrid
} from 'lucide-react';
import SidebarMenuItem from './SidebarMenuItem';
import SidebarSubMenu from './SidebarSubMenu';
import { exportPetitionsToExcel } from '../../lib/exportExcel';
import { useToast } from '../ui/ToastProvider';
import { MODULES, getAllowedModules } from '../../lib/modules';

// /officers/dashboard and /officers/reports are their own links, not part of the roster group
const isOfficerRosterPath = (pathname) =>
  (pathname === '/officers' || pathname.startsWith('/officers/')) &&
  !pathname.startsWith('/officers/dashboard') &&
  !pathname.startsWith('/officers/reports');

const isCourtCaseRegisterPath = (pathname) =>
  (pathname === '/court-cases' || pathname.startsWith('/court-cases/')) &&
  !pathname.startsWith('/court-cases/dashboard') &&
  !pathname.startsWith('/court-cases/reports');

const MODULE_MENUS = {
  petitions: [
    { type: 'link', key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', end: true },
    {
      type: 'group', key: 'register', label: 'Register', icon: FolderOpen,
      match: (pathname) => pathname.startsWith('/register'),
      children: [
        { label: 'All Petitions', path: '/register', end: true },
        { label: 'Add Petition', path: '/register/new' }
      ]
    },
    { type: 'link', key: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' }
  ],
  officers: [
    { type: 'link', key: 'officers-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/officers/dashboard', end: true },
    {
      type: 'group', key: 'officers-roster', label: 'Officers', icon: UserCog,
      match: isOfficerRosterPath,
      children: [
        { label: 'All Officers', path: '/officers', end: true },
        { label: 'Add Officer', path: '/officers/new' }
      ]
    },
    { type: 'link', key: 'officers-reports', label: 'Reports', icon: BarChart3, path: '/officers/reports' }
  ],
  courtCases: [
    { type: 'link', key: 'court-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/court-cases/dashboard', end: true },
    {
      type: 'group', key: 'court-register', label: 'Court Cases', icon: Gavel,
      match: isCourtCaseRegisterPath,
      children: [
        { label: 'All Court Cases', path: '/court-cases', end: true },
        { label: 'Add Court Case', path: '/court-cases/new' }
      ]
    },
    { type: 'link', key: 'court-reports', label: 'Reports', icon: BarChart3, path: '/court-cases/reports' }
  ]
};

const ADMIN_MENU = [
  { type: 'link', key: 'users', label: 'Users', icon: Users, path: '/users' },
  { type: 'link', key: 'masters', label: 'Masters', icon: Settings, path: '/masters/districts', matchPrefix: '/masters' }
];

export default function Sidebar({ moduleKey = 'petitions', collapsed, onExpandSidebar, onLinkClick }) {
  const location = useLocation();
  const isAdmin = localStorage.getItem('role') === 'admin';
  const moduleMenu = useMemo(() => {
    const base = MODULE_MENUS[moduleKey] || MODULE_MENUS.petitions;
    if (isAdmin) return base;
    return base.map(item => {
      if (item.key === 'officers-roster' && item.children) {
        return {
          ...item,
          children: item.children.filter(c => c.path !== '/officers/new')
        };
      }
      return item;
    });
  }, [moduleKey, isAdmin]);
  const otherModules = getAllowedModules().filter(key => key !== moduleKey && MODULE_MENUS[key]).map(key => MODULES[key]);

  const activeGroup = moduleMenu.find(item => item.type === 'group' && item.match(location.pathname));
  const [expandedKey, setExpandedKey] = useState(activeGroup?.key || null);
  const { showError } = useToast();

  useEffect(() => {
    if (activeGroup) setExpandedKey(activeGroup.key);
  }, [activeGroup?.key]);

  const handleExport = async () => {
    try {
      await exportPetitionsToExcel();
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export petitions to Excel.');
    }
  };

  const handleGroupToggle = (item) => {
    if (collapsed) {
      onExpandSidebar?.();
      setExpandedKey(item.key);
      return;
    }
    setExpandedKey(prev => (prev === item.key ? null : item.key));
  };

  const renderItem = (item) => {
    if (item.type === 'link') {
      return (
        <SidebarMenuItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          path={item.path}
          matchPrefix={item.matchPrefix}
          end={item.end}
          collapsed={collapsed}
          onLinkClick={onLinkClick}
        />
      );
    }
    if (item.type === 'action') {
      return (
        <SidebarMenuItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          collapsed={collapsed}
          onClick={handleExport}
        />
      );
    }
    return (
      <SidebarSubMenu
        key={item.key}
        icon={item.icon}
        label={item.label}
        collapsed={collapsed}
        active={item.match(location.pathname)}
        expanded={!collapsed && expandedKey === item.key}
        onToggle={() => handleGroupToggle(item)}
        onLinkClick={onLinkClick}
      >
        {item.children}
      </SidebarSubMenu>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-1">
      {moduleMenu.map(renderItem)}

      {isAdmin && (
        <>
          {collapsed ? (
            <div className="my-2 mx-2 border-t border-white/15" />
          ) : (
            <div className="mt-4 mb-1 px-3.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#8FA2E6]">
              Administration
            </div>
          )}
          {ADMIN_MENU.map(renderItem)}
        </>
      )}

      {/* Jump straight to the other modules this user can open */}
      {otherModules.length > 0 && (
        <div className={`mt-auto pt-3 ${collapsed ? 'flex flex-col items-center gap-1.5' : ''}`}>
          {!collapsed && (
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#8FA2E6]">Switch Module</span>
              <Link to="/home" onClick={onLinkClick} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#AFC0F2] hover:text-yellow-300 transition-colors">
                <LayoutGrid className="w-3 h-3" /> All
              </Link>
            </div>
          )}
          <div className={collapsed ? 'flex flex-col gap-1.5' : 'rounded-xl border border-dashed border-white/25 p-1 flex flex-col gap-0.5'}>
            {otherModules.map(m => (
              <Link
                key={m.key}
                to={m.home}
                onClick={onLinkClick}
                title={`Switch to ${m.label} module`}
                className={`group flex items-center gap-2.5 rounded-lg hover:bg-white/10 transition-all duration-200 ${collapsed ? 'justify-center p-1.5' : 'px-2 py-1.5'}`}
              >
                <div className="w-7 h-7 rounded-md bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-300 group-hover:border-yellow-300 transition-colors">
                  <m.icon className="w-3.5 h-3.5 text-yellow-300 group-hover:text-[#000E89] transition-colors" />
                </div>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold text-white truncate leading-tight">{m.label}</div>
                      <div className="text-[10.5px] font-semibold text-yellow-300/90 truncate leading-tight">{m.kannada}</div>
                    </div>
                    <ArrowRightLeft className="w-3 h-3 text-[#AFC0F2] group-hover:text-yellow-300 flex-shrink-0 transition-colors" />
                  </>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Shield,
  Users, Settings, BarChart3, Download
} from 'lucide-react';
import SidebarMenuItem from './SidebarMenuItem';
import SidebarSubMenu from './SidebarSubMenu';
import { exportPetitionsToExcel } from '../../lib/exportExcel';
import { useToast } from '../ui/ToastProvider';

const buildMenu = (isAdmin) => [
  { type: 'link', key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', end: true },
  {
    type: 'group', key: 'register', label: 'Register', icon: FolderOpen, prefix: '/register',
    children: [
      { label: 'All Petitions', path: '/register', end: true },
      { label: 'Add Petition', path: '/register/new' }
    ]
  },
  {
    type: 'group', key: 'officers', label: 'Officers', icon: Shield, prefix: '/officers',
    children: [
      { label: 'All Officers', path: '/officers', end: true },
      { label: 'Add Officer', path: '/officers/new' }
    ]
  },
  ...(isAdmin ? [{ type: 'link', key: 'users', label: 'Users', icon: Users, path: '/users' }] : []),
  ...(isAdmin ? [{
    type: 'group', key: 'masters', label: 'Masters', icon: Settings, prefix: '/masters',
    children: [
      { label: 'Districts', path: '/masters/districts' },
      { label: 'Taluks', path: '/masters/taluks' },
      { label: 'Police Stations', path: '/masters/police-stations' },
      { label: 'Departments', path: '/masters/departments' },
      { label: 'PE Status', path: '/masters/pe-status' },
      { label: 'Proposal Status', path: '/masters/proposal-status' }
    ]
  }] : []),
  { type: 'link', key: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { type: 'action', key: 'export', label: 'Export Excel', icon: Download }
];

export default function Sidebar({ collapsed, onExpandSidebar, onLinkClick }) {
  const location = useLocation();
  const isAdmin = localStorage.getItem('role') === 'admin';
  const menu = buildMenu(isAdmin);

  const activeGroup = menu.find(item => item.type === 'group' && location.pathname.startsWith(item.prefix));
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

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-1">
      {menu.map(item => {
        if (item.type === 'link') {
          return (
            <SidebarMenuItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              path={item.path}
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
            active={location.pathname.startsWith(item.prefix)}
            expanded={!collapsed && expandedKey === item.key}
            onToggle={() => handleGroupToggle(item)}
            onLinkClick={onLinkClick}
          >
            {item.children}
          </SidebarSubMenu>
        );
      })}
    </nav>
  );
}

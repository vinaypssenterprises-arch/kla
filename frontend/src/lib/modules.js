import { FileText, Shield, Landmark } from 'lucide-react';
import { apiFetch } from './api';

// The workspaces a user picks from on the post-login hub (/home).
// Each module owns its own dashboard, register and reports; Users & Masters are shared admin pages.
export const MODULES = {
  petitions: {
    key: 'petitions',
    label: 'Petitions',
    kannada: 'ಅರ್ಜಿಗಳು',
    title: '17-A Proposals & Status Register',
    home: '/dashboard',
    icon: FileText,
    color: '#000E89',
    tint: '#EEF1FB',
    border: '#C9D3F2'
  },
  officers: {
    key: 'officers',
    label: 'Officers',
    kannada: 'ಅಧಿಕಾರಿಗಳು',
    title: 'Officers Roster & Deployment Register',
    home: '/officers/dashboard',
    icon: Shield,
    color: '#2E6A4C',
    tint: '#E9F2EC',
    border: '#C4DCCD'
  },
  courtCases: {
    key: 'courtCases',
    label: 'Court Cases',
    kannada: 'ನ್ಯಾಯಾಲಯ ಪ್ರಕರಣಗಳು',
    title: 'High Court Stay & Court Cases Register',
    home: '/court-cases/dashboard',
    icon: Landmark,
    color: '#7E2A34',
    tint: '#F7ECEE',
    border: '#E6C9CE'
  }
};

export const MODULE_ORDER = ['petitions', 'officers', 'courtCases'];

export const ACTIVE_MODULE_STORAGE_KEY = 'activeModule';
export const ALLOWED_MODULES_STORAGE_KEY = 'modules';

// Modules the signed-in user may open. Admins always get every module; the server enforces
// the same rule on every module API, this only decides what the UI shows.
export function getAllowedModules() {
  if (localStorage.getItem('role') === 'admin') return [...MODULE_ORDER];
  try {
    const stored = JSON.parse(localStorage.getItem(ALLOWED_MODULES_STORAGE_KEY) || '[]');
    return MODULE_ORDER.filter(key => Array.isArray(stored) && stored.includes(key));
  } catch {
    return [];
  }
}

export const canAccessModule = (key) => getAllowedModules().includes(key);

// Sessions started before module permissions existed have no stored list yet
export const hasAccessSnapshot = () =>
  localStorage.getItem('role') === 'admin' || localStorage.getItem(ALLOWED_MODULES_STORAGE_KEY) !== null;

export function setAllowedModules(modules) {
  localStorage.setItem(ALLOWED_MODULES_STORAGE_KEY, JSON.stringify(MODULE_ORDER.filter(key => (modules || []).includes(key))));
}

// Pull the current role / module access from the server so an admin's change applies without re-login
export async function refreshAccess() {
  try {
    const res = await apiFetch('/auth/me');
    if (res.ok) {
      const me = await res.json();
      localStorage.setItem('role', me.role);
      if (me.fullName) localStorage.setItem('fullName', me.fullName);
      setAllowedModules(me.modules);
    }
  } catch (err) {
    console.error('Failed to refresh module access', err);
  }
  return getAllowedModules();
}

// Module that owns a route, or null for shared pages (Users, Masters).
export function getModuleForPath(pathname) {
  if (pathname === '/officers' || pathname.startsWith('/officers/')) return 'officers';
  if (pathname === '/court-cases' || pathname.startsWith('/court-cases/')) return 'courtCases';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/register') || pathname.startsWith('/reports')) return 'petitions';
  return null;
}

export function getStoredModule() {
  try {
    const key = localStorage.getItem(ACTIVE_MODULE_STORAGE_KEY);
    return MODULES[key] ? key : null;
  } catch {
    return null;
  }
}

export function storeModule(key) {
  try {
    localStorage.setItem(ACTIVE_MODULE_STORAGE_KEY, key);
  } catch {
    // storage unavailable — module still resolves from the URL
  }
}

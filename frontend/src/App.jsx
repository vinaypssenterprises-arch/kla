import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/ToastProvider';
import Login from './components/Login';
import Layout from './components/layout/Layout';

// Code splitting — lazy-load heavy pages to reduce initial bundle ~40%
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const RegisterList = lazy(() => import('./pages/RegisterList'));
const FormPage = lazy(() => import('./components/FormPage'));
const OfficersList = lazy(() => import('./pages/OfficersList'));
const OfficerForm = lazy(() => import('./pages/OfficerForm'));
const OfficerDetail = lazy(() => import('./pages/OfficerDetail'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Masters = lazy(() => import('./components/Masters'));
const Reports = lazy(() => import('./pages/Reports'));
const ModuleHub = lazy(() => import('./pages/ModuleHub'));
const OfficersDashboard = lazy(() => import('./pages/OfficersDashboard'));
const OfficerReports = lazy(() => import('./pages/OfficerReports'));
const CourtCasesDashboard = lazy(() => import('./pages/CourtCasesDashboard'));
const CourtCasesList = lazy(() => import('./pages/CourtCasesList'));
const CourtCaseForm = lazy(() => import('./pages/CourtCaseForm'));
const CourtCaseDetail = lazy(() => import('./pages/CourtCaseDetail'));
const CourtCaseReports = lazy(() => import('./pages/CourtCaseReports'));

// Skeleton screen for route-level suspense boundary
function PageSkeleton() {
  return (
    <div className="space-y-5 p-1 animate-pulse">
      <div className="h-8 skeleton-line w-64 rounded-lg" />
      <div className="h-4 skeleton-line w-48 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 skeleton-card rounded-xl" />
        ))}
      </div>
      <div className="h-64 skeleton-card rounded-xl" />
    </div>
  );
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const role = localStorage.getItem('role');
  return role === 'admin' ? children : <Navigate to="/home" replace />;
}

function AppRoutes() {
  const navigate = useNavigate();

  const handleLogin = () => navigate('/home');

  const handleLogout = () => {
    ['token', 'email', 'role', 'fullName', 'userId', 'districtId', 'districtName', 'isHeadOffice', 'activeModule', 'modules'].forEach(key => localStorage.removeItem(key));
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />

      {/* Post-login module hub: pick Petitions or Officers */}
      <Route path="/home" element={
        <RequireAuth>
          <Suspense fallback={<div className="min-h-screen bg-[#FFFDF7]" />}><ModuleHub onLogout={handleLogout} /></Suspense>
        </RequireAuth>
      } />

      <Route element={<RequireAuth><Layout onLogout={handleLogout} /></RequireAuth>}>
        <Route path="/dashboard" element={
          <Suspense fallback={<PageSkeleton />}><DashboardHome /></Suspense>
        } />

        <Route path="/register" element={
          <Suspense fallback={<PageSkeleton />}><RegisterList /></Suspense>
        } />
        <Route path="/register/new" element={
          <Suspense fallback={<PageSkeleton />}><FormPage /></Suspense>
        } />
        <Route path="/register/:id/edit" element={
          <Suspense fallback={<PageSkeleton />}><FormPage /></Suspense>
        } />

        <Route path="/officers/dashboard" element={
          <Suspense fallback={<PageSkeleton />}><OfficersDashboard /></Suspense>
        } />
        <Route path="/officers/reports" element={
          <Suspense fallback={<PageSkeleton />}><OfficerReports /></Suspense>
        } />
        <Route path="/officers" element={
          <Suspense fallback={<PageSkeleton />}><OfficersList /></Suspense>
        } />
        <Route path="/officers/new" element={
          <Suspense fallback={<PageSkeleton />}><OfficerForm /></Suspense>
        } />
        <Route path="/officers/:id" element={
          <Suspense fallback={<PageSkeleton />}><OfficerDetail /></Suspense>
        } />
        <Route path="/officers/:id/edit" element={
          <Suspense fallback={<PageSkeleton />}><OfficerForm /></Suspense>
        } />

        <Route path="/court-cases/dashboard" element={
          <Suspense fallback={<PageSkeleton />}><CourtCasesDashboard /></Suspense>
        } />
        <Route path="/court-cases/reports" element={
          <Suspense fallback={<PageSkeleton />}><CourtCaseReports /></Suspense>
        } />
        <Route path="/court-cases" element={
          <Suspense fallback={<PageSkeleton />}><CourtCasesList /></Suspense>
        } />
        <Route path="/court-cases/new" element={
          <Suspense fallback={<PageSkeleton />}><CourtCaseForm /></Suspense>
        } />
        <Route path="/court-cases/:id" element={
          <Suspense fallback={<PageSkeleton />}><CourtCaseDetail /></Suspense>
        } />
        <Route path="/court-cases/:id/edit" element={
          <Suspense fallback={<PageSkeleton />}><CourtCaseForm /></Suspense>
        } />

        <Route path="/users" element={
          <RequireAdmin>
            <Suspense fallback={<PageSkeleton />}><UserManagement /></Suspense>
          </RequireAdmin>
        } />

        <Route path="/masters" element={<Navigate to="/masters/districts" replace />} />
        <Route path="/masters/:category" element={
          <RequireAdmin>
            <Suspense fallback={<PageSkeleton />}><Masters /></Suspense>
          </RequireAdmin>
        } />

        <Route path="/reports" element={
          <Suspense fallback={<PageSkeleton />}><Reports /></Suspense>
        } />

        <Route path="/" element={<Navigate to="/home" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}

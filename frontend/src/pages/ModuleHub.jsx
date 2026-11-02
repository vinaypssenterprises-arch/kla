import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Scale, ArrowRight, LogOut, MapPin, Clock, Sparkles, Shield, FileText,
  LayoutDashboard, FolderOpen, BarChart3, UserCog, Users, Settings, AlertTriangle, Hourglass, ClipboardList, Gavel, Send, Lock, X
} from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { apiFetch } from '../lib/api';
import { MODULES, getStoredModule, storeModule, getAllowedModules, hasAccessSnapshot, refreshAccess } from '../lib/modules';

const accentFor = (key, hover, badgeFrom) => ({
  solid: MODULES[key].color,
  tint: MODULES[key].tint,
  border: MODULES[key].border,
  hover,
  badge: `linear-gradient(140deg, ${badgeFrom} 0%, ${MODULES[key].color} 100%)`
});

const ACCENTS = {
  petitions: accentFor('petitions', '#000A63', '#2A4BD0'),
  officers: accentFor('officers', '#225039', '#3F8A64'),
  courtCases: accentFor('courtCases', '#5E1F27', '#A13A47')
};

const INSIGHT_TONES = {
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  info: 'bg-[#EEF1FB] text-[#000E89] border-[#C9D3F2]',
  good: 'bg-emerald-50 text-emerald-800 border-emerald-200'
};

function getInitials(name, email) {
  const source = (name || '').trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }
  return (email || '?').slice(0, 2).toUpperCase();
}

function getGreeting(date) {
  const h = date.getHours();
  if (h < 12) return { en: 'Good Morning', kn: 'ಶುಭೋದಯ' };
  if (h < 17) return { en: 'Good Afternoon', kn: 'ಶುಭ ಮಧ್ಯಾಹ್ನ' };
  return { en: 'Good Evening', kn: 'ಶುಭ ಸಂಜೆ' };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Eased count-up so the tile numbers "land" instead of popping in
function CountUp({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    if (prefersReducedMotion() || target === 0) {
      setDisplay(target);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return <>{display.toLocaleString('en-IN')}</>;
}

function StatValue({ loading, value, suffix }) {
  if (loading) return <span className="inline-block h-6 w-12 rounded-md skeleton-line align-middle" />;
  if (value === null || value === undefined) return <span className="text-ink-text-faint">—</span>;
  return (
    <>
      <CountUp value={value} />
      {suffix && <span className="text-[13px] text-ink-text-faint font-sans font-semibold ml-0.5">{suffix}</span>}
    </>
  );
}

function ModuleTile({ module, shortcut, accent, tagline, stats, links, insight, loading, lastOpened, delay }) {
  const navigate = useNavigate();
  const Icon = module.icon;
  const open = () => {
    storeModule(module.key);
    navigate(module.home);
  };

  return (
    <div className="hub-rise" style={{ animationDelay: `${delay}ms` }}>
      <article
        onClick={open}
        className="group relative h-full flex flex-col overflow-hidden rounded-2xl bg-white border border-[#E6DFC8] cursor-pointer
          shadow-[0_1px_2px_rgba(36,30,20,0.05),0_8px_24px_rgba(36,30,20,0.06)]
          hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(36,30,20,0.06),0_18px_40px_rgba(36,30,20,0.12)]
          transition-all duration-300 ease-out"
        style={{ '--accent': accent.solid, '--accent-hover': accent.hover }}
      >
        {/* Accent rule */}
        <div className="h-1 w-full transition-all duration-300 group-hover:h-1.5" style={{ background: accent.solid }} />
        {/* Accent wash on hover */}
        <div
          className="absolute inset-x-0 top-0 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `linear-gradient(180deg, ${accent.tint} 0%, transparent 100%)` }}
        />

        <div className="relative flex-1 flex flex-col p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_6px_14px_rgba(0,0,0,0.15)] ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105"
              style={{ background: accent.badge }}
            >
              <Icon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[21px] font-serif font-bold text-ink-text leading-tight tracking-tight truncate">{module.label}</h2>
              <div className="text-[13px] font-semibold leading-snug truncate" style={{ color: accent.solid }}>{module.kannada}</div>
              <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-text-soft leading-snug sm:truncate">{tagline}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <kbd
                title={`Keyboard shortcut: ${shortcut}`}
                className="hidden sm:inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md border border-[#E6DFC8] bg-[#FBF8EF] font-mono text-[11px] font-bold text-ink-text-soft shadow-[inset_0_-1px_0_rgba(36,30,20,0.08)]"
              >
                {shortcut}
              </kbd>
              {lastOpened && (
                <span
                  className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                  style={{ color: accent.solid, borderColor: accent.border, background: accent.tint }}
                >
                  <Clock className="w-2.5 h-2.5" />
                  Last opened
                </span>
              )}
            </div>
          </div>

          {/* Live stats */}
          <div className="mt-5 grid grid-cols-3 rounded-xl border border-[#EFE9D6] bg-[#FDFBF5] divide-x divide-[#EFE9D6]">
            {stats.map(s => (
              <div key={s.label} className="px-3 py-3 min-w-0">
                <div className="font-serif text-[22px] font-bold text-ink-text leading-none tabular-nums">
                  <StatValue loading={loading} value={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-text-soft leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Insight */}
          <div className="mt-3 min-h-[30px]">
            {!loading && insight && (
              <div className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border ${INSIGHT_TONES[insight.tone]}`}>
                <insight.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{insight.text}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-auto pt-5">
            <Link
              to={module.home}
              onClick={(e) => { e.stopPropagation(); storeModule(module.key); }}
              className="hub-cta group/cta relative w-full h-11 inline-flex items-center justify-between gap-3 pl-4 pr-1.5 rounded-xl text-white text-[13.5px] font-semibold tracking-wide overflow-hidden
                shadow-[0_6px_16px_-6px_var(--accent)] focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[#C9A15E]/60 transition-all duration-200"
            >
              <span className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="relative">Open {module.label} <span className="text-white/60 font-medium">· ಪ್ರವೇಶಿಸಿ</span></span>
              <span className="relative w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center transition-transform duration-200 group-hover/cta:translate-x-0.5">
                <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
              </span>
            </Link>

            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={(e) => { e.stopPropagation(); storeModule(module.key); }}
                  className="h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E6DFC8] bg-[#FDFBF5] text-[12px] font-semibold text-ink-text-soft
                    hover:bg-white hover:text-ink-text hover:border-[var(--accent)] hover:shadow-[0_2px_8px_rgba(36,30,20,0.08)]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A15E] transition-all duration-150"
                >
                  <l.icon className="w-3.5 h-3.5" style={{ color: accent.solid }} />
                  <span className="truncate">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

// Headline numbers for one hub tile; fetched only when the user can open that module
function useModuleStats(enabled, url, field) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    apiFetch(url)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then(json => { if (!cancelled) setData(json[field] || {}); })
      .catch(err => console.error(`Hub stats failed: ${url}`, err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, url, field]);

  return [data, loading];
}

export default function ModuleHub({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [lastModule] = useState(getStoredModule);
  const [allowed, setAllowed] = useState(getAllowedModules);
  const [accessReady, setAccessReady] = useState(hasAccessSnapshot);
  const [deniedModule, setDeniedModule] = useState(() => location.state?.deniedModule || null);

  const fullName = localStorage.getItem('fullName');
  const email = localStorage.getItem('email');
  const role = localStorage.getItem('role');
  const districtName = localStorage.getItem('districtName');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const isAdmin = role === 'admin';
  const firstName = (fullName || email || 'Officer').trim().split(/\s+/)[0];
  const greeting = getGreeting(now);

  const jurisdiction = isAdmin
    ? 'State-wide · All Districts'
    : isHeadOffice
      ? 'Head Office · State-wide'
      : districtName ? `${districtName} District` : 'Jurisdiction not assigned';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Module access can change at any time (admin edits), so confirm it with the server on arrival
  useEffect(() => {
    let alive = true;
    refreshAccess().then(list => {
      if (!alive) return;
      setAllowed(list);
      setAccessReady(true);
    });
    return () => { alive = false; };
  }, []);

  const hasPetitions = allowed.includes('petitions');
  const hasOfficers = allowed.includes('officers');
  const hasCourtCases = allowed.includes('courtCases');

  const [petitionData, loadingPetitions] = useModuleStats(hasPetitions, '/dashboard/analytics', 'overview');
  const [officerData, loadingOfficers] = useModuleStats(hasOfficers, '/officers/meta/analytics', 'totals');
  const [courtData, loadingCourt] = useModuleStats(hasCourtCases, '/court-cases/meta/analytics', 'totals');

  // Keyboard shortcuts: 1, 2, 3 open the visible tiles in order
  useEffect(() => {
    const handleKey = (e) => {
      if (confirmingLogout || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const target = MODULES[allowed[Number(e.key) - 1]];
      if (!target) return;
      storeModule(target.key);
      navigate(target.home);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, confirmingLogout, allowed]);

  const p = petitionData || {};
  const o = officerData || {};
  const c = courtData || {};

  const petitionInsight = p.criticalPendingCount > 0
    ? { icon: AlertTriangle, tone: 'danger', text: `${p.criticalPendingCount.toLocaleString('en-IN')} proposal${p.criticalPendingCount === 1 ? '' : 's'} pending with CA for over 60 days` }
    : petitionData
      ? { icon: Sparkles, tone: 'info', text: `${(p.totalRespondents || 0).toLocaleString('en-IN')} accused public servants on record` }
      : null;

  const profilesNeedingDetails = (o.filledPosts ?? o.totalOfficers ?? 0) - (o.completeProfiles || 0);
  const officerInsight = !officerData
    ? null
    : o.longTenureCount > 0
      ? { icon: Hourglass, tone: 'warning', text: `${o.longTenureCount.toLocaleString('en-IN')} officers serving 3+ yrs at current posting` }
      : profilesNeedingDetails > 0
        ? { icon: ClipboardList, tone: 'warning', text: `${profilesNeedingDetails.toLocaleString('en-IN')} officer profiles need details` }
        : { icon: Sparkles, tone: 'good', text: 'All officer profiles are complete' };

  const courtInsight = !courtData
    ? null
    : !c.total
      ? { icon: Sparkles, tone: 'info', text: 'No court cases registered yet' }
      : c.sppNotInformed > 0
        ? { icon: Send, tone: 'warning', text: `${c.sppNotInformed.toLocaleString('en-IN')} stay${c.sppNotInformed === 1 ? '' : 's'} in force — SPP not informed` }
        : c.longPending > 0
          ? { icon: Hourglass, tone: 'danger', text: `${c.longPending.toLocaleString('en-IN')} stay${c.longPending === 1 ? '' : 's'} in force for over 1 year` }
          : { icon: Sparkles, tone: 'good', text: 'SPP informed for every stay in force' };

  const tileConfig = {
    petitions: {
      accent: ACCENTS.petitions,
      tagline: '17-A Proposals · CA · PE',
      loading: loadingPetitions,
      stats: [
        { label: 'Petitions', value: petitionData ? p.totalPetitions : null },
        { label: 'Sent to CA', value: petitionData ? p.proposalsSentToCA : null },
        { label: 'FIRs', value: petitionData ? p.firRegistered : null }
      ],
      insight: petitionInsight,
      links: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
        { label: 'Register', icon: FolderOpen, to: '/register' },
        { label: 'Reports', icon: BarChart3, to: '/reports' }
      ]
    },
    officers: {
      accent: ACCENTS.officers,
      tagline: 'Roster · Tenure · Deployment',
      loading: loadingOfficers,
      stats: [
        { label: 'In Position', value: officerData ? (o.filledPosts ?? o.totalOfficers) : null },
        { label: 'Vacant', value: officerData ? o.vacantPosts : null },
        { label: 'Districts', value: officerData ? o.districtsCovered : null, suffix: officerData && o.totalDistricts > 1 ? `/${o.totalDistricts}` : '' }
      ],
      insight: officerInsight,
      links: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/officers/dashboard' },
        { label: 'Roster', icon: UserCog, to: '/officers' },
        { label: 'Reports', icon: BarChart3, to: '/officers/reports' }
      ]
    },
    courtCases: {
      accent: ACCENTS.courtCases,
      tagline: 'HC Stays · SPP · Supreme Court',
      loading: loadingCourt,
      stats: [
        { label: 'Cases', value: courtData ? c.total : null },
        { label: 'Stay in Force', value: courtData ? c.pending : null },
        { label: 'Vacated', value: courtData ? c.vacated : null }
      ],
      insight: courtInsight,
      links: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/court-cases/dashboard' },
        { label: 'Cases', icon: Gavel, to: '/court-cases' },
        { label: 'Reports', icon: BarChart3, to: '/court-cases/reports' }
      ]
    }
  };
  const gridClass = allowed.length >= 3
    ? 'max-w-[1200px] md:grid-cols-2 xl:grid-cols-3'
    : allowed.length === 2 ? 'max-w-[880px] md:grid-cols-2' : 'max-w-[440px]';

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FFFDF7] text-ink-text">
      {/* Quiet texture: faint seal-blue glow + dot grid that fades out */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] rounded-full bg-[#000E89]/[0.05] blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,14,137,0.10) 1px, transparent 0)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 20%, black 0%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 20%, black 0%, transparent 75%)'
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Brand stripe */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#000E89] via-[#C9A15E] to-[#000E89]" />

        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-12 py-3.5 border-b border-[#ECE5CF] bg-[#FFFDF7]/85 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-b from-[#F3DFAF] via-[#C9A15E] to-[#000E89] shadow-[0_4px_12px_rgba(0,14,137,0.25)] flex-shrink-0">
              <div className="w-full h-full rounded-full flex items-center justify-center bg-white p-1 border border-[#C9A15E]/50 overflow-hidden">
                <img 
                  src="/lokayukta-emblem.png" 
                  alt="Lokayukta" 
                  className="w-full h-full object-contain select-none pointer-events-none" 
                />
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-serif font-bold text-[#000E89] leading-tight truncate">ಕರ್ನಾಟಕ ಲೋಕಾಯುಕ್ತ</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-text-soft font-semibold truncate">
                Karnataka Lokayukta · 17-A Portal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 text-right">
              <Clock className="w-4 h-4 text-brass" />
              <div>
                <div className="text-[12.5px] font-mono font-bold text-ink-text leading-tight">
                  {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div className="text-[10.5px] text-ink-text-soft leading-tight">
                  {now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pl-1 sm:pl-4 sm:border-l border-[#ECE5CF]">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-[#000E89] ring-2 ring-white shadow-sm"
                style={{ background: 'radial-gradient(circle at 35% 30%, #FDE68A, #F59E0B 60%, #B45309)' }}
              >
                {getInitials(fullName, email)}
              </div>
              <div className="hidden sm:block min-w-0 max-w-[180px]">
                <div className="text-[13px] font-bold text-ink-text truncate leading-tight">{fullName || email}</div>
                <div className="text-[10.5px] text-brass capitalize font-semibold leading-tight">{role}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmingLogout(true)}
              title="Log out"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold text-ink-text-soft bg-white border border-[#E6DFC8]
                hover:text-brick hover:border-[#E3B8AF] hover:bg-[#FBEFEB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A15E] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </header>

        {/* Hero + module tiles */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-10 sm:py-12">
          <div className="hub-rise text-center max-w-2xl" style={{ animationDelay: '0ms' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E6DFC8] text-[12px] font-semibold text-ink-text-soft shadow-[0_1px_2px_rgba(36,30,20,0.05)]">
              <Sparkles className="w-3.5 h-3.5 text-brass" />
              <span>{greeting.en}, <span className="text-ink-text">{firstName}</span></span>
              <span className="text-brass">· {greeting.kn}</span>
            </div>

            <h1 className="mt-4 text-[30px] sm:text-[38px] font-serif font-bold leading-[1.1] tracking-tight text-[#000E89]">
              {allowed.length <= 1 ? 'Your workspace' : 'Choose your workspace'}
            </h1>
            <p className="mt-1.5 text-[16px] sm:text-[17px] font-semibold text-brass">
              {allowed.length <= 1 ? 'ನಿಮ್ಮ ಕಾರ್ಯಕ್ಷೇತ್ರ' : 'ನಿಮ್ಮ ಕಾರ್ಯಕ್ಷೇತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ'}
            </p>

            <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#000E89] bg-[#EEF1FB] border border-[#C9D3F2] px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              <span>{jurisdiction}</span>
            </div>
          </div>

          {deniedModule && MODULES[deniedModule] && (
            <div className="hub-rise mt-6 w-full max-w-[640px] flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900" role="alert">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">
                You do not have access to the <strong>{MODULES[deniedModule].label}</strong> module. Please contact the administrator if you need it.
              </span>
              <button type="button" onClick={() => setDeniedModule(null)} className="text-amber-900/70 hover:text-amber-950" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {!accessReady ? (
            <div className="mt-9 w-full max-w-[880px] grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map(i => <div key={i} className="h-[340px] rounded-2xl skeleton-card" />)}
            </div>
          ) : allowed.length === 0 ? (
            <div className="hub-rise mt-9 w-full max-w-[520px] rounded-2xl border border-[#E6DFC8] bg-white px-8 py-10 text-center shadow-[0_8px_24px_rgba(36,30,20,0.06)]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FBF8EF] border border-[#E6DFC8] flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-brass" />
              </div>
              <h2 className="font-serif text-[20px] font-bold text-ink-text">No modules assigned yet</h2>
              <p className="text-[13px] text-ink-text-soft mt-1.5 leading-relaxed">
                Your account does not have access to Petitions, Officers or Court Cases. Please contact the administrator to enable the modules you need.
              </p>
              <p className="text-[12.5px] font-semibold text-brass mt-2">ಮಾಡ್ಯೂಲ್ ಪ್ರವೇಶಕ್ಕಾಗಿ ನಿರ್ವಾಹಕರನ್ನು ಸಂಪರ್ಕಿಸಿ</p>
            </div>
          ) : (
            <div className={`mt-9 w-full grid grid-cols-1 gap-5 lg:gap-6 ${gridClass}`}>
              {allowed.map((key, i) => (
                <ModuleTile
                  key={key}
                  module={MODULES[key]}
                  shortcut={i + 1}
                  delay={100 + i * 80}
                  lastOpened={lastModule === key && allowed.length > 1}
                  {...tileConfig[key]}
                />
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="hub-rise mt-7 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: '260ms' }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-text-faint mr-1">Administration</span>
              {[
                { label: 'User Management', icon: Users, to: '/users' },
                { label: 'Masters', icon: Settings, to: '/masters/districts' }
              ].map(a => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-ink-text-soft bg-white border border-[#E6DFC8]
                    hover:text-[#000E89] hover:border-[#C9D3F2] hover:bg-[#EEF1FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A15E] transition-colors"
                >
                  <a.icon className="w-3.5 h-3.5 text-brass" />
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </main>

        <footer className="px-4 sm:px-8 lg:px-12 py-3.5 border-t border-[#ECE5CF] flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-ink-text-faint">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-brass" />
            <span>ಕರ್ನಾಟಕ ಸರ್ಕಾರ · Government of Karnataka · Karnataka Lokayukta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Sec. 17-A, Prevention of Corruption Act</span>
          </div>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmingLogout}
        tone="neutral"
        title="Log Out?"
        message="Are you sure you want to log out of your account? You'll need to sign in again to continue."
        confirmLabel="Log Out"
        cancelLabel="Stay Signed In"
        onConfirm={() => { setConfirmingLogout(false); onLogout(); }}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  );
}

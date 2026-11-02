import { apiFetch } from './api';

// Must match backend/routes/courtCases.js
export const HC_BENCHES = ['Bengaluru', 'Dharwad', 'Kalburgi'];
export const CASE_STATUSES = ['Vacated', 'Quashed', 'Quash'];
export const PENDING = 'Pending';

export const CASE_TYPES = ['Trap', 'DA', 'Criminal Misconduct'];
export const CASE_STAGES = [
  'Under investigation',
  'FR Submitted',
  'Final Report Submitted',
  'Chargesheeted',
  'Stay',
  'PT'
];
export const HC_PETITION_TYPES = ['WP', 'Crl.Pet', 'Appeal', 'Others'];
export const HC_RESPONDENTS = ['Lokayukta', 'ADGP', 'SP', 'DSP', 'PI'];
export const HC_COURT_ORDERS = ['Vacated', 'Quashed'];
export const CLC_OPINIONS = ['Fit', 'Not Fit'];
export const SC_PETITION_TYPES = ['Slp No', 'Crl. Diary No'];

export const parseCrimeNo = (crimeNo) => {
  const defaultYear = new Date().getFullYear().toString();
  if (!crimeNo) return { districtCode: '', number: '', year: defaultYear };
  const parts = crimeNo.split('/');
  if (parts.length >= 4 && parts[0]?.toUpperCase() === 'KLA') {
    return {
      districtCode: parts[1] || '',
      number: parts[2] ? parts[2].padStart(3, '0') : '',
      year: parts[3] || defaultYear
    };
  }
  const m = crimeNo.match(/KLA\/([A-Z0-9]+)\/(\d{1,3})\/(\d{4})/i);
  if (m) {
    return {
      districtCode: m[1],
      number: m[2].padStart(3, '0'),
      year: m[3]
    };
  }
  return { districtCode: '', number: '', year: defaultYear };
};

export const formatCrimeNo = ({ districtCode, number, year }) => {
  const numPadded = number ? String(number).padStart(3, '0') : '';
  return `KLA/${districtCode || '___'}/${numPadded || '___'}/${year || '____'}`;
};

// Status of the stay in the High Court. Amber / blue / red was validated for colour-blind
// separation (a red-green pair failed), and every use also carries the text label.
export const STATUS_META = {
  Pending: { label: 'Stay in Force', stamp: 'stamp-warning', color: '#C98A10' },
  Vacated: { label: 'Vacated', stamp: 'stamp-info', color: '#1D6FA8' },
  Quash: { label: 'Quashed', stamp: 'stamp-danger', color: '#B3261E' }
};

export const statusOf = (value) => (CASE_STATUSES.includes(value) ? value : PENDING);

// One-hue ramp for stay aging (light → dark = older stay); "not recorded" stays neutral
export const AGING_COLORS = {
  lt6m: '#F2D9A6',
  '6to12m': '#E0AE4C',
  '1to2y': '#B07A12',
  '2plus': '#6E4A08',
  na: '#D9D2B4'
};

export async function fetchCourtCaseAnalytics(districtId = '') {
  const qs = districtId ? `?districtId=${encodeURIComponent(districtId)}` : '';
  const res = await apiFetch(`/court-cases/meta/analytics${qs}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to load court case analytics (${res.status})`);
  }
  return res.json();
}

export const formatCaseDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const daysBetween = (from, to = new Date()) =>
  from ? Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000))) : null;

export const formatDuration = (days) => {
  if (days === null || days === undefined) return '—';
  if (days < 31) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.floor(days / 30)} mo`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return `${years} yr${years === 1 ? '' : 's'}${months ? ` ${months} mo` : ''}`;
};

// Petition numbers are usually typed with their own prefix ("Crl.P 1234/2023"); only add one to bare numbers
export const formatWpNo = (value) => {
  if (!value) return 'WP/Crl.P —';
  return /^[A-Za-z]/.test(value) ? value : `WP/Crl.P ${value}`;
};

export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

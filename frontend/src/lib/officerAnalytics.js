import { apiFetch } from './api';

// Shared by the Officers dashboard, Officer reports and the module hub.
export async function fetchOfficerAnalytics(districtId = '') {
  const qs = districtId ? `?districtId=${encodeURIComponent(districtId)}` : '';
  const res = await apiFetch(`/officers/meta/analytics${qs}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to load officer analytics (${res.status})`);
  }
  return res.json();
}

// Keys match the backend's rank classifier (routes/officers.js → OFFICER_RANKS)
export const OFFICER_RANK_OPTIONS = [
  { value: 'SP', label: 'Superintendent of Police (SP)' },
  { value: 'ADDL_SP', label: 'Additional SP' },
  { value: 'DYSP', label: 'Deputy Superintendent of Police (DySP)' },
  { value: 'PI', label: 'Police Inspector (PI)' },
  { value: 'PSI', label: 'Police Sub-Inspector (PSI)' },
  { value: 'ASI', label: 'Assistant Sub-Inspector (ASI)' },
  { value: 'HC', label: 'Head Constable (HC)' },
  { value: 'PC', label: 'Police Constable (PC)' },
  { value: 'OTHER', label: 'Other Designations' }
];

export const OFFICER_RANKS = [
  { key: 'SP', weight: 1, label: 'Superintendent of Police', short: 'SP', test: d => (/\bsuperintendent of police\b/.test(d) || /\bsp\b/.test(d)) && !/\b(deputy|additional|addl\.?|assistant|asst\.?)\s*(superintendent|sp)/.test(d) },
  { key: 'ADDL_SP', weight: 2, label: 'Additional Superintendent of Police', short: 'Addl. SP', test: d => /\b(additional|addl\.?)\s*(superintendent|sp)\b/.test(d) },
  { key: 'DYSP', weight: 3, label: 'Deputy Superintendent of Police', short: 'DySP', test: d => /\bdeputy superintendent\b|\bdysp\b|\bdy\.?\s*sp\b/.test(d) },
  { key: 'PI', weight: 4, label: 'Police Inspector', short: 'PI', test: d => (/\bpolice inspector\b|\binspector of police\b|\bpi\b/.test(d)) && !/\bsub/.test(d) },
  { key: 'PSI', weight: 5, label: 'Police Sub-Inspector', short: 'PSI', test: d => /\bsub[- ]?inspector\b|\bpsi\b/.test(d) && !/\bassistant\b/.test(d) },
  { key: 'ASI', weight: 6, label: 'Assistant Sub-Inspector', short: 'ASI', test: d => /\bassistant sub[- ]?inspector\b|\basi\b/.test(d) },
  { key: 'HC', weight: 7, label: 'Head Constable', short: 'HC', test: d => /\bhead constable\b|\bhc\b/.test(d) },
  { key: 'PC', weight: 8, label: 'Police Constable', short: 'PC', test: d => /\bconstable\b|\bpc\b/.test(d) }
];
export const OTHER_RANK = { key: 'OTHER', weight: 9, label: 'Other Designations', short: 'Other' };

export const getOfficerRank = (designation) => {
  const d = (designation || '').toLowerCase();
  return OFFICER_RANKS.find(r => r.test(d)) || OTHER_RANK;
};

export const compareDesignationsByRank = (desigA, desigB) => {
  const rankA = getOfficerRank(desigA).weight;
  const rankB = getOfficerRank(desigB).weight;
  if (rankA !== rankB) return rankA - rankB;
  return (desigA || '').localeCompare(desigB || '', undefined, { numeric: true, sensitivity: 'base' });
};

export const compareOfficersByRank = (a, b) => {
  const distA = a.district?.name || '';
  const distB = b.district?.name || '';
  const distDiff = distA.localeCompare(distB, undefined, { sensitivity: 'base' });
  if (distDiff !== 0) return distDiff;

  const rankA = getOfficerRank(a.designation).weight;
  const rankB = getOfficerRank(b.designation).weight;
  if (rankA !== rankB) return rankA - rankB;

  const desigDiff = (a.designation || '').localeCompare(b.designation || '', undefined, { numeric: true, sensitivity: 'base' });
  if (desigDiff !== 0) return desigDiff;

  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
};

export const COMPLETENESS_LABELS = {
  mobile: 'Govt (CUG) Mobile Number',
  reportingDate: 'Reporting Date',
  presentAddress: 'Present Address',
  permanentAddress: 'Permanent Address',
  previousPlaces: 'Working History'
};

// One-hue sequential ramp (light → dark = shorter → longer tenure); "not recorded" stays neutral
export const TENURE_COLORS = {
  lt1: '#BFC8F0',
  '1to2': '#8393DE',
  '2to3': '#4256C4',
  '3plus': '#000E89',
  na: '#D9D2B4'
};

export const formatOfficerDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

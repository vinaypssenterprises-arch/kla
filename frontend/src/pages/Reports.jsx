import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  BarChart3, MapPin, Briefcase, Shield, Download, Search,
  Calendar, Table, Filter, CheckCircle2, Clock, XCircle, FileSpreadsheet,
  RefreshCw, ArrowUpRight, Maximize2, Minimize2, RotateCcw, Check, Sparkles, TrendingUp,
  X, Eye, ExternalLink, Copy, FolderOpen, AlertCircle, ChevronRight, User, Users, Building2,
  FileText, Layers, Hash, FileDown
} from 'lucide-react';
import { exportDistrictProposalsStatisticsExcel, exportDistrictRespondentsStatisticsExcel } from '../lib/exportExcel';
import { exportPetitionToPdf } from '../lib/exportPdf';
import { useToast } from '../components/ui/ToastProvider';

const PALETTE = ['#7E2A34', '#A97B33', '#3C6E4F', '#1F2C48', '#A85A20', '#4B5878', '#6E6248', '#AA3A2E'];

// Standard Karnataka Lokayukta Police Divisions / SP Units Order
// Standard Karnataka Lokayukta Police Divisions / SP Units Order
const PREFERRED_DISTRICT_ORDER = [
  'Bengaluru City 1', 'Bengaluru City 2', 'Bengaluru Rural', 'Bengaluru South',
  'Bagalkote', 'Ballari', 'Belagavi', 'Bidar', 'Chamarajanagar',
  'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Davanagere', 'Dharwad',
  'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Karwar', 'Kodagu', 'Kolar',
  'Koppal', 'Mandya', 'Mangalore', 'Mysuru', 'Raichur', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Vijayanagara', 'Vijayapura', 'Yadgir'
];

function normalizeDistrictName(rawName) {
  if (!rawName) return 'OTHER';
  const clean = rawName.trim().toUpperCase();
  if (clean.includes('SP-1') || clean.includes('SP 1') || clean === 'SP1 BNG CITY' || clean === 'BENGALURU CITY 1' || clean === 'BANGALORE CITY 1') return 'Bengaluru City 1';
  if (clean.includes('SP-2') || clean.includes('SP 2') || clean === 'SP2 BNG CITY' || clean === 'BENGALURU CITY 2' || clean === 'BANGALORE CITY 2') return 'Bengaluru City 2';
  if (clean === 'BENGALURU URBAN' || clean === 'BANGALORE URBAN') return 'Bengaluru City 1';
  if (clean === 'BENGALURU RURAL' || clean === 'BANGALORE RURAL') return 'Bengaluru Rural';
  if (clean === 'BENGALURU SOUTH' || clean === 'BANGALORE SOUTH') return 'Bengaluru South';
  if (clean === 'BAGALKOTE' || clean === 'BAGALKOT') return 'Bagalkote';
  if (clean === 'BELAGAVI' || clean === 'BELGAVI') return 'Belagavi';
  if (clean === 'BALLARI' || clean === 'BELLARY') return 'Ballari';
  if (clean === 'BIDAR') return 'Bidar';
  if (clean === 'CHAMARAJANAGAR' || clean === 'CHAMRAJNAGAR') return 'Chamarajanagar';
  if (clean === 'CHIKKABALLAPURA' || clean === 'CHIKKABALLAPUR') return 'Chikkaballapura';
  if (clean === 'CHIKKAMAGALURU' || clean === 'CHIKKAMAGALUR') return 'Chikkamagaluru';
  if (clean === 'CHITRADURGA') return 'Chitradurga';
  if (clean === 'DAVANAGERE' || clean === 'DAVANGERE') return 'Davanagere';
  if (clean === 'DHARWAD') return 'Dharwad';
  if (clean === 'GADAG') return 'Gadag';
  if (clean === 'HASSAN') return 'Hassan';
  if (clean === 'HAVERI') return 'Haveri';
  if (clean === 'HOSPET' || clean === 'VIJAYANAGARA') return 'Vijayanagara';
  if (clean === 'KALABURAGI' || clean === 'KALBURGI') return 'Kalaburagi';
  if (clean === 'KARWAR' || clean === 'UTTARA KANNADA') return 'Karwar';
  if (clean === 'KODAGU') return 'Kodagu';
  if (clean === 'KOLAR') return 'Kolar';
  if (clean === 'KOPPAL') return 'Koppal';
  if (clean === 'MANDYA') return 'Mandya';
  if (clean === 'MANGALORE' || clean === 'DAKSHINA KANNADA') return 'Mangalore';
  if (clean === 'MYSURU' || clean === 'MYSORE') return 'Mysuru';
  if (clean === 'RAICHUR') return 'Raichur';
  if (clean === 'RAMANAGARA') return 'Ramanagara';
  if (clean === 'SHIVAMOGGA') return 'Shivamogga';
  if (clean === 'TUMAKURU' || clean === 'TUMKUR') return 'Tumakuru';
  if (clean === 'UDUPI') return 'Udupi';
  if (clean === 'VIJAYAPURA' || clean === 'BIJAPUR') return 'Vijayapura';
  if (clean === 'YADGIR') return 'Yadgir';
  if (clean === 'HEAD OFFICE') return 'Head Office';
  return rawName.trim();
}

function getLocalDateString(d) {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPetitionDateStr(p) {
  if (p.proposalSentDate) {
    const s = getLocalDateString(p.proposalSentDate);
    if (s) return s;
  }
  if (p.createdAt) {
    const s = getLocalDateString(p.createdAt);
    if (s) return s;
  }
  return getLocalDateString(new Date());
}

function getPetitionYear(p) {
  if (p.petitionNo && typeof p.petitionNo === 'string') {
    const m = p.petitionNo.match(/\/(\d{4})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (y >= 2000 && y <= 2099) return y;
    }
  }
  if (p.proposalSentDate) {
    const d = new Date(p.proposalSentDate);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  if (p.createdAt) {
    const d = new Date(p.createdAt);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return new Date().getFullYear();
}

export const PE_STATUS_COLUMNS = [
  'Registered FIR',
  'Register FIR',
  'PE Pending',
  'Recommended to DE',
  'Close',
  'High Court Stay'
];

export function normalizePeStatus(status) {
  if (!status) return '';
  const s = String(status).trim().toLowerCase();
  if (s === 'registered fir' || s === 'fir registered') return 'Registered FIR';
  if (s === 'register fir') return 'Register FIR';
  if (s === 'pe pending' || s === 'pending pe' || s === 'pe') return 'PE Pending';
  if (s === 'recommended to de' || s.includes('recommend') || s.includes('de')) return 'Recommended to DE';
  if (s === 'close' || s === 'closed') return 'Close';
  if (s === 'high court stay' || s.includes('stay')) return 'High Court Stay';
  return status.trim();
}

export function hasDateSentToCA(p) {
  if (!p) return false;
  if (p.proposalSentDate != null && String(p.proposalSentDate).trim() !== '') return true;
  if (p.respondents && p.respondents.some(r => r.permissionSentDate != null && String(r.permissionSentDate).trim() !== '')) return true;
  return false;
}

export function isPetitionSentBackToDist(p) {
  if (!p) return false;
  const propStatus = (p.proposalStatus || '').trim().toLowerCase();
  const pStatus = (p.status || '').trim();
  return (
    propStatus.includes('returned') ||
    pStatus === '17A_RETURNED'
  );
}

export function isPetitionSentToCA(p) {
  if (!p) return false;
  // If returned to district, it is not sent to CA
  if (isPetitionSentBackToDist(p)) return false;
  // Only if Date Sent to CA is updated/present:
  return hasDateSentToCA(p);
}

export function isPetitionNotSentToCA(p) {
  if (!p) return false;
  // If returned to district with remarks, do not count under Not Sent to CA
  if (isPetitionSentBackToDist(p)) return false;
  return !isPetitionSentToCA(p);
}

export function isPetitionObtained(p) {
  if (!p || !p.respondents) return false;
  return p.respondents.some(r => 
    (r.permissionStatus || '').trim().toLowerCase() === 'obtain'
  );
}

export function isPetitionRejected(p) {
  if (!p || !p.respondents) return false;
  return p.respondents.some(r => 
    (r.permissionStatus || '').trim().toLowerCase() === 'reject'
  );
}

export function isPetitionPendingWithCA(p) {
  if (!p) return false;
  // Must be sent to CA
  if (!isPetitionSentToCA(p)) return false;
  // Pending until PE Status is updated:
  const peStat = (p.peStatus || '').trim();
  return peStat === '';
}

export function isPetitionPeStatus(p, targetStatus) {
  if (!p) return false;
  if (!isPetitionSentToCA(p)) return false;
  return normalizePeStatus(p.peStatus) === targetStatus;
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center flex-shrink-0 border border-white/10 shadow-md">
        <Icon className="w-5 h-5 text-[#C9A15E]" />
      </div>
      <div>
        <h3 className="text-[16px] font-serif font-semibold text-ink-text">{title}</h3>
        {subtitle && <p className="text-[12.5px] text-ink-text-soft mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const SkeletonChart = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-5 skeleton-line w-40 rounded" />
    <div className="h-[220px] skeleton-card rounded-xl" />
  </div>
);

const EmptyChart = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-14 text-ink-text-faint">
    <BarChart3 className="w-10 h-10 mb-3 opacity-40" strokeWidth={1.5} />
    <p className="text-[13px] italic">{label || 'No data available'}</p>
  </div>
);

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink border border-white/15 rounded-xl px-4 py-3 shadow-deep text-[12.5px]">
      <div className="font-semibold text-[#F5EFE1] mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[#C9A15E]">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink border border-white/15 rounded-xl px-4 py-3 shadow-deep text-[12.5px]">
      <div className="font-semibold text-[#F5EFE1] mb-1">{payload[0].name}</div>
      <div className="text-[#C9A15E]">Count: <strong>{payload[0].value}</strong></div>
      <div className="text-[#8590A8]">{(payload[0].percent * 100).toFixed(1)}%</div>
    </div>
  );
};

export default function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rawPetitions, setRawPetitions] = useState([]);
  const [dbDistricts, setDbDistricts] = useState([]);
  const [chartExtraData, setChartExtraData] = useState(null);

  // Drilldown Modal & Quick View State
  const [drilldownModal, setDrilldownModal] = useState(null);
  const [drilldownSearch, setDrilldownSearch] = useState('');
  const [viewingPetition, setViewingPetition] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const userDistrictName = localStorage.getItem('districtName') || '';
  const isGlobalUser = role === 'admin' || isHeadOffice;

  // Filters state (Defaults to 'ALL' - All Years Cumulative)
  const [focusYear, setFocusYear] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState(!isGlobalUser && userDistrictName ? normalizeDistrictName(userDistrictName) : '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Applied filters (applied only when "Apply Filter" is clicked)
  const [appliedDistrict, setAppliedDistrict] = useState(!isGlobalUser && userDistrictName ? normalizeDistrictName(userDistrictName) : '');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  // Secondary filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [activeTab, setActiveTab] = useState('proposals'); // 'proposals', 'respondents', or 'charts'
  const [isExpanded, setIsExpanded] = useState(false); // compact scroll vs full expand

  const { showSuccess, showError } = useToast();

  // Load raw data once or on manual refresh
  const loadData = async () => {
    setLoading(true);
    try {
      const [petRes, distRes, repRes] = await Promise.all([
        apiFetch('/petitions?all=true'),
        apiFetch('/districts'),
        apiFetch('/dashboard/reports')
      ]);

      const petJson = await petRes.json();
      const distJson = await distRes.json();
      const repJson = await repRes.json().catch(() => ({}));

      const petitions = Array.isArray(petJson) ? petJson : (petJson.data || []);
      setRawPetitions(petitions);
      setDbDistricts(distJson || []);
      setChartExtraData(repJson);
    } catch (err) {
      console.error('Failed to load petitions and districts', err);
      showError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Master Ordered District List
  const allOrderedDistricts = useMemo(() => {
    if (!isGlobalUser && userDistrictName) {
      return [normalizeDistrictName(userDistrictName)];
    }
    const activeDbList = (Array.isArray(dbDistricts) ? dbDistricts : [])
      .filter(d => d.isActive !== false)
      .map(d => typeof d === 'string' ? d : d.name)
      .map(name => normalizeDistrictName(name));

    if (activeDbList.length === 0) {
      return PREFERRED_DISTRICT_ORDER;
    }

    const uniqueList = Array.from(new Set(activeDbList));
    return uniqueList.sort((a, b) => {
      const idxA = PREFERRED_DISTRICT_ORDER.indexOf(a);
      const idxB = PREFERRED_DISTRICT_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [dbDistricts, isGlobalUser, userDistrictName]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Dynamically compute the earliest year found in database petitions (defaults to 2016 if found)
  const minYear = useMemo(() => {
    let min = 2017;
    (rawPetitions || []).forEach(p => {
      const y = getPetitionYear(p);
      if (y && y < min && y >= 2000) min = y;
    });
    return min;
  }, [rawPetitions]);

  // Dynamically compute available years (from current year down to minYear, plus any found in petitions data)
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    for (let y = currentYear; y >= minYear; y--) {
      yearsSet.add(y);
    }
    (rawPetitions || []).forEach(p => {
      const y = getPetitionYear(p);
      if (y && y >= 2000 && y <= currentYear + 1) {
        yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [rawPetitions, currentYear, minYear]);

  // Historical Years list:
  // In ALL mode: shows full breakdown from minYear up to currentYear (e.g. 2016 to 2026)
  // In Single Year mode: shows minYear up to focusYear - 1
  const historicalYears = useMemo(() => {
    const years = [];
    if (focusYear === 'ALL') {
      for (let y = minYear; y <= currentYear; y++) {
        years.push(y);
      }
    } else {
      for (let y = minYear; y < focusYear; y++) {
        years.push(y);
      }
    }
    return years;
  }, [minYear, focusYear, currentYear]);

  // Master Statistics Calculation (100% reactive to filters)
  const statsData = useMemo(() => {
    const isAll = focusYear === 'ALL';
    const districtStatsMap = {};

    const createInitialRow = (dist) => ({
      district: dist,
      historical: {},
      totalReceivedAtHq: 0,
      notSentToCA: 0,
      proposalsSentToCA: 0,
      proposalsSentBackToDist: 0,
      pendingWithCA: 0,
      peBreakdown: {
        'Registered FIR': 0,
        'Register FIR': 0,
        'PE Pending': 0,
        'Recommended to DE': 0,
        'Close': 0,
        'High Court Stay': 0
      }
    });

    allOrderedDistricts.forEach(dist => {
      districtStatsMap[dist] = createInitialRow(dist);
      historicalYears.forEach(y => {
        districtStatsMap[dist].historical[y] = 0;
      });
    });

    (rawPetitions || []).forEach(p => {
      const normDist = normalizeDistrictName(p.district);
      if (!districtStatsMap[normDist]) {
        districtStatsMap[normDist] = createInitialRow(normDist);
        historicalYears.forEach(y => {
          districtStatsMap[normDist].historical[y] = 0;
        });
      }

      const pYear = getPetitionYear(p);
      const pDateStr = getPetitionDateStr(p);
      const row = districtStatsMap[normDist];

      if (isAll) {
        // Record into yearly breakdown
        if (row.historical[pYear] !== undefined) {
          row.historical[pYear]++;
        }

        // Custom date range filtering if applied
        if (appliedFromDate && pDateStr < appliedFromDate) return;
        if (appliedToDate && pDateStr > appliedToDate) return;

        row.totalReceivedAtHq++;

        const isSentToCA = isPetitionSentToCA(p);
        const isNotSentToCA = isPetitionNotSentToCA(p);
        const isSentBackToDist = isPetitionSentBackToDist(p);
        const isPendingWithCA = isPetitionPendingWithCA(p);

        if (isNotSentToCA) row.notSentToCA++;
        if (isSentToCA) {
          row.proposalsSentToCA++;
          if (isPendingWithCA) {
            row.pendingWithCA++;
          } else {
            const peNorm = normalizePeStatus(p.peStatus);
            if (row.peBreakdown[peNorm] !== undefined) {
              row.peBreakdown[peNorm]++;
            }
          }
        }
        if (isSentBackToDist) row.proposalsSentBackToDist++;
      } else {
        if (pYear < focusYear) {
          if (row.historical[pYear] !== undefined) {
            row.historical[pYear]++;
          }
        } else if (pYear === focusYear) {
          // Date range filtering (string-based YYYY-MM-DD comparison is timezone safe)
          if (appliedFromDate && pDateStr < appliedFromDate) return;
          if (appliedToDate && pDateStr > appliedToDate) return;

          row.totalReceivedAtHq++;

          const isSentToCA = isPetitionSentToCA(p);
          const isNotSentToCA = isPetitionNotSentToCA(p);
          const isSentBackToDist = isPetitionSentBackToDist(p);
          const isPendingWithCA = isPetitionPendingWithCA(p);

          if (isNotSentToCA) row.notSentToCA++;
          if (isSentToCA) {
            row.proposalsSentToCA++;
            if (isPendingWithCA) {
              row.pendingWithCA++;
            } else {
              const peNorm = normalizePeStatus(p.peStatus);
              if (row.peBreakdown[peNorm] !== undefined) {
                row.peBreakdown[peNorm]++;
              }
            }
          }
          if (isSentBackToDist) row.proposalsSentBackToDist++;
        }
      }
    });

    let districtStats = allOrderedDistricts.map((dist, idx) => ({
      slNo: idx + 1,
      ...districtStatsMap[dist]
    }));

    // District Filter: if appliedDistrict is set, filter exclusively to that district!
    if (appliedDistrict && appliedDistrict !== 'ALL') {
      const normFilter = normalizeDistrictName(appliedDistrict);
      districtStats = districtStats.filter(d => d.district === normFilter);
    }

    // Totals calculation
    const totals = {
      historical: {},
      totalReceivedAtHq: 0,
      notSentToCA: 0,
      proposalsSentToCA: 0,
      proposalsSentBackToDist: 0,
      pendingWithCA: 0,
      peBreakdown: {
        'Registered FIR': 0,
        'Register FIR': 0,
        'PE Pending': 0,
        'Recommended to DE': 0,
        'Close': 0,
        'High Court Stay': 0
      }
    };
    historicalYears.forEach(y => {
      totals.historical[y] = 0;
    });

    districtStats.forEach(row => {
      historicalYears.forEach(y => {
        totals.historical[y] += (row.historical[y] || 0);
      });
      totals.totalReceivedAtHq += row.totalReceivedAtHq;
      totals.notSentToCA += row.notSentToCA;
      totals.proposalsSentToCA += row.proposalsSentToCA;
      totals.proposalsSentBackToDist += row.proposalsSentBackToDist;
      totals.pendingWithCA += row.pendingWithCA;
      PE_STATUS_COLUMNS.forEach(peKey => {
        totals.peBreakdown[peKey] += (row.peBreakdown[peKey] || 0);
      });
    });

    return {
      districtStats,
      totals
    };
  }, [rawPetitions, allOrderedDistricts, historicalYears, focusYear, appliedFromDate, appliedToDate, appliedDistrict]);

  // Master Respondent-Wise Statistics Calculation (100% reactive to filters)
  const respondentStatsData = useMemo(() => {
    const isAll = focusYear === 'ALL';
    const districtStatsMap = {};

    const createInitialRow = (dist) => ({
      district: dist,
      historical: {},
      totalRespondents: 0,
      notSentToCA: 0,
      sentToCA: 0,
      backToDist: 0,
      pendingWithCA: 0,
      obtained: 0,
      rejected: 0,
      peBreakdown: {
        'Registered FIR': 0,
        'Register FIR': 0,
        'PE Pending': 0,
        'Recommended to DE': 0,
        'Close': 0,
        'High Court Stay': 0
      }
    });

    allOrderedDistricts.forEach(dist => {
      districtStatsMap[dist] = createInitialRow(dist);
      historicalYears.forEach(y => {
        districtStatsMap[dist].historical[y] = 0;
      });
    });

    (rawPetitions || []).forEach(p => {
      const normDist = normalizeDistrictName(p.district);
      if (!districtStatsMap[normDist]) {
        districtStatsMap[normDist] = createInitialRow(normDist);
        historicalYears.forEach(y => {
          districtStatsMap[normDist].historical[y] = 0;
        });
      }

      const pYear = getPetitionYear(p);
      const pDateStr = getPetitionDateStr(p);
      const row = districtStatsMap[normDist];

      const propStatus = (p.proposalStatus || '').trim().toLowerCase();
      const pStatus = (p.status || '').trim();
      const isReturned = propStatus.includes('returned') || pStatus === '17A_RETURNED';
      const peNorm = normalizePeStatus(p.peStatus);

      (p.respondents || []).forEach(r => {
        const rSentDate = r.permissionSentDate || p.proposalSentDate;
        const rDateStr = rSentDate ? getLocalDateString(rSentDate) : pDateStr;
        const rHasDate = Boolean(rSentDate && String(rSentDate).trim() !== '');
        const rStatus = (r.permissionStatus || 'Pending').trim().toLowerCase();

        if (isAll) {
          if (row.historical[pYear] !== undefined) {
            row.historical[pYear]++;
          }

          if (appliedFromDate && rDateStr < appliedFromDate) return;
          if (appliedToDate && rDateStr > appliedToDate) return;

          row.totalRespondents++;

          if (isReturned) {
            row.backToDist++;
          } else if (!rHasDate) {
            row.notSentToCA++;
          } else {
            row.sentToCA++;
            if (rStatus === 'obtain') {
              row.obtained++;
            } else if (rStatus === 'reject') {
              row.rejected++;
            } else {
              row.pendingWithCA++;
            }

            if (row.peBreakdown[peNorm] !== undefined) {
              row.peBreakdown[peNorm]++;
            }
          }
        } else {
          if (pYear < focusYear) {
            if (row.historical[pYear] !== undefined) {
              row.historical[pYear]++;
            }
          } else if (pYear === focusYear) {
            if (appliedFromDate && rDateStr < appliedFromDate) return;
            if (appliedToDate && rDateStr > appliedToDate) return;

            row.totalRespondents++;

            if (isReturned) {
              row.backToDist++;
            } else if (!rHasDate) {
              row.notSentToCA++;
            } else {
              row.sentToCA++;
              if (rStatus === 'obtain') {
                row.obtained++;
              } else if (rStatus === 'reject') {
                row.rejected++;
              } else {
                row.pendingWithCA++;
              }

              if (row.peBreakdown[peNorm] !== undefined) {
                row.peBreakdown[peNorm]++;
              }
            }
          }
        }
      });
    });

    let districtStats = allOrderedDistricts.map((dist, idx) => ({
      slNo: idx + 1,
      ...districtStatsMap[dist]
    }));

    if (appliedDistrict && appliedDistrict !== 'ALL') {
      const normFilter = normalizeDistrictName(appliedDistrict);
      districtStats = districtStats.filter(d => d.district === normFilter);
    }

    const totals = {
      historical: {},
      totalRespondents: 0,
      notSentToCA: 0,
      sentToCA: 0,
      backToDist: 0,
      pendingWithCA: 0,
      obtained: 0,
      rejected: 0,
      peBreakdown: {
        'Registered FIR': 0,
        'Register FIR': 0,
        'PE Pending': 0,
        'Recommended to DE': 0,
        'Close': 0,
        'High Court Stay': 0
      }
    };
    historicalYears.forEach(y => {
      totals.historical[y] = 0;
    });

    districtStats.forEach(row => {
      historicalYears.forEach(y => {
        totals.historical[y] += (row.historical[y] || 0);
      });
      totals.totalRespondents += row.totalRespondents;
      totals.notSentToCA += row.notSentToCA;
      totals.sentToCA += row.sentToCA;
      totals.backToDist += row.backToDist;
      totals.pendingWithCA += row.pendingWithCA;
      totals.obtained += row.obtained;
      totals.rejected += row.rejected;
      PE_STATUS_COLUMNS.forEach(peKey => {
        totals.peBreakdown[peKey] += (row.peBreakdown[peKey] || 0);
      });
    });

    return {
      districtStats,
      totals
    };
  }, [rawPetitions, allOrderedDistricts, historicalYears, focusYear, appliedFromDate, appliedToDate, appliedDistrict]);

  // Interactive Drilldown Case Viewer: opens when any count in the table is clicked!
  const handleOpenDrilldown = (district, columnType, year = null, customTitle = null) => {
    const isAllDistricts = district === 'ALL';
    const normDist = isAllDistricts ? 'ALL' : normalizeDistrictName(district);
    const isAllYears = focusYear === 'ALL';

    const matchingCases = (rawPetitions || []).filter(p => {
      // 1. District match
      if (!isAllDistricts && normalizeDistrictName(p.district) !== normDist) {
        return false;
      }

      const pYear = getPetitionYear(p);
      const pDateStr = getPetitionDateStr(p);

      // 2. Year column match
      if (columnType === 'year') {
        return pYear === year;
      }

      // 3. For focus year / date range columns:
      if (isAllYears) {
        if (appliedFromDate && pDateStr < appliedFromDate) return false;
        if (appliedToDate && pDateStr > appliedToDate) return false;
      } else {
        if (pYear !== focusYear) return false;
        if (appliedFromDate && pDateStr < appliedFromDate) return false;
        if (appliedToDate && pDateStr > appliedToDate) return false;
      }

      if (columnType === 'totalReceived') {
        return true;
      }
      if (columnType === 'notSentToCA') {
        return isPetitionNotSentToCA(p);
      }
      if (columnType === 'sentToCA') {
        return isPetitionSentToCA(p);
      }
      if (columnType === 'sentBack') {
        return isPetitionSentBackToDist(p);
      }
      if (columnType === 'obtained') {
        return isPetitionObtained(p);
      }
      if (columnType === 'rejected') {
        return isPetitionRejected(p);
      }
      if (columnType === 'pendingWithCA') {
        return isPetitionPendingWithCA(p);
      }
      if (columnType.startsWith('peStatus:')) {
        const targetPe = columnType.split(':')[1];
        return isPetitionSentToCA(p) && normalizePeStatus(p.peStatus) === targetPe;
      }

      return true;
    });

    let title = customTitle;
    let subtitle = '';
    const distLabel = isAllDistricts ? 'All Police Units (State Total)' : normDist;

    if (!title) {
      if (columnType === 'year') {
        title = `${distLabel} — Year ${year} Proposals`;
        subtitle = `Section 17-A proposals registered in calendar year ${year}`;
      } else if (columnType === 'totalReceived') {
        title = `${distLabel} — Total Received at HQ`;
        subtitle = isAllYears ? `All Section 17-A proposals registered (${minYear} – ${currentYear})` : `Proposals received during ${focusYear}`;
      } else if (columnType === 'notSentToCA') {
        title = `${distLabel} — Not Sent to Competent Authority`;
        subtitle = 'Petitions received at HQ where Date Sent to CA is not yet entered / dispatched';
      } else if (columnType === 'sentToCA') {
        title = `${distLabel} — Proposals Sent to Competent Authority`;
        subtitle = 'Proposals approved at HQ and dispatched to the Competent Authority for 17-A sanction';
      } else if (columnType === 'sentBack') {
        title = `${distLabel} — Sent Back to District`;
        subtitle = 'Proposals returned back to the SP / investigating unit with queries or remarks';
      } else if (columnType === 'obtained') {
        title = `${distLabel} — Sanctions Obtained`;
        subtitle = 'Cases where Competent Authority has granted Section 17-A investigation sanction';
      } else if (columnType === 'rejected') {
        title = `${distLabel} — Sanctions Rejected`;
        subtitle = 'Cases where Section 17-A sanction was refused or rejected by Competent Authority';
      } else if (columnType === 'pendingWithCA') {
        title = `${distLabel} — Pending with Competent Authority`;
        subtitle = 'Proposals dispatched to Competent Authority currently awaiting sanction decision';
      } else if (columnType.startsWith('peStatus:')) {
        const targetPe = columnType.split(':')[1];
        title = `${distLabel} — Preliminary Enquiry: ${targetPe}`;
        subtitle = `Cases where Preliminary Enquiry outcome is marked as "${targetPe}"`;
      }
    }

    setDrilldownSearch('');
    setDrilldownModal({
      isOpen: true,
      isRespondentDrilldown: false,
      district: normDist,
      columnType,
      year,
      title,
      subtitle,
      cases: matchingCases
    });
  };

  // Interactive Drilldown for Respondents: opens when any respondent count in the table is clicked!
  const handleOpenRespondentDrilldown = (district, columnType, year = null, customTitle = null) => {
    const isAllDistricts = district === 'ALL';
    const normDist = isAllDistricts ? 'ALL' : normalizeDistrictName(district);
    const isAllYears = focusYear === 'ALL';

    const matchingRespondents = [];

    (rawPetitions || []).forEach(p => {
      if (!isAllDistricts && normalizeDistrictName(p.district) !== normDist) {
        return;
      }

      const pYear = getPetitionYear(p);
      const pDateStr = getPetitionDateStr(p);
      const propStatus = (p.proposalStatus || '').trim().toLowerCase();
      const pStatus = (p.status || '').trim();
      const isReturned = propStatus.includes('returned') || pStatus === '17A_RETURNED';
      const peNorm = normalizePeStatus(p.peStatus);

      (p.respondents || []).forEach(r => {
        const rSentDate = r.permissionSentDate || p.proposalSentDate;
        const rDateStr = rSentDate ? getLocalDateString(rSentDate) : pDateStr;
        const rHasDate = Boolean(rSentDate && String(rSentDate).trim() !== '');
        const rStatus = (r.permissionStatus || 'Pending').trim().toLowerCase();

        if (columnType === 'year') {
          if (pYear === year) {
            matchingRespondents.push({ ...r, petition: p });
          }
          return;
        }

        if (isAllYears) {
          if (appliedFromDate && rDateStr < appliedFromDate) return;
          if (appliedToDate && rDateStr > appliedToDate) return;
        } else {
          if (pYear !== focusYear) return;
          if (appliedFromDate && rDateStr < appliedFromDate) return;
          if (appliedToDate && rDateStr > appliedToDate) return;
        }

        if (columnType === 'totalRespondents') {
          matchingRespondents.push({ ...r, petition: p });
        } else if (columnType === 'notSentToCA') {
          if (!isReturned && !rHasDate) matchingRespondents.push({ ...r, petition: p });
        } else if (columnType === 'sentToCA') {
          if (!isReturned && rHasDate) matchingRespondents.push({ ...r, petition: p });
        } else if (columnType === 'backToDist') {
          if (isReturned) matchingRespondents.push({ ...r, petition: p });
        } else if (columnType === 'pendingWithCA') {
          if (!isReturned && rHasDate && rStatus !== 'obtain' && rStatus !== 'reject') {
            matchingRespondents.push({ ...r, petition: p });
          }
        } else if (columnType === 'obtained') {
          if (!isReturned && rHasDate && rStatus === 'obtain') {
            matchingRespondents.push({ ...r, petition: p });
          }
        } else if (columnType === 'rejected') {
          if (!isReturned && rHasDate && rStatus === 'reject') {
            matchingRespondents.push({ ...r, petition: p });
          }
        } else if (columnType.startsWith('peStatus:')) {
          const targetPe = columnType.split(':')[1];
          if (!isReturned && rHasDate && peNorm === targetPe) {
            matchingRespondents.push({ ...r, petition: p });
          }
        }
      });
    });

    let title = customTitle;
    let subtitle = '';
    const distLabel = isAllDistricts ? 'All Police Units (State Total)' : normDist;

    if (!title) {
      if (columnType === 'year') {
        title = `${distLabel} — Year ${year} Respondents`;
        subtitle = `Respondents involved in proposals registered in calendar year ${year}`;
      } else if (columnType === 'totalRespondents') {
        title = `${distLabel} — Total Respondents Registered`;
        subtitle = isAllYears ? `All registered respondents across units (${minYear} – ${currentYear})` : `Respondents recorded during ${focusYear}`;
      } else if (columnType === 'notSentToCA') {
        title = `${distLabel} — Respondents Awaiting Dispatch to CA`;
        subtitle = 'Respondents whose 17-A proposal is at HQ and has not yet been dispatched to Competent Authority';
      } else if (columnType === 'sentToCA') {
        title = `${distLabel} — Respondents Dispatched to Competent Authority`;
        subtitle = 'Respondents whose 17-A proposal was approved at HQ and submitted to CA';
      } else if (columnType === 'backToDist') {
        title = `${distLabel} — Respondents Returned Back to District`;
        subtitle = 'Respondents whose proposal was returned back to SP unit with queries or remarks';
      } else if (columnType === 'pendingWithCA') {
        title = `${distLabel} — Sanctions Pending with Competent Authority`;
        subtitle = 'Respondents awaiting Section 17-A sanction decision from the Competent Authority';
      } else if (columnType === 'obtained') {
        title = `${distLabel} — Section 17-A Sanctions Obtained`;
        subtitle = 'Respondents for whom Section 17-A investigation sanction was granted by Competent Authority';
      } else if (columnType === 'rejected') {
        title = `${distLabel} — Section 17-A Sanctions Rejected`;
        subtitle = 'Respondents for whom Section 17-A sanction was refused or rejected by Competent Authority';
      } else if (columnType.startsWith('peStatus:')) {
        const targetPe = columnType.split(':')[1];
        title = `${distLabel} — Respondents: ${targetPe}`;
        subtitle = `Respondents in proposals where Preliminary Enquiry outcome is "${targetPe}"`;
      }
    }

    setDrilldownSearch('');
    setDrilldownModal({
      isOpen: true,
      isRespondentDrilldown: true,
      district: normDist,
      columnType,
      year,
      title,
      subtitle,
      cases: matchingRespondents
    });
  };

  // Apply Filter Button Click
  const handleApplyFilter = () => {
    setAppliedDistrict(selectedDistrict);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    showSuccess('Filter applied successfully.');
  };

  // Reset Filters
  const handleResetFilter = () => {
    const defaultDist = !isGlobalUser && userDistrictName ? normalizeDistrictName(userDistrictName) : '';
    setSelectedDistrict(defaultDist);
    setFromDate('');
    setToDate('');
    setAppliedDistrict(defaultDist);
    setAppliedFromDate('');
    setAppliedToDate('');
    setSearchTerm('');
    setFocusYear('ALL');
    showSuccess('Filters reset to default.');
  };

  const hasActiveFilters = !!(appliedDistrict || appliedFromDate || appliedToDate || focusYear !== 'ALL');

  // Filter rows for search term & active filter
  const displayedRows = useMemo(() => {
    return (statsData.districtStats || []).filter(r => {
      const matchesSearch = !searchTerm.trim() || r.district.toLowerCase().includes(searchTerm.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (showOnlyActive) {
        const histTotal = Object.values(r.historical || {}).reduce((a, b) => a + b, 0);
        const focusTotal = (r.totalReceivedAtHq || 0) + (r.proposalsSentToCA || 0) + (r.notSentToCA || 0);
        return histTotal > 0 || focusTotal > 0;
      }
      return true;
    });
  }, [statsData.districtStats, searchTerm, showOnlyActive]);

  // Filter respondent rows for search term & active filter
  const displayedRespondentRows = useMemo(() => {
    return (respondentStatsData.districtStats || []).filter(r => {
      const matchesSearch = !searchTerm.trim() || r.district.toLowerCase().includes(searchTerm.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (showOnlyActive) {
        const histTotal = Object.values(r.historical || {}).reduce((a, b) => a + b, 0);
        const focusTotal = (r.totalRespondents || 0) + (r.sentToCA || 0) + (r.notSentToCA || 0);
        return histTotal > 0 || focusTotal > 0;
      }
      return true;
    });
  }, [respondentStatsData.districtStats, searchTerm, showOnlyActive]);

  // Export to Excel handler
  const handleExportStatisticsExcel = async () => {
    if (activeTab === 'respondents') {
      if (!displayedRespondentRows || displayedRespondentRows.length === 0) return;
      try {
        const isAll = focusYear === 'ALL';
        const dateRangeLabel = appliedFromDate && appliedToDate
          ? `${appliedFromDate} to ${appliedToDate}`
          : (isAll ? 'All Years (Cumulative)' : `${focusYear}`);

        await exportDistrictRespondentsStatisticsExcel({
          districtStats: displayedRespondentRows,
          totals: respondentStatsData.totals,
          historicalYears,
          focusYear: dateRangeLabel,
          isAllYears: isAll
        });
        showSuccess('17-A Respondent Statistics report exported successfully.');
      } catch (err) {
        console.error(err);
        showError('Export failed. Please try again.');
      }
      return;
    }

    if (!displayedRows || displayedRows.length === 0) return;
    try {
      const isAll = focusYear === 'ALL';
      const dateRangeLabel = appliedFromDate && appliedToDate
        ? `${appliedFromDate} to ${appliedToDate}`
        : (isAll ? 'All Years (Cumulative)' : `${focusYear}`);

      await exportDistrictProposalsStatisticsExcel({
        districtStats: displayedRows,
        totals: statsData.totals,
        historicalYears,
        focusYear: dateRangeLabel,
        isAllYears: isAll
      });
      showSuccess('17-A Statistics report exported successfully.');
    } catch (err) {
      console.error(err);
      showError('Export failed. Please try again.');
    }
  };

  // Visual Chart Data
  const districtData = useMemo(() => {
    const isAll = focusYear === 'ALL';
    return (statsData.districtStats || []).filter(r => {
      const tot = isAll
        ? (r.totalReceivedAtHq || 0)
        : ((r.totalReceivedAtHq || 0) + Object.values(r.historical || {}).reduce((a, b) => a + b, 0));
      return tot > 0;
    }).map(r => ({
      district: r.district,
      count: isAll
        ? (r.totalReceivedAtHq || 0)
        : ((r.totalReceivedAtHq || 0) + Object.values(r.historical || {}).reduce((a, b) => a + b, 0))
    })).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [statsData.districtStats, focusYear]);

  // Year-over-Year Proposals Trend for Charts tab
  const yearlyTrendData = useMemo(() => {
    const counts = {};
    for (let y = minYear; y <= currentYear; y++) {
      counts[y] = 0;
    }
    (rawPetitions || []).forEach(p => {
      const y = getPetitionYear(p);
      if (y && y >= minYear && y <= currentYear) {
        counts[y] = (counts[y] || 0) + 1;
      }
    });
    return Object.keys(counts).map(y => ({
      year: y,
      proposals: counts[y]
    }));
  }, [rawPetitions, currentYear, minYear]);

  const peStatusData = chartExtraData?.petitionsByPeStatus || [];
  const officerDistData = (chartExtraData?.officersByDistrict || []).filter(r => r.count > 0).slice(0, 12);

  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }} className="pb-16">
      {/* Top Header & View Mode Switcher in Single Unified Bar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-[20px] font-serif font-bold text-ink-text tracking-tight">
            17-A Proposals
          </h2>

          {/* Sleek inline view tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-stone-200/70 border border-rule/70">
            <button
              type="button"
              onClick={() => setActiveTab('proposals')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-[12px] transition-all ${
                activeTab === 'proposals'
                  ? 'bg-[#000E89] text-white shadow-xs'
                  : 'text-ink-text hover:text-black hover:bg-white/60'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Matrix</span>
              <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'proposals' ? 'bg-white/20 text-white' : 'bg-stone-300/80 text-ink-text'
              }`}>
                {displayedRows.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('respondents')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-[12px] transition-all ${
                activeTab === 'respondents'
                  ? 'bg-[#000E89] text-white shadow-xs'
                  : 'text-ink-text hover:text-black hover:bg-white/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Respondent Wise Matrix</span>
              <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'respondents' ? 'bg-white/20 text-white' : 'bg-stone-300/80 text-ink-text'
              }`}>
                {respondentStatsData.totals.totalRespondents || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-[12px] transition-all ${
                activeTab === 'charts'
                  ? 'bg-[#000E89] text-white shadow-xs'
                  : 'text-ink-text hover:text-black hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>
        </div>

        {/* Action Buttons: Excel Export & Refresh */}
        <div className="flex items-center gap-2 flex-wrap no-print">
          <button
            type="button"
            className="btn btn-excel flex items-center gap-1.5 shadow-2xs font-semibold text-[12px] py-1 px-3"
            onClick={handleExportStatisticsExcel}
            title={activeTab === 'respondents' ? "Download Respondent Wise Statistics Excel table" : "Download Proposal Statistics Excel table"}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg border border-rule/70 bg-white text-ink-text-soft hover:text-ink-text hover:bg-stone-50 transition shadow-2xs"
            onClick={loadData}
            title="Refresh statistics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#A97B33]' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards for Selected Filter / Range */}
      {activeTab === 'respondents' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs">
            <div className="text-[11px] font-semibold text-ink-text-soft uppercase tracking-wider flex items-center justify-between">
              <span>Total Respondents</span>
              <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border ${
                focusYear === 'ALL'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {appliedFromDate && appliedToDate ? 'Range' : focusYear === 'ALL' ? 'All Years' : focusYear}
              </span>
            </div>
            <div className="text-[20px] font-serif font-bold text-ink-text mt-0.5">
              {respondentStatsData.totals.totalRespondents || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rose-200 rounded-lg px-3 py-2 shadow-2xs bg-rose-50/20">
            <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
              Not Sent to CA
            </div>
            <div className="text-[20px] font-serif font-bold text-rose-900 mt-0.5">
              {respondentStatsData.totals.notSentToCA || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs">
            <div className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">
              Sent to CA
            </div>
            <div className="text-[20px] font-serif font-bold text-indigo-900 mt-0.5">
              {respondentStatsData.totals.sentToCA || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Back to Dist
            </div>
            <div className="text-[20px] font-serif font-bold text-amber-900 mt-0.5">
              {respondentStatsData.totals.backToDist || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs bg-gradient-to-br from-amber-50/60 to-[#FFFDF7]">
            <div className="text-[11px] font-semibold text-[#8B5A10] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#A97B33]" />
              <span>Pending CA</span>
            </div>
            <div className="text-[20px] font-serif font-bold text-[#7E2A34] mt-0.5">
              {respondentStatsData.totals.pendingWithCA || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-emerald-200 rounded-lg px-3 py-2 shadow-2xs bg-emerald-50/20">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                <span>Obtained</span>
              </div>
              <span className="text-[10px] text-rose-800 font-mono font-bold bg-rose-100/80 px-1 rounded">
                Rej: {respondentStatsData.totals.rejected || 0}
              </span>
            </div>
            <div className="text-[20px] font-serif font-bold text-emerald-950 mt-0.5">
              {respondentStatsData.totals.obtained || 0}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs">
            <div className="text-[11px] font-semibold text-ink-text-soft uppercase tracking-wider flex items-center justify-between">
              <span>Received HQ</span>
              <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border ${
                focusYear === 'ALL'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {appliedFromDate && appliedToDate ? 'Range' : focusYear === 'ALL' ? 'All Years' : focusYear}
              </span>
            </div>
            <div className="text-[20px] font-serif font-bold text-ink-text mt-0.5">
              {statsData.totals.totalReceivedAtHq || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rose-200 rounded-lg px-3 py-2 shadow-2xs bg-rose-50/20">
            <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
              Not Sent to CA
            </div>
            <div className="text-[20px] font-serif font-bold text-rose-900 mt-0.5">
              {statsData.totals.notSentToCA || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs">
            <div className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">
              Sent to CA
            </div>
            <div className="text-[20px] font-serif font-bold text-indigo-900 mt-0.5">
              {statsData.totals.proposalsSentToCA || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Back to Dist
            </div>
            <div className="text-[20px] font-serif font-bold text-amber-900 mt-0.5">
              {statsData.totals.proposalsSentBackToDist || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3 py-2 shadow-2xs bg-gradient-to-br from-amber-50/60 to-[#FFFDF7]">
            <div className="text-[11px] font-semibold text-[#8B5A10] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#A97B33]" />
              <span>Pending CA</span>
            </div>
            <div className="text-[20px] font-serif font-bold text-[#7E2A34] mt-0.5">
              {statsData.totals.pendingWithCA || 0}
            </div>
          </div>

          <div className="bg-[#FFFDF7] border border-emerald-200 rounded-lg px-3 py-2 shadow-2xs bg-emerald-50/20">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              <span>PE Action Taken</span>
            </div>
            <div className="text-[20px] font-serif font-bold text-emerald-950 mt-0.5">
              {Object.values(statsData.totals.peBreakdown || {}).reduce((a, b) => a + b, 0)}
            </div>
          </div>
        </div>
      )}

      {/* FILTER & PERIOD CONTROLS CARD */}
      <div className="bg-[#FFFDF7] border border-rule rounded-lg p-2.5 mb-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Main Controls: District, From Date, To Date, Apply, Reset */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* District Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11.5px] font-bold text-ink-text flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#A97B33]" />
                Unit:
              </label>
              {!isGlobalUser && userDistrictName ? (
                <span className="font-mono text-xs font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-brass" />
                  {normalizeDistrictName(userDistrictName)}
                </span>
              ) : (
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-white border border-rule rounded-md px-2.5 py-1 text-[12px] font-semibold text-ink-text focus:outline-none focus:ring-1 focus:ring-[#000E89] min-w-[170px]"
                >
                  <option value="">All Units ({allOrderedDistricts.length})</option>
                  {allOrderedDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="h-4 w-[1px] bg-rule/60 hidden md:block" />

            {/* From Date */}
            <div className="flex items-center gap-1">
              <label className="text-[11.5px] font-bold text-ink-text">
                From:
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white border border-rule rounded-md px-2 py-1 text-[11.5px] font-medium text-ink-text focus:outline-none focus:ring-1 focus:ring-[#000E89]"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1">
              <label className="text-[11.5px] font-bold text-ink-text">
                To:
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white border border-rule rounded-md px-2 py-1 text-[11.5px] font-medium text-ink-text focus:outline-none focus:ring-1 focus:ring-[#000E89]"
              />
            </div>

            {/* Apply Filter Button */}
            <button
              type="button"
              onClick={handleApplyFilter}
              className="px-3 py-1 bg-[#000E89] hover:bg-[#0015A8] text-white rounded-md text-[12px] font-bold flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Filter className="w-3 h-3 text-yellow-300" />
              Apply
            </button>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-2.5 py-1 border border-rule bg-white hover:bg-stone-100 text-ink-text-soft hover:text-ink-text rounded-md text-[11.5px] font-semibold flex items-center gap-1 transition shadow-2xs"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Right: Year Filter Selector with All Years & Quick Toggle */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11.5px] font-bold text-ink-text flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#A97B33]" />
              Year:
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={focusYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setFocusYear(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                }}
                className={`border rounded-md px-2 py-1 text-[12px] font-bold focus:outline-none focus:ring-1 transition shadow-2xs cursor-pointer ${
                  focusYear === 'ALL'
                    ? 'bg-amber-50 text-amber-950 border-amber-300'
                    : 'bg-white text-ink-text border-rule'
                }`}
              >
                <option value="ALL">✨ All Years</option>
                <optgroup label="Focus Year">
                  {availableYears.map(y => (
                    <option key={y} value={y}>
                      Year {y} {y === currentYear ? '(Current)' : ''}
                    </option>
                  ))}
                </optgroup>
              </select>

              {focusYear === 'ALL' ? (
                <button
                  type="button"
                  onClick={() => setFocusYear(currentYear)}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-stone-100 text-stone-700 border border-rule transition shadow-2xs whitespace-nowrap"
                  title={`Switch to ${currentYear} only`}
                >
                  {currentYear}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFocusYear('ALL')}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition shadow-2xs whitespace-nowrap flex items-center gap-1"
                  title="Switch to All Years cumulative view"
                >
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Summary Pill */}
        {(hasActiveFilters || focusYear === 'ALL') && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-rule/40 text-[11px] text-amber-900 bg-amber-50/70 px-2.5 py-1 rounded-md border border-amber-200">
            <span className="font-bold">Scope:</span>
            <span>{focusYear === 'ALL' ? `All Years (${minYear} – ${currentYear})` : `Year ${focusYear}`}</span>
            <span>• {appliedDistrict ? `Unit: ${appliedDistrict}` : `All Units (${allOrderedDistricts.length})`}</span>
            {appliedFromDate && <span>• From: <strong>{appliedFromDate}</strong></span>}
            {appliedToDate && <span>• To: <strong>{appliedToDate}</strong></span>}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="ml-auto text-amber-800 hover:text-rose-700 font-bold flex items-center gap-1 underline text-[10.5px]"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Secondary Row: Quick Text Search, Only units with proposals, Expand All Toggle */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap pt-1.5 border-t border-rule/40 text-[11.5px]">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Text Search */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-ink-text-faint absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search unit name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-rule rounded-md pl-7 pr-2.5 py-0.5 text-[11.5px] text-ink-text placeholder-ink-text-faint focus:outline-none focus:ring-1 focus:ring-[#A97B33]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-text-faint hover:text-ink-text text-[10px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Show only active */}
            <label className="flex items-center gap-1.5 text-ink-text cursor-pointer select-none text-[11.5px]">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => setShowOnlyActive(e.target.checked)}
                className="rounded border-rule text-[#7E2A34] focus:ring-[#7E2A34] w-3.5 h-3.5"
              />
              <span className="text-ink-text-soft">Only with proposals</span>
            </label>
          </div>

          {/* Expand All Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="px-2.5 py-1 rounded-md border border-rule/80 bg-white text-ink-text hover:bg-stone-50 flex items-center gap-1.5 text-[11.5px] font-medium transition shadow-2xs"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3 h-3 text-ink-text-soft" />
                <span>Compact View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-[#A97B33]" />
                <span>Expand All ({activeTab === 'respondents' ? displayedRespondentRows.length : displayedRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Table View */}
      {activeTab === 'proposals' && (
        <div className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
          <div className="px-3.5 py-1.5 border-b border-rule/70 bg-[#F7F3E7] flex items-center justify-between flex-wrap gap-2 text-[11.5px]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-[13px] text-ink-text">
                Unit Proposals
              </span>
              <span className="text-[11px] text-ink-text-soft">
                ({displayedRows.length} units • {appliedFromDate && appliedToDate ? `${appliedFromDate} to ${appliedToDate}` : focusYear === 'ALL' ? `All Years: ${minYear} – ${currentYear}` : `Year ${focusYear}`})
              </span>
              {focusYear === 'ALL' && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  All Years
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-ink-text-faint">
              * Click any count to view cases
            </div>
          </div>

          {/* Table Container: Controlled height or expanded */}
          <div className={`overflow-x-auto relative ${isExpanded ? 'max-h-none' : 'max-h-[calc(100vh-250px)] min-h-[440px]'}`}>
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                {/* Header Row 1: High-Contrast Group Headers */}
                <tr className="text-white text-[12px] font-bold">
                  <th
                    rowSpan={2}
                    style={{ position: 'sticky', top: 0, left: 0, zIndex: 25, width: '48px', minWidth: '48px' }}
                    className="py-2 px-2 text-center bg-[#1B2538] border border-[#2D3A54] text-amber-200"
                  >
                    Sl. No
                  </th>
                  <th
                    rowSpan={2}
                    style={{ position: 'sticky', top: 0, left: '48px', zIndex: 25, width: '185px', minWidth: '185px' }}
                    className="py-2 px-3 text-left bg-[#1B2538] border border-[#2D3A54] text-white shadow-[2px_0_4px_rgba(0,0,0,0.2)]"
                  >
                    Dist (SP Unit)
                  </th>
                  <th
                    colSpan={historicalYears.length}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-1.5 px-3 text-center tracking-wider uppercase bg-[#1F2C48] border border-[#2D3A54] text-amber-100 text-[11px]"
                  >
                    {focusYear === 'ALL'
                      ? `Proposals by Year (${historicalYears[0]} - ${historicalYears[historicalYears.length - 1]})`
                      : `Proposals (${historicalYears.length > 0 ? `${historicalYears[0]} - ${historicalYears[historicalYears.length - 1]}` : focusYear})`
                    }
                  </th>
                  <th
                    colSpan={5}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-1.5 px-3 text-center tracking-wider uppercase bg-[#7E2A34] border border-[#9A3542] text-amber-200 text-[11px]"
                  >
                    {appliedFromDate && appliedToDate
                      ? `CA Dispatch (${appliedFromDate} to ${appliedToDate})`
                      : focusYear === 'ALL'
                      ? 'CA Dispatch & Status'
                      : `Year ${focusYear} CA Dispatch`
                    }
                  </th>
                  <th
                    colSpan={6}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-1.5 px-3 text-center tracking-wider uppercase bg-[#1A2E4C] border border-[#2A446C] text-amber-100 text-[11px]"
                  >
                    Preliminary Enquiry (PE) Status
                  </th>
                </tr>

                {/* Header Row 2: Sub-headers pinned at top */}
                <tr className="text-ink-text text-[11px] font-bold">
                  {historicalYears.map((yr) => (
                    <th
                      key={yr}
                      style={{ position: 'sticky', top: '30px', zIndex: 15, width: '50px', minWidth: '50px' }}
                      className="py-1.5 px-1 text-center bg-[#EDE7D6] border border-stone-300 text-stone-700"
                    >
                      {yr}
                    </th>
                  ))}
                  {/* CA Dispatch & Status sub-headers */}
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '90px' }}
                    className="py-1.5 px-2 text-center bg-blue-100/90 border border-blue-200 text-blue-950 font-bold cursor-help"
                    title={focusYear === 'ALL' ? "Total proposals received across all recorded years" : `Total proposals received in ${focusYear}`}
                  >
                    Total Received
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '92px' }}
                    className="py-1.5 px-2 text-center bg-rose-100/90 border border-rose-200 text-rose-950 font-bold cursor-help"
                    title="Petitions received at HQ where Date Sent to CA is not yet entered or dispatched"
                  >
                    Not Sent to CA
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-indigo-100/90 border border-indigo-200 text-indigo-950 font-semibold cursor-help"
                    title="Proposals dispatched to Competent Authority for sanction (Date Sent to CA updated)"
                  >
                    Sent to CA
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-amber-100/90 border border-amber-200 text-amber-950 font-semibold cursor-help"
                    title="Proposals sent back to SP / district unit with remarks"
                  >
                    Back to Dist
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-amber-200/90 border border-amber-300 text-[#7E2A34] font-bold cursor-help"
                    title="Proposals sent to CA awaiting sanction decision (PE Status not yet updated)"
                  >
                    Pending CA
                  </th>

                  {/* Preliminary Enquiry sub-headers */}
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '90px' }}
                    className="py-1.5 px-2 text-center bg-red-100/90 border border-red-200 text-red-950 font-bold cursor-help"
                    title="Preliminary Enquiry: Registered FIR"
                  >
                    Registered FIR
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-orange-100/90 border border-orange-200 text-orange-950 font-semibold cursor-help"
                    title="Preliminary Enquiry: Register FIR"
                  >
                    Register FIR
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-yellow-100/90 border border-yellow-200 text-yellow-950 font-semibold cursor-help"
                    title="Preliminary Enquiry: PE Pending"
                  >
                    PE Pending
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '95px' }}
                    className="py-1.5 px-2 text-center bg-purple-100/90 border border-purple-200 text-purple-950 font-semibold cursor-help"
                    title="Preliminary Enquiry: Recommended to DE"
                  >
                    Recommended to DE
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '75px' }}
                    className="py-1.5 px-2 text-center bg-stone-200/90 border border-stone-300 text-stone-900 font-semibold cursor-help"
                    title="Preliminary Enquiry: Close"
                  >
                    Close
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '90px' }}
                    className="py-1.5 px-2 text-center bg-sky-100/90 border border-sky-200 text-sky-950 font-semibold cursor-help"
                    title="Preliminary Enquiry: High Court Stay"
                  >
                    High Court Stay
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2 + historicalYears.length + 11} className="py-20 text-center text-ink-text-faint">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#A97B33]" />
                        <span>Compiling district proposal matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={2 + historicalYears.length + 11} className="py-12 text-center text-ink-text-faint italic">
                      No district matched your criteria.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row, idx) => {
                    const hasFocusActivity =
                      (row.totalReceivedAtHq || 0) +
                      (row.notSentToCA || 0) +
                      (row.proposalsSentToCA || 0) +
                      (row.proposalsSentBackToDist || 0) > 0;

                    const rowBg = hasFocusActivity
                      ? 'bg-[#FBF8EF]'
                      : idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-[#FCFAF4]';

                    return (
                      <tr
                        key={row.district}
                        className={`border-b border-stone-200 hover:bg-[#F4EEDC] transition-colors ${rowBg}`}
                      >
                        {/* Sl. No (Sticky column 1) */}
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            width: '48px',
                            minWidth: '48px',
                            backgroundColor: hasFocusActivity ? '#F7F3E5' : (idx % 2 === 0 ? '#FAF8F2' : '#F6F3EB')
                          }}
                          className="py-1.5 px-2 border border-stone-300 text-center font-mono text-[11px] text-stone-600 font-semibold"
                        >
                          {row.slNo}
                        </td>

                        {/* Dist Name (Sticky column 2) */}
                        <td
                          style={{
                            position: 'sticky',
                            left: '48px',
                            zIndex: 10,
                            width: '185px',
                            minWidth: '185px',
                            backgroundColor: hasFocusActivity ? '#F7F3E5' : (idx % 2 === 0 ? '#FAF8F2' : '#F6F3EB'),
                            boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
                          }}
                          className="py-1.5 px-3 border border-stone-300 font-semibold text-ink-text"
                        >
                          <Link
                            to={`/register?district=${encodeURIComponent(row.district)}`}
                            className="hover:text-[#7E2A34] flex items-center justify-between group"
                            title={`View petitions for ${row.district}`}
                          >
                            <span className="truncate">{row.district}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-70 transition flex-shrink-0" />
                          </Link>
                        </td>

                        {/* Historical Years */}
                        {historicalYears.map((yr) => {
                          const val = row.historical ? (row.historical[yr] || 0) : 0;
                          return (
                            <td key={yr} className="py-1.5 px-1 border border-stone-300 text-center font-mono text-[11.5px]">
                              {val === 0 ? (
                                <span className="text-stone-400 font-normal">0</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDrilldown(row.district, 'year', yr)}
                                  className="inline-block font-bold text-ink-text bg-amber-100 hover:bg-amber-200 border border-amber-300 hover:border-amber-400 px-2 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                                  title={`Click to view ${val} proposal${val > 1 ? 's' : ''} for ${row.district} in ${yr}`}
                                >
                                  {val}
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Focus Year: Total Received at HQ */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-blue-50/25">
                          {row.totalReceivedAtHq === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'totalReceived')}
                              className="inline-block font-bold text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 hover:border-blue-400 px-2.5 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.totalReceivedAtHq} proposal${row.totalReceivedAtHq > 1 ? 's' : ''} for ${row.district}`}
                            >
                              {row.totalReceivedAtHq}
                            </button>
                          )}
                        </td>

                        {/* Focus Year: Not Sent to CA */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-rose-50/25">
                          {row.notSentToCA === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'notSentToCA')}
                              className="inline-block font-bold text-rose-950 bg-rose-100 hover:bg-rose-200 border border-rose-300 hover:border-rose-400 px-2.5 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.notSentToCA} proposal${row.notSentToCA > 1 ? 's' : ''} not yet sent to CA for ${row.district}`}
                            >
                              {row.notSentToCA}
                            </button>
                          )}
                        </td>

                        {/* Focus Year: Proposals Sent to CA */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-indigo-50/25">
                          {row.proposalsSentToCA === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'sentToCA')}
                              className="inline-block font-bold text-indigo-950 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 hover:border-indigo-400 px-2.5 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.proposalsSentToCA} proposal${row.proposalsSentToCA > 1 ? 's' : ''} sent to CA for ${row.district}`}
                            >
                              {row.proposalsSentToCA}
                            </button>
                          )}
                        </td>

                        {/* Focus Year: Proposals sent back to Dist */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-amber-50/25">
                          {row.proposalsSentBackToDist === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'sentBack')}
                              className="inline-block font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 hover:border-amber-400 px-2.5 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.proposalsSentBackToDist} proposal${row.proposalsSentBackToDist > 1 ? 's' : ''} returned to district for ${row.district}`}
                            >
                              {row.proposalsSentBackToDist}
                            </button>
                          )}
                        </td>

                        {/* Focus Year: Pending with CA */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-amber-50/30">
                          {row.pendingWithCA === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'pendingWithCA')}
                              className="inline-block font-bold text-white bg-[#7E2A34] hover:bg-[#993441] border border-[#5E1F27] px-2.5 py-0.5 rounded shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.pendingWithCA} case${row.pendingWithCA > 1 ? 's' : ''} pending with CA for ${row.district}`}
                            >
                              {row.pendingWithCA}
                            </button>
                          )}
                        </td>

                        {/* Preliminary Enquiry: Registered FIR */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-red-50/20">
                          {(!row.peBreakdown || row.peBreakdown['Registered FIR'] === 0) ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'peStatus:Registered FIR')}
                              className="inline-block font-bold text-red-950 bg-red-100 hover:bg-red-200 border border-red-300 hover:border-red-400 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.peBreakdown['Registered FIR']} Registered FIR case${row.peBreakdown['Registered FIR'] > 1 ? 's' : ''} for ${row.district}`}
                            >
                              {row.peBreakdown['Registered FIR']}
                            </button>
                          )}
                        </td>

                        {/* Preliminary Enquiry: Register FIR */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-orange-50/20">
                          {(!row.peBreakdown || row.peBreakdown['Register FIR'] === 0) ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'peStatus:Register FIR')}
                              className="inline-block font-bold text-orange-950 bg-orange-100 hover:bg-orange-200 border border-orange-300 hover:border-orange-400 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.peBreakdown['Register FIR']} Register FIR case${row.peBreakdown['Register FIR'] > 1 ? 's' : ''} for ${row.district}`}
                            >
                              {row.peBreakdown['Register FIR']}
                            </button>
                          )}
                        </td>

                        {/* Preliminary Enquiry: PE Pending */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-yellow-50/20">
                          {(!row.peBreakdown || row.peBreakdown['PE Pending'] === 0) ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'peStatus:PE Pending')}
                              className="inline-block font-bold text-yellow-950 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 hover:border-yellow-400 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.peBreakdown['PE Pending']} PE Pending case${row.peBreakdown['PE Pending'] > 1 ? 's' : ''} for ${row.district}`}
                            >
                              {row.peBreakdown['PE Pending']}
                            </button>
                          )}
                        </td>

                        {/* Preliminary Enquiry: Recommended to DE */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-purple-50/20">
                          {(!row.peBreakdown || row.peBreakdown['Recommended to DE'] === 0) ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'peStatus:Recommended to DE')}
                              className="inline-block font-bold text-purple-950 bg-purple-100 hover:bg-purple-200 border border-purple-300 hover:border-purple-400 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.peBreakdown['Recommended to DE']} Recommended to DE case${row.peBreakdown['Recommended to DE'] > 1 ? 's' : ''} for ${row.district}`}
                            >
                              {row.peBreakdown['Recommended to DE']}
                            </button>
                          )}
                        </td>

                        {/* Preliminary Enquiry: Close */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-stone-100/40">
                          {(!row.peBreakdown || row.peBreakdown['Close'] === 0) ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'peStatus:Close')}
                              className="inline-block font-bold text-stone-900 bg-stone-200 hover:bg-stone-300 border border-stone-300 hover:border-stone-400 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.peBreakdown['Close']} Closed case${row.peBreakdown['Close'] > 1 ? 's' : ''} for ${row.district}`}
                            >
                              {row.peBreakdown['Close']}
                            </button>
                          )}
                        </td>

                        {/* Preliminary Enquiry: High Court Stay */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-sky-50/20">
                          {(!row.peBreakdown || row.peBreakdown['High Court Stay'] === 0) ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrilldown(row.district, 'peStatus:High Court Stay')}
                              className="inline-block font-bold text-sky-950 bg-sky-100 hover:bg-sky-200 border border-sky-300 hover:border-sky-400 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                              title={`Click to view ${row.peBreakdown['High Court Stay']} High Court Stay case${row.peBreakdown['High Court Stay'] > 1 ? 's' : ''} for ${row.district}`}
                            >
                              {row.peBreakdown['High Court Stay']}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Total Row Footer (Sticky at bottom: 0) */}
              <tfoot>
                <tr className="text-ink-text font-bold text-[12px]">
                  <td
                    colSpan={2}
                    style={{
                      position: 'sticky',
                      left: 0,
                      bottom: 0,
                      zIndex: 25,
                      backgroundColor: '#E2DCB8',
                      boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                    }}
                    className="py-2.5 px-3 border border-stone-400 text-center tracking-wider text-[12.5px]"
                  >
                    TOTAL
                  </td>

                  {/* Historical totals */}
                  {historicalYears.map((yr) => {
                    const totalVal = statsData.totals.historical ? statsData.totals.historical[yr] || 0 : 0;
                    return (
                      <td
                        key={yr}
                        style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#EAE5CE' }}
                        className="py-2.5 px-1 border border-stone-400 text-center font-mono text-[12px]"
                      >
                        {totalVal === 0 ? (
                          <span className="text-stone-500 font-normal">0</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenDrilldown('ALL', 'year', yr)}
                            className="inline-block font-bold text-ink-text bg-amber-100 hover:bg-amber-200 border border-amber-300 hover:border-amber-400 px-2 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                            title={`Click to view all ${totalVal} cases from ${yr} across all districts`}
                          >
                            {totalVal}
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {/* CA Dispatch & Status totals */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#D4E2F5' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-blue-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'totalReceived')}
                      className="inline-block font-black text-blue-950 bg-blue-200/80 hover:bg-blue-300/90 border border-blue-400 px-3 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.totalReceivedAtHq || 0} cases received at HQ`}
                    >
                      {statsData.totals.totalReceivedAtHq || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FADBD8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-rose-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'notSentToCA')}
                      className="inline-block font-black text-rose-950 bg-rose-200/80 hover:bg-rose-300/90 border border-rose-400 px-3 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.notSentToCA || 0} cases not yet sent to CA`}
                    >
                      {statsData.totals.notSentToCA || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#DDD8F0' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-indigo-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'sentToCA')}
                      className="inline-block font-black text-indigo-950 bg-indigo-200/80 hover:bg-indigo-300/90 border border-indigo-400 px-3 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.proposalsSentToCA || 0} cases sent to CA`}
                    >
                      {statsData.totals.proposalsSentToCA || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#F2E2C4' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-amber-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'sentBack')}
                      className="inline-block font-black text-amber-950 bg-amber-200/80 hover:bg-amber-300/90 border border-amber-400 px-3 py-0.5 rounded shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.proposalsSentBackToDist || 0} cases returned to district`}
                    >
                      {statsData.totals.proposalsSentBackToDist || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#F1D5B8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-[#7E2A34] font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'pendingWithCA')}
                      className="inline-block font-black text-white bg-[#7E2A34] hover:bg-[#993441] border border-[#5E1F27] px-3 py-0.5 rounded shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.pendingWithCA || 0} cases pending with CA`}
                    >
                      {statsData.totals.pendingWithCA || 0}
                    </button>
                  </td>

                  {/* Preliminary Enquiry Totals */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FADBD8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-red-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'peStatus:Registered FIR')}
                      className="inline-block font-bold text-red-950 bg-red-200/80 hover:bg-red-300/90 border border-red-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.peBreakdown?.['Registered FIR'] || 0} Registered FIR cases`}
                    >
                      {statsData.totals.peBreakdown?.['Registered FIR'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FDEBD0' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-orange-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'peStatus:Register FIR')}
                      className="inline-block font-bold text-orange-950 bg-orange-200/80 hover:bg-orange-300/90 border border-orange-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.peBreakdown?.['Register FIR'] || 0} Register FIR cases`}
                    >
                      {statsData.totals.peBreakdown?.['Register FIR'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FCF3CF' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-yellow-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'peStatus:PE Pending')}
                      className="inline-block font-bold text-yellow-950 bg-yellow-200/80 hover:bg-yellow-300/90 border border-yellow-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.peBreakdown?.['PE Pending'] || 0} PE Pending cases`}
                    >
                      {statsData.totals.peBreakdown?.['PE Pending'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#E8DAEF' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-purple-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'peStatus:Recommended to DE')}
                      className="inline-block font-bold text-purple-950 bg-purple-200/80 hover:bg-purple-300/90 border border-purple-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.peBreakdown?.['Recommended to DE'] || 0} Recommended to DE cases`}
                    >
                      {statsData.totals.peBreakdown?.['Recommended to DE'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#EAEDED' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-stone-900 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'peStatus:Close')}
                      className="inline-block font-bold text-stone-900 bg-stone-300/80 hover:bg-stone-400/90 border border-stone-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.peBreakdown?.['Close'] || 0} Closed cases`}
                    >
                      {statsData.totals.peBreakdown?.['Close'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#EBF5FB' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-sky-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenDrilldown('ALL', 'peStatus:High Court Stay')}
                      className="inline-block font-bold text-sky-950 bg-sky-200/80 hover:bg-sky-300/90 border border-sky-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer underline-offset-2 hover:underline"
                      title={`Click to view all ${statsData.totals.peBreakdown?.['High Court Stay'] || 0} High Court Stay cases`}
                    >
                      {statsData.totals.peBreakdown?.['High Court Stay'] || 0}
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Respondent Wise Matrix Table View */}
      {activeTab === 'respondents' && (
        <div className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
          <div className="px-3.5 py-1.5 border-b border-rule/70 bg-[#F7F3E7] flex items-center justify-between flex-wrap gap-2 text-[11.5px]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-[13px] text-ink-text flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#A97B33]" />
                <span>Respondent Wise Statistics Matrix</span>
              </span>
              <span className="text-[11px] text-ink-text-soft">
                ({displayedRespondentRows.length} units • {appliedFromDate && appliedToDate ? `${appliedFromDate} to ${appliedToDate}` : focusYear === 'ALL' ? `All Years: ${minYear} – ${currentYear}` : `Year ${focusYear}`})
              </span>
              {focusYear === 'ALL' && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  All Years
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-ink-text-faint">
              * Click any count to view respondent records
            </div>
          </div>

          {/* Table Container: Controlled height or expanded */}
          <div className={`overflow-x-auto relative ${isExpanded ? 'max-h-none' : 'max-h-[calc(100vh-250px)] min-h-[440px]'}`}>
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                {/* Header Row 1: High-Contrast Group Headers */}
                <tr className="text-white text-[12px] font-bold">
                  <th
                    rowSpan={2}
                    style={{ position: 'sticky', top: 0, left: 0, zIndex: 25, width: '48px', minWidth: '48px' }}
                    className="py-2 px-2 text-center bg-[#1B2538] border border-[#2D3A54] text-amber-200"
                  >
                    Sl. No
                  </th>
                  <th
                    rowSpan={2}
                    style={{ position: 'sticky', top: 0, left: '48px', zIndex: 25, width: '185px', minWidth: '185px' }}
                    className="py-2 px-3 text-left bg-[#1B2538] border border-[#2D3A54] text-white shadow-[2px_0_4px_rgba(0,0,0,0.2)]"
                  >
                    Dist (SP Unit)
                  </th>
                  <th
                    colSpan={historicalYears.length}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-1.5 px-3 text-center tracking-wider uppercase bg-[#1F2C48] border border-[#2D3A54] text-amber-100 text-[11px]"
                  >
                    {focusYear === 'ALL'
                      ? `Respondents by Year (${historicalYears[0]} - ${historicalYears[historicalYears.length - 1]})`
                      : `Respondents (${historicalYears.length > 0 ? `${historicalYears[0]} - ${historicalYears[historicalYears.length - 1]}` : focusYear})`
                    }
                  </th>
                  <th
                    colSpan={7}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-1.5 px-3 text-center tracking-wider uppercase bg-[#7E2A34] border border-[#9A3542] text-amber-200 text-[11px]"
                  >
                    {appliedFromDate && appliedToDate
                      ? `CA Sanction Status (${appliedFromDate} to ${appliedToDate})`
                      : focusYear === 'ALL'
                      ? 'CA Sanction Status (Per Respondent)'
                      : `Year ${focusYear} CA Sanction Status`
                    }
                  </th>
                  <th
                    colSpan={6}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-1.5 px-3 text-center tracking-wider uppercase bg-[#1A2E4C] border border-[#2A446C] text-amber-100 text-[11px]"
                  >
                    Preliminary Enquiry (PE) Status
                  </th>
                </tr>

                {/* Header Row 2: Sub-headers pinned at top */}
                <tr className="text-ink-text text-[11px] font-bold">
                  {historicalYears.map((yr) => (
                    <th
                      key={yr}
                      style={{ position: 'sticky', top: '30px', zIndex: 15, width: '50px', minWidth: '50px' }}
                      className="py-1.5 px-1 text-center bg-[#EDE7D6] border border-stone-300 text-stone-700"
                    >
                      {yr}
                    </th>
                  ))}
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '90px' }}
                    className="py-1.5 px-2 text-center bg-blue-100/90 border border-blue-200 text-blue-950 font-bold cursor-help"
                    title={focusYear === 'ALL' ? "Total respondents registered across all recorded years" : `Total respondents registered in ${focusYear}`}
                  >
                    Total Resp
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '92px' }}
                    className="py-1.5 px-2 text-center bg-rose-100/90 border border-rose-200 text-rose-950 font-bold cursor-help"
                    title="Respondents whose 17-A proposal is at HQ and has not yet been dispatched to Competent Authority"
                  >
                    Not Sent to CA
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-indigo-100/90 border border-indigo-200 text-indigo-950 font-semibold cursor-help"
                    title="Respondents whose 17-A proposal was dispatched to Competent Authority for sanction"
                  >
                    Sent to CA
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-amber-100/90 border border-amber-200 text-amber-950 font-semibold cursor-help"
                    title="Respondents whose proposal was returned back to SP unit with remarks"
                  >
                    Back to Dist
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-amber-200/90 border border-amber-300 text-[#7E2A34] font-bold cursor-help"
                    title="Respondents whose sanction is awaiting decision from Competent Authority"
                  >
                    Pending CA
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-emerald-100/90 border border-emerald-200 text-emerald-950 font-bold cursor-help"
                    title="Respondents for whom Section 17-A investigation sanction was obtained / granted"
                  >
                    Obtained
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-red-100/90 border border-red-200 text-red-950 font-bold cursor-help"
                    title="Respondents for whom Section 17-A sanction was rejected / refused by CA"
                  >
                    Rejected
                  </th>

                  {/* Preliminary Enquiry Subheaders */}
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-red-100/80 border border-stone-300 text-red-950 cursor-help"
                    title="Respondents in cases where FIR was registered"
                  >
                    Registered FIR
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-orange-100/80 border border-stone-300 text-orange-950 cursor-help"
                    title="Respondents in cases where order to register FIR was issued"
                  >
                    Register FIR
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-yellow-100/80 border border-stone-300 text-yellow-950 cursor-help"
                    title="Respondents in cases where Preliminary Enquiry is actively pending"
                  >
                    PE Pending
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '95px' }}
                    className="py-1.5 px-2 text-center bg-purple-100/80 border border-stone-300 text-purple-950 cursor-help"
                    title="Respondents in cases recommended to Departmental Enquiry"
                  >
                    Recommended DE
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '70px' }}
                    className="py-1.5 px-2 text-center bg-stone-200/80 border border-stone-300 text-stone-900 cursor-help"
                    title="Respondents in cases closed after enquiry"
                  >
                    Close
                  </th>
                  <th
                    style={{ position: 'sticky', top: '30px', zIndex: 15, minWidth: '85px' }}
                    className="py-1.5 px-2 text-center bg-sky-100/80 border border-stone-300 text-sky-950 cursor-help"
                    title="Respondents in cases stayed by High Court"
                  >
                    HC Stay
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRespondentRows.map((row, idx) => (
                  <tr
                    key={row.district}
                    className={`hover:bg-amber-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF8F2]'
                    }`}
                  >
                    <td
                      style={{ position: 'sticky', left: 0, zIndex: 10 }}
                      className="py-1 px-2 border border-stone-200 text-center font-mono text-ink-text-soft bg-inherit"
                    >
                      {row.slNo}
                    </td>
                    <td
                      style={{ position: 'sticky', left: '48px', zIndex: 10 }}
                      className="py-1 px-3 border border-stone-200 font-semibold text-ink-text bg-inherit shadow-[2px_0_4px_rgba(0,0,0,0.06)]"
                    >
                      {row.district}
                    </td>

                    {/* Historical / Yearly Respondents */}
                    {historicalYears.map((yr) => (
                      <td
                        key={yr}
                        className="py-1 px-1 border border-stone-200 text-center font-mono bg-stone-50/40"
                      >
                        {row.historical[yr] === 0 ? (
                          <span className="text-stone-300 font-normal">0</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenRespondentDrilldown(row.district, 'year', yr)}
                            className="inline-block font-bold text-amber-950 bg-amber-100/70 hover:bg-amber-200 border border-amber-300 px-1.5 py-0.2 rounded hover:scale-105 active:scale-95 transition cursor-pointer"
                            title={`Click to view ${row.historical[yr]} respondents for ${row.district} in year ${yr}`}
                          >
                            {row.historical[yr]}
                          </button>
                        )}
                      </td>
                    ))}

                    {/* Total Respondents */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-blue-50/30">
                      {row.totalRespondents === 0 ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'totalRespondents')}
                          className="inline-block font-black text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view all ${row.totalRespondents} respondents for ${row.district}`}
                        >
                          {row.totalRespondents}
                        </button>
                      )}
                    </td>

                    {/* Not Sent to CA */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-rose-50/30">
                      {row.notSentToCA === 0 ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'notSentToCA')}
                          className="inline-block font-bold text-rose-950 bg-rose-100 hover:bg-rose-200 border border-rose-300 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.notSentToCA} respondents awaiting dispatch to CA for ${row.district}`}
                        >
                          {row.notSentToCA}
                        </button>
                      )}
                    </td>

                    {/* Sent to CA */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-indigo-50/25">
                      {row.sentToCA === 0 ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'sentToCA')}
                          className="inline-block font-bold text-indigo-950 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.sentToCA} respondents dispatched to CA for ${row.district}`}
                        >
                          {row.sentToCA}
                        </button>
                      )}
                    </td>

                    {/* Back to Dist */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-amber-50/25">
                      {row.backToDist === 0 ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'backToDist')}
                          className="inline-block font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.backToDist} respondents in returned proposals for ${row.district}`}
                        >
                          {row.backToDist}
                        </button>
                      )}
                    </td>

                    {/* Pending CA */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-amber-50/30">
                      {row.pendingWithCA === 0 ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'pendingWithCA')}
                          className="inline-block font-bold text-white bg-[#7E2A34] hover:bg-[#993441] border border-[#5E1F27] px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.pendingWithCA} respondents pending with CA for ${row.district}`}
                        >
                          {row.pendingWithCA}
                        </button>
                      )}
                    </td>

                    {/* Obtained */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-emerald-50/30">
                      {row.obtained === 0 ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'obtained')}
                          className="inline-block font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.obtained} respondents with sanction obtained for ${row.district}`}
                        >
                          {row.obtained}
                        </button>
                      )}
                    </td>

                    {/* Rejected */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-red-50/30">
                      {row.rejected === 0 ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'rejected')}
                          className="inline-block font-bold text-red-950 bg-red-100 hover:bg-red-200 border border-red-300 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.rejected} respondents with sanction rejected for ${row.district}`}
                        >
                          {row.rejected}
                        </button>
                      )}
                    </td>

                    {/* Preliminary Enquiry: Registered FIR */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-red-50/20">
                      {(!row.peBreakdown || row.peBreakdown['Registered FIR'] === 0) ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'peStatus:Registered FIR')}
                          className="inline-block font-bold text-red-950 bg-red-100 hover:bg-red-200 border border-red-300 px-1.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.peBreakdown['Registered FIR']} respondents in Registered FIR cases for ${row.district}`}
                        >
                          {row.peBreakdown['Registered FIR']}
                        </button>
                      )}
                    </td>

                    {/* Preliminary Enquiry: Register FIR */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-orange-50/20">
                      {(!row.peBreakdown || row.peBreakdown['Register FIR'] === 0) ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'peStatus:Register FIR')}
                          className="inline-block font-bold text-orange-950 bg-orange-100 hover:bg-orange-200 border border-orange-300 px-1.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.peBreakdown['Register FIR']} respondents in Register FIR cases for ${row.district}`}
                        >
                          {row.peBreakdown['Register FIR']}
                        </button>
                      )}
                    </td>

                    {/* Preliminary Enquiry: PE Pending */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-yellow-50/20">
                      {(!row.peBreakdown || row.peBreakdown['PE Pending'] === 0) ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'peStatus:PE Pending')}
                          className="inline-block font-bold text-yellow-950 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 px-1.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.peBreakdown['PE Pending']} respondents in PE Pending cases for ${row.district}`}
                        >
                          {row.peBreakdown['PE Pending']}
                        </button>
                      )}
                    </td>

                    {/* Preliminary Enquiry: Recommended to DE */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-purple-50/20">
                      {(!row.peBreakdown || row.peBreakdown['Recommended to DE'] === 0) ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'peStatus:Recommended to DE')}
                          className="inline-block font-bold text-purple-950 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.peBreakdown['Recommended to DE']} respondents in Recommended to DE cases for ${row.district}`}
                        >
                          {row.peBreakdown['Recommended to DE']}
                        </button>
                      )}
                    </td>

                    {/* Preliminary Enquiry: Close */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-stone-100/40">
                      {(!row.peBreakdown || row.peBreakdown['Close'] === 0) ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'peStatus:Close')}
                          className="inline-block font-bold text-stone-900 bg-stone-200 hover:bg-stone-300 border border-stone-300 px-1.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.peBreakdown['Close']} respondents in Closed cases for ${row.district}`}
                        >
                          {row.peBreakdown['Close']}
                        </button>
                      )}
                    </td>

                    {/* Preliminary Enquiry: High Court Stay */}
                    <td className="py-1 px-2 border border-stone-300 text-center font-mono bg-sky-50/20">
                      {(!row.peBreakdown || row.peBreakdown['High Court Stay'] === 0) ? (
                        <span className="text-stone-300 font-normal">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRespondentDrilldown(row.district, 'peStatus:High Court Stay')}
                          className="inline-block font-bold text-sky-950 bg-sky-100 hover:bg-sky-200 border border-sky-300 px-1.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Click to view ${row.peBreakdown['High Court Stay']} respondents in High Court Stay cases for ${row.district}`}
                        >
                          {row.peBreakdown['High Court Stay']}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Total Row */}
                <tr className="border-t-2 border-stone-500 font-bold text-[12px]">
                  <td
                    style={{ position: 'sticky', bottom: 0, left: 0, zIndex: 30, backgroundColor: '#E0D7C2' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-ink-text font-black"
                  >
                    TOTAL
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, left: '48px', zIndex: 30, backgroundColor: '#E0D7C2' }}
                    className="py-2.5 px-3 border border-stone-400 text-ink-text font-black uppercase text-[11px] shadow-[2px_0_4px_rgba(0,0,0,0.15)]"
                  >
                    State Total ({displayedRespondentRows.length} Units)
                  </td>

                  {/* Historical Years Totals */}
                  {historicalYears.map((yr) => (
                    <td
                      key={yr}
                      style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#EDE7D6' }}
                      className="py-2.5 px-1 border border-stone-400 text-center font-mono text-stone-900 font-bold"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenRespondentDrilldown('ALL', 'year', yr)}
                        className="inline-block font-black text-amber-950 bg-amber-200/80 hover:bg-amber-300 border border-amber-400 px-2 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                        title={`Click to view all ${respondentStatsData.totals.historical[yr] || 0} respondents for year ${yr}`}
                      >
                        {respondentStatsData.totals.historical[yr] || 0}
                      </button>
                    </td>
                  ))}

                  {/* Total Respondents */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#D6EAF8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-blue-950 font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'totalRespondents')}
                      className="inline-block font-black text-blue-950 bg-blue-200/90 hover:bg-blue-300 border border-blue-400 px-3 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.totalRespondents || 0} respondents`}
                    >
                      {respondentStatsData.totals.totalRespondents || 0}
                    </button>
                  </td>

                  {/* Not Sent to CA */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FADBD8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-rose-950 font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'notSentToCA')}
                      className="inline-block font-black text-rose-950 bg-rose-200/90 hover:bg-rose-300 border border-rose-400 px-3 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.notSentToCA || 0} respondents awaiting dispatch to CA`}
                    >
                      {respondentStatsData.totals.notSentToCA || 0}
                    </button>
                  </td>

                  {/* Sent to CA */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#E8DAEF' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-indigo-950 font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'sentToCA')}
                      className="inline-block font-black text-indigo-950 bg-indigo-200/90 hover:bg-indigo-300 border border-indigo-400 px-3 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.sentToCA || 0} respondents dispatched to CA`}
                    >
                      {respondentStatsData.totals.sentToCA || 0}
                    </button>
                  </td>

                  {/* Back to Dist */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FCF3CF' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-amber-950 font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'backToDist')}
                      className="inline-block font-black text-amber-950 bg-amber-200/80 hover:bg-amber-300 border border-amber-400 px-3 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.backToDist || 0} respondents in returned proposals`}
                    >
                      {respondentStatsData.totals.backToDist || 0}
                    </button>
                  </td>

                  {/* Pending CA */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#F1D5B8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-[#7E2A34] font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'pendingWithCA')}
                      className="inline-block font-black text-white bg-[#7E2A34] hover:bg-[#993441] border border-[#5E1F27] px-3 py-0.5 rounded shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.pendingWithCA || 0} respondents pending with CA`}
                    >
                      {respondentStatsData.totals.pendingWithCA || 0}
                    </button>
                  </td>

                  {/* Obtained */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#D4EFDF' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-emerald-950 font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'obtained')}
                      className="inline-block font-black text-emerald-950 bg-emerald-200/90 hover:bg-emerald-300 border border-emerald-400 px-3 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.obtained || 0} respondents with sanction obtained`}
                    >
                      {respondentStatsData.totals.obtained || 0}
                    </button>
                  </td>

                  {/* Rejected */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FADBD8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-red-950 font-black text-[13px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'rejected')}
                      className="inline-block font-black text-red-950 bg-red-200/90 hover:bg-red-300 border border-red-400 px-3 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.rejected || 0} respondents with sanction rejected`}
                    >
                      {respondentStatsData.totals.rejected || 0}
                    </button>
                  </td>

                  {/* Preliminary Enquiry Totals */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FADBD8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-red-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'peStatus:Registered FIR')}
                      className="inline-block font-bold text-red-950 bg-red-200/80 hover:bg-red-300 border border-red-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.peBreakdown?.['Registered FIR'] || 0} respondents in Registered FIR cases`}
                    >
                      {respondentStatsData.totals.peBreakdown?.['Registered FIR'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FDEBD0' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-orange-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'peStatus:Register FIR')}
                      className="inline-block font-bold text-orange-950 bg-orange-200/80 hover:bg-orange-300 border border-orange-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.peBreakdown?.['Register FIR'] || 0} respondents in Register FIR cases`}
                    >
                      {respondentStatsData.totals.peBreakdown?.['Register FIR'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#FCF3CF' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-yellow-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'peStatus:PE Pending')}
                      className="inline-block font-bold text-yellow-950 bg-yellow-200/80 hover:bg-yellow-300 border border-yellow-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.peBreakdown?.['PE Pending'] || 0} respondents in PE Pending cases`}
                    >
                      {respondentStatsData.totals.peBreakdown?.['PE Pending'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#E8DAEF' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-purple-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'peStatus:Recommended to DE')}
                      className="inline-block font-bold text-purple-950 bg-purple-200/80 hover:bg-purple-300 border border-purple-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.peBreakdown?.['Recommended to DE'] || 0} respondents in Recommended to DE cases`}
                    >
                      {respondentStatsData.totals.peBreakdown?.['Recommended to DE'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#EAEDED' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-stone-900 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'peStatus:Close')}
                      className="inline-block font-bold text-stone-900 bg-stone-300/80 hover:bg-stone-400 border border-stone-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.peBreakdown?.['Close'] || 0} respondents in Closed cases`}
                    >
                      {respondentStatsData.totals.peBreakdown?.['Close'] || 0}
                    </button>
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#EBF5FB' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-sky-950 font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenRespondentDrilldown('ALL', 'peStatus:High Court Stay')}
                      className="inline-block font-bold text-sky-950 bg-sky-200/80 hover:bg-sky-300 border border-sky-400 px-2.5 py-0.5 rounded shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
                      title={`Click to view all ${respondentStatsData.totals.peBreakdown?.['High Court Stay'] || 0} respondents in High Court Stay cases`}
                    >
                      {respondentStatsData.totals.peBreakdown?.['High Court Stay'] || 0}
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Graphical Breakdown View */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2">
          {/* Yearly Proposals Trend Progression Bar Chart */}
          <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft">
            <SectionHeader
              icon={TrendingUp}
              title={`Yearly Proposals Inflow (2017 – ${currentYear})`}
              subtitle="Annual registration volume across all units"
            />
            {loading ? <SkeletonChart /> : yearlyTrendData.length === 0 ? <EmptyChart label="No annual trend recorded." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={yearlyTrendData} margin={{ top: 10, right: 15, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,24,38,0.06)" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#6E6248', fontWeight: 600 }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6248' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-ink border border-white/15 rounded-xl px-4 py-2.5 shadow-deep text-[12.5px]">
                          <div className="font-bold text-[#F5EFE1]">Year {label}</div>
                          <div className="text-amber-300 font-semibold mt-0.5">
                            Proposals: <strong>{payload[0].value}</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="proposals" name="Proposals" fill="#000E89" radius={[5, 5, 0, 0]} maxBarSize={38}>
                    {yearlyTrendData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.year === String(focusYear) ? '#A97B33' : '#000E89'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* District-wise Petitions Bar Chart */}
          <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft">
            <SectionHeader
              icon={MapPin}
              title={focusYear === 'ALL' ? "Top Units by Petitions (All-Time)" : `Top Units by Petitions (${focusYear})`}
              subtitle="Distribution across top active units"
            />
            {loading ? <SkeletonChart /> : districtData.length === 0 ? <EmptyChart label="No district data recorded yet." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={districtData} margin={{ top: 5, right: 10, left: -15, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,24,38,0.06)" />
                  <XAxis
                    dataKey="district"
                    tick={{ fontSize: 10, fill: '#6E6248' }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6248' }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" name="Petitions" radius={[5, 5, 0, 0]} maxBarSize={32}>
                    {districtData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* PE Status Pie Chart */}
          <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft">
            <SectionHeader
              icon={Shield}
              title="Preliminary Enquiry Status"
              subtitle="Distribution of Preliminary Enquiry outcomes"
            />
            {loading ? <SkeletonChart /> : peStatusData.length === 0 ? <EmptyChart label="No PE status data." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={peStatusData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {peStatusData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    formatter={(v) => <span className="text-[12px] text-ink-text-soft">{v}</span>}
                    iconSize={10}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Officers by District */}
          <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft">
            <SectionHeader
              icon={Briefcase}
              title="Officers Deployed by District"
              subtitle="Active vigilance officer headcount per district"
            />
            {loading ? <SkeletonChart /> : officerDistData.length === 0 ? <EmptyChart label="No officer data found." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={officerDistData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,24,38,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6E6248' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 11, fill: '#6E6248' }} width={75} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" name="Officers" fill="#A97B33" radius={[0, 5, 5, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
      {/* DRILLDOWN CASES MODAL — Opens when ANY count cell is clicked */}
      {drilldownModal && drilldownModal.isOpen && createPortal(
        <div
          style={{ zIndex: 9990 }}
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setDrilldownModal(null)}
        >
          <div
            className="bg-[#FFFDF7] border-2 border-[#C9BD98] rounded-2xl shadow-deep w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#1B2538] text-white flex items-start justify-between gap-4 border-b border-[#2D3A54] flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D3A54] border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0 shadow-inner">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {drilldownModal.district === 'ALL' ? 'State Total' : drilldownModal.district}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-stone-300">
                      • {drilldownModal.cases.length} {drilldownModal.isRespondentDrilldown ? `Respondent${drilldownModal.cases.length === 1 ? '' : 's'}` : `Case${drilldownModal.cases.length === 1 ? '' : 's'}`} in Database
                    </span>
                  </div>
                  <h3 className="text-[18px] font-serif font-bold text-white mt-1">
                    {drilldownModal.title}
                  </h3>
                  {drilldownModal.subtitle && (
                    <p className="text-[12px] text-stone-300 mt-0.5">
                      {drilldownModal.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Header Right: Modal Close */}
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition shadow-sm ml-auto"
                title="Close modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar: Search & Summary */}
            <div className="px-5 py-3 bg-[#F7F3E7] border-b border-rule/70 flex items-center justify-between gap-3 flex-wrap text-[12.5px]">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-ink-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={drilldownModal.isRespondentDrilldown 
                    ? "Filter respondents by Name, Designation, Office, Department, CA, Unit..." 
                    : "Filter cases by Petition No, Petitioner, Respondent, CA..."}
                  value={drilldownSearch}
                  onChange={(e) => setDrilldownSearch(e.target.value)}
                  className="w-full bg-white border border-rule rounded-lg pl-9 pr-8 py-1.5 text-[12.5px] text-ink-text placeholder-ink-text-faint focus:outline-none focus:ring-2 focus:ring-[#000E89]/20 focus:border-[#000E89]"
                />
                {drilldownSearch && (
                  <button
                    type="button"
                    onClick={() => setDrilldownSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-text-faint hover:text-ink-text text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="text-[12px] font-semibold text-ink-text-soft flex items-center gap-2">
                <span>Showing:</span>
                <span className="font-bold text-[#000E89] bg-white px-2.5 py-0.5 rounded border border-rule/80">
                  {(() => {
                    const q = drilldownSearch.trim().toLowerCase();
                    if (!q) return drilldownModal.cases.length;
                    return drilldownModal.cases.filter(item => {
                      if (drilldownModal.isRespondentDrilldown) {
                        const rName = (item.name || '').toLowerCase();
                        const rDesig = (item.designation || '').toLowerCase();
                        const rDept = (item.department || '').toLowerCase();
                        const rOffice = (item.office || '').toLowerCase();
                        const rCa = (item.caDesignation || '').toLowerCase();
                        const rCaPlace = (item.caPlace || '').toLowerCase();
                        const rDist = (item.petition?.district || '').toLowerCase();
                        const rPetNo = (item.petition?.petitionNo || '').toLowerCase();
                        const rStatus = (item.permissionStatus || '').toLowerCase();
                        return rName.includes(q) || rDesig.includes(q) || rDept.includes(q) || rOffice.includes(q) || rCa.includes(q) || rCaPlace.includes(q) || rDist.includes(q) || rPetNo.includes(q) || rStatus.includes(q);
                      }
                      const p = item;
                      const pNo = (p.petitionNo || '').toLowerCase();
                      const petName = (p.petitionerName || '').toLowerCase();
                      const dist = (p.district || '').toLowerCase();
                      const eo = (p.sirEo || p.sirOfficerName || '').toLowerCase();
                      const respMatch = (p.respondents || []).some(r =>
                        (r.name || '').toLowerCase().includes(q) ||
                        (r.designation || '').toLowerCase().includes(q) ||
                        (r.caDesignation || '').toLowerCase().includes(q)
                      );
                      return pNo.includes(q) || petName.includes(q) || dist.includes(q) || eo.includes(q) || respMatch;
                    }).length;
                  })()} of {drilldownModal.cases.length} {drilldownModal.isRespondentDrilldown ? 'respondents' : 'cases'}
                </span>
              </div>
            </div>

            {/* Modal Body: Scrollable Cases List */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-170px)] space-y-3.5 bg-[#FCFAF4]">
              {(() => {
                const q = drilldownSearch.trim().toLowerCase();
                const filtered = !q
                  ? drilldownModal.cases
                  : drilldownModal.cases.filter(item => {
                      if (drilldownModal.isRespondentDrilldown) {
                        const rName = (item.name || '').toLowerCase();
                        const rDesig = (item.designation || '').toLowerCase();
                        const rDept = (item.department || '').toLowerCase();
                        const rOffice = (item.office || '').toLowerCase();
                        const rCa = (item.caDesignation || '').toLowerCase();
                        const rCaPlace = (item.caPlace || '').toLowerCase();
                        const rDist = (item.petition?.district || '').toLowerCase();
                        const rPetNo = (item.petition?.petitionNo || '').toLowerCase();
                        const rStatus = (item.permissionStatus || '').toLowerCase();
                        return rName.includes(q) || rDesig.includes(q) || rDept.includes(q) || rOffice.includes(q) || rCa.includes(q) || rCaPlace.includes(q) || rDist.includes(q) || rPetNo.includes(q) || rStatus.includes(q);
                      }
                      const p = item;
                      const pNo = (p.petitionNo || '').toLowerCase();
                      const petName = (p.petitionerName || '').toLowerCase();
                      const dist = (p.district || '').toLowerCase();
                      const eo = (p.sirEo || p.sirOfficerName || '').toLowerCase();
                      const respMatch = (p.respondents || []).some(r =>
                        (r.name || '').toLowerCase().includes(q) ||
                        (r.designation || '').toLowerCase().includes(q) ||
                        (r.caDesignation || '').toLowerCase().includes(q)
                      );
                      return pNo.includes(q) || petName.includes(q) || dist.includes(q) || eo.includes(q) || respMatch;
                    });

                if (filtered.length === 0) {
                  return (
                    <div className="py-14 text-center text-ink-text-faint">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2.5 opacity-40 text-[#A97B33]" />
                      <p className="text-[14px] font-semibold text-ink-text-soft">
                        {drilldownModal.isRespondentDrilldown ? 'No matching respondents found' : 'No matching cases found'}
                      </p>
                      <p className="text-[12px] mt-0.5">Try refining your search keyword or clearing the filter.</p>
                      {drilldownSearch && (
                        <button
                          type="button"
                          onClick={() => setDrilldownSearch('')}
                          className="mt-3 px-3 py-1 bg-white border border-rule rounded-md text-[11.5px] font-bold text-[#000E89] hover:bg-stone-50"
                        >
                          Clear Search Filter
                        </button>
                      )}
                    </div>
                  );
                }

                return filtered.map((item, idx) => {
                  if (drilldownModal.isRespondentDrilldown) {
                    const r = item;
                    const p = r.petition || {};
                    const perm = (r.permissionStatus || 'Pending').toLowerCase();
                    let permBadge = (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending with CA</span>
                      </span>
                    );
                    if (perm === 'obtain') {
                      permBadge = (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Sanction Obtained</span>
                        </span>
                      );
                    } else if (perm === 'reject') {
                      permBadge = (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-900 border border-rose-300 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-700" />
                          <span>Sanction Rejected</span>
                        </span>
                      );
                    }

                    const rSentDate = r.permissionSentDate || p.proposalSentDate;

                    return (
                      <div
                        key={r.id || idx}
                        className="bg-white border border-rule/80 rounded-xl p-4 shadow-soft hover:shadow-card hover:border-[#A97B33]/60 transition"
                      >
                        {/* Top Header: Sl, Respondent Name & Designation, Sanction Status Badge */}
                        <div className="flex items-start justify-between gap-3 flex-wrap pb-2.5 border-b border-rule/40">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-stone-100 border border-stone-300 text-stone-700 text-[11px] font-mono font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="text-[14px] font-bold text-ink-text flex items-center gap-2 flex-wrap">
                                <span>{r.name || 'Unnamed Respondent'}</span>
                                {r.designation && (
                                  <span className="text-[12.5px] font-semibold text-ink-text-soft">
                                    — {r.designation}
                                  </span>
                                )}
                              </div>
                              {(r.office || r.department) && (
                                <div className="text-[11.5px] text-ink-text-faint mt-0.5">
                                  {[r.office, r.department].filter(Boolean).join(' • ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {permBadge}
                          </div>
                        </div>

                        {/* Details Grid: Competent Authority info and Proposal Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2.5 text-[12px]">
                          {/* CA Column */}
                          <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-2.5">
                            <div className="text-[10.5px] font-bold text-ink-text-faint uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-[#A97B33]" />
                              Competent Authority (CA)
                            </div>
                            <div className="font-semibold text-ink-text">
                              {r.caDesignation || '— (CA Designation Not Set)'}
                              {r.caPlace && <span className="font-normal text-ink-text-soft">, {r.caPlace}</span>}
                            </div>
                            <div className="text-[11px] text-ink-text-soft mt-1 space-y-0.5">
                              <div>Date Sent to CA: <strong>{rSentDate ? getLocalDateString(rSentDate) : 'Not Dispatched'}</strong></div>
                              {r.permissionReceivedDate && (
                                <div>Decision Date: <strong>{getLocalDateString(r.permissionReceivedDate)}</strong></div>
                              )}
                              {r.permissionOrderNo && (
                                <div>Order No: <strong className="font-mono">{r.permissionOrderNo}</strong></div>
                              )}
                            </div>
                          </div>

                          {/* Linked Proposal Column */}
                          <div className="bg-blue-50/40 border border-blue-200/70 rounded-lg p-2.5">
                            <div className="text-[10.5px] font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Shield className="w-3 h-3 text-[#000E89]" />
                              Linked 17-A Proposal
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-[13px] text-[#000E89]">
                                {p.petitionNo || 'UNREGISTERED'}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-[#7E2A34]/10 text-[#7E2A34] border border-[#7E2A34]/20">
                                {p.district || '—'}
                              </span>
                              <span className="text-[11px] text-ink-text-soft">
                                Year {getPetitionYear(p)}
                              </span>
                            </div>
                            {p.peNo && (
                              <div className="text-[11px] text-indigo-900 font-mono mt-1">
                                PE No: <strong>{p.peNo}</strong> ({p.peStatus || 'Pending'})
                              </div>
                            )}
                            {p.sirEo && (
                              <div className="text-[11px] text-ink-text-soft mt-0.5 truncate">
                                EO: {p.sirEo}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-1 pt-2 border-t border-rule/40 flex items-center justify-end gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              exportPetitionToPdf(p);
                              showSuccess(`Downloading summary for ${p.petitionNo || 'case'}…`);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[#C9A15E]/80 bg-[#FFF9EE] hover:bg-[#FDF2DB] text-[#805B10] font-bold text-[11.5px] flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
                            title="Download official Case Dossier Summary PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 text-[#A97B33]" />
                            <span>Download Summary</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingPetition(p)}
                            className="px-2.5 py-1 rounded-lg border border-rule/80 bg-white hover:bg-stone-50 text-ink-text font-bold text-[11.5px] flex items-center gap-1 shadow-2xs transition active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#A97B33]" />
                            <span>Quick View Proposal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDrilldownModal(null);
                              navigate(`/register?search=${encodeURIComponent(p.petitionNo || '')}`);
                            }}
                            className="px-3 py-1 rounded-lg bg-[#000E89] hover:bg-[#0015A8] text-white font-bold text-[11.5px] flex items-center gap-1 shadow-sm transition active:scale-95"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Open in Register</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const p = item;
                  const pYear = getPetitionYear(p);
                  const pDateStr = getPetitionDateStr(p);
                  const propStatus = (p.proposalStatus || '').trim().toLowerCase();
                  const pStatus = (p.status || '').trim();

                  // Respondents sanction breakdown
                  const respondents = p.respondents || [];
                  const obtCount = respondents.filter(r => (r.permissionStatus || '').toLowerCase() === 'obtain').length;
                  const rejCount = respondents.filter(r => (r.permissionStatus || '').toLowerCase() === 'reject').length;
                  const pendCount = respondents.filter(r => !(r.permissionStatus) || (r.permissionStatus || '').toLowerCase() === 'pending').length;

                  // Overall stage label
                  let stagePill = {
                    text: pStatus ? pStatus.replace(/_/g, ' ') : 'Pending',
                    bg: 'bg-stone-100 text-stone-800 border-stone-300'
                  };
                  if (pStatus === 'CA_SUBMITTED' || propStatus === 'accept') {
                    stagePill = { text: 'Dispatched to CA', bg: 'bg-indigo-50 text-indigo-900 border-indigo-200 font-bold' };
                  } else if (pStatus === '17A_ACCEPTED') {
                    stagePill = { text: '17-A Accepted', bg: 'bg-blue-50 text-blue-900 border-blue-200 font-bold' };
                  } else if (pStatus === '17A_RETURNED' || propStatus.includes('returned')) {
                    stagePill = { text: 'Returned to Dist', bg: 'bg-amber-100 text-amber-950 border-amber-300 font-bold' };
                  } else if (pStatus === 'SUBMITTED_TO_SUPERVISOR') {
                    stagePill = { text: 'Submitted to Supervisor (Pending at HQ)', bg: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold' };
                  } else if (pStatus === 'DRAFT') {
                    stagePill = { text: 'Draft Proposal', bg: 'bg-stone-100 text-stone-700 border-stone-300' };
                  }

                  return (
                    <div
                      key={p.id || idx}
                      className="bg-white border border-rule/80 rounded-xl p-4 shadow-soft hover:shadow-card hover:border-[#A97B33]/60 transition"
                    >
                      {/* Top Card Row: Petition No, District, Stage Badge, Date */}
                      <div className="flex items-start justify-between gap-3 flex-wrap pb-3 border-b border-rule/40">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-stone-100 border border-stone-300 text-stone-700 text-[11px] font-mono font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-[14px] text-[#000E89] bg-blue-50/70 border border-blue-200 px-2.5 py-0.5 rounded-md">
                            {p.petitionNo || 'UNREGISTERED'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(p.petitionNo || '');
                              setCopiedId(p.id);
                              setTimeout(() => setCopiedId(null), 1800);
                            }}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 transition"
                            title="Copy petition number"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#7E2A34]/10 text-[#7E2A34] border border-[#7E2A34]/20">
                            {p.district}
                          </span>
                          {p.type && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                              {p.type}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-md text-[11.5px] border ${stagePill.bg}`}>
                            {stagePill.text}
                          </span>
                          <span className="text-[11.5px] text-ink-text-soft font-mono font-medium">
                            Year: <strong>{pYear}</strong> • Date: <strong>{pDateStr}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Card Content Grid: Petitioner, Investigating Officer, Remarks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 text-[12px]">
                        <div>
                          <div className="text-[11px] font-bold text-ink-text-faint uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <User className="w-3 h-3 text-[#A97B33]" />
                            Petitioner Details
                          </div>
                          <div className="font-semibold text-ink-text">
                            {p.petitionerName || '— (Not Specified)'}
                          </div>
                          {p.petitionerAddress && (
                            <div className="text-[11.5px] text-ink-text-soft truncate mt-0.5" title={p.petitionerAddress}>
                              {p.petitionerAddress}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-ink-text-faint uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-indigo-700" />
                            Enquiry / Investigating Officer
                          </div>
                          <div className="font-semibold text-ink-text">
                            {p.sirEo || p.sirOfficerName || '— (Awaiting Officer Assignment)'}
                            {(p.sirEoDesignation || p.officerRank) && (
                              <span className="text-ink-text-soft font-normal text-[11.5px] ml-1">
                                ({p.sirEoDesignation || p.officerRank})
                              </span>
                            )}
                          </div>
                          {p.peNo && (
                            <div className="text-[11px] text-indigo-800 font-mono mt-0.5">
                              PE No: <strong>{p.peNo}</strong> ({p.peStatus || 'Pending'})
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Respondents List & CA Sanction Status Breakdown */}
                      <div className="pt-2.5 pb-2 border-t border-rule/40">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2 text-[11.5px]">
                          <span className="font-bold text-ink-text flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#A97B33]" />
                            <span>Respondents &amp; Competent Authority ({respondents.length}):</span>
                          </span>

                          {respondents.length > 0 && (
                            <div className="flex items-center gap-2 text-[11px] font-bold">
                              {obtCount > 0 && (
                                <span className="px-2 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  ✓ {obtCount} Obtained
                                </span>
                              )}
                              {rejCount > 0 && (
                                <span className="px-2 py-0.2 rounded bg-rose-100 text-rose-900 border border-rose-300">
                                  ✕ {rejCount} Rejected
                                </span>
                              )}
                              {pendCount > 0 && (
                                <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                  ⏳ {pendCount} Awaiting CA
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {respondents.length === 0 ? (
                          <div className="text-[11.5px] text-ink-text-faint italic py-1">
                            No respondents linked to this proposal yet.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {respondents.map((r, rIdx) => {
                              const perm = (r.permissionStatus || '').toLowerCase();
                              let permBadge = (
                                <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Pending with CA</span>
                                </span>
                              );
                              if (perm === 'obtain') {
                                permBadge = (
                                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                    <span>Sanction Obtained</span>
                                  </span>
                                );
                              } else if (perm === 'reject') {
                                permBadge = (
                                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-50 text-rose-900 border border-rose-300 flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-rose-700" />
                                    <span>Sanction Rejected</span>
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={r.id || rIdx}
                                  className="bg-stone-50 border border-stone-200/90 rounded-lg px-3 py-2 flex items-center justify-between gap-3 flex-wrap text-[11.5px]"
                                >
                                  <div>
                                    <span className="font-bold text-ink-text">{r.name}</span>
                                    {r.designation && <span className="text-ink-text-soft"> — {r.designation}</span>}
                                    {r.department && <span className="text-stone-500 text-[11px]"> ({r.department})</span>}
                                    {r.caDesignation && (
                                      <div className="text-[11px] text-indigo-900 font-semibold mt-0.5">
                                        CA: <strong>{r.caDesignation}</strong>
                                        {r.caPlace ? ` (${r.caPlace})` : ''}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {permBadge}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Action Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-rule/40 flex items-center justify-end gap-2.5 flex-wrap">
                        {/* Download Summary Button */}
                        <button
                          type="button"
                          onClick={() => {
                            exportPetitionToPdf(p);
                            showSuccess(`Downloading summary for ${p.petitionNo || 'case'}…`);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#C9A15E]/80 bg-[#FFF9EE] hover:bg-[#FDF2DB] text-[#805B10] font-bold text-[12px] flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                          title="Download official Case Dossier Summary PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-[#A97B33]" />
                          <span>Download Summary</span>
                        </button>

                        {/* Quick View Button */}
                        <button
                          type="button"
                          onClick={() => setViewingPetition(p)}
                          className="px-3 py-1.5 rounded-lg border border-rule/80 bg-white hover:bg-stone-50 text-ink-text font-bold text-[12px] flex items-center gap-1.5 shadow-2xs transition active:scale-95"
                          title="View complete 6-stage details of this petition"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#A97B33]" />
                          <span>Quick View</span>
                        </button>

                        {/* Open in Register Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDrilldownModal(null);
                            navigate(`/register?search=${encodeURIComponent(p.petitionNo || '')}`);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#000E89] hover:bg-[#0015A8] text-white font-bold text-[12px] flex items-center gap-1.5 shadow-sm transition active:scale-95"
                          title="Open this petition in the main Register for full editing and workflow actions"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-yellow-300" />
                          <span>Open in Register</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-5 py-3 bg-[#F7F3E7] border-t border-rule/70 flex items-center justify-between gap-3 flex-wrap text-[12px]">
              <div className="text-ink-text-soft">
                Showing {drilldownModal.isRespondentDrilldown ? 'respondent records' : 'petition records'} directly from Lokayukta Section 17-A database.
              </div>
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="px-4 py-1.5 rounded-lg border border-rule bg-white hover:bg-stone-100 font-bold text-ink-text text-[12px] shadow-2xs transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* QUICK VIEW PETITION MODAL — Comprehensive 6-stage Case Viewer */}
      {viewingPetition && createPortal(
        <div
          style={{ zIndex: 10000 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setViewingPetition(null)}
        >
          <div
            className="bg-[#FFFDF7] border-2 border-[#C9BD98] rounded-2xl shadow-deep w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#000E89] text-white flex items-center justify-between gap-3 border-b border-blue-900 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-yellow-300" />
                <div>
                  <h3 className="font-serif font-bold text-[16px] text-white">
                    Petition Details: {viewingPetition.petitionNo || 'UNREGISTERED'}
                  </h3>
                  <p className="text-[11.5px] text-blue-200">
                    {viewingPetition.district} • Received: {getPetitionDateStr(viewingPetition)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportPetitionToPdf(viewingPetition);
                    showSuccess(`Downloading summary for ${viewingPetition.petitionNo || 'case'}…`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A15E] hover:bg-[#b58e4e] text-[#000E89] text-[12px] font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Download Summary Dossier PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPetition(null)}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Sections */}
            <div className="p-5 overflow-y-auto space-y-4 text-[12.5px] bg-[#FCFAF4]">
              {/* Stage I: Basic Details */}
              <div className="bg-white border border-rule/70 rounded-xl p-4 shadow-2xs">
                <h4 className="font-serif font-bold text-[13.5px] text-[#000E89] border-b border-rule/40 pb-1.5 mb-2.5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#A97B33]" />
                  I. Petition Basic Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Petition Number:</span>
                    <span className="font-mono font-bold text-[#000E89]">{viewingPetition.petitionNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Police Unit / District:</span>
                    <span className="font-bold text-ink-text">{viewingPetition.district}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Type:</span>
                    <span className="font-semibold text-ink-text">{viewingPetition.type || 'Complaint'}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Workflow Status:</span>
                    <span className="font-bold text-ink-text">{viewingPetition.status || 'DRAFT'}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Proposal Status:</span>
                    <span className="font-bold text-ink-text">{viewingPetition.proposalStatus || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Registration Date:</span>
                    <span className="font-mono">{getPetitionDateStr(viewingPetition)}</span>
                  </div>
                </div>
              </div>

              {/* Stage II: Petitioner */}
              <div className="bg-white border border-rule/70 rounded-xl p-4 shadow-2xs">
                <h4 className="font-serif font-bold text-[13.5px] text-[#000E89] border-b border-rule/40 pb-1.5 mb-2.5 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#A97B33]" />
                  II. Petitioner Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Petitioner Name:</span>
                    <span className="font-semibold text-ink-text">{viewingPetition.petitionerName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Address:</span>
                    <span className="text-ink-text">{viewingPetition.petitionerAddress || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Stage III: Investigating Officers */}
              <div className="bg-white border border-rule/70 rounded-xl p-4 shadow-2xs">
                <h4 className="font-serif font-bold text-[13.5px] text-[#000E89] border-b border-rule/40 pb-1.5 mb-2.5 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#A97B33]" />
                  III. Investigating Officers &amp; Enquiry
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">Enquiry Officer (EO):</span>
                    <span className="font-semibold text-ink-text">{viewingPetition.sirEo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">EO Designation:</span>
                    <span className="text-ink-text">{viewingPetition.sirEoDesignation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ink-text-faint text-[11px] block">PE Number &amp; Status:</span>
                    <span className="font-mono text-indigo-900 font-bold">{viewingPetition.peNo || '—'} ({viewingPetition.peStatus || 'Pending'})</span>
                  </div>
                </div>
              </div>

              {/* Stage IV: Respondents & CA Status */}
              <div className="bg-white border border-rule/70 rounded-xl p-4 shadow-2xs">
                <h4 className="font-serif font-bold text-[13.5px] text-[#000E89] border-b border-rule/40 pb-1.5 mb-2.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#A97B33]" />
                  IV. Respondents &amp; Section 17-A Sanction Status ({(viewingPetition.respondents || []).length})
                </h4>
                {(viewingPetition.respondents || []).length === 0 ? (
                  <p className="text-ink-text-faint italic">No respondents registered for this petition.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-[11.5px]">
                      <thead>
                        <tr className="bg-[#1F2C48] text-white">
                          <th className="py-2 px-2.5">Respondent</th>
                          <th className="py-2 px-2.5">Designation &amp; Dept</th>
                          <th className="py-2 px-2.5">Competent Authority (CA)</th>
                          <th className="py-2 px-2.5">Dispatch Date</th>
                          <th className="py-2 px-2.5 text-center">Sanction Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingPetition.respondents.map((r, i) => {
                          const perm = (r.permissionStatus || '').toLowerCase();
                          return (
                            <tr key={i} className="border-b border-stone-200">
                              <td className="py-2 px-2.5 font-bold text-ink-text">{r.name}</td>
                              <td className="py-2 px-2.5 text-ink-text-soft">{r.designation} ({r.department || '—'})</td>
                              <td className="py-2 px-2.5 text-indigo-900 font-semibold">{r.caDesignation || '—'} {r.caPlace ? `(${r.caPlace})` : ''}</td>
                              <td className="py-2 px-2.5 font-mono">{r.permissionSentDate ? r.permissionSentDate.slice(0, 10) : '—'}</td>
                              <td className="py-2 px-2.5 text-center">
                                {perm === 'obtain' ? (
                                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    Obtained
                                  </span>
                                ) : perm === 'reject' ? (
                                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                    Rejected
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Pending CA
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-[#F7F3E7] border-t border-rule/70 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setViewingPetition(null)}
                className="px-4 py-1.5 rounded-lg border border-rule bg-white hover:bg-stone-100 text-ink-text font-semibold text-[12px]"
              >
                Back to Cases List
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportPetitionToPdf(viewingPetition);
                    showSuccess(`Downloading summary for ${viewingPetition.petitionNo || 'case'}…`);
                  }}
                  className="px-4 py-1.5 rounded-lg border border-[#C9A15E] bg-[#FFF9EE] hover:bg-[#FDF2DB] text-[#805B10] font-bold text-[12px] flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                  title="Download Summary Dossier PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#A97B33]" />
                  <span>Download Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingPetition(null);
                    setDrilldownModal(null);
                    navigate(`/register?search=${encodeURIComponent(viewingPetition.petitionNo || '')}`);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#000E89] hover:bg-[#0015A8] text-white font-bold text-[12.5px] flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Open in Register</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

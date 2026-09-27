import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  BarChart3, MapPin, Briefcase, Shield, Download, Search,
  Calendar, Table, Filter, CheckCircle2, Clock, XCircle, FileSpreadsheet,
  RefreshCw, ArrowUpRight, Maximize2, Minimize2, RotateCcw, Check
} from 'lucide-react';
import { exportDistrictProposalsStatisticsExcel } from '../lib/exportExcel';
import { useToast } from '../components/ui/ToastProvider';

const PALETTE = ['#7E2A34', '#A97B33', '#3C6E4F', '#1F2C48', '#A85A20', '#4B5878', '#6E6248', '#AA3A2E'];

// Standard Karnataka Lokayukta Police Divisions / SP Units Order
const STANDARD_DISTRICT_ORDER = [
  'SP-1 BNG CITY', 'SP-2 BNG CITY', 'BANGALORE RURAL', 'BAGALKOT', 'BELGAVI',
  'BELLARY', 'BIDAR', 'CHAMRAJNAGAR', 'CHIKKABALLAPUR', 'CHIKKAMAGALUR',
  'CHITRADURGA', 'DAVANGERE', 'DHARWAD', 'GADAG', 'HASSAN', 'HAVERI',
  'HOSPET', 'KALBURGI', 'KARWAR', 'KODAGU', 'KOLAR', 'KOPPAL', 'MANDYA',
  'MANGALORE', 'MYSURU', 'RAICHUR', 'RAMANAGARA', 'SHIVAMOGGA', 'TUMAKURU',
  'UDUPI', 'VIJAYAPURA', 'YADGIR'
];

function normalizeDistrictName(rawName) {
  if (!rawName) return 'OTHER';
  const clean = rawName.trim().toUpperCase();
  if (clean.includes('SP-1') || clean.includes('SP 1') || clean === 'SP1 BNG CITY') return 'SP-1 BNG CITY';
  if (clean.includes('SP-2') || clean.includes('SP 2') || clean === 'SP2 BNG CITY') return 'SP-2 BNG CITY';
  if (clean === 'BENGALURU URBAN' || clean === 'BANGALORE URBAN') return 'SP-1 BNG CITY';
  if (clean === 'BENGALURU RURAL' || clean === 'BANGALORE RURAL') return 'BANGALORE RURAL';
  if (clean === 'BAGALKOTE' || clean === 'BAGALKOT') return 'BAGALKOT';
  if (clean === 'BELAGAVI' || clean === 'BELGAVI') return 'BELGAVI';
  if (clean === 'BALLARI' || clean === 'BELLARY') return 'BELLARY';
  if (clean === 'BIDAR') return 'BIDAR';
  if (clean === 'CHAMARAJANAGAR' || clean === 'CHAMRAJNAGAR') return 'CHAMRAJNAGAR';
  if (clean === 'CHIKKABALLAPURA' || clean === 'CHIKKABALLAPUR') return 'CHIKKABALLAPUR';
  if (clean === 'CHIKKAMAGALURU' || clean === 'CHIKKAMAGALUR') return 'CHIKKAMAGALUR';
  if (clean === 'CHITRADURGA') return 'CHITRADURGA';
  if (clean === 'DAVANAGERE' || clean === 'DAVANGERE') return 'DAVANGERE';
  if (clean === 'DHARWAD') return 'DHARWAD';
  if (clean === 'GADAG') return 'GADAG';
  if (clean === 'HASSAN') return 'HASSAN';
  if (clean === 'HAVERI') return 'HAVERI';
  if (clean === 'HOSPET' || clean === 'VIJAYANAGARA') return 'HOSPET';
  if (clean === 'KALABURAGI' || clean === 'KALBURGI') return 'KALBURGI';
  if (clean === 'KARWAR' || clean === 'UTTARA KANNADA') return 'KARWAR';
  if (clean === 'KODAGU') return 'KODAGU';
  if (clean === 'KOLAR') return 'KOLAR';
  if (clean === 'KOPPAL') return 'KOPPAL';
  if (clean === 'MANDYA') return 'MANDYA';
  if (clean === 'MANGALORE' || clean === 'DAKSHINA KANNADA') return 'MANGALORE';
  if (clean === 'MYSURU' || clean === 'MYSORE') return 'MYSURU';
  if (clean === 'RAICHUR') return 'RAICHUR';
  if (clean === 'RAMANAGARA') return 'RAMANAGARA';
  if (clean === 'SHIVAMOGGA') return 'SHIVAMOGGA';
  if (clean === 'TUMAKURU' || clean === 'TUMKUR') return 'TUMAKURU';
  if (clean === 'UDUPI') return 'UDUPI';
  if (clean === 'VIJAYAPURA' || clean === 'BIJAPUR') return 'VIJAYAPURA';
  if (clean === 'YADGIR') return 'YADGIR';
  if (clean === 'HEAD OFFICE') return 'HEAD OFFICE';
  return clean;
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
  const [loading, setLoading] = useState(true);
  const [rawPetitions, setRawPetitions] = useState([]);
  const [dbDistricts, setDbDistricts] = useState([]);
  const [chartExtraData, setChartExtraData] = useState(null);

  // Filters state
  const [focusYear, setFocusYear] = useState(new Date().getFullYear());
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Applied filters (applied only when "Apply Filter" is clicked)
  const [appliedDistrict, setAppliedDistrict] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  // Secondary filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [activeTab, setActiveTab] = useState('table'); // 'table' or 'charts'
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
    const list = [...STANDARD_DISTRICT_ORDER];
    if (Array.isArray(dbDistricts)) {
      dbDistricts.forEach(d => {
        const name = typeof d === 'string' ? d : d.name;
        const norm = normalizeDistrictName(name);
        if (!list.includes(norm)) {
          list.push(norm);
        }
      });
    }
    return list;
  }, [dbDistricts]);

  // Historical Years list: 2017 up to focusYear - 1
  const historicalYears = useMemo(() => {
    const startYear = 2017;
    const years = [];
    for (let y = startYear; y < focusYear; y++) {
      years.push(y);
    }
    return years;
  }, [focusYear]);

  // Master Statistics Calculation (100% reactive to filters)
  const statsData = useMemo(() => {
    const districtStatsMap = {};
    allOrderedDistricts.forEach(dist => {
      districtStatsMap[dist] = {
        district: dist,
        historical: {},
        totalReceivedAtHq: 0,
        proposalsSentToCA: 0,
        proposalsSentBackToDist: 0,
        obtained: 0,
        rejected: 0,
        pendingWithCA: 0
      };
      historicalYears.forEach(y => {
        districtStatsMap[dist].historical[y] = 0;
      });
    });

    (rawPetitions || []).forEach(p => {
      const normDist = normalizeDistrictName(p.district);
      if (!districtStatsMap[normDist]) {
        districtStatsMap[normDist] = {
          district: normDist,
          historical: {},
          totalReceivedAtHq: 0,
          proposalsSentToCA: 0,
          proposalsSentBackToDist: 0,
          obtained: 0,
          rejected: 0,
          pendingWithCA: 0
        };
        historicalYears.forEach(y => {
          districtStatsMap[normDist].historical[y] = 0;
        });
      }

      const pYear = getPetitionYear(p);
      const pDateStr = getPetitionDateStr(p);
      const row = districtStatsMap[normDist];

      if (pYear < focusYear) {
        if (row.historical[pYear] !== undefined) {
          row.historical[pYear]++;
        }
      } else if (pYear === focusYear) {
        // Date range filtering (string-based YYYY-MM-DD comparison is timezone safe)
        if (appliedFromDate && pDateStr < appliedFromDate) return;
        if (appliedToDate && pDateStr > appliedToDate) return;

        row.totalReceivedAtHq++;

        const propStatus = (p.proposalStatus || '').trim().toLowerCase();
        const pStatus = (p.status || '').trim();

        const isSentToCA = 
          propStatus === 'accept' ||
          pStatus === 'CA_SUBMITTED' ||
          pStatus === '17A_PERMISSION_PENDING' ||
          pStatus === '17A_PERMISSION_COMPLETED' ||
          pStatus === 'PRELIMINARY_ENQUIRY_SUBMITTED' ||
          p.proposalSentDate != null ||
          (p.respondents && p.respondents.some(r => r.permissionSentDate || r.caDesignation));

        const isSentBackToDist = 
          propStatus.includes('returned') ||
          pStatus === '17A_RETURNED';

        const isObtained = p.respondents && p.respondents.some(r => 
          (r.permissionStatus || '').trim().toLowerCase() === 'obtain'
        );

        const isRejected = p.respondents && p.respondents.some(r => 
          (r.permissionStatus || '').trim().toLowerCase() === 'reject'
        );

        const isPendingWithCA = isSentToCA && !isObtained && !isRejected;

        if (isSentToCA) row.proposalsSentToCA++;
        if (isSentBackToDist) row.proposalsSentBackToDist++;
        if (isObtained) row.obtained++;
        if (isRejected) row.rejected++;
        if (isPendingWithCA) row.pendingWithCA++;
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
      proposalsSentToCA: 0,
      proposalsSentBackToDist: 0,
      obtained: 0,
      rejected: 0,
      pendingWithCA: 0
    };
    historicalYears.forEach(y => {
      totals.historical[y] = 0;
    });

    districtStats.forEach(row => {
      historicalYears.forEach(y => {
        totals.historical[y] += (row.historical[y] || 0);
      });
      totals.totalReceivedAtHq += row.totalReceivedAtHq;
      totals.proposalsSentToCA += row.proposalsSentToCA;
      totals.proposalsSentBackToDist += row.proposalsSentBackToDist;
      totals.obtained += row.obtained;
      totals.rejected += row.rejected;
      totals.pendingWithCA += row.pendingWithCA;
    });

    return {
      districtStats,
      totals
    };
  }, [rawPetitions, allOrderedDistricts, historicalYears, focusYear, appliedFromDate, appliedToDate, appliedDistrict]);

  // Apply Filter Button Click
  const handleApplyFilter = () => {
    setAppliedDistrict(selectedDistrict);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    showSuccess('Filter applied successfully.');
  };

  // Reset Filters
  const handleResetFilter = () => {
    setSelectedDistrict('');
    setFromDate('');
    setToDate('');
    setAppliedDistrict('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setSearchTerm('');
    showSuccess('Filters reset to default.');
  };

  const hasActiveFilters = !!(appliedDistrict || appliedFromDate || appliedToDate);

  // Filter rows for search term & active filter
  const displayedRows = useMemo(() => {
    return (statsData.districtStats || []).filter(r => {
      const matchesSearch = !searchTerm.trim() || r.district.toLowerCase().includes(searchTerm.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (showOnlyActive) {
        const histTotal = Object.values(r.historical || {}).reduce((a, b) => a + b, 0);
        const focusTotal = (r.totalReceivedAtHq || 0) + (r.proposalsSentToCA || 0) + (r.proposalsSentBackToDist || 0);
        return histTotal > 0 || focusTotal > 0;
      }
      return true;
    });
  }, [statsData.districtStats, searchTerm, showOnlyActive]);

  // Export to Excel handler
  const handleExportStatisticsExcel = async () => {
    if (!displayedRows || displayedRows.length === 0) return;
    try {
      const dateRangeLabel = appliedFromDate && appliedToDate
        ? `${appliedFromDate} to ${appliedToDate}`
        : `${focusYear}`;

      await exportDistrictProposalsStatisticsExcel({
        districtStats: displayedRows,
        totals: statsData.totals,
        historicalYears,
        focusYear: dateRangeLabel
      });
      showSuccess('17-A Statistics report exported successfully.');
    } catch (err) {
      console.error(err);
      showError('Export failed. Please try again.');
    }
  };

  // Visual Chart Data
  const districtData = useMemo(() => {
    return (statsData.districtStats || []).filter(r => {
      const tot = (r.totalReceivedAtHq || 0) + Object.values(r.historical || {}).reduce((a, b) => a + b, 0);
      return tot > 0;
    }).map(r => ({
      district: r.district,
      count: (r.totalReceivedAtHq || 0) + Object.values(r.historical || {}).reduce((a, b) => a + b, 0)
    })).slice(0, 15);
  }, [statsData.districtStats]);

  const peStatusData = chartExtraData?.petitionsByPeStatus || [];
  const officerDistData = (chartExtraData?.officersByDistrict || []).filter(r => r.count > 0).slice(0, 12);

  const yearOptions = [2026, 2025, 2024, 2023, 2022, 2021];

  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }} className="pb-16">
      {/* Top Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-[#7E2A34]/10 text-[#7E2A34] border border-[#7E2A34]/20">
              Karnataka Lokayukta Police
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Section 17-A Statistics Matrix
            </span>
          </div>
          <h2 className="text-[23px] font-serif font-semibold text-ink-text mt-1.5">
            17-A Proposals &amp; District Statistics
          </h2>
          <p className="text-[13px] text-ink-text-soft mt-0.5">
            Official annual Section 17-A proposal register and sanction monitoring across all 32 police unit jurisdictions.
          </p>
        </div>

        {/* Action Buttons: Only Excel Export & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap no-print">
          <button
            type="button"
            className="btn btn-excel flex items-center gap-2 shadow-sm font-semibold"
            onClick={handleExportStatisticsExcel}
            title="Download formatted Excel table"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            Export Statistics Excel
          </button>
          <button
            type="button"
            className="p-2.5 rounded-lg border border-rule/70 bg-white text-ink-text-soft hover:text-ink-text hover:bg-stone-50 transition shadow-2xs"
            onClick={loadData}
            title="Refresh statistics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#A97B33]' : ''}`} />
          </button>
        </div>
      </div>

      {/* PROMINENT MAIN VIEW SELECTOR (Table Matrix vs Charts) */}
      <div className="flex items-center gap-3 border-b-2 border-rule/50 pb-3 mb-5 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-[13.5px] transition-all shadow-sm ${
            activeTab === 'table'
              ? 'bg-[#000E89] text-white shadow-[0_2px_10px_rgba(0,14,137,0.3)] ring-2 ring-yellow-400/40'
              : 'bg-white text-ink-text hover:bg-stone-50 border border-rule/70'
          }`}
        >
          <Table className={`w-4 h-4 ${activeTab === 'table' ? 'text-yellow-300' : 'text-[#A97B33]'}`} />
          <span>17-A District Statistics Matrix</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeTab === 'table' ? 'bg-white/20 text-white' : 'bg-stone-100 text-ink-text-soft'
          }`}>
            {displayedRows.length} Units
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-[13.5px] transition-all shadow-sm ${
            activeTab === 'charts'
              ? 'bg-[#000E89] text-white shadow-[0_2px_10px_rgba(0,14,137,0.3)] ring-2 ring-yellow-400/40'
              : 'bg-white text-ink-text hover:bg-stone-50 border border-rule/70'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeTab === 'charts' ? 'text-yellow-300' : 'text-[#A97B33]'}`} />
          <span>Charts &amp; Visual Analytics</span>
          <span className="text-[11px] font-normal text-ink-text-faint hidden sm:inline">
            (Bar Charts &amp; PE Status Breakdown)
          </span>
        </button>
      </div>

      {/* KPI Cards for Selected Filter / Range */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <div className="bg-[#FFFDF7] border border-rule/80 rounded-xl p-3.5 shadow-soft">
          <div className="text-[11.5px] font-semibold text-ink-text-soft uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Received at HQ</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
              {appliedFromDate && appliedToDate ? 'Range' : focusYear}
            </span>
          </div>
          <div className="text-[23px] font-serif font-bold text-ink-text">
            {statsData.totals.totalReceivedAtHq || 0}
          </div>
          <div className="text-[11px] text-ink-text-faint mt-0.5">Total registered proposals</div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule/80 rounded-xl p-3.5 shadow-soft">
          <div className="text-[11.5px] font-semibold text-indigo-800 uppercase tracking-wider mb-1">
            Sent to CA
          </div>
          <div className="text-[23px] font-serif font-bold text-indigo-900">
            {statsData.totals.proposalsSentToCA || 0}
          </div>
          <div className="text-[11px] text-ink-text-faint mt-0.5">Dispatched for sanction</div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule/80 rounded-xl p-3.5 shadow-soft">
          <div className="text-[11.5px] font-semibold text-amber-800 uppercase tracking-wider mb-1">
            Back to Dist
          </div>
          <div className="text-[23px] font-serif font-bold text-amber-900">
            {statsData.totals.proposalsSentBackToDist || 0}
          </div>
          <div className="text-[11px] text-ink-text-faint mt-0.5">Returned with remarks</div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule/80 rounded-xl p-3.5 shadow-soft">
          <div className="text-[11.5px] font-semibold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Obtained</span>
          </div>
          <div className="text-[23px] font-serif font-bold text-emerald-900">
            {statsData.totals.obtained || 0}
          </div>
          <div className="text-[11px] text-ink-text-faint mt-0.5">Sanctions granted</div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule/80 rounded-xl p-3.5 shadow-soft">
          <div className="text-[11.5px] font-semibold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Rejected</span>
          </div>
          <div className="text-[23px] font-serif font-bold text-rose-900">
            {statsData.totals.rejected || 0}
          </div>
          <div className="text-[11px] text-ink-text-faint mt-0.5">Sanctions refused</div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule/80 rounded-xl p-3.5 shadow-soft bg-gradient-to-br from-amber-50/60 to-[#FFFDF7]">
          <div className="text-[11.5px] font-semibold text-[#8B5A10] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#A97B33]" />
            <span>Pending CA</span>
          </div>
          <div className="text-[23px] font-serif font-bold text-[#7E2A34]">
            {statsData.totals.pendingWithCA || 0}
          </div>
          <div className="text-[11px] text-ink-text-faint mt-0.5">Awaiting sanction</div>
        </div>
      </div>

      {/* FILTER & PERIOD CONTROLS CARD */}
      <div className="bg-[#FFFDF7] border border-rule rounded-xl p-4 mb-5 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Main Controls: District, From Date, To Date, Apply, Reset */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* District Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-[12px] font-bold text-ink-text flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#A97B33]" />
                District Unit:
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-white border border-rule rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-ink-text focus:outline-none focus:ring-2 focus:ring-[#000E89]/20 focus:border-[#000E89] min-w-[190px]"
              >
                <option value="">All Districts (33 Units)</option>
                {STANDARD_DISTRICT_ORDER.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="h-5 w-[1px] bg-rule/60 hidden md:block" />

            {/* From Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-[12px] font-bold text-ink-text flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                From:
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white border border-rule rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-text focus:outline-none focus:ring-2 focus:ring-[#000E89]/20"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-[12px] font-bold text-ink-text flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                To:
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white border border-rule rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-text focus:outline-none focus:ring-2 focus:ring-[#000E89]/20"
              />
            </div>

            {/* Apply Filter Button */}
            <button
              type="button"
              onClick={handleApplyFilter}
              className="px-4 py-1.5 bg-[#000E89] hover:bg-[#0015A8] text-white rounded-lg text-[12.5px] font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Filter className="w-3.5 h-3.5 text-yellow-300" />
              Apply Filter
            </button>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-3 py-1.5 border border-rule bg-white hover:bg-stone-100 text-ink-text-soft hover:text-ink-text rounded-lg text-[12px] font-semibold flex items-center gap-1 transition shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filter
              </button>
            )}
          </div>

          {/* Right: Active Year Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-bold text-ink-text flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#A97B33]" />
              Historical Year:
            </label>
            <select
              value={focusYear}
              onChange={(e) => setFocusYear(parseInt(e.target.value))}
              className="bg-white border border-rule rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold text-ink-text focus:outline-none focus:ring-2 focus:ring-[#000E89]/20"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Summary Pill */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2 border-t border-rule/40 text-[11.5px] text-amber-900 bg-amber-50/70 px-3 py-1.5 rounded-lg border border-amber-200">
            <span className="font-bold">Active Filters Applied:</span>
            <span>{appliedDistrict ? `Unit: ${appliedDistrict}` : 'All Units'}</span>
            {appliedFromDate && <span>• From: <strong>{appliedFromDate}</strong></span>}
            {appliedToDate && <span>• To: <strong>{appliedToDate}</strong></span>}
            <button
              type="button"
              onClick={handleResetFilter}
              className="ml-auto text-amber-800 hover:text-rose-700 font-bold flex items-center gap-1 underline"
            >
              Reset to All
            </button>
          </div>
        )}

        {/* Secondary Row: Quick Text Search, Only units with proposals, Expand All Toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-rule/40 text-[12px]">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick Text Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-ink-text-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Quick search unit name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-rule rounded-md pl-8 pr-3 py-1 text-[12px] text-ink-text placeholder-ink-text-faint focus:outline-none focus:ring-1 focus:ring-[#A97B33]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-text-faint hover:text-ink-text text-[11px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Show only active */}
            <label className="flex items-center gap-1.5 text-ink-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => setShowOnlyActive(e.target.checked)}
                className="rounded border-rule text-[#7E2A34] focus:ring-[#7E2A34]"
              />
              <span className="text-ink-text-soft">Only units with proposals</span>
            </label>
          </div>

          {/* Expand All Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="px-3 py-1.5 rounded-lg border border-rule/80 bg-white text-ink-text hover:bg-stone-50 flex items-center gap-1.5 text-[12px] font-medium transition shadow-2xs"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-ink-text-soft" />
                <span>Compact Scroll Box</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#A97B33]" />
                <span>Expand All Rows ({displayedRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Table View */}
      {activeTab === 'table' && (
        <div className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
          <div className="px-4 py-2.5 border-b border-rule/70 bg-[#F7F3E7] flex items-center justify-between flex-wrap gap-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-[13.5px] text-ink-text">
                Section 17-A Proposal Statistics
              </span>
              <span className="text-[11.5px] text-ink-text-soft">
                — {displayedRows.length} units ({appliedFromDate && appliedToDate ? `${appliedFromDate} to ${appliedToDate}` : `${focusYear} Status`})
              </span>
            </div>
            <div className="text-[11px] text-ink-text-faint">
              * Units with 0 are explicitly displayed. Click district name to open petitions.
            </div>
          </div>

          {/* Table Container: Controlled height or expanded */}
          <div className={`overflow-x-auto relative ${isExpanded ? 'max-h-none' : 'max-h-[calc(100vh-275px)] min-h-[440px]'}`}>
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                {/* Header Row 1: High-Contrast Group Headers */}
                <tr className="text-white text-[12px] font-bold">
                  <th
                    rowSpan={2}
                    style={{ position: 'sticky', top: 0, left: 0, zIndex: 25, width: '48px', minWidth: '48px' }}
                    className="py-2.5 px-2 text-center bg-[#1B2538] border border-[#2D3A54] text-amber-200"
                  >
                    Sl. No
                  </th>
                  <th
                    rowSpan={2}
                    style={{ position: 'sticky', top: 0, left: '48px', zIndex: 25, width: '185px', minWidth: '185px' }}
                    className="py-2.5 px-3 text-left bg-[#1B2538] border border-[#2D3A54] text-white shadow-[2px_0_4px_rgba(0,0,0,0.2)]"
                  >
                    Dist (SP Unit)
                  </th>
                  <th
                    colSpan={historicalYears.length}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-2 px-3 text-center tracking-wider uppercase bg-[#1F2C48] border border-[#2D3A54] text-amber-100 text-[11.5px]"
                  >
                    17-A Proposals ({historicalYears[0]} - {historicalYears[historicalYears.length - 1]})
                  </th>
                  <th
                    colSpan={6}
                    style={{ position: 'sticky', top: 0, zIndex: 15 }}
                    className="py-2 px-3 text-center tracking-wider uppercase bg-[#7E2A34] border border-[#9A3542] text-amber-200 text-[11.5px]"
                  >
                    {appliedFromDate && appliedToDate ? `Period: ${appliedFromDate} to ${appliedToDate}` : `Year ${focusYear} Status & Action`}
                  </th>
                </tr>

                {/* Header Row 2: Sub-headers pinned at top: 33px */}
                <tr className="text-ink-text text-[11px] font-bold">
                  {historicalYears.map((yr) => (
                    <th
                      key={yr}
                      style={{ position: 'sticky', top: '33px', zIndex: 15, width: '52px', minWidth: '52px' }}
                      className="py-2 px-1 text-center bg-[#EDE7D6] border border-stone-300 text-stone-700"
                    >
                      {yr}
                    </th>
                  ))}
                  <th
                    style={{ position: 'sticky', top: '33px', zIndex: 15, minWidth: '105px' }}
                    className="py-2 px-2 text-center bg-blue-100/90 border border-blue-200 text-blue-950 font-semibold"
                  >
                    Total Received at HQ
                  </th>
                  <th
                    style={{ position: 'sticky', top: '33px', zIndex: 15, minWidth: '95px' }}
                    className="py-2 px-2 text-center bg-indigo-100/90 border border-indigo-200 text-indigo-950 font-semibold"
                  >
                    Proposals Sent to CA
                  </th>
                  <th
                    style={{ position: 'sticky', top: '33px', zIndex: 15, minWidth: '100px' }}
                    className="py-2 px-2 text-center bg-amber-100/90 border border-amber-200 text-amber-950 font-semibold"
                  >
                    Sent back to Dist
                  </th>
                  <th
                    style={{ position: 'sticky', top: '33px', zIndex: 15, minWidth: '80px' }}
                    className="py-2 px-2 text-center bg-emerald-100/90 border border-emerald-200 text-emerald-950 font-semibold"
                  >
                    Obtained
                  </th>
                  <th
                    style={{ position: 'sticky', top: '33px', zIndex: 15, minWidth: '80px' }}
                    className="py-2 px-2 text-center bg-rose-100/90 border border-rose-200 text-rose-950 font-semibold"
                  >
                    Rejected
                  </th>
                  <th
                    style={{ position: 'sticky', top: '33px', zIndex: 15, minWidth: '95px' }}
                    className="py-2 px-2 text-center bg-amber-200/90 border border-amber-300 text-[#7E2A34] font-bold"
                  >
                    Pending with CA
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2 + historicalYears.length + 6} className="py-20 text-center text-ink-text-faint">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#A97B33]" />
                        <span>Compiling district proposal matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={2 + historicalYears.length + 6} className="py-12 text-center text-ink-text-faint italic">
                      No district matched your criteria.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row, idx) => {
                    const hasFocusActivity =
                      (row.totalReceivedAtHq || 0) +
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
                                <span className="inline-block font-bold text-ink-text bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded shadow-2xs">
                                  {val}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Focus Year: Total Received at HQ */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-blue-50/25">
                          {row.totalReceivedAtHq === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <span className="inline-block font-bold text-blue-950 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded shadow-2xs">
                              {row.totalReceivedAtHq}
                            </span>
                          )}
                        </td>

                        {/* Focus Year: Proposals Sent to CA */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-indigo-50/25">
                          {row.proposalsSentToCA === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <span className="inline-block font-bold text-indigo-950 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded shadow-2xs">
                              {row.proposalsSentToCA}
                            </span>
                          )}
                        </td>

                        {/* Focus Year: Proposals sent back to Dist */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-amber-50/25">
                          {row.proposalsSentBackToDist === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <span className="inline-block font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded shadow-2xs">
                              {row.proposalsSentBackToDist}
                            </span>
                          )}
                        </td>

                        {/* Focus Year: Obtained */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-emerald-50/25">
                          {row.obtained === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <span className="inline-block font-bold text-emerald-950 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
                              {row.obtained}
                            </span>
                          )}
                        </td>

                        {/* Focus Year: Rejected */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-rose-50/25">
                          {row.rejected === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <span className="inline-block font-bold text-rose-950 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded shadow-2xs">
                              {row.rejected}
                            </span>
                          )}
                        </td>

                        {/* Focus Year: Pending with CA */}
                        <td className="py-1.5 px-2 border border-stone-300 text-center font-mono bg-amber-50/30">
                          {row.pendingWithCA === 0 ? (
                            <span className="text-stone-400 font-normal">0</span>
                          ) : (
                            <span className="inline-block font-bold text-white bg-[#7E2A34] px-2 py-0.5 rounded shadow-sm">
                              {row.pendingWithCA}
                            </span>
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
                  {historicalYears.map((yr) => (
                    <td
                      key={yr}
                      style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#EAE5CE' }}
                      className="py-2.5 px-1 border border-stone-400 text-center font-mono text-[12px]"
                    >
                      {statsData.totals.historical ? statsData.totals.historical[yr] || 0 : 0}
                    </td>
                  ))}

                  {/* Focus Year totals */}
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#D4E2F5' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-blue-950 font-bold"
                  >
                    {statsData.totals.totalReceivedAtHq || 0}
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#DDD8F0' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-indigo-950 font-bold"
                  >
                    {statsData.totals.proposalsSentToCA || 0}
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#F2E2C4' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-amber-950 font-bold"
                  >
                    {statsData.totals.proposalsSentBackToDist || 0}
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#CEEAD4' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-emerald-950 font-bold"
                  >
                    {statsData.totals.obtained || 0}
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#F5CECB' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-rose-950 font-bold"
                  >
                    {statsData.totals.rejected || 0}
                  </td>
                  <td
                    style={{ position: 'sticky', bottom: 0, zIndex: 15, backgroundColor: '#F1D5B8' }}
                    className="py-2.5 px-2 border border-stone-400 text-center font-mono text-[#7E2A34] font-black text-[13px]"
                  >
                    {statsData.totals.pendingWithCA || 0}
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
          {/* District-wise Petitions Bar Chart */}
          <div className="bg-[#FFFDF7] border border-rule rounded-xl p-6 shadow-soft col-span-1 xl:col-span-2">
            <SectionHeader
              icon={MapPin}
              title="Petitions by District"
              subtitle="Registered Section 17-A petitions per active district unit"
            />
            {loading ? <SkeletonChart /> : districtData.length === 0 ? <EmptyChart label="No district data recorded yet." /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={districtData} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,24,38,0.06)" />
                  <XAxis
                    dataKey="district"
                    tick={{ fontSize: 11, fill: '#6E6248' }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6248' }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" name="Petitions" radius={[5, 5, 0, 0]} maxBarSize={40}>
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
    </div>
  );
}

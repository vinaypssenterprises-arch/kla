import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3, Table, Hourglass, ClipboardCheck, FileSpreadsheet, RefreshCw, Printer,
  Filter, MapPin, Users, UserX, AlertCircle, Search, Eye, EyeOff, Pencil
} from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';
import { exportTabularReportExcel } from '../lib/exportExcel';
import {
  fetchOfficerAnalytics, COMPLETENESS_LABELS, TENURE_COLORS, formatOfficerDate, pct
} from '../lib/officerAnalytics';

const TABS = [
  { id: 'rank', label: 'District × Rank', icon: Table },
  { id: 'tenure', label: 'Tenure', icon: Hourglass },
  { id: 'completeness', label: 'Completeness', icon: ClipboardCheck }
];

const COMPLETENESS_FIELDS = Object.keys(COMPLETENESS_LABELS);

// Sequential single-hue cell shading for matrix magnitudes
const heat = (value, max) =>
  value > 0 ? { backgroundColor: `rgba(0, 14, 137, ${0.05 + 0.25 * (value / (max || 1))})` } : undefined;

function MiniKpi({ icon: Icon, label, value, suffix, tone = 'default' }) {
  const toneClass = tone === 'warning'
    ? 'border-amber-200 bg-amber-50/40'
    : tone === 'good' ? 'border-emerald-200 bg-emerald-50/40' : 'border-rule/80';
  return (
    <div className={`bg-[#FFFDF7] border rounded-lg px-3.5 py-2.5 shadow-2xs ${toneClass}`}>
      <div className="text-[10.5px] font-semibold text-ink-text-soft uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-brass" />
        {label}
      </div>
      <div className="text-[22px] font-serif font-bold text-ink-text mt-0.5 tabular-nums leading-tight">
        {Number(value || 0).toLocaleString('en-IN')}
        {suffix && <span className="text-[13px] text-ink-text-soft font-sans font-semibold ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

const thClass = 'py-3 px-3 text-[10.5px] uppercase tracking-[0.06em] text-ink-text-soft font-bold bg-[#F5F2E9] border-b border-[#D8CEB2] whitespace-nowrap';
const tdClass = 'py-2.5 px-3 text-[12.5px] border-b border-[#EFEAD9] text-center tabular-nums';
const stickyTh = `${thClass} sticky left-0 z-10 text-left`;
const stickyTd = 'py-2.5 px-3 text-[12.5px] border-b border-[#EFEAD9] sticky left-0 z-[1] bg-inherit text-left font-semibold text-ink-text whitespace-nowrap';

export default function OfficerReports() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError } = useToast();

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const isGlobalUser = role === 'admin' || isHeadOffice;
  const userDistrictName = localStorage.getItem('districtName') || '';
  const currentUserId = localStorage.getItem('userId');

  const initialTab = TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'rank';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [districtId, setDistrictId] = useState('');
  const [districts, setDistricts] = useState([]);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [registerSearch, setRegisterSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isGlobalUser) return;
    apiFetch('/districts')
      .then(res => (res.ok ? res.json() : []))
      .then(list => setDistricts(list.filter(d => d.isActive)))
      .catch(err => console.error('Failed to load districts', err));
  }, [isGlobalUser]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchOfficerAnalytics(districtId));
    } catch (err) {
      console.error('Officer report load failure:', err);
      setError(err.message || 'Could not load officer reports.');
    } finally {
      setLoading(false);
    }
  }, [districtId]);

  useEffect(() => { load(); }, [load]);

  const switchTab = (id) => {
    setActiveTab(id);
    setRegisterSearch('');
    setSearchParams(id === 'rank' ? {} : { tab: id }, { replace: true });
  };

  const totals = data?.totals || {};
  const scopeLabel = !isGlobalUser
    ? `${userDistrictName} District`
    : districtId ? (districts.find(d => d.id === districtId)?.name || 'Selected District') : 'State-wide (All Districts)';

  const rows = useMemo(
    () => (data?.byDistrict || []).filter(d => !hideEmpty || d.count > 0),
    [data, hideEmpty]
  );
  const rankCols = data?.byRank || [];
  const maxMatrixCell = useMemo(
    () => Math.max(1, ...rows.flatMap(r => Object.values(r.ranks || {}))),
    [rows]
  );
  const tenureBuckets = data?.tenureBuckets || [];
  const tenureTotals = useMemo(() => Object.fromEntries((data?.tenure || []).map(t => [t.key, t.count])), [data]);
  const completenessTotals = useMemo(() => Object.fromEntries((data?.completeness || []).map(c => [c.field, c.count])), [data]);

  const needle = registerSearch.trim().toLowerCase();
  const matchesSearch = (o) => !needle || [o.name, o.designation, o.district].some(v => (v || '').toLowerCase().includes(needle));
  const longTenure = useMemo(() => (data?.longTenure || []).filter(matchesSearch), [data, needle]);
  const incomplete = useMemo(() => (data?.incompleteProfiles || []).filter(matchesSearch), [data, needle]);
  const vacantPosts = useMemo(() => (data?.vacantList || []).filter(matchesSearch), [data, needle]);
  const inPosition = totals.filledPosts ?? totals.totalOfficers ?? 0;

  const rosterLink = (dId, rank) => {
    const qs = new URLSearchParams();
    if (isGlobalUser && dId) qs.set('districtId', dId);
    if (rank) qs.set('rank', rank);
    return `/officers${qs.toString() ? `?${qs}` : ''}`;
  };

  const handleExport = async () => {
    try {
      if (activeTab === 'rank') {
        const columns = [
          { header: 'Sl No', key: 'sl', width: 7 },
          { header: 'District', key: 'district', width: 22, align: 'left', bold: true },
          ...rankCols.map(r => ({ header: `${r.label} (${r.short})`, key: r.key, width: 18 })),
          { header: 'Total Posts', key: 'total', width: 11, bold: true },
          { header: 'Vacant', key: 'vacant', width: 10 }
        ];
        await exportTabularReportExcel({
          reportTitle: 'District × Rank Strength',
          sheetName: 'District x Rank',
          scopeLabel,
          columns,
          rows: rows.map((r, idx) => ({
            sl: idx + 1,
            district: r.district,
            ...Object.fromEntries(rankCols.map(c => [c.key, r.ranks?.[c.key] || 0])),
            total: r.count,
            vacant: r.vacant
          })),
          totalsRow: { sl: '', district: 'TOTAL', ...Object.fromEntries(rankCols.map(c => [c.key, c.count])), total: totals.totalOfficers || 0, vacant: totals.vacantPosts || 0 },
          fileSlug: 'Officers_District_Rank'
        });
      } else if (activeTab === 'tenure') {
        const columns = [
          { header: 'Sl No', key: 'sl', width: 7 },
          { header: 'District', key: 'district', width: 22, align: 'left', bold: true },
          ...tenureBuckets.map(b => ({ header: b.label, key: b.key, width: 13 })),
          { header: 'In Position', key: 'total', width: 11, bold: true },
          { header: `${data?.longTenureYears || 3}+ yrs Share`, key: 'share', width: 13 }
        ];
        await exportTabularReportExcel({
          reportTitle: 'Tenure at Current Posting — District-wise',
          sheetName: 'Tenure Matrix',
          scopeLabel,
          columns,
          rows: rows.map((r, idx) => ({ sl: idx + 1, district: r.district, ...r.tenure, total: r.filled, share: `${pct(r.tenure['3plus'], r.filled)}%` })),
          totalsRow: { sl: '', district: 'TOTAL', ...tenureTotals, total: inPosition, share: `${pct(tenureTotals['3plus'], inPosition)}%` },
          fileSlug: 'Officers_Tenure_Matrix'
        });
      } else {
        const columns = [
          { header: 'Sl No', key: 'sl', width: 7 },
          { header: 'District', key: 'district', width: 22, align: 'left', bold: true },
          { header: 'In Position', key: 'total', width: 11, bold: true },
          ...COMPLETENESS_FIELDS.map(f => ({ header: COMPLETENESS_LABELS[f], key: f, width: 14 })),
          { header: 'Complete Profiles', key: 'complete', width: 13 },
          { header: 'Completeness %', key: 'rate', width: 13, bold: true }
        ];
        await exportTabularReportExcel({
          reportTitle: 'Officer Profile Completeness — District-wise',
          sheetName: 'Completeness',
          scopeLabel,
          columns,
          rows: rows.map((r, idx) => ({ sl: idx + 1, district: r.district, total: r.filled, ...r.completeness, complete: r.completeProfiles, rate: `${pct(r.completeProfiles, r.filled)}%` })),
          totalsRow: { sl: '', district: 'TOTAL', total: inPosition, ...completenessTotals, complete: totals.completeProfiles || 0, rate: `${totals.completenessRate || 0}%` },
          fileSlug: 'Officers_Profile_Completeness'
        });
      }
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export report to Excel.');
    }
  };

  const handleExportRegister = async () => {
    try {
      if (activeTab === 'rank') {
        await exportTabularReportExcel({
          reportTitle: 'Vacant Posts Register',
          sheetName: 'Vacant Posts',
          scopeLabel,
          columns: [
            { header: 'Sl No', key: 'sl', width: 7 },
            { header: 'Post / Designation', key: 'designation', width: 40, align: 'left', bold: true },
            { header: 'Rank', key: 'rank', width: 10 },
            { header: 'District', key: 'district', width: 22, align: 'left' }
          ],
          rows: vacantPosts.map((v, idx) => ({ sl: idx + 1, ...v })),
          fileSlug: 'Officers_Vacant_Posts'
        });
      } else if (activeTab === 'tenure') {
        await exportTabularReportExcel({
          reportTitle: `Long Tenure Register (${data?.longTenureYears || 3}+ years at current posting)`,
          sheetName: 'Long Tenure Register',
          scopeLabel,
          columns: [
            { header: 'Sl No', key: 'sl', width: 7 },
            { header: 'Officer Name', key: 'name', width: 26, align: 'left', bold: true },
            { header: 'Designation', key: 'designation', width: 22, align: 'left' },
            { header: 'District', key: 'district', width: 20, align: 'left' },
            { header: 'Reporting Date', key: 'reportingDate', width: 15 },
            { header: 'Tenure (yrs)', key: 'years', width: 12, bold: true }
          ],
          rows: longTenure.map((o, idx) => ({ sl: idx + 1, ...o, reportingDate: formatOfficerDate(o.reportingDate) })),
          fileSlug: 'Officers_Long_Tenure_Register'
        });
      } else {
        await exportTabularReportExcel({
          reportTitle: 'Officer Profiles Needing Details',
          sheetName: 'Incomplete Profiles',
          scopeLabel,
          columns: [
            { header: 'Sl No', key: 'sl', width: 7 },
            { header: 'Officer Name', key: 'name', width: 26, align: 'left', bold: true },
            { header: 'Designation', key: 'designation', width: 22, align: 'left' },
            { header: 'District', key: 'district', width: 20, align: 'left' },
            { header: 'Missing Details', key: 'missing', width: 60, align: 'left', wrap: true }
          ],
          rows: incomplete.map((o, idx) => ({ sl: idx + 1, ...o, missing: o.missing.map(f => COMPLETENESS_LABELS[f] || f).join(', ') })),
          fileSlug: 'Officers_Incomplete_Profiles'
        });
      }
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export register to Excel.');
    }
  };

  const registerSearchBox = (
    <div className="relative w-full sm:w-[280px] no-print">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-text-faint pointer-events-none" />
      <input
        type="text"
        className="app-input !py-2 pl-9 text-[13px]"
        placeholder="Search name, designation, district…"
        value={registerSearch}
        onChange={e => setRegisterSearch(e.target.value)}
      />
    </div>
  );

  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }} className="pb-16 space-y-4">
      {/* Title, tabs, actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-[20px] font-serif font-bold text-ink-text tracking-tight leading-tight">Officer Reports</h2>
            <p className="text-[11.5px] text-ink-text-soft">ಅಧಿಕಾರಿಗಳ ವರದಿಗಳು · {scopeLabel}</p>
          </div>
          <div className="flex items-center p-0.5 rounded-lg bg-stone-200/70 border border-rule/70 no-print">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-[12px] transition-all ${
                  activeTab === t.id ? 'bg-[#000E89] text-white shadow-xs' : 'text-ink-text hover:text-black hover:bg-white/60'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap no-print">
          <button type="button" className="btn btn-excel btn-sm" onClick={handleExport} disabled={loading || !data}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()} disabled={loading || !data}>
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            type="button"
            className="p-2 rounded-lg border border-rule/70 bg-white text-ink-text-soft hover:text-ink-text hover:bg-stone-50 transition shadow-2xs"
            onClick={load}
            title="Refresh report data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#A97B33]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#FFFDF7] border border-rule/70 rounded-xl px-4 py-3 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-text mr-1">
            <Filter className="w-3.5 h-3.5 text-brass" />
            <span>Jurisdiction:</span>
          </div>
          {!isGlobalUser ? (
            <span className="font-mono text-xs font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brass" />
              {userDistrictName}
            </span>
          ) : (
            <SearchableSelect
              className="w-auto min-w-[220px]"
              value={districtId}
              onChange={setDistrictId}
              options={[{ value: '', label: 'All Districts (State-wide)' }, ...districts.map(d => ({ value: d.id, label: d.name }))]}
              label="Filter by District"
            />
          )}
        </div>
        {isGlobalUser && !districtId && (
          <button
            type="button"
            onClick={() => setHideEmpty(v => !v)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-text-soft hover:text-ink-text self-start md:self-auto"
          >
            {hideEmpty ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideEmpty ? 'Showing districts with officers' : 'Showing all districts'}
          </button>
        )}
      </div>

      {/* KPI strip */}
      {data && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <MiniKpi icon={Users} label="Officers in Position" value={inPosition} suffix={`/${totals.totalOfficers || 0} posts`} />
          <MiniKpi icon={UserX} label="Vacant Posts" value={totals.vacantPosts} suffix={totals.vacantPosts ? ` · ${totals.vacancyRate}%` : ''} tone={totals.vacantPosts ? 'warning' : 'good'} />
          <MiniKpi icon={MapPin} label="Districts Covered" value={totals.districtsCovered} suffix={`/${totals.totalDistricts || 0}`} />
          <MiniKpi icon={Hourglass} label={`Tenure ${data.longTenureYears || 3}+ yrs`} value={totals.longTenureCount} tone={totals.longTenureCount ? 'warning' : 'default'} />
          <MiniKpi icon={ClipboardCheck} label="Complete Profiles" value={totals.completenessRate} suffix="%" tone={totals.completenessRate >= 80 ? 'good' : totals.completenessRate < 50 ? 'warning' : 'default'} />
        </div>
      )}

      {loading && !data ? (
        <div className="h-96 skeleton-card rounded-xl" />
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h3 className="font-serif font-bold text-base">{error}</h3>
          <button type="button" onClick={load} className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-[#FFFDF7] border border-rule rounded-xl py-16 text-center shadow-soft">
          <BarChart3 className="w-10 h-10 mx-auto text-ink-text-faint mb-3" strokeWidth={1.5} />
          <h3 className="font-serif text-[17px] text-ink-text">No officers on record</h3>
          <p className="text-[12.5px] text-ink-text-soft mt-1">Add officers to start building deployment reports.</p>
        </div>
      ) : (
        <>
          {/* ── District × Rank ── */}
          {activeTab === 'rank' && (
            <section className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
              <div className="px-5 py-3.5 border-b border-rule/50 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-[15px] font-serif font-bold text-ink-text">District × Rank Strength</h3>
                  <p className="text-[11.5px] text-ink-text-soft">Rank is read from each officer's designation. Click any number to open those officers in the roster; darker cells = more officers.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-12 text-center`}>Sl</th>
                      <th className={`${stickyTh} min-w-[160px] bg-[#F5F2E9]`}>District</th>
                      {rankCols.map(c => (
                        <th key={c.key} className={`${thClass} text-center min-w-[110px]`} title={c.label}>
                          <span className="block text-[12px] text-ink-text normal-case tracking-normal">{c.short}</span>
                          <span className="block normal-case tracking-normal font-medium text-[10px] text-ink-text-faint">{c.label}</span>
                        </th>
                      ))}
                      <th className={`${thClass} text-center bg-[#ECE6D3] text-ink-text`}>Total Posts</th>
                      <th className={`${thClass} text-center`}>Vacant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.districtId} className={idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'}>
                        <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                        <td className={stickyTd}>
                          <Link to={rosterLink(r.districtId)} className="hover:text-maroon hover:underline">{r.district}</Link>
                        </td>
                        {rankCols.map(c => {
                          const v = r.ranks?.[c.key] || 0;
                          return (
                            <td key={c.key} className={tdClass} style={heat(v, maxMatrixCell)}>
                              {v ? (
                                <Link to={rosterLink(r.districtId, c.key)} className="font-semibold text-ink-text hover:text-maroon hover:underline" title={`${r.district} · ${c.label}: ${v}`}>{v}</Link>
                              ) : <span className="text-ink-text-faint">·</span>}
                            </td>
                          );
                        })}
                        <td className={`${tdClass} font-bold text-ink-text bg-[#F5F2E9]/70`}>{r.count}</td>
                        <td className={tdClass}>
                          {r.vacant ? <span className="text-[11px] font-bold px-2 py-0.5 rounded border bg-rust-bg text-rust border-rust/30">{r.vacant}</span> : <span className="text-ink-text-faint">·</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FFF6DA]">
                      <td className={`${tdClass} border-t-2 border-t-[#D8CEB2]`} />
                      <td className={`${stickyTd} bg-[#FFF6DA] border-t-2 border-t-[#D8CEB2] font-bold uppercase tracking-wide text-[11.5px]`}>Total</td>
                      {rankCols.map(c => (
                        <td key={c.key} className={`${tdClass} font-bold text-ink-text border-t-2 border-t-[#D8CEB2]`}>
                          <Link to={rosterLink(districtId, c.key)} className="hover:text-maroon hover:underline">{c.count}</Link>
                        </td>
                      ))}
                      <td className={`${tdClass} font-bold text-[#000E89] text-[13.5px] border-t-2 border-t-[#D8CEB2]`}>{totals.totalOfficers || 0}</td>
                      <td className={`${tdClass} font-bold text-rust border-t-2 border-t-[#D8CEB2]`}>{totals.vacantPosts || 0}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'rank' && (
            <section className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
              <div className="px-5 py-3.5 border-b border-rule/50 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-[15px] font-serif font-bold text-ink-text">Vacant Posts Register</h3>
                  <p className="text-[11.5px] text-ink-text-soft">{totals.vacantPosts || 0} posts recorded as "Vacant" across {totals.districtsWithVacancies || 0} districts.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {registerSearchBox}
                  <button type="button" className="btn btn-excel btn-sm no-print" onClick={handleExportRegister} disabled={vacantPosts.length === 0}>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Register
                  </button>
                </div>
              </div>
              {vacantPosts.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13px] text-ink-text-soft">
                  {needle ? 'No vacant posts match this search.' : 'Every post on the roster is filled.'}
                </p>
              ) : (
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className={`${thClass} w-12 text-center`}>Sl</th>
                        <th className={`${thClass} text-left`}>Post / Designation</th>
                        <th className={`${thClass} text-center`}>Rank</th>
                        <th className={`${thClass} text-left`}>District</th>
                        <th className={`${thClass} w-12 no-print`} />
                      </tr>
                    </thead>
                    <tbody>
                      {vacantPosts.map((v, idx) => (
                        <tr key={v.id} onClick={() => navigate(`/officers/${v.id}`)} className={`${idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'} hover:bg-[#F4EEDF] cursor-pointer transition-colors`}>
                          <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                          <td className={`${tdClass} !text-left font-semibold text-ink-text`}>{v.designation}</td>
                          <td className={tdClass}><span className="stamp stamp-warning">{v.rank}</span></td>
                          <td className={`${tdClass} !text-left font-medium text-ink-text`}>{v.district}</td>
                          <td className={`${tdClass} no-print`} onClick={e => e.stopPropagation()}>
                            {(role === 'admin' || v.createdById === currentUserId) && (
                              <button type="button" className="icon-btn mx-auto" title="Fill this post (edit record)" onClick={() => navigate(`/officers/${v.id}/edit`)}>
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ── Tenure ── */}
          {activeTab === 'tenure' && (
            <>
              <section className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
                <div className="px-5 py-3.5 border-b border-rule/50 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-[15px] font-serif font-bold text-ink-text">Tenure at Current Posting — District-wise</h3>
                    <p className="text-[11.5px] text-ink-text-soft">Years since reporting date. Officers at {data.longTenureYears || 3}+ years are due for transfer review.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-ink-text-soft">
                    {tenureBuckets.map(b => (
                      <span key={b.key} className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: TENURE_COLORS[b.key] }} />
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={`${thClass} w-12 text-center`}>Sl</th>
                        <th className={`${stickyTh} min-w-[160px] bg-[#F5F2E9]`}>District</th>
                        {tenureBuckets.map(b => <th key={b.key} className={`${thClass} text-center`}>{b.label}</th>)}
                        <th className={`${thClass} text-center bg-[#ECE6D3] text-ink-text`}>In Position</th>
                        <th className={`${thClass} text-left min-w-[200px]`}>Distribution</th>
                        <th className={`${thClass} text-center`}>{data.longTenureYears || 3}+ yrs Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const share = pct(r.tenure['3plus'], r.filled);
                        return (
                          <tr key={r.districtId} className={idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'}>
                            <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                            <td className={stickyTd}>
                              <Link to={rosterLink(r.districtId)} className="hover:text-maroon hover:underline">{r.district}</Link>
                            </td>
                            {tenureBuckets.map(b => (
                              <td key={b.key} className={`${tdClass} ${b.key === '3plus' && r.tenure[b.key] ? 'font-bold text-rust' : 'text-ink-text'}`}>
                                {r.tenure[b.key] || <span className="text-ink-text-faint">·</span>}
                              </td>
                            ))}
                            <td className={`${tdClass} font-bold text-ink-text bg-[#F5F2E9]/70`}>{r.filled}</td>
                            <td className="py-2.5 px-3 border-b border-[#EFEAD9]">
                              {r.filled > 0 ? (
                                <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-parchment-2 gap-[2px]">
                                  {tenureBuckets.filter(b => r.tenure[b.key] > 0).map(b => (
                                    <div
                                      key={b.key}
                                      style={{ width: `${(r.tenure[b.key] / r.filled) * 100}%`, backgroundColor: TENURE_COLORS[b.key] }}
                                      title={`${b.label}: ${r.tenure[b.key]}`}
                                    />
                                  ))}
                                </div>
                              ) : <span className="text-ink-text-faint text-[12px]">—</span>}
                            </td>
                            <td className={tdClass}>
                              {r.filled > 0 ? (
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${share >= 40 ? 'bg-brick-bg text-brick border-brick-soft' : share > 0 ? 'bg-rust-bg text-rust border-rust/30' : 'bg-forest-bg text-forest border-forest-soft'}`}>
                                  {share}%
                                </span>
                              ) : <span className="text-ink-text-faint">·</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FFF6DA]">
                        <td className={`${tdClass} border-t-2 border-t-[#D8CEB2]`} />
                        <td className={`${stickyTd} bg-[#FFF6DA] border-t-2 border-t-[#D8CEB2] font-bold uppercase tracking-wide text-[11.5px]`}>Total</td>
                        {tenureBuckets.map(b => (
                          <td key={b.key} className={`${tdClass} font-bold text-ink-text border-t-2 border-t-[#D8CEB2]`}>{tenureTotals[b.key] || 0}</td>
                        ))}
                        <td className={`${tdClass} font-bold text-[#000E89] text-[13.5px] border-t-2 border-t-[#D8CEB2]`}>{inPosition}</td>
                        <td className={`${tdClass} border-t-2 border-t-[#D8CEB2]`} />
                        <td className={`${tdClass} font-bold text-ink-text border-t-2 border-t-[#D8CEB2]`}>{pct(tenureTotals['3plus'], inPosition)}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <section className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
                <div className="px-5 py-3.5 border-b border-rule/50 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-[15px] font-serif font-bold text-ink-text">Long Tenure Register</h3>
                    <p className="text-[11.5px] text-ink-text-soft">{totals.longTenureCount || 0} officers at the current posting for {data.longTenureYears || 3}+ years, longest first.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {registerSearchBox}
                    <button type="button" className="btn btn-excel btn-sm no-print" onClick={handleExportRegister} disabled={longTenure.length === 0}>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Export Register
                    </button>
                  </div>
                </div>
                {longTenure.length === 0 ? (
                  <p className="px-5 py-10 text-center text-[13px] text-ink-text-soft">
                    {needle ? 'No officers match this search.' : `No officer has crossed ${data.longTenureYears || 3} years at the current posting.`}
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className={`${thClass} w-12 text-center`}>Sl</th>
                          <th className={`${thClass} text-left`}>Officer Name</th>
                          <th className={`${thClass} text-left`}>Designation</th>
                          <th className={`${thClass} text-left`}>District</th>
                          <th className={`${thClass} text-left`}>Reporting Date</th>
                          <th className={`${thClass} text-center`}>Tenure</th>
                        </tr>
                      </thead>
                      <tbody>
                        {longTenure.map((o, idx) => (
                          <tr key={o.id} onClick={() => navigate(`/officers/${o.id}`)} className={`${idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'} hover:bg-[#F4EEDF] cursor-pointer transition-colors`}>
                            <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                            <td className={`${tdClass} !text-left font-semibold text-maroon`}>{o.name}</td>
                            <td className={`${tdClass} !text-left`}><span className="stamp stamp-info">{o.designation}</span></td>
                            <td className={`${tdClass} !text-left font-medium text-ink-text`}>{o.district}</td>
                            <td className={`${tdClass} !text-left text-ink-text-soft whitespace-nowrap`}>{formatOfficerDate(o.reportingDate)}</td>
                            <td className={tdClass}><span className={`stamp ${o.years >= 5 ? 'stamp-danger' : 'stamp-warning'}`}>{o.years} yrs</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ── Completeness ── */}
          {activeTab === 'completeness' && (
            <>
              <section className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
                <div className="px-5 py-3.5 border-b border-rule/50">
                  <h3 className="text-[15px] font-serif font-bold text-ink-text">Profile Completeness — District-wise</h3>
                  <p className="text-[11.5px] text-ink-text-soft">Officers in position with each detail recorded (vacant posts excluded). A complete profile has all five.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={`${thClass} w-12 text-center`}>Sl</th>
                        <th className={`${stickyTh} min-w-[160px] bg-[#F5F2E9]`}>District</th>
                        <th className={`${thClass} text-center bg-[#ECE6D3] text-ink-text`}>In Position</th>
                        {COMPLETENESS_FIELDS.map(f => <th key={f} className={`${thClass} text-center !whitespace-normal max-w-[96px] leading-tight`}>{COMPLETENESS_LABELS[f]}</th>)}
                        <th className={`${thClass} text-center`}>Complete</th>
                        <th className={`${thClass} text-left min-w-[150px]`}>Completeness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const rate = pct(r.completeProfiles, r.filled);
                        return (
                          <tr key={r.districtId} className={idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'}>
                            <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                            <td className={stickyTd}>
                              <Link to={rosterLink(r.districtId)} className="hover:text-maroon hover:underline">{r.district}</Link>
                            </td>
                            <td className={`${tdClass} font-bold text-ink-text bg-[#F5F2E9]/70`}>{r.filled}</td>
                            {COMPLETENESS_FIELDS.map(f => {
                              const missing = r.filled - r.completeness[f];
                              return (
                                <td key={f} className={tdClass}>
                                  {r.filled ? (
                                    <span className={missing ? 'text-ink-text' : 'text-forest font-semibold'} title={missing ? `${missing} missing` : 'All recorded'}>
                                      {r.completeness[f]}
                                      {missing > 0 && <span className="text-[10.5px] text-brick font-semibold ml-1">−{missing}</span>}
                                    </span>
                                  ) : <span className="text-ink-text-faint">·</span>}
                                </td>
                              );
                            })}
                            <td className={`${tdClass} font-semibold text-ink-text`}>{r.filled ? r.completeProfiles : <span className="text-ink-text-faint">·</span>}</td>
                            <td className="py-2.5 px-3 border-b border-[#EFEAD9]">
                              {r.filled ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 rounded-full bg-parchment-2 overflow-hidden">
                                    <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(2, rate)}%` }} />
                                  </div>
                                  <span className="text-[11.5px] font-mono font-bold text-ink-text w-10 text-right tabular-nums">{rate}%</span>
                                </div>
                              ) : <span className="text-ink-text-faint text-[12px]">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FFF6DA]">
                        <td className={`${tdClass} border-t-2 border-t-[#D8CEB2]`} />
                        <td className={`${stickyTd} bg-[#FFF6DA] border-t-2 border-t-[#D8CEB2] font-bold uppercase tracking-wide text-[11.5px]`}>Total</td>
                        <td className={`${tdClass} font-bold text-[#000E89] text-[13.5px] border-t-2 border-t-[#D8CEB2]`}>{inPosition}</td>
                        {COMPLETENESS_FIELDS.map(f => (
                          <td key={f} className={`${tdClass} font-bold text-ink-text border-t-2 border-t-[#D8CEB2]`}>{completenessTotals[f] || 0}</td>
                        ))}
                        <td className={`${tdClass} font-bold text-ink-text border-t-2 border-t-[#D8CEB2]`}>{totals.completeProfiles || 0}</td>
                        <td className={`${tdClass} font-bold text-forest border-t-2 border-t-[#D8CEB2] !text-left`}>{totals.completenessRate || 0}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <section className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
                <div className="px-5 py-3.5 border-b border-rule/50 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-[15px] font-serif font-bold text-ink-text">Profiles Needing Details</h3>
                    <p className="text-[11.5px] text-ink-text-soft">{data.incompleteTotal || 0} officers with one or more details missing, most missing first.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {registerSearchBox}
                    <button type="button" className="btn btn-excel btn-sm no-print" onClick={handleExportRegister} disabled={incomplete.length === 0}>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Export List
                    </button>
                  </div>
                </div>
                {incomplete.length === 0 ? (
                  <p className="px-5 py-10 text-center text-[13px] text-ink-text-soft">
                    {needle ? 'No officers match this search.' : 'Every officer profile is complete.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className={`${thClass} w-12 text-center`}>Sl</th>
                          <th className={`${thClass} text-left`}>Officer Name</th>
                          <th className={`${thClass} text-left`}>Designation</th>
                          <th className={`${thClass} text-left`}>District</th>
                          <th className={`${thClass} text-left`}>Missing Details</th>
                          <th className={`${thClass} w-12 no-print`} />
                        </tr>
                      </thead>
                      <tbody>
                        {incomplete.map((o, idx) => (
                          <tr key={o.id} className={`${idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'} hover:bg-[#F4EEDF] transition-colors`}>
                            <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                            <td className={`${tdClass} !text-left`}>
                              <Link to={`/officers/${o.id}`} className="font-semibold text-maroon hover:underline">{o.name}</Link>
                            </td>
                            <td className={`${tdClass} !text-left text-ink-text`}>{o.designation}</td>
                            <td className={`${tdClass} !text-left font-medium text-ink-text`}>{o.district}</td>
                            <td className={`${tdClass} !text-left`}>
                              <div className="flex flex-wrap gap-1">
                                {o.missing.map(f => (
                                  <span key={f} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brick-bg text-brick border border-brick-soft whitespace-nowrap">
                                    {COMPLETENESS_LABELS[f] || f}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className={`${tdClass} no-print`}>
                              {(role === 'admin' || o.createdById === currentUserId) && (
                                <button type="button" className="icon-btn mx-auto" title="Edit officer" onClick={() => navigate(`/officers/${o.id}/edit`)}>
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

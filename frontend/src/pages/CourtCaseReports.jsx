import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, Landmark, Users, Hourglass, FileSpreadsheet, RefreshCw, Printer, Filter, AlertCircle,
  Search, Gavel, ShieldCheck, ShieldX, Scale, Download
} from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';
import { exportTabularReportExcel, exportCourtCasesToExcel } from '../lib/exportExcel';
import {
  STATUS_META, AGING_COLORS, PENDING, fetchCourtCaseAnalytics, formatCaseDate, formatDuration, pct
} from '../lib/courtCases';

const BANNER = 'KARNATAKA LOKAYUKTA · COURT CASES REGISTER';

const TABS = [
  { id: 'district', label: 'District-wise', icon: MapPin },
  { id: 'bench', label: 'Bench-wise', icon: Landmark },
  { id: 'spp', label: 'SPP-wise', icon: Users },
  { id: 'aging', label: 'Stay Aging', icon: Hourglass }
];

const thClass = 'py-3 px-3 text-[10.5px] uppercase tracking-[0.06em] text-ink-text-soft font-bold bg-[#F5F2E9] border-b border-[#D8CEB2] whitespace-nowrap';
const tdClass = 'py-2.5 px-3 text-[12.5px] border-b border-[#EFEAD9] text-center tabular-nums';
const tdLeft = 'py-2.5 px-3 text-[12.5px] border-b border-[#EFEAD9] text-left';
const footTd = `${tdClass} font-bold text-ink-text border-t-2 border-t-[#D8CEB2]`;

function MiniKpi({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#FFFDF7] border border-rule/80 rounded-lg px-3.5 py-2.5 shadow-2xs">
      <div className="text-[10.5px] font-semibold text-ink-text-soft uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: color || '#A97B33' }} />
        {label}
      </div>
      <div className="text-[22px] font-serif font-bold text-ink-text mt-0.5 tabular-nums leading-tight">{Number(value || 0).toLocaleString('en-IN')}</div>
    </div>
  );
}

// Count cell that drills into the register; zero renders as a quiet dot
function CountLink({ value, to, tone }) {
  if (!value) return <span className="text-ink-text-faint">·</span>;
  return <Link to={to} className={`font-semibold hover:underline ${tone || 'text-ink-text hover:text-maroon'}`}>{value}</Link>;
}

function ReportSection({ title, subtitle, actions, children }) {
  return (
    <section className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
      <div className="px-5 py-3.5 border-b border-rule/50 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[15px] font-serif font-bold text-ink-text">{title}</h3>
          {subtitle && <p className="text-[11.5px] text-ink-text-soft">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function CourtCaseReports() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError } = useToast();

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const isGlobalUser = role === 'admin' || isHeadOffice;
  const userDistrictName = localStorage.getItem('districtName') || '';

  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'district');
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
      setData(await fetchCourtCaseAnalytics(districtId));
    } catch (err) {
      setError(err.message || 'Could not load court case reports.');
    } finally {
      setLoading(false);
    }
  }, [districtId]);

  useEffect(() => { load(); }, [load]);

  const switchTab = (id) => {
    setActiveTab(id);
    setSearchParams(id === 'district' ? {} : { tab: id }, { replace: true });
  };

  const t = data?.totals || {};
  const scopeLabel = !isGlobalUser
    ? `${userDistrictName} District`
    : districtId ? (districts.find(d => d.id === districtId)?.name || 'Selected District') : 'State-wide (All Districts)';

  const listLink = (params = {}) => {
    const qs = new URLSearchParams();
    if (isGlobalUser && districtId && !params.districtId) qs.set('districtId', districtId);
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return `/court-cases${qs.toString() ? `?${qs}` : ''}`;
  };

  const districtRows = useMemo(() => (data?.byDistrict || []).filter(d => !hideEmpty || d.total > 0), [data, hideEmpty]);
  const agingBuckets = data?.agingBuckets || [];
  const agingTotals = useMemo(() => Object.fromEntries((data?.aging || []).map(a => [a.key, a.count])), [data]);
  const needle = registerSearch.trim().toLowerCase();
  const pendingRegister = useMemo(
    () => (data?.watchlist || []).filter(c => !needle || [c.crimeNo, c.wpCrlpNo, c.district, c.sppName, c.hcBench].some(v => (v || '').toLowerCase().includes(needle))),
    [data, needle]
  );

  const exportTab = async () => {
    try {
      const statusCols = [
        { header: 'Total Cases', key: 'total', width: 11, bold: true },
        { header: 'Stay in Force', key: 'pending', width: 12 },
        { header: 'Vacated', key: 'vacated', width: 10 },
        { header: 'Quashed', key: 'quash', width: 10 }
      ];
      const statusTotals = { total: t.total || 0, pending: t.pending || 0, vacated: t.vacated || 0, quash: t.quash || 0 };

      if (activeTab === 'district') {
        await exportTabularReportExcel({
          bannerTitle: BANNER,
          reportTitle: 'District-wise Court Case Status',
          sheetName: 'District-wise',
          scopeLabel,
          columns: [
            { header: 'Sl No', key: 'sl', width: 7 },
            { header: 'District', key: 'district', width: 22, align: 'left', bold: true },
            ...statusCols,
            { header: 'SLPs Filed', key: 'slp', width: 10 },
            { header: 'SPP Not Informed', key: 'sppNotInformed', width: 13 }
          ],
          rows: districtRows.map((r, i) => ({ sl: i + 1, ...r })),
          totalsRow: { sl: '', district: 'TOTAL', ...statusTotals, slp: t.slpFiled || 0, sppNotInformed: t.sppNotInformed || 0 },
          fileSlug: 'Court_Cases_District_Wise'
        });
      } else if (activeTab === 'bench') {
        await exportTabularReportExcel({
          bannerTitle: BANNER,
          reportTitle: "Hon'ble High Court Bench-wise Status",
          sheetName: 'Bench-wise',
          scopeLabel,
          columns: [
            { header: 'Sl No', key: 'sl', width: 7 },
            { header: 'High Court Bench', key: 'bench', width: 22, align: 'left', bold: true },
            ...statusCols
          ],
          rows: (data.byBench || []).map((r, i) => ({ sl: i + 1, ...r })),
          totalsRow: { sl: '', bench: 'TOTAL', ...statusTotals },
          fileSlug: 'Court_Cases_Bench_Wise'
        });
      } else if (activeTab === 'spp') {
        await exportTabularReportExcel({
          bannerTitle: BANNER,
          reportTitle: 'SPP-wise Court Case Status',
          sheetName: 'SPP-wise',
          scopeLabel,
          columns: [
            { header: 'Sl No', key: 'sl', width: 7 },
            { header: 'Name of the SPP', key: 'spp', width: 26, align: 'left', bold: true },
            ...statusCols,
            { header: 'SPP Not Informed', key: 'notInformed', width: 13 },
            { header: 'Avg Days: Stay → SPP Informed', key: 'avgLag', width: 16 }
          ],
          rows: (data.bySpp || []).map((r, i) => ({ sl: i + 1, ...r, avgLag: r.avgLagDays ?? '' })),
          totalsRow: { sl: '', spp: 'TOTAL', ...statusTotals, notInformed: t.sppNotInformed || 0, avgLag: t.avgSppLagDays ?? '' },
          fileSlug: 'Court_Cases_SPP_Wise'
        });
      } else {
        await exportTabularReportExcel({
          bannerTitle: BANNER,
          reportTitle: 'Age of Stays in Force — District-wise',
          sheetName: 'Stay Aging',
          scopeLabel,
          columns: [
            { header: 'Sl No', key: 'sl', width: 7 },
            { header: 'District', key: 'district', width: 22, align: 'left', bold: true },
            ...agingBuckets.map(b => ({ header: b.label, key: b.key, width: 14 })),
            { header: 'Stays in Force', key: 'pending', width: 12, bold: true }
          ],
          rows: districtRows.map((r, i) => ({ sl: i + 1, district: r.district, ...r.aging, pending: r.pending })),
          totalsRow: { sl: '', district: 'TOTAL', ...agingTotals, pending: t.pending || 0 },
          fileSlug: 'Court_Cases_Stay_Aging'
        });
      }
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export report to Excel.');
    }
  };

  const exportPendingRegister = async () => {
    try {
      await exportTabularReportExcel({
        bannerTitle: BANNER,
        reportTitle: 'Stays in Force — Oldest First',
        sheetName: 'Stays in Force',
        scopeLabel,
        columns: [
          { header: 'Sl No', key: 'sl', width: 7 },
          { header: 'District', key: 'district', width: 18, align: 'left' },
          { header: 'Crime No', key: 'crimeNo', width: 10, bold: true },
          { header: 'WP/Crl.P No', key: 'wpCrlpNo', width: 18 },
          { header: 'Bench', key: 'hcBench', width: 12 },
          { header: 'Name of the SPP', key: 'sppName', width: 22, align: 'left' },
          { header: 'Stay Date', key: 'stayDate', width: 13 },
          { header: 'Stay Type', key: 'stayType', width: 20, align: 'left' },
          { header: 'Days in Force', key: 'days', width: 11, bold: true }
        ],
        rows: pendingRegister.map((c, i) => ({ sl: i + 1, ...c, stayDate: formatCaseDate(c.stayDate) })),
        fileSlug: 'Court_Cases_Stays_In_Force'
      });
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export register to Excel.');
    }
  };

  const exportFullRegister = async () => {
    try {
      await exportCourtCasesToExcel({ districtId }, scopeLabel);
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export court cases to Excel.');
    }
  };

  const statusHeaders = (
    <>
      <th className={`${thClass} text-center bg-[#ECE6D3] text-ink-text`}>Total</th>
      {['Pending', 'Vacated', 'Quash'].map(s => (
        <th key={s} className={`${thClass} text-center`}>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
            {STATUS_META[s].label}
          </span>
        </th>
      ))}
    </>
  );
  const statusCells = (r, base) => (
    <>
      <td className={`${tdClass} font-bold text-ink-text bg-[#F5F2E9]/70`}><CountLink value={r.total} to={listLink(base)} /></td>
      <td className={tdClass}><CountLink value={r.pending} to={listLink({ ...base, hcStatus: PENDING })} tone="text-rust" /></td>
      <td className={tdClass}><CountLink value={r.vacated} to={listLink({ ...base, hcStatus: 'Vacated' })} tone="text-[#1D6FA8]" /></td>
      <td className={tdClass}><CountLink value={r.quash} to={listLink({ ...base, hcStatus: 'Quash' })} tone="text-brick" /></td>
    </>
  );
  const statusFoot = (
    <>
      <td className={`${footTd} text-[#000E89] text-[13.5px]`}>{t.total || 0}</td>
      <td className={footTd}>{t.pending || 0}</td>
      <td className={footTd}>{t.vacated || 0}</td>
      <td className={footTd}>{t.quash || 0}</td>
    </>
  );

  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }} className="pb-16 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-[20px] font-serif font-bold text-ink-text tracking-tight leading-tight">Court Case Reports</h2>
            <p className="text-[11.5px] text-ink-text-soft">ನ್ಯಾಯಾಲಯ ಪ್ರಕರಣಗಳ ವರದಿಗಳು · {scopeLabel}</p>
          </div>
          <div className="flex items-center p-0.5 rounded-lg bg-stone-200/70 border border-rule/70 no-print">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-[12px] transition-all ${
                  activeTab === tab.id ? 'bg-[#000E89] text-white shadow-xs' : 'text-ink-text hover:text-black hover:bg-white/60'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap no-print">
          <button type="button" className="btn btn-excel btn-sm" onClick={exportTab} disabled={loading || !t.total}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={exportFullRegister} disabled={loading || !t.total}>
            <Download className="w-3.5 h-3.5" /> Full Register
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()} disabled={loading || !data}>
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button type="button" className="p-2 rounded-lg border border-rule/70 bg-white text-ink-text-soft hover:text-ink-text transition shadow-2xs" onClick={load} title="Refresh report data">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#A97B33]' : ''}`} />
          </button>
        </div>
      </div>

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
        {isGlobalUser && !districtId && (activeTab === 'district' || activeTab === 'aging') && (
          <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-ink-text-soft cursor-pointer select-none">
            <input type="checkbox" checked={hideEmpty} onChange={e => setHideEmpty(e.target.checked)} className="w-3.5 h-3.5 accent-[#000E89]" />
            Only districts with court cases
          </label>
        )}
      </div>

      {data && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <MiniKpi icon={Gavel} label="Total Cases" value={t.total} />
          <MiniKpi icon={Hourglass} label="Stay in Force" value={t.pending} color={STATUS_META.Pending.color} />
          <MiniKpi icon={ShieldCheck} label="Vacated" value={t.vacated} color={STATUS_META.Vacated.color} />
          <MiniKpi icon={ShieldX} label="Quashed" value={t.quash} color={STATUS_META.Quash.color} />
          <MiniKpi icon={Scale} label="SLPs Filed" value={t.slpFiled} />
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
      ) : !t.total ? (
        <div className="bg-[#FFFDF7] border border-rule rounded-xl py-16 text-center shadow-soft">
          <Landmark className="w-10 h-10 mx-auto text-ink-text-faint mb-3" strokeWidth={1.5} />
          <h3 className="font-serif text-[17px] text-ink-text">No court cases on record</h3>
          <p className="text-[12.5px] text-ink-text-soft mt-1">Reports appear once court cases are registered.</p>
          <button type="button" className="btn btn-primary btn-sm mt-4" onClick={() => navigate('/court-cases/new')}>Add Court Case</button>
        </div>
      ) : (
        <>
          {activeTab === 'district' && (
            <ReportSection title="District-wise Court Case Status" subtitle="Click any number to open those cases in the register.">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-12 text-center`}>Sl</th>
                      <th className={`${thClass} text-left min-w-[170px]`}>District</th>
                      {statusHeaders}
                      <th className={`${thClass} text-center`}>SLPs Filed</th>
                      <th className={`${thClass} text-center`}>SPP Not Informed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtRows.map((r, idx) => (
                      <tr key={r.districtId} className={idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'}>
                        <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                        <td className={`${tdLeft} font-semibold text-ink-text`}>{r.district}</td>
                        {statusCells(r, { districtId: r.districtId })}
                        <td className={tdClass}><CountLink value={r.slp} to={listLink({ districtId: r.districtId, scStatus: 'filed' })} /></td>
                        <td className={tdClass}>
                          {r.sppNotInformed ? (
                            <Link to={listLink({ districtId: r.districtId, attention: 'sppNotInformed' })} className="text-[11px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-900 border-amber-200 hover:underline">{r.sppNotInformed}</Link>
                          ) : <span className="text-ink-text-faint">·</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FFF6DA]">
                      <td className={footTd} />
                      <td className={`${footTd} !text-left uppercase tracking-wide text-[11.5px]`}>Total</td>
                      {statusFoot}
                      <td className={footTd}>{t.slpFiled || 0}</td>
                      <td className={footTd}>{t.sppNotInformed || 0}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </ReportSection>
          )}

          {activeTab === 'bench' && (
            <ReportSection title="Hon'ble High Court Bench-wise Status" subtitle="Bengaluru (Principal), Dharwad and Kalaburagi benches.">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-12 text-center`}>Sl</th>
                      <th className={`${thClass} text-left min-w-[170px]`}>High Court Bench</th>
                      {statusHeaders}
                      <th className={`${thClass} text-left min-w-[220px]`}>Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byBench || []).map((r, idx) => (
                      <tr key={r.bench} className={idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'}>
                        <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                        <td className={`${tdLeft} font-semibold text-ink-text`}>{r.bench === 'Not recorded' ? 'Bench not recorded' : `${r.bench} Bench`}</td>
                        {statusCells(r, r.bench === 'Not recorded' ? {} : { hcBench: r.bench })}
                        <td className={tdLeft}>
                          {r.total ? (
                            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-parchment-2 gap-[2px]">
                              {['Pending', 'Vacated', 'Quash'].map(s => {
                                const v = r[s === 'Pending' ? 'pending' : s.toLowerCase()];
                                return v ? <div key={s} style={{ flex: v, backgroundColor: STATUS_META[s].color }} title={`${STATUS_META[s].label}: ${v}`} /> : null;
                              })}
                            </div>
                          ) : <span className="text-ink-text-faint">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FFF6DA]">
                      <td className={footTd} />
                      <td className={`${footTd} !text-left uppercase tracking-wide text-[11.5px]`}>Total</td>
                      {statusFoot}
                      <td className={footTd} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </ReportSection>
          )}

          {activeTab === 'spp' && (
            <ReportSection title="SPP-wise Court Case Status" subtitle="Workload and follow-up for each Special Public Prosecutor.">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-12 text-center`}>Sl</th>
                      <th className={`${thClass} text-left min-w-[200px]`}>Name of the SPP</th>
                      {statusHeaders}
                      <th className={`${thClass} text-center`}>SPP Not Informed</th>
                      <th className={`${thClass} text-center`}>Avg Days: Stay → SPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.bySpp || []).map((r, idx) => {
                      const base = { sppName: r.assigned ? r.spp : '__none' };
                      return (
                        <tr key={r.spp} className={idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'}>
                          <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                          <td className={`${tdLeft} font-semibold ${r.assigned ? 'text-ink-text' : 'text-ink-text-faint italic'}`}>{r.spp}</td>
                          {statusCells(r, base)}
                          <td className={tdClass}>
                            {r.notInformed ? (
                              <Link to={listLink({ ...base, attention: 'sppNotInformed' })} className="text-[11px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-900 border-amber-200 hover:underline">{r.notInformed}</Link>
                            ) : <span className="text-ink-text-faint">·</span>}
                          </td>
                          <td className={tdClass}>{r.avgLagDays !== null ? `${r.avgLagDays} days` : <span className="text-ink-text-faint">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FFF6DA]">
                      <td className={footTd} />
                      <td className={`${footTd} !text-left uppercase tracking-wide text-[11.5px]`}>Total</td>
                      {statusFoot}
                      <td className={footTd}>{t.sppNotInformed || 0}</td>
                      <td className={footTd}>{t.avgSppLagDays !== null && t.avgSppLagDays !== undefined ? `${t.avgSppLagDays} days` : '—'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </ReportSection>
          )}

          {activeTab === 'aging' && (
            <>
              <ReportSection
                title="Age of Stays in Force — District-wise"
                subtitle="Pending stays grouped by time since the stay was granted."
                actions={
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-ink-text-soft">
                    {agingBuckets.map(b => (
                      <span key={b.key} className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: AGING_COLORS[b.key] }} />
                        {b.label}
                      </span>
                    ))}
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={`${thClass} w-12 text-center`}>Sl</th>
                        <th className={`${thClass} text-left min-w-[170px]`}>District</th>
                        {agingBuckets.map(b => <th key={b.key} className={`${thClass} text-center`}>{b.label}</th>)}
                        <th className={`${thClass} text-center bg-[#ECE6D3] text-ink-text`}>Stays in Force</th>
                      </tr>
                    </thead>
                    <tbody>
                      {districtRows.map((r, idx) => (
                        <tr key={r.districtId} className={idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'}>
                          <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                          <td className={`${tdLeft} font-semibold text-ink-text`}>{r.district}</td>
                          {agingBuckets.map(b => (
                            <td key={b.key} className={`${tdClass} ${(b.key === '1to2y' || b.key === '2plus') && r.aging[b.key] ? 'font-bold text-brick' : 'text-ink-text'}`}>
                              {r.aging[b.key] || <span className="text-ink-text-faint">·</span>}
                            </td>
                          ))}
                          <td className={`${tdClass} font-bold text-ink-text bg-[#F5F2E9]/70`}>
                            <CountLink value={r.pending} to={listLink({ districtId: r.districtId, hcStatus: PENDING })} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FFF6DA]">
                        <td className={footTd} />
                        <td className={`${footTd} !text-left uppercase tracking-wide text-[11.5px]`}>Total</td>
                        {agingBuckets.map(b => <td key={b.key} className={footTd}>{agingTotals[b.key] || 0}</td>)}
                        <td className={`${footTd} text-[#000E89] text-[13.5px]`}>{t.pending || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </ReportSection>

              <ReportSection
                title="Stays in Force — Oldest First"
                subtitle={`${(data.watchlist || []).length} pending stays with a recorded stay date.`}
                actions={
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-full sm:w-[260px] no-print">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-text-faint pointer-events-none" />
                      <input
                        type="text"
                        className="app-input !py-2 pl-9 text-[13px]"
                        placeholder="Search crime no, WP, district, SPP…"
                        value={registerSearch}
                        onChange={e => setRegisterSearch(e.target.value)}
                      />
                    </div>
                    <button type="button" className="btn btn-excel btn-sm no-print" onClick={exportPendingRegister} disabled={pendingRegister.length === 0}>
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                }
              >
                {pendingRegister.length === 0 ? (
                  <p className="px-5 py-10 text-center text-[13px] text-ink-text-soft">{needle ? 'No stays match this search.' : 'No stays in force with a recorded stay date.'}</p>
                ) : (
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className={`${thClass} w-12 text-center`}>Sl</th>
                          <th className={`${thClass} text-left`}>Crime No</th>
                          <th className={`${thClass} text-left`}>WP/Crl.P No · Bench</th>
                          <th className={`${thClass} text-left`}>District</th>
                          <th className={`${thClass} text-left`}>SPP</th>
                          <th className={`${thClass} text-left`}>Stay Date · Type</th>
                          <th className={`${thClass} text-center`}>In Force For</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRegister.map((c, idx) => (
                          <tr key={c.id} onClick={() => navigate(`/court-cases/${c.id}`)} className={`${idx % 2 ? 'bg-[#FCFAF6]' : 'bg-white'} hover:bg-[#F4EEDF] cursor-pointer transition-colors`}>
                            <td className={`${tdClass} text-ink-text-faint font-mono`}>{idx + 1}</td>
                            <td className={`${tdLeft} font-mono font-bold text-maroon`}>{c.crimeNo}</td>
                            <td className={tdLeft}>
                              <span className="font-mono font-semibold text-ink-text">{c.wpCrlpNo || '—'}</span>
                              {c.hcBench && <span className="text-ink-text-soft"> · {c.hcBench}</span>}
                            </td>
                            <td className={`${tdLeft} font-medium text-ink-text`}>{c.district}</td>
                            <td className={`${tdLeft} text-ink-text-soft`}>{c.sppName || '—'}</td>
                            <td className={`${tdLeft} text-ink-text-soft whitespace-nowrap`}>{formatCaseDate(c.stayDate)}{c.stayType ? ` · ${c.stayType}` : ''}</td>
                            <td className={tdClass}><span className={`stamp ${c.days >= 365 ? 'stamp-danger' : 'stamp-warning'}`}>{formatDuration(c.days)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportSection>
            </>
          )}
        </>
      )}
    </div>
  );
}

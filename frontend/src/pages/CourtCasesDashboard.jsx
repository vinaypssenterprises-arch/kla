import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  Landmark, RotateCw, Filter, MapPin, Gavel, Hourglass, ShieldCheck, ShieldX, Send, Plus, Download,
  AlertCircle, ArrowUpRight, Scale, Users, CalendarClock, Layers, ChevronRight, FilePlus2
} from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { Card, KpiCard, EmptyState, ChartTooltip } from '../components/dashboard/ModuleCards';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';
import { exportCourtCasesToExcel } from '../lib/exportExcel';
import {
  STATUS_META, AGING_COLORS, PENDING, fetchCourtCaseAnalytics, formatCaseDate, formatDuration, pct
} from '../lib/courtCases';

const STATUS_KEYS = [
  { key: 'pending', status: 'Pending' },
  { key: 'vacated', status: 'Vacated' },
  { key: 'quash', status: 'Quash' }
];

function StatusLegend() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-text-soft flex-shrink-0 flex-wrap">
      {STATUS_KEYS.map(s => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_META[s.status].color }} />
          {STATUS_META[s.status].label}
        </span>
      ))}
    </div>
  );
}

// One row of a stacked status bar (bench / district), scaled to the largest row
function StatusRow({ label, sublabel, row, max, onClick, labelWidth = 128 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left px-2 py-1.5 -mx-2 rounded-lg hover:bg-parchment-2/60 transition-colors"
      title={`${label}: ${row.total} cases — ${row.pending} stay in force, ${row.vacated} vacated, ${row.quash} quashed`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 min-w-0" style={{ width: labelWidth }}>
          <div className="text-[12.5px] font-semibold text-ink-text truncate group-hover:text-maroon transition-colors">{label}</div>
          {sublabel && <div className="text-[10.5px] text-ink-text-faint truncate">{sublabel}</div>}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="flex h-3.5 rounded-[4px] overflow-hidden gap-[2px]" style={{ width: `${Math.max(2, (row.total / (max || 1)) * 100)}%` }}>
            {STATUS_KEYS.filter(s => row[s.key] > 0).map(s => (
              <div key={s.key} className="h-full" style={{ flex: row[s.key], backgroundColor: STATUS_META[s.status].color }} />
            ))}
          </div>
          <span className="text-[11.5px] font-mono font-bold text-ink-text-soft tabular-nums">{row.total}</span>
        </div>
      </div>
    </button>
  );
}

export default function CourtCasesDashboard() {
  const navigate = useNavigate();
  const { showError } = useToast();

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const isGlobalUser = role === 'admin' || isHeadOffice;
  const userDistrictName = localStorage.getItem('districtName') || '';

  const [districtId, setDistrictId] = useState('');
  const [districts, setDistricts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isGlobalUser) return;
    apiFetch('/districts')
      .then(res => (res.ok ? res.json() : []))
      .then(list => setDistricts(list.filter(d => d.isActive)))
      .catch(err => console.error('Failed to load districts', err));
  }, [isGlobalUser]);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      setData(await fetchCourtCaseAnalytics(districtId));
    } catch (err) {
      console.error('Court case analytics load failure:', err);
      setError(err.message || 'Could not load court case analytics.');
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 400);
    }
  }, [districtId]);

  useEffect(() => { load(); }, [load]);

  const scopeLabel = !isGlobalUser
    ? `${userDistrictName} District`
    : districtId ? (districts.find(d => d.id === districtId)?.name || 'Selected District') : 'State-wide';

  const handleExport = async () => {
    try {
      await exportCourtCasesToExcel({ districtId }, scopeLabel);
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export court cases to Excel.');
    }
  };

  // Drill into the register with filters pre-applied
  const listLink = (params = {}) => {
    const qs = new URLSearchParams();
    if (districtId && isGlobalUser) qs.set('districtId', districtId);
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return `/court-cases${qs.toString() ? `?${qs}` : ''}`;
  };

  const t = data?.totals || {};
  const total = t.total || 0;
  const benchMax = Math.max(1, ...(data?.byBench || []).map(b => b.total));
  const districtRows = (data?.byDistrict || []).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  const districtMax = Math.max(1, ...districtRows.map(d => d.total));
  const sppRows = data?.bySpp || [];
  const sppMax = Math.max(1, ...sppRows.map(s => s.total));
  const pendingTotal = t.pending || 0;
  const aging = data?.aging || [];
  const stayTypes = data?.byStayType || [];
  const stayTypeMax = Math.max(1, ...stayTypes.map(s => s.count));
  const watchTop = (data?.watchlist || []).slice(0, 10);
  const notInformedTop = (data?.sppNotInformed || []).slice(0, 8);

  return (
    <div className="space-y-6 pb-12" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      {/* Header banner */}
      <div className="bg-[#FFFDF7] border border-rule/70 rounded-xl p-5 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white p-1 flex-shrink-0 flex items-center justify-center shadow-md border-2 border-[#C9A15E]/60 ring-1 ring-[#000E89]/10">
              <img 
                src="/lokayukta-emblem.png" 
                alt="Karnataka Lokayukta" 
                className="w-10 h-10 object-contain select-none pointer-events-none" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-maroon/10 text-maroon border border-maroon/20">
                  Karnataka Lokayukta
                </span>
                <span className="text-[10px] uppercase tracking-wider font-mono text-ink-text-soft bg-parchment-2 px-2 py-0.5 rounded border border-rule/40">
                  Court Cases Module · ನ್ಯಾಯಾಲಯ ಪ್ರಕರಣಗಳು
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink-text mt-1 leading-tight">High Court Stay Dashboard</h1>
              <p className="text-[12.5px] text-ink-text-soft mt-0.5">
                Stays in force, outcomes, SPP follow-up and Supreme Court SLPs · <span className="font-semibold text-ink-text">{scopeLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-rule/80 text-ink-text hover:bg-parchment-2 transition-all shadow-xs disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-brass ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <button type="button" className="btn btn-excel btn-sm" onClick={handleExport} disabled={!total}>
              <Download className="w-3.5 h-3.5" />
              Export Register
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/court-cases/new')}>
              <Plus className="w-4 h-4" strokeWidth={2.3} />
              Add Court Case
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-rule/40 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-parchment-2/30 -mx-5 -mb-5 p-4 rounded-b-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-text mr-1">
              <Filter className="w-3.5 h-3.5 text-brass" />
              <span>Jurisdiction:</span>
            </div>
            {!isGlobalUser ? (
              <span className="font-mono text-xs font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brass" />
                {userDistrictName} District Jurisdiction
              </span>
            ) : (
              <>
                <SearchableSelect
                  className="w-auto min-w-[220px]"
                  value={districtId}
                  onChange={setDistrictId}
                  options={[{ value: '', label: 'All Districts (State-wide)' }, ...districts.map(d => ({ value: d.id, label: d.name }))]}
                  label="Filter by District"
                />
                {districtId && (
                  <button type="button" onClick={() => setDistrictId('')} className="text-[11px] text-maroon hover:underline font-semibold ml-1">
                    Reset to State-wide
                  </button>
                )}
              </>
            )}
          </div>
          {data?.generatedAt && (
            <span className="text-[11px] text-ink-text-faint font-mono">
              Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-36 skeleton-card rounded-xl" />)}
          </div>
          <div className="h-80 skeleton-card rounded-xl" />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h3 className="font-serif font-bold text-base">{error}</h3>
          <button type="button" onClick={() => load()} className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors">
            Retry Loading
          </button>
        </div>
      ) : total === 0 ? (
        <div className="bg-[#FFFDF7] border border-rule rounded-xl py-16 px-6 text-center shadow-soft">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F6E9EB] border border-[#E2C3C8] flex items-center justify-center mb-4">
            <Landmark className="w-7 h-7 text-maroon" />
          </div>
          <h3 className="font-serif text-[19px] font-bold text-ink-text">No court cases registered yet</h3>
          <p className="text-[13px] text-ink-text-soft mt-1.5 max-w-md mx-auto">
            Register High Court stay matters to track stays in force, SPP follow-up, vacate / quash outcomes and Supreme Court SLPs here.
          </p>
          <button type="button" className="btn btn-primary mt-5" onClick={() => navigate('/court-cases/new')}>
            <FilePlus2 className="w-4 h-4" /> Add the First Court Case
          </button>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <KpiCard
              icon={Gavel}
              label="Total Court Cases"
              value={total}
              accent="#60A5FA"
              badge={`${t.districtsWithCases || 0} Districts`}
              footer={`${t.slpFiled || 0} SLPs filed in Supreme Court`}
              to={listLink()}
            />
            <KpiCard
              icon={Hourglass}
              label="Stay in Force"
              value={t.pending}
              accent="#FBBF24"
              badge={`${pct(t.pending, total)}% Pending`}
              progress={pct(t.pending, total)}
              footer={`${t.longPending || 0} pending for over 1 year`}
              to={listLink({ hcStatus: PENDING })}
            />
            <KpiCard
              icon={ShieldCheck}
              label="Stays Vacated"
              value={t.vacated}
              accent="#60A5FA"
              badge={`${pct(t.vacated, total)}% of Cases`}
              progress={pct(t.vacated, total)}
              footer="Investigation can resume"
              to={listLink({ hcStatus: 'Vacated' })}
            />
            <KpiCard
              icon={ShieldX}
              label="Quashed"
              value={t.quash}
              accent="#F87171"
              badge={`${pct(t.quash, total)}% of Cases`}
              progress={pct(t.quash, total)}
              footer={`${t.slpFiled || 0} SLPs · ${t.scPending || 0} pending in SC`}
              to={listLink({ hcStatus: 'Quash' })}
            />
            <KpiCard
              icon={Send}
              label="SPP Not Informed"
              value={t.sppNotInformed}
              accent="#FB923C"
              badge={t.sppNotInformed ? 'Action Needed' : 'All Informed'}
              progress={pct(t.sppNotInformed, t.pending)}
              footer={t.avgSppLagDays !== null && t.avgSppLagDays !== undefined ? `Avg ${t.avgSppLagDays} days from stay to SPP` : 'No SPP dates recorded yet'}
              to={listLink({ attention: 'sppNotInformed' })}
            />
          </section>

          {/* Status overview + bench */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card icon={Layers} title="Stay Status" subtitle="High Court outcome across all cases" className="lg:col-span-2">
              <div className="flex h-4 w-full rounded-full overflow-hidden bg-parchment-2 gap-[2px]" role="img" aria-label="Stay status distribution">
                {STATUS_KEYS.filter(s => t[s.key] > 0).map(s => (
                  <div key={s.key} className="h-full" style={{ width: `${(t[s.key] / total) * 100}%`, backgroundColor: STATUS_META[s.status].color }} title={`${STATUS_META[s.status].label}: ${t[s.key]}`} />
                ))}
              </div>
              <div className="mt-4 divide-y divide-rule/40">
                {STATUS_KEYS.map(s => (
                  <Link key={s.key} to={listLink({ hcStatus: s.status === 'Pending' ? PENDING : s.status })} className="group flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <span className="flex items-center gap-2 text-ink-text font-semibold group-hover:text-maroon transition-colors">
                      <span className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: STATUS_META[s.status].color }} />
                      {STATUS_META[s.status].label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-serif text-[18px] font-bold text-ink-text tabular-nums">{t[s.key] || 0}</span>
                      <span className="text-[11px] text-ink-text-faint w-9 text-right tabular-nums">{pct(t[s.key], total)}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-text-faint group-hover:text-maroon" />
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-rule/40 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'SLPs Filed', value: t.slpFiled },
                  { label: 'SC Vacated', value: t.scVacated },
                  { label: 'SC Quash', value: t.scQuash }
                ].map(s => (
                  <Link key={s.label} to={listLink({ scStatus: s.label === 'SLPs Filed' ? 'filed' : s.label === 'SC Vacated' ? 'Vacated' : 'Quash' })} className="rounded-lg border border-rule/60 bg-white/60 py-2 hover:border-brass transition-colors">
                    <div className="font-serif text-[18px] font-bold text-ink-text leading-tight">{s.value || 0}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-text-soft">{s.label}</div>
                  </Link>
                ))}
              </div>
            </Card>

            <Card icon={Landmark} title="High Court Benches" subtitle="Cases per bench by stay status · click to open" className="lg:col-span-3" action={<StatusLegend />}>
              <div className="space-y-2">
                {(data.byBench || []).map(b => (
                  <StatusRow
                    key={b.bench}
                    label={b.bench === 'Not recorded' ? 'Bench not recorded' : `${b.bench} Bench`}
                    sublabel={`${b.pending} in force · ${b.vacated} vacated · ${b.quash} quashed`}
                    row={b}
                    max={benchMax}
                    labelWidth={190}
                    onClick={() => navigate(listLink(b.bench === 'Not recorded' ? {} : { hcBench: b.bench }))}
                  />
                ))}
              </div>
            </Card>
          </section>

          {/* Districts + SPP workload */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
            <Card icon={MapPin} title="Cases by District" subtitle="Click a district to open its court cases" className="lg:col-span-3" action={<StatusLegend />}>
              {districtRows.length === 0 ? <EmptyState icon={Landmark} label="No court cases yet." /> : (
                <div className="space-y-1.5">
                  {districtRows.map(d => (
                    <StatusRow
                      key={d.districtId}
                      label={d.district}
                      sublabel={d.sppNotInformed ? `${d.sppNotInformed} SPP not informed` : undefined}
                      row={d}
                      max={districtMax}
                      onClick={() => navigate(`/court-cases?districtId=${d.districtId}`)}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card icon={Users} title="SPP Workload" subtitle="Cases handled by each Special Public Prosecutor" className="lg:col-span-2">
              <div className="space-y-1">
                {sppRows.map(s => (
                  <Link
                    key={s.spp}
                    to={listLink({ sppName: s.assigned ? s.spp : '__none' })}
                    className="group block px-2 py-2 -mx-2 rounded-lg hover:bg-parchment-2/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 text-[12.5px]">
                      <span className={`font-semibold truncate group-hover:text-maroon ${s.assigned ? 'text-ink-text' : 'text-ink-text-faint italic'}`}>{s.spp}</span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        {s.notInformed > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200" title="Stays in force where this SPP has not been informed">
                            {s.notInformed} not informed
                          </span>
                        )}
                        <span className="font-mono font-bold text-ink-text tabular-nums">{s.total}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-parchment-2 overflow-hidden">
                        <div className="h-full rounded-full bg-brass" style={{ width: `${Math.max(3, (s.total / sppMax) * 100)}%` }} />
                      </div>
                      <span className="text-[10.5px] text-ink-text-soft whitespace-nowrap">
                        {s.pending} in force{s.avgLagDays !== null ? ` · ${s.avgLagDays}d avg` : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </section>

          {/* Aging · monthly · stay types */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card icon={Hourglass} title="Age of Stays in Force" subtitle="Time since the stay was granted">
              {pendingTotal === 0 ? <EmptyState icon={Hourglass} label="No stays in force." /> : (
                <>
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-parchment-2 gap-[2px]" role="img" aria-label="Stay age distribution">
                    {aging.filter(a => a.count > 0).map(a => (
                      <div key={a.key} className="h-full" style={{ width: `${(a.count / pendingTotal) * 100}%`, backgroundColor: AGING_COLORS[a.key] }} title={`${a.label}: ${a.count}`} />
                    ))}
                  </div>
                  <div className="mt-4 divide-y divide-rule/40">
                    {aging.map(a => (
                      <div key={a.key} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                        <span className="flex items-center gap-2 text-ink-text">
                          <span className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: AGING_COLORS[a.key] }} />
                          <span className={a.key === '2plus' || a.key === '1to2y' ? 'font-bold' : 'font-medium'}>{a.label}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ink-text tabular-nums">{a.count}</span>
                          <span className="text-[10.5px] text-ink-text-faint w-9 text-right tabular-nums">{pct(a.count, pendingTotal)}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card icon={CalendarClock} title="Stays Granted" subtitle="By stay date, last 12 months">
              {(data.monthlyStays || []).every(m => m.count === 0) ? <EmptyState icon={CalendarClock} label="No stays granted in the last 12 months." /> : (
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyStays} margin={{ top: 18, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(16,24,38,0.06)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6E6248' }} axisLine={false} tickLine={false} interval={1} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6E6248' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip unit="Stays granted" />} cursor={{ fill: 'rgba(126,42,52,0.05)' }} />
                      <Bar dataKey="count" name="Stays" fill="#7E2A34" radius={[4, 4, 0, 0]} maxBarSize={22} label={{ position: 'top', fontSize: 10.5, fill: '#6E6248', fontWeight: 600 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card icon={Scale} title="Stay Types" subtitle="Nature of the stay granted">
              {stayTypes.length === 0 ? <EmptyState icon={Scale} label="No stay types recorded." /> : (
                <div className="space-y-1">
                  {stayTypes.map(s => (
                    <Link key={s.stayType} to={listLink({ stayType: s.stayType })} className="group block px-2 py-2 -mx-2 rounded-lg hover:bg-parchment-2/60 transition-colors">
                      <div className="flex items-center justify-between gap-3 text-[12.5px]">
                        <span className="font-semibold text-ink-text truncate group-hover:text-maroon">{s.stayType}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ink-text tabular-nums">{s.count}</span>
                          <span className="text-[10.5px] text-ink-text-faint w-9 text-right tabular-nums">{pct(s.count, total)}%</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-parchment-2 overflow-hidden">
                        <div className="h-full rounded-full bg-maroon" style={{ width: `${Math.max(3, (s.count / stayTypeMax) * 100)}%` }} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          {/* Watchlists */}
          <section className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
            <Card
              icon={Hourglass}
              title="Longest Stays in Force"
              subtitle="Pending stays, oldest first — priority for vacate applications"
              className="xl:col-span-3"
              action={t.longPending > 0 && <span className="stamp stamp-danger">{t.longPending} over 1 yr</span>}
            >
              {watchTop.length === 0 ? <EmptyState icon={Hourglass} label="No stays in force with a recorded stay date." /> : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[10.5px] uppercase tracking-[0.07em] text-ink-text-soft bg-[#F5F2E9] border-y border-[#D8CEB2]">
                        <th className="py-2.5 px-5 font-bold">Case</th>
                        <th className="py-2.5 px-3 font-bold">District</th>
                        <th className="py-2.5 px-3 font-bold">SPP</th>
                        <th className="py-2.5 px-5 font-bold text-right">Stay Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchTop.map(c => (
                        <tr key={c.id} onClick={() => navigate(`/court-cases/${c.id}`)} className="border-b border-[#EFEAD9] last:border-b-0 hover:bg-[#F4EEDF] cursor-pointer transition-colors">
                          <td className="py-2.5 px-5">
                            <div className="font-mono font-bold text-maroon">Cr.No {c.crimeNo}</div>
                            <div className="text-[11px] text-ink-text-soft">{c.wpCrlpNo || 'WP/Crl.P —'}{c.hcBench ? ` · ${c.hcBench}` : ''}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-ink-text">{c.district}</td>
                          <td className="py-2.5 px-3 text-ink-text-soft">{c.sppName || '—'}</td>
                          <td className="py-2.5 px-5 text-right whitespace-nowrap">
                            <span className={`stamp ${c.days >= 365 ? 'stamp-danger' : 'stamp-warning'}`}>{formatDuration(c.days)}</span>
                            <div className="text-[10.5px] text-ink-text-faint mt-1">since {formatCaseDate(c.stayDate)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 pt-3 text-[11.5px] text-ink-text-soft">
                    {(data.watchlist || []).length > watchTop.length ? `Showing ${watchTop.length} of ${data.watchlist.length}. ` : ''}
                    Full list in <Link to="/court-cases/reports?tab=aging" className="text-maroon font-semibold hover:underline">Court Case Reports → Stay Aging</Link>.
                  </div>
                </div>
              )}
            </Card>

            <Card
              icon={Send}
              title="SPP Not Informed"
              subtitle="Stays in force with no information date to the SPP"
              className="xl:col-span-2"
              action={t.sppNotInformed > 0 && <span className="stamp stamp-warning">{t.sppNotInformed} pending</span>}
            >
              {notInformedTop.length === 0 ? <EmptyState icon={Send} label="The SPP has been informed for every stay in force." /> : (
                <>
                  <div className="divide-y divide-rule/40">
                    {notInformedTop.map(c => (
                      <Link key={c.id} to={`/court-cases/${c.id}`} className="flex items-center gap-3 py-2.5 group">
                        <span className="min-w-[46px] h-8 px-1.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                          {c.crimeNo}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-ink-text truncate group-hover:text-maroon transition-colors">
                            {c.sppName || 'SPP not assigned'}
                          </div>
                          <div className="text-[11px] text-ink-text-soft truncate">
                            {c.district}{c.days !== null && c.days !== undefined ? ` · stay ${formatDuration(c.days)} old` : ''}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-ink-text-faint group-hover:text-maroon flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                  <div className="pt-3 text-[11.5px]">
                    <Link to={listLink({ attention: 'sppNotInformed' })} className="text-maroon font-semibold hover:underline inline-flex items-center gap-0.5">
                      Open all in register <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

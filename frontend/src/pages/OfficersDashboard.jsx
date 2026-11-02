import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList
} from 'recharts';
import {
  Shield, RotateCw, Filter, MapPin, Users, Award, Hourglass, ClipboardCheck,
  Plus, Download, AlertCircle, ArrowUpRight, UserPlus, CalendarClock, ChevronRight, Pencil, Building2, UserX
} from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';
import { Card, KpiCard, EmptyState, ChartTooltip } from '../components/dashboard/ModuleCards';
import { apiFetch } from '../lib/api';
import { exportOfficersToExcel } from '../lib/exportExcel';
import {
  fetchOfficerAnalytics, COMPLETENESS_LABELS, TENURE_COLORS, formatOfficerDate, pct
} from '../lib/officerAnalytics';

// Validated pair (dataviz palette check): distinct under CVD; vacant segments also carry legend + total labels
const FILLED_COLOR = '#1D3FBF';
const VACANT_COLOR = '#C98A10';

// Total-posts label at the end of each stacked bar. Zero-width segments get no label of their own,
// so the in-position segment draws it (offset past the vacant segment) unless the district is fully vacant.
function renderPostsTotal({ x, y, width, height, index }, rows, segment) {
  const d = rows[index];
  if (!d || (segment === 'filled' ? d.filled === 0 : d.filled > 0)) return null;
  const vacantWidth = segment === 'filled' && d.filled ? (width / d.filled) * d.vacant : 0;
  return (
    <text x={x + width + vacantWidth + 6} y={y + height / 2} dy="0.35em" fontSize={11} fontWeight={600} fill="#6E6248">
      {d.count}
    </text>
  );
}

// Tenure can't be computed until reporting dates are entered — say so instead of showing an empty chart
function NoReportingDates({ count }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-7 px-4 rounded-xl border border-dashed border-rule bg-parchment-2/30">
      <CalendarClock className="w-8 h-8 text-brass mb-2" strokeWidth={1.6} />
      <p className="text-[13px] font-semibold text-ink-text">Reporting dates not recorded yet</p>
      <p className="text-[11.5px] text-ink-text-soft mt-1 max-w-[260px]">
        Add the reporting date for the {count.toLocaleString('en-IN')} officers on record to see tenure and transfer-due officers here.
      </p>
      <button
        type="button"
        onClick={() => scrollToId('incomplete-profiles')}
        className="mt-3 text-[11.5px] font-semibold text-maroon hover:underline"
      >
        See profiles needing details →
      </button>
    </div>
  );
}

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export default function OfficersDashboard() {
  const navigate = useNavigate();
  const { showError } = useToast();

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const isGlobalUser = role === 'admin' || isHeadOffice;
  const userDistrictName = localStorage.getItem('districtName') || '';
  const currentUserId = localStorage.getItem('userId');

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
      setData(await fetchOfficerAnalytics(districtId));
    } catch (err) {
      console.error('Officer analytics load failure:', err);
      setError(err.message || 'Could not load officer analytics.');
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 400);
    }
  }, [districtId]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      await exportOfficersToExcel({ districtId });
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export officers to Excel.');
    }
  };

  const totals = data?.totals || {};
  const total = totals.totalOfficers || 0;
  // Vacant posts have no officer, so tenure & completeness are measured over filled posts only
  const inPosition = totals.filledPosts ?? total;
  const vacantTop = (data?.vacantList || []).slice(0, 8);

  const districtChart = useMemo(
    () => (data?.byDistrict || [])
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(d => ({ name: d.district, districtId: d.districtId, count: d.count, filled: d.filled, vacant: d.vacant })),
    [data]
  );
  const showDistrictChart = isGlobalUser && !districtId && (data?.byDistrict || []).length > 1;
  const strength = useMemo(() => {
    if (districtChart.length === 0) return null;
    const byFilled = [...districtChart].sort((a, b) => b.filled - a.filled);
    const max = byFilled[0];
    const min = byFilled[byFilled.length - 1];
    const avgRaw = byFilled.reduce((sum, d) => sum + d.filled, 0) / byFilled.length;
    return {
      avg: Math.round(avgRaw * 10) / 10,
      below: byFilled.filter(d => d.filled < avgRaw).length,
      max: { ...max, count: max.filled },
      min: { ...min, count: min.filled },
      maxTies: byFilled.filter(d => d.filled === max.filled).length - 1,
      minTies: byFilled.filter(d => d.filled === min.filled).length - 1
    };
  }, [districtChart]);
  const ranks = data?.byRank || [];
  const maxRank = Math.max(1, ...ranks.map(r => r.count));
  const tenure = data?.tenure || [];
  const trend = data?.reportingTrend || [];
  const longTenureTop = (data?.longTenure || []).slice(0, 12);
  const incompleteTop = (data?.incompleteProfiles || []).slice(0, 10);
  const scopeLabel = !isGlobalUser
    ? `${userDistrictName} District`
    : districtId
      ? (districts.find(d => d.id === districtId)?.name || 'Selected District')
      : 'State-wide';

  const drillTo = (params) => {
    const qs = new URLSearchParams();
    const dId = params.districtId || districtId;
    if (dId && isGlobalUser) qs.set('districtId', dId);
    if (params.rank) qs.set('rank', params.rank);
    navigate(`/officers${qs.toString() ? `?${qs}` : ''}`);
  };

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
                  Officers Module · ಅಧಿಕಾರಿಗಳು
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink-text mt-1 leading-tight">
                Officers Deployment Dashboard
              </h1>
              <p className="text-[12.5px] text-ink-text-soft mt-0.5">
                Roster strength, rank mix, tenure at current posting and profile completeness · <span className="font-semibold text-ink-text">{scopeLabel}</span>
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
            <button type="button" className="btn btn-excel btn-sm" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Export Roster
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/officers/new')}>
              <Plus className="w-4 h-4" strokeWidth={2.3} />
              Add Officer
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="h-80 skeleton-card rounded-xl lg:col-span-2" />
            <div className="h-80 skeleton-card rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h3 className="font-serif font-bold text-base">{error}</h3>
          <button type="button" onClick={() => load()} className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors">
            Retry Loading
          </button>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <KpiCard
              icon={Users}
              label="Officers in Position"
              value={inPosition}
              accent="#60A5FA"
              badge={`${total} Posts`}
              progress={pct(inPosition, total)}
              footer={`${pct(inPosition, total)}% of ${total} posts filled`}
              to={districtId ? `/officers?districtId=${districtId}` : '/officers'}
            />
            <KpiCard
              icon={MapPin}
              label="Districts Covered"
              value={totals.districtsCovered}
              suffix={`/${totals.totalDistricts || 0}`}
              accent="#34D399"
              badge={`${pct(totals.districtsCovered, totals.totalDistricts)}% Coverage`}
              progress={pct(totals.districtsCovered, totals.totalDistricts)}
              footer={`${Math.max(0, (totals.totalDistricts || 0) - (totals.districtsCovered || 0))} districts with no officer on record`}
              onClick={() => scrollToId('officer-distribution')}
            />
            <KpiCard
              icon={UserX}
              label="Vacant Posts"
              value={totals.vacantPosts}
              accent="#FBBF24"
              badge={`${totals.vacancyRate || 0}% Vacancy`}
              progress={totals.vacancyRate || 0}
              footer={totals.vacantPosts ? `${totals.districtsWithVacancies} districts · ${ranks.filter(r => r.vacant).map(r => `${r.short} ${r.vacant}`).join(' · ')}` : 'Every post is filled'}
              onClick={() => scrollToId('vacant-posts')}
            />
            <KpiCard
              icon={Hourglass}
              label={`Tenure ${data?.longTenureYears || 3}+ Years`}
              value={totals.longTenureCount}
              accent="#FB923C"
              badge={totals.longTenureCount > 0 ? 'Transfer Watch' : inPosition > 0 && totals.tenureNotRecorded === inPosition ? 'No Dates Yet' : 'All Clear'}
              progress={pct(totals.longTenureCount, inPosition)}
              footer={`${pct(totals.longTenureCount, inPosition)}% of officers · ${totals.tenureNotRecorded || 0} without reporting date`}
              onClick={() => scrollToId('tenure-watchlist')}
            />
            <KpiCard
              icon={ClipboardCheck}
              label="Complete Profiles"
              value={totals.completeProfiles}
              accent="#A78BFA"
              badge={`${totals.completenessRate || 0}% Complete`}
              progress={totals.completenessRate || 0}
              footer={`${(data?.incompleteTotal || 0).toLocaleString('en-IN')} profiles need details`}
              onClick={() => scrollToId('incomplete-profiles')}
            />
          </section>

          {/* Distribution */}
          <section id="officer-distribution" className={`grid grid-cols-1 gap-5 ${showDistrictChart ? 'lg:grid-cols-5' : ''}`}>
            {showDistrictChart && (
              <Card
                icon={MapPin}
                title="Posts by District"
                subtitle="Officers in position and vacant posts per district · click a bar to open that district's roster"
                className="lg:col-span-3"
                action={totals.vacantPosts > 0 && (
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-text-soft flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: FILLED_COLOR }} />In position</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: VACANT_COLOR }} />Vacant</span>
                  </div>
                )}
              >
                {districtChart.length === 0 ? <EmptyState label="No officers on record yet." /> : (
                  <div style={{ height: Math.max(260, districtChart.length * 26 + 30) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={districtChart} layout="vertical" margin={{ top: 0, right: 36, left: 4, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(16,24,38,0.06)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6E6248' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11.5, fill: '#241E14', fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} />
                        <Tooltip content={<ChartTooltip unit="Officers" totalLabel="Total posts" />} cursor={{ fill: 'rgba(0,14,137,0.05)' }} />
                        <Bar
                          dataKey="filled"
                          name="In position"
                          stackId="posts"
                          fill={FILLED_COLOR}
                          barSize={14}
                          className="cursor-pointer"
                          onClick={(entry) => drillTo({ districtId: entry?.districtId || entry?.payload?.districtId })}
                        >
                          <LabelList content={(p) => renderPostsTotal(p, districtChart, 'filled')} />
                        </Bar>
                        <Bar
                          dataKey="vacant"
                          name="Vacant"
                          stackId="posts"
                          fill={VACANT_COLOR}
                          radius={[0, 4, 4, 0]}
                          barSize={14}
                          className="cursor-pointer"
                          onClick={(entry) => drillTo({ districtId: entry?.districtId || entry?.payload?.districtId })}
                        >
                          <LabelList content={(p) => renderPostsTotal(p, districtChart, 'vacant')} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            )}

            <div className={`space-y-5 ${showDistrictChart ? 'lg:col-span-2' : ''}`}>
            <Card
              icon={Award}
              title="Rank Mix"
              subtitle="Officers per rank / cadre · click to open that rank in the roster"
            >
              {ranks.length === 0 ? <EmptyState label="No officers on record yet." /> : (
                <div className={`grid gap-3 ${showDistrictChart ? '' : 'md:grid-cols-3'}`}>
                  {ranks.map(r => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => drillTo({ rank: r.key })}
                      className="group w-full text-left p-3.5 rounded-xl border border-rule/60 bg-white/60 hover:bg-white hover:border-brass hover:shadow-soft transition-all"
                      title={`${r.label}: ${r.count} officers`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="min-w-[46px] h-11 px-1.5 rounded-lg bg-gradient-to-br from-[#0000FE] to-[#000E89] text-yellow-300 font-mono font-bold text-[12px] flex items-center justify-center shadow-sm flex-shrink-0">
                            {r.short}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-ink-text leading-tight truncate">{r.label}</div>
                            <div className="text-[11px] text-ink-text-soft mt-0.5">
                              {pct(r.count, total)}% of posts
                              {r.vacant > 0 && <span className="text-rust font-semibold"> · {r.vacant} vacant</span>}
                            </div>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <span className="font-serif text-[24px] font-bold text-ink-text tabular-nums leading-none">{r.count}</span>
                          <ChevronRight className="w-4 h-4 text-ink-text-faint group-hover:text-maroon group-hover:translate-x-0.5 transition-all" />
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-parchment-2 overflow-hidden">
                        <div className="h-full rounded-full bg-brass transition-all duration-700" style={{ width: `${Math.max(2, (r.count / maxRank) * 100)}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {totals.inChargeCount > 0 && (
                <p className="mt-3 text-[11.5px] text-ink-text-soft">
                  Includes <span className="font-semibold text-ink-text">{totals.inChargeCount}</span> in-charge (I/C) postings.
                </p>
              )}
            </Card>

            {showDistrictChart && strength && (
              <Card icon={Building2} title="Strength Snapshot" subtitle="How officer strength is spread across districts">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-rule/60 bg-white/60">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-text-soft">Avg per District</div>
                    <div className="font-serif text-[26px] font-bold text-ink-text leading-tight tabular-nums mt-1">{strength.avg}</div>
                    <div className="text-[11px] text-ink-text-soft">officers in position, {totals.districtsCovered} districts</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-rule/60 bg-white/60">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-text-soft">Below Average</div>
                    <div className="font-serif text-[26px] font-bold text-ink-text leading-tight tabular-nums mt-1">{strength.below}</div>
                    <div className="text-[11px] text-ink-text-soft">districts under {strength.avg} officers</div>
                  </div>
                  {[
                    { label: 'Most Staffed', row: strength.max, ties: strength.maxTies, tone: 'text-forest' },
                    { label: 'Least Staffed', row: strength.min, ties: strength.minTies, tone: 'text-rust' }
                  ].map(s => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => drillTo({ districtId: s.row.districtId })}
                      className="group text-left p-3.5 rounded-xl border border-rule/60 bg-white/60 hover:bg-white hover:border-brass transition-all"
                    >
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-text-soft">{s.label}</div>
                      <div className={`font-serif text-[26px] font-bold leading-tight tabular-nums mt-1 ${s.tone}`}>{s.row.count}</div>
                      <div className="text-[11.5px] font-semibold text-ink-text truncate group-hover:text-maroon transition-colors">
                        {s.row.name}{s.ties > 0 && <span className="font-normal text-ink-text-soft"> +{s.ties} more</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
            </div>
          </section>

          {/* Tenure · trend · completeness */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card icon={Hourglass} title="Tenure at Current Posting" subtitle="Time since reporting date">
              {inPosition === 0 ? <EmptyState label="No officers in position yet." /> : totals.tenureNotRecorded === inPosition ? (
                <NoReportingDates count={inPosition} />
              ) : (
                <>
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-parchment-2 gap-[2px]" role="img" aria-label="Tenure distribution">
                    {tenure.filter(t => t.count > 0).map(t => (
                      <div
                        key={t.key}
                        className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
                        style={{ width: `${(t.count / inPosition) * 100}%`, backgroundColor: TENURE_COLORS[t.key] }}
                        title={`${t.label}: ${t.count} (${pct(t.count, inPosition)}%)`}
                      />
                    ))}
                  </div>
                  <div className="mt-4 divide-y divide-rule/40">
                    {tenure.map(t => (
                      <div key={t.key} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                        <span className="flex items-center gap-2 text-ink-text">
                          <span className="w-3 h-3 rounded-[3px] flex-shrink-0" style={{ backgroundColor: TENURE_COLORS[t.key] }} />
                          <span className={t.key === '3plus' ? 'font-bold' : 'font-medium'}>{t.label}</span>
                          {t.key === '3plus' && t.count > 0 && (
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-rust bg-rust-bg border border-rust/30 px-1.5 py-0.5 rounded">Watch</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ink-text tabular-nums">{t.count}</span>
                          <span className="text-[10.5px] text-ink-text-faint w-9 text-right tabular-nums">{pct(t.count, inPosition)}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card icon={CalendarClock} title="Reporting Trend" subtitle="Officers by year of reporting to current posting">
              {trend.every(t => t.count === 0) ? (
                totals.tenureNotRecorded === inPosition && inPosition > 0
                  ? <NoReportingDates count={inPosition} />
                  : <EmptyState label="No reporting dates in the last 8 years." />
              ) : (
                <>
                  <div className="h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trend} margin={{ top: 18, right: 4, left: -22, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(16,24,38,0.06)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6E6248' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6E6248' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip unit="Officers reported" />} cursor={{ fill: 'rgba(0,14,137,0.05)' }} />
                        <Bar dataKey="count" name="Officers" fill="#4256C4" radius={[4, 4, 0, 0]} maxBarSize={30} label={{ position: 'top', fontSize: 10.5, fill: '#6E6248', fontWeight: 600 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {data?.earlierReported > 0 && (
                    <p className="text-[11px] text-ink-text-faint mt-1">+ {data.earlierReported} officers reported before {trend[0]?.year}</p>
                  )}
                </>
              )}
            </Card>

            <Card id="profile-completeness" icon={ClipboardCheck} title="Profile Completeness" subtitle="Officers in position with each detail recorded">
              {inPosition === 0 ? <EmptyState label="No officers in position yet." /> : (
                <div className="space-y-3.5">
                  {(data?.completeness || []).map(c => {
                    const value = pct(c.count, inPosition);
                    return (
                      <div key={c.field}>
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-ink-text">{COMPLETENESS_LABELS[c.field] || c.field}</span>
                          <span className="font-mono text-ink-text-soft tabular-nums">
                            <span className="font-bold text-ink-text">{value}%</span> · {c.count}/{inPosition}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-parchment-2 overflow-hidden">
                          <div className="h-full rounded-full bg-forest transition-all duration-700" style={{ width: `${Math.max(2, value)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 mt-1 border-t border-rule/40 flex items-center justify-between text-[12.5px]">
                    <span className="font-bold text-ink-text">All details complete</span>
                    <span className="font-mono font-bold text-forest">{totals.completenessRate || 0}%</span>
                  </div>
                </div>
              )}
            </Card>
          </section>

          {/* Watchlists */}
          <section className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
            <Card
              id="tenure-watchlist"
              icon={Hourglass}
              title={`Long Tenure Watchlist (${data?.longTenureYears || 3}+ years)`}
              subtitle="Officers serving longest at their current posting"
              className="xl:col-span-3"
              action={totals.longTenureCount > 0 && (
                <span className="stamp stamp-warning">{totals.longTenureCount} officers</span>
              )}
            >
              {longTenureTop.length === 0 ? (
                totals.tenureNotRecorded === inPosition && inPosition > 0
                  ? <NoReportingDates count={inPosition} />
                  : <EmptyState label={`No officer has crossed ${data?.longTenureYears || 3} years at the current posting${totals.tenureNotRecorded ? ` (${totals.tenureNotRecorded} officers have no reporting date)` : ''}.`} />
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[10.5px] uppercase tracking-[0.07em] text-ink-text-soft bg-[#F5F2E9] border-y border-[#D8CEB2]">
                        <th className="py-2.5 px-5 font-bold">Officer</th>
                        <th className="py-2.5 px-3 font-bold">District</th>
                        <th className="py-2.5 px-3 font-bold">Reported</th>
                        <th className="py-2.5 px-5 font-bold text-right">Tenure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {longTenureTop.map(o => (
                        <tr
                          key={o.id}
                          onClick={() => navigate(`/officers/${o.id}`)}
                          className="border-b border-[#EFEAD9] last:border-b-0 hover:bg-[#F4EEDF] cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-5">
                            <div className="font-semibold text-maroon">{o.name}</div>
                            <div className="text-[11px] text-ink-text-soft">{o.designation}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-ink-text">{o.district}</td>
                          <td className="py-2.5 px-3 text-ink-text-soft whitespace-nowrap">{formatOfficerDate(o.reportingDate)}</td>
                          <td className="py-2.5 px-5 text-right">
                            <span className={`stamp ${o.years >= 5 ? 'stamp-danger' : 'stamp-warning'}`}>{o.years} yrs</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 pt-3 text-[11.5px] text-ink-text-soft">
                    {totals.longTenureCount > longTenureTop.length ? `Showing top ${longTenureTop.length} of ${totals.longTenureCount}. ` : ''}
                    Full register in{' '}
                    <Link to="/officers/reports?tab=tenure" className="text-maroon font-semibold hover:underline">Officer Reports → Tenure</Link>.
                  </div>
                </div>
              )}
            </Card>

            <Card
              id="vacant-posts"
              icon={UserX}
              title="Vacant Posts"
              subtitle="Posts on the roster with no officer in position"
              className="xl:col-span-2"
              action={totals.vacantPosts > 0 && <span className="stamp stamp-warning">{totals.vacantPosts} vacant</span>}
            >
              {vacantTop.length === 0 ? <EmptyState label="Every post on the roster is filled." /> : (
                <>
                  <div className="divide-y divide-rule/40">
                    {vacantTop.map(v => (
                      <Link key={v.id} to={`/officers/${v.id}`} className="flex items-center gap-3 py-2.5 group">
                        <span className="min-w-[42px] h-8 px-1 rounded-md bg-rust-bg text-rust border border-rust/30 font-mono font-bold text-[10.5px] flex items-center justify-center flex-shrink-0">
                          {v.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-ink-text truncate group-hover:text-maroon transition-colors">{v.designation}</div>
                          <div className="text-[11px] text-ink-text-soft truncate">{v.district}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-ink-text-faint group-hover:text-maroon flex-shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                  <div className="pt-3 text-[11.5px] text-ink-text-soft">
                    {totals.vacantPosts > vacantTop.length ? `Showing ${vacantTop.length} of ${totals.vacantPosts}. ` : ''}
                    <Link
                      to={`/officers?postStatus=vacant${districtId ? `&districtId=${districtId}` : ''}`}
                      className="text-maroon font-semibold hover:underline"
                    >
                      Open vacant posts in roster →
                    </Link>
                  </div>
                </>
              )}
            </Card>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
          <Card
            id="incomplete-profiles"
            icon={ClipboardCheck}
            title="Profiles Needing Details"
            subtitle="Officers in position with missing mobile, reporting date, address or working history"
            className="xl:col-span-3"
            action={data?.incompleteTotal > 0 && <span className="stamp stamp-neutral">{data.incompleteTotal} pending</span>}
          >
            {incompleteTop.length === 0 ? (
              <EmptyState label="Every officer profile is complete." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incompleteTop.map(o => (
                  <div key={o.id} className="flex items-start gap-3 p-3 rounded-lg border border-rule/60 bg-white/60 hover:border-brass/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <Link to={`/officers/${o.id}`} className="text-[13px] font-semibold text-maroon hover:underline truncate block">{o.name}</Link>
                      <div className="text-[11px] text-ink-text-soft truncate">{o.designation} · {o.district}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {o.missing.map(f => (
                          <span key={f} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brick-bg text-brick border border-brick-soft">
                            {COMPLETENESS_LABELS[f] || f}
                          </span>
                        ))}
                      </div>
                    </div>
                    {(role === 'admin' || o.createdById === currentUserId) && (
                      <button type="button" className="icon-btn" title="Edit officer" onClick={() => navigate(`/officers/${o.id}/edit`)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {data?.incompleteTotal > incompleteTop.length && (
              <div className="pt-3 text-[11.5px] text-ink-text-soft">
                Showing {incompleteTop.length} of {data.incompleteTotal}. Full list in{' '}
                <Link to="/officers/reports?tab=completeness" className="text-maroon font-semibold hover:underline">Officer Reports → Completeness</Link>.
              </div>
            )}
          </Card>

            <Card icon={UserPlus} title="Recently Added" subtitle="Latest officer records" className="xl:col-span-2"
              action={<Link to="/officers" className="text-[11.5px] font-semibold text-maroon hover:underline inline-flex items-center gap-0.5">View all <ArrowUpRight className="w-3 h-3" /></Link>}
            >
              {(data?.recentOfficers || []).length === 0 ? <EmptyState label="No officers added yet." /> : (
                <div className="divide-y divide-rule/40">
                  {data.recentOfficers.map(o => (
                    <Link key={o.id} to={`/officers/${o.id}`} className="flex items-center gap-3 py-2.5 group">
                      <div className="w-9 h-9 rounded-full bg-[#E8EEF9] border border-[#CBD8EF] text-[#000E89] flex items-center justify-center text-[11.5px] font-bold flex-shrink-0">
                        {(o.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-ink-text truncate group-hover:text-maroon transition-colors">{o.name}</div>
                        <div className="text-[11px] text-ink-text-soft truncate">{o.designation} · {o.district}</div>
                      </div>
                      <span className="text-[10.5px] text-ink-text-faint font-mono flex-shrink-0">{formatOfficerDate(o.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

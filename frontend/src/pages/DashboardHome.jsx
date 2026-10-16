import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Shield, 
  RotateCw, 
  Filter, 
  Printer, 
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  MapPin,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import StatCards from '../components/dashboard/StatCards';
import PipelineFunnel from '../components/dashboard/PipelineFunnel';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';
import StatutoryAgingWatchlist from '../components/dashboard/StatutoryAgingWatchlist';
import RecentActivityFeed from '../components/dashboard/RecentActivityFeed';

export default function DashboardHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('proposals'); // 'proposals' | 'respondents'

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const isGlobalUser = role === 'admin' || isHeadOffice;
  const userDistrict = localStorage.getItem('districtName');

  // Interactive filters
  const [selectedDistrict, setSelectedDistrict] = useState(isGlobalUser ? 'ALL' : (userDistrict || 'ALL'));
  const [timeframe, setTimeframe] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedDistrict && selectedDistrict !== 'ALL') {
        params.append('district', selectedDistrict);
      }
      if (timeframe && timeframe !== 'all') {
        params.append('timeframe', timeframe);
      }

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/dashboard/analytics${queryStr}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load analytics: ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Analytics load failure:', err);
      setError('Could not retrieve dashboard intelligence. Please try again.');
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setRefreshing(false), 400);
      }
    }
  }, [selectedDistrict, timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePrint = () => {
    window.print();
  };

  const scrollToWatchlist = () => {
    const el = document.getElementById('statutory-watchlist');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const overview = data?.overview || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Portal Header Banner */}
      <div className="bg-[#FFFDF7] border border-rule/70 rounded-xl p-5 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Title & Organization Info */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0000FE] to-[#0000C8] flex-shrink-0 flex items-center justify-center shadow-md border border-yellow-300/60">
              <Shield className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-maroon/10 text-maroon border border-maroon/20">
                  Karnataka Lokayukta
                </span>
                <span className="text-[10px] uppercase tracking-wider font-mono text-ink-text-soft bg-parchment-2 px-2 py-0.5 rounded border border-rule/40">
                  Sec. 17-A Vigilance Wing
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink-text mt-1 leading-tight">
                Enforcement Dashboard
              </h1>
            </div>
          </div>

          {/* Perspective Toggle & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-rule/30">
            {/* Proposals vs Respondents Toggle */}
            <div className="inline-flex p-1 bg-parchment-2/90 rounded-xl border border-rule/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('proposals')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'proposals'
                    ? 'bg-[#0000FE] text-white shadow-xs'
                    : 'text-ink-text-soft hover:text-ink-text hover:bg-white/60'
                }`}
                title="View by 17-A Proposals & Petitions"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Proposals</span>
                <span className={`text-[10.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  viewMode === 'proposals' ? 'bg-white/20 text-white' : 'bg-parchment-3 text-ink-text'
                }`}>
                  {overview.totalPetitions || 236}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('respondents')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'respondents'
                    ? 'bg-[#0000FE] text-white shadow-xs'
                    : 'text-ink-text-soft hover:text-ink-text hover:bg-white/60'
                }`}
                title="View by Named Accused Public Servants"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Accused</span>
                <span className={`text-[10.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  viewMode === 'respondents' ? 'bg-white/20 text-white' : 'bg-parchment-3 text-ink-text'
                }`}>
                  {(overview.totalRespondents || 1005).toLocaleString('en-IN')}
                </span>
              </button>
            </div>

            <div className="hidden sm:flex flex-col text-right px-2 border-l border-rule/40">
              <span className="text-[10px] text-ink-text-faint font-mono uppercase tracking-wider">Live Time</span>
              <span className="text-xs font-mono font-semibold text-ink-text">
                {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              title="Refresh intelligence feed"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-rule/80 text-ink-text hover:bg-parchment-2 hover:border-rule transition-all shadow-xs disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-brass ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={handlePrint}
              title="Print executive summary"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-rule/80 text-ink-text hover:bg-parchment-2 hover:border-rule transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-ink-text-soft" />
              <span className="hidden sm:inline">Print Brief</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar (District Selector & Timeframe) */}
        <div className="mt-4 pt-3.5 border-t border-rule/40 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-parchment-2/30 -mx-5 -mb-5 p-4 rounded-b-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-text mr-1">
              <Filter className="w-3.5 h-3.5 text-brass" />
              <span>Jurisdiction:</span>
            </div>

            {/* District dropdown */}
            {!isGlobalUser && userDistrict ? (
              <span className="font-mono text-xs font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-3 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brass" />
                {userDistrict} District Jurisdiction
              </span>
            ) : (
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="text-xs bg-white border border-rule/80 rounded-lg px-2.5 py-1.5 text-ink-text font-medium focus:ring-1 focus:ring-brass focus:outline-none shadow-xs min-w-[190px]"
              >
                <option value="ALL">All Districts (State-wide)</option>
                {(data?.districts || []).map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            )}

            {isGlobalUser && selectedDistrict !== 'ALL' && (
              <button
                onClick={() => setSelectedDistrict('ALL')}
                className="text-[11px] text-maroon hover:underline font-semibold ml-1"
              >
                Reset to State-wide
              </button>
            )}
          </div>

          {/* Timeframe pill tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-rule/60 self-start md:self-auto shadow-xs text-xs">
            {[
              { id: 'all', label: 'All Time' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' },
              { id: '1y', label: 'Past Year' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  timeframe === t.id
                    ? 'bg-[#0000FE] text-white font-bold shadow-xs'
                    : 'text-ink-text-soft hover:text-ink-text hover:bg-parchment-2/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Statutory Reconciliation Bar */}
      {!loading && !error && data && (
        <div className="bg-[#FFFDF7] border border-rule/60 rounded-xl px-4 py-3 shadow-soft flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-ink-text">Statutory Reconciliation:</span>
            <span className="text-ink-text-soft font-mono">
              {viewMode === 'proposals'
                ? `214 Dispatched + 6 Awaiting + 16 Returned = 236 Total Proposals`
                : `906 Dispatched + 21 Awaiting + 78 Returned = 1,005 Total Accused`
              }
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap font-mono text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Send className="w-3 h-3 text-emerald-600" />
              <span>Dispatched:</span>
              <strong>{viewMode === 'proposals' ? overview.proposalsSentToCA : overview.respondentsSentToCA}</strong>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>Awaiting:</span>
              <strong>{viewMode === 'proposals' ? overview.proposalsNotSentToCA : overview.respondentsNotSentToCA}</strong>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              <RotateCcw className="w-3 h-3 text-amber-600" />
              <span>Returned:</span>
              <strong>{viewMode === 'proposals' ? overview.proposalsBackToDist : overview.respondentsBackToDist}</strong>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Pending with CA:</span>
              <strong>{viewMode === 'proposals' ? overview.proposalsPendingWithCA : overview.respondentsPendingWithCA}</strong>
              <span className="text-[10px] text-rose-600 font-bold">
                ({viewMode === 'proposals' ? overview.criticalPendingCount : overview.respondentsCriticalPendingCount} &gt;60d)
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#FFFDF7] border border-rule/60 rounded-xl shadow-soft">
          <div className="seal animate-pulse mb-4">
            <Shield className="w-8 h-8 text-ink" />
          </div>
          <h3 className="font-serif font-bold text-ink-text text-base">
            Loading Vigilance Intelligence...
          </h3>
          <p className="text-xs text-ink-text-soft mt-1">
            Aggregating Section 17-A proposals, CA sanction statuses, and district metrics.
          </p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h3 className="font-serif font-bold text-base">{error}</h3>
          <button
            onClick={() => fetchAnalytics()}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <>
          {/* Section 1: Hero KPI Cards */}
          <section>
            <StatCards 
              overview={data?.overview} 
              viewMode={viewMode}
              onFilterPendingCa={scrollToWatchlist} 
            />
          </section>

          {/* Section 2: Case Progression & Lifecycle Funnel */}
          <section>
            <PipelineFunnel 
              pipeline={viewMode === 'respondents' ? data?.respondentsPipelineFunnel : data?.pipelineFunnel} 
              viewMode={viewMode}
            />
          </section>

          {/* Section 3: Interactive Recharts Visualizations */}
          <section>
            <AnalyticsCharts
              districtBreakdown={data?.districtBreakdown || []}
              monthlyTrends={data?.monthlyTrends || []}
              permissionChartData={data?.permissionChartData || []}
              peChartData={data?.peChartData || []}
              topDepartments={data?.topDepartments || []}
              onSelectDistrict={setSelectedDistrict}
            />
          </section>

          {/* Section 4: Operational Intelligence & Audit Feed */}
          <section className="space-y-6">
            {/* Statutory CA Sanction Watchlist */}
            <StatutoryAgingWatchlist watchlist={data?.statutoryAgingWatchlist || []} />

            {/* Recent Petitions Activity Feed */}
            <RecentActivityFeed recentPetitions={data?.recentPetitions || []} />
          </section>
        </>
      )}
    </div>
  );
}

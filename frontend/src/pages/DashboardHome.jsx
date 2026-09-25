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
  AlertCircle
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

  // Interactive filters
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
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

          {/* Quick Action Buttons & Clock */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-rule/30">
            <div className="hidden sm:flex flex-col text-right mr-2">
              <span className="text-[10px] text-ink-text-faint font-mono uppercase tracking-wider">Live System Time</span>
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

            {selectedDistrict !== 'ALL' && (
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
              onFilterPendingCa={scrollToWatchlist} 
            />
          </section>

          {/* Section 2: Case Progression & Lifecycle Funnel */}
          <section>
            <PipelineFunnel pipeline={data?.pipelineFunnel} />
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

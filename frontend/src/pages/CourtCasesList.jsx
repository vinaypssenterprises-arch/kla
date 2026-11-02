import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Eye, Pencil, Download, RotateCcw, MapPin, Landmark, AlertTriangle, X } from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';
import { exportCourtCasesToExcel } from '../lib/exportExcel';
import {
  HC_BENCHES, STATUS_META, PENDING, statusOf, daysBetween, formatDuration, formatCaseDate, fetchCourtCaseAnalytics,
  CASE_TYPES, CASE_STAGES
} from '../lib/courtCases';

const PAGE_SIZE = 15;
const FILTER_KEYS = ['districtId', 'caseStage', 'caseType', 'hcBench', 'hcStatus', 'sppName', 'stayType', 'scStatus', 'attention'];

export default function CourtCasesList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError } = useToast();

  const role = localStorage.getItem('role');
  const currentUserId = localStorage.getItem('userId');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const isGlobalUser = role === 'admin' || isHeadOffice;
  const userDistrictName = localStorage.getItem('districtName') || '';

  // Dashboard / report drill-downs arrive as query params
  const [filters, setFilters] = useState(() => Object.fromEntries(FILTER_KEYS.map(k => [k, searchParams.get(k) || ''])));
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [sppList, setSppList] = useState([]);
  const [stayTypes, setStayTypes] = useState([]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  useEffect(() => {
    const activeOnly = (d) => (Array.isArray(d) ? d.filter(x => x.isActive) : []);
    if (isGlobalUser) apiFetch('/districts').then(r => r.json()).then(d => setDistricts(activeOnly(d))).catch(() => {});
    apiFetch('/master-items/spp').then(r => r.json()).then(d => setSppList(activeOnly(d))).catch(() => {});
    apiFetch('/master-items/stayType').then(r => r.json()).then(d => setStayTypes(activeOnly(d))).catch(() => {});
  }, [isGlobalUser]);

  // Status tab counts follow the district filter
  useEffect(() => {
    fetchCourtCaseAnalytics(filters.districtId).then(d => setCounts(d.totals)).catch(() => setCounts(null));
  }, [filters.districtId]);

  const fetchCases = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

    apiFetch(`/court-cases?${params.toString()}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        setCases(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(err => console.error('Failed to load court cases', err))
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchCases, 250);
    return () => clearTimeout(timer);
  }, [fetchCases]);

  useEffect(() => { setPage(1); }, [search, filters]);

  const resetFilters = () => {
    setSearch('');
    setFilters(Object.fromEntries(FILTER_KEYS.map(k => [k, ''])));
  };

  const handleExport = async () => {
    try {
      const scope = filters.districtId ? (districts.find(d => d.id === filters.districtId)?.name || 'Selected District') : (isGlobalUser ? 'State-wide' : `${userDistrictName} District`);
      await exportCourtCasesToExcel({ search, ...filters }, scope);
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export court cases to Excel.');
    }
  };

  const statusTabs = [
    { value: '', label: 'All Cases', count: counts?.total },
    { value: PENDING, label: STATUS_META.Pending.label, count: counts?.pending, dot: STATUS_META.Pending.color },
    { value: 'Vacated', label: STATUS_META.Vacated.label, count: counts?.vacated, dot: STATUS_META.Vacated.color },
    { value: 'Quash', label: STATUS_META.Quash.label, count: counts?.quash, dot: STATUS_META.Quash.color }
  ];
  const hasFilters = search || Object.values(filters).some(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">Court Cases — All Court Cases</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">{total} case{total === 1 ? '' : 's'} {hasFilters ? 'match the filters' : 'on record'}.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" className="btn btn-excel" onClick={handleExport}>
            <Download className="w-[15px] h-[15px]" />
            Export
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/court-cases/new')}>
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
            Add Court Case
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 p-1 mb-4 rounded-xl bg-parchment-2/70 border border-rule/70 w-fit max-w-full overflow-x-auto">
        {statusTabs.map(t => {
          const active = filters.hcStatus === t.value;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => setFilter('hcStatus', t.value)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold whitespace-nowrap transition-all ${
                active ? 'bg-[#000E89] text-white shadow-xs' : 'text-ink-text-soft hover:text-ink-text hover:bg-white/70'
              }`}
            >
              {t.dot && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.dot }} />}
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10.5px] font-mono px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-white border border-rule/70'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {filters.attention === 'sppNotInformed' && (
        <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12.5px] font-semibold text-amber-900">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Showing stays in force where the SPP has not been informed yet.</span>
          <button type="button" onClick={() => setFilter('attention', '')} className="inline-flex items-center gap-1 hover:underline">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <section className="flex flex-col md:flex-row md:flex-wrap gap-3 mb-[22px] items-stretch md:items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-text-faint pointer-events-none" />
          <input
            type="text"
            className="app-input pl-[38px]"
            placeholder="Search crime no, WP/Crl.P, SLP, section, SPP, I.O…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {!isGlobalUser ? (
          <span className="font-mono text-xs font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-3 py-2 rounded-lg inline-flex items-center gap-1.5 flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-brass" />
            {userDistrictName}
          </span>
        ) : (
          <SearchableSelect
            className="w-auto min-w-[160px]"
            value={filters.districtId}
            onChange={(val) => setFilter('districtId', val)}
            options={[{ value: '', label: 'All Districts' }, ...districts.map(d => ({ value: d.id, label: d.name }))]}
            label="Filter by District"
          />
        )}
        <SearchableSelect
          className="w-auto min-w-[150px]"
          value={filters.caseStage}
          onChange={(val) => setFilter('caseStage', val)}
          options={[{ value: '', label: 'All Stages' }, ...CASE_STAGES.map(s => ({ value: s, label: s }))]}
          label="Filter by Stage"
        />
        <SearchableSelect
          className="w-auto min-w-[140px]"
          value={filters.caseType}
          onChange={(val) => setFilter('caseType', val)}
          options={[{ value: '', label: 'All Case Types' }, ...CASE_TYPES.map(t => ({ value: t, label: t }))]}
          label="Filter by Type"
        />
        <SearchableSelect
          className="w-auto min-w-[140px]"
          value={filters.hcBench}
          onChange={(val) => setFilter('hcBench', val)}
          options={[{ value: '', label: 'All Benches' }, ...HC_BENCHES.map(b => ({ value: b, label: `${b} Bench` }))]}
          label="Filter by Bench"
        />
        <SearchableSelect
          className="w-auto min-w-[150px]"
          value={filters.sppName}
          onChange={(val) => setFilter('sppName', val)}
          options={[{ value: '', label: 'All SPPs' }, { value: '__none', label: 'SPP not assigned' }, ...sppList.map(s => ({ value: s.name, label: s.name }))]}
          label="Filter by SPP"
        />
        <SearchableSelect
          className="w-auto min-w-[150px]"
          value={filters.stayType}
          onChange={(val) => setFilter('stayType', val)}
          options={[{ value: '', label: 'All Stay Types' }, ...stayTypes.map(s => ({ value: s.name, label: s.name }))]}
          label="Filter by Stay Type"
        />
        <SearchableSelect
          className="w-auto min-w-[150px]"
          value={filters.scStatus}
          onChange={(val) => setFilter('scStatus', val)}
          options={[
            { value: '', label: 'Supreme Court: Any' },
            { value: 'filed', label: 'SLP filed' },
            { value: 'Vacated', label: 'SC: Vacated' },
            { value: 'Quash', label: 'SC: Quash' }
          ]}
          label="Filter by Supreme Court"
        />
        <button type="button" className="btn btn-secondary" onClick={resetFilters} title="Reset filters">
          <RotateCcw className="w-[15px] h-[15px]" />
          Reset
        </button>
      </section>

      {loading ? (
        <div className="h-72 skeleton-card rounded-xl" />
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 px-5 bg-[#FFFDF7] border border-rule rounded-m shadow-soft">
          <Landmark className="w-[52px] h-[52px] text-ink-text-faint mb-[18px]" strokeWidth={1.5} />
          <h3 className="text-[19px] text-ink-text mb-2 font-serif">No court cases found</h3>
          <p className="text-[13.5px] text-ink-text-soft mb-6 max-w-[360px]">
            {hasFilters ? 'No court cases match these filters.' : 'Register the first High Court stay matter to start the register.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/court-cases/new')}>
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
            Add Court Case
          </button>
        </div>
      ) : (
        <>
          <section className="bg-[#FFFDF7] border border-rule rounded-m overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="data-table !min-w-[1360px]">
                <thead>
                  <tr>
                    <th>Sl</th>
                    <th>District</th>
                    <th>Cr. No.</th>
                    <th>Complainant / AGOs</th>
                    <th>Type · Act / Section</th>
                    <th>Stage of Case</th>
                    <th>Court & CC No</th>
                    <th>HC Bench & Petition No</th>
                    <th>Stay & Orders</th>
                    <th>Supreme Court</th>
                    <th>I.O</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, idx) => {
                    const status = statusOf(c.hcCourtOrders || c.hcCaseStatus);
                    const stayDate = c.hcStayDate || c.stayDate;
                    const stayDays = status === PENDING && stayDate ? daysBetween(stayDate) : null;
                    const canEdit = role === 'admin' || c.createdById === currentUserId;
                    const petitionNo = c.hcPetitionNo || c.wpCrlpNo;
                    const slpNo = c.scPetitionNo || c.slpNo;
                    const agoCount = c.agos?.length || 0;

                    return (
                      <tr key={c.id} onClick={() => navigate(`/court-cases/${c.id}`)}>
                        <td className="font-mono text-ink-text-faint">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="font-semibold text-ink-text">{c.district?.name}</td>
                        <td className="font-mono font-bold text-maroon whitespace-nowrap">{c.crimeNo}</td>
                        <td className="max-w-[200px]">
                          <div className="font-medium text-[13px] text-ink-text truncate" title={c.complainantName || ''}>
                            {c.complainantName || <span className="text-ink-text-faint">—</span>}
                          </div>
                          {agoCount > 0 && (
                            <div className="text-[11px] text-[#000E89] font-medium mt-0.5">
                              {agoCount} AGO{agoCount === 1 ? '' : 's'} ({c.agos[0]?.name}{agoCount > 1 ? ` +${agoCount - 1}` : ''})
                            </div>
                          )}
                        </td>
                        <td className="max-w-[210px]">
                          {c.caseType && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-[#E8EEF9] text-[#000E89] mr-1.5 mb-0.5">
                              {c.caseType}
                            </span>
                          )}
                          <div className="text-[12px] text-ink-text-soft truncate" title={c.actSections?.map(a => `${a.act}: ${a.section}`).join('\n') || `${c.act || ''} - ${c.section || ''}`}>
                            {c.actSections && c.actSections.length > 0 ? (
                              <span>
                                {c.actSections[0].act}{c.actSections[0].section ? ` (${c.actSections[0].section})` : ''}
                                {c.actSections.length > 1 && (
                                  <span className="text-[#000E89] font-bold ml-1">+{c.actSections.length - 1} more</span>
                                )}
                              </span>
                            ) : (
                              <span>{c.act || ''}{c.section || c.sectionOfLaw ? ` - ${c.section || c.sectionOfLaw}` : ''}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {c.caseStage ? (
                            <span className="font-semibold text-[12.5px] text-[#000E89]">
                              {c.caseStage}
                            </span>
                          ) : <span className="text-ink-text-faint">—</span>}
                        </td>
                        <td className="text-[12px]">
                          <div className="text-ink-text font-medium truncate max-w-[140px]" title={c.courtName || ''}>{c.courtName || '—'}</div>
                          {c.ccNo && <div className="text-[11px] font-mono text-ink-text-soft">CC: {c.ccNo}</div>}
                        </td>
                        <td>
                          <div className="font-mono text-[12.5px] font-semibold text-ink-text whitespace-nowrap">
                            {c.hcPetitionType ? `${c.hcPetitionType} ` : ''}{petitionNo || '—'}
                          </div>
                          <div className="text-[11px] text-ink-text-soft">{c.hcBench ? `${c.hcBench} Bench` : 'Bench not recorded'}</div>
                        </td>
                        <td>
                          <span className={`stamp ${STATUS_META[status].stamp}`}>
                            {c.hcCourtOrders || STATUS_META[status].label}
                          </span>
                          <div className="text-[11px] text-ink-text-soft mt-0.5 whitespace-nowrap">
                            {formatCaseDate(stayDate)}
                          </div>
                          {stayDays !== null && (
                            <div className={`text-[10.5px] font-bold mt-0.5 ${stayDays >= 365 ? 'text-brick' : 'text-rust'}`}>
                              {formatDuration(stayDays)}
                            </div>
                          )}
                        </td>
                        <td className="text-[12px]">
                          {slpNo ? (
                            <>
                              <div className="font-mono font-semibold text-ink-text">{slpNo}</div>
                              <div className="text-[11px] text-ink-text-soft">{c.scCourtOrders || c.scCaseStatus || 'Pending'}</div>
                            </>
                          ) : <span className="text-ink-text-faint">—</span>}
                        </td>
                        <td className="text-[12.5px]">{c.ioName || <span className="text-ink-text-faint">—</span>}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button type="button" className="icon-btn" title="View" onClick={() => navigate(`/court-cases/${c.id}`)}>
                              <Eye className="w-4 h-4" />
                            </button>
                            {canEdit && (
                              <button type="button" className="icon-btn" title="Edit" onClick={() => navigate(`/court-cases/${c.id}/edit`)}>
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
            <p className="text-[12.5px] text-ink-text-soft">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1.5">
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span className="text-[12.5px] text-ink-text-soft px-2">Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

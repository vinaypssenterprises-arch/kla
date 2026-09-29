import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, ArchiveX, Eye, Pencil, Trash2, X, Download,
  FileText, Calendar, Users, MessageSquare, MapPin, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp,
  AlertCircle, Clock, Gavel, Shield, Building2, SlidersHorizontal, FileDown,
  Settings2
} from 'lucide-react';
import { exportPetitionsToExcel } from '../lib/exportExcel';
import { exportPetitionToPdf } from '../lib/exportPdf';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function RegisterList() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [modalTab, setModalTab] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedCases, setExpandedCases] = useState({});
  const { showError, showSuccess } = useToast();

  const toggleExpandCase = (id) => {
    setExpandedCases(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Pagination & filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [allDistricts, setAllDistricts] = useState([]);

  const currentUserId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');
  const searchDebounceRef = useRef(null);

  // Debounce search input — 350ms delay
  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on search change
    }, 350);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [districtFilter, statusFilter]);

  // Fetch districts (one-time)
  useEffect(() => {
    apiFetch('/districts')
      .then(r => r.json())
      .then(data => setAllDistricts(data.filter(d => d.isActive)))
      .catch(err => console.error('Districts load error', err));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (districtFilter) params.set('district', districtFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiFetch(`/petitions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        // Support both paginated { data, total, totalPages } and legacy array response
        if (Array.isArray(json)) {
          setEntries(json);
          setTotal(json.length);
          setTotalPages(1);
        } else {
          setEntries(json.data || []);
          setTotal(json.total || 0);
          setTotalPages(json.totalPages || 1);
        }
      } else {
        showError('Failed to load petitions. Please try again.');
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, districtFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const handleOpenView = (entry) => {
    setViewingEntry(entry);
    setModalTab('all');
  };

  // Close action menu on click outside, scroll, resize, or Escape
  useEffect(() => {
    if (!actionMenu) return;
    const close = () => setActionMenu(null);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActionMenu(null);
    };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionMenu]);

  const handleToggleActionMenu = (e, entry) => {
    e.stopPropagation();
    if (actionMenu?.id === entry.id) {
      setActionMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.max(12, rect.left);
    const top = rect.bottom + 6;
    const openUpwards = top + 180 > window.innerHeight;
    setActionMenu({
      id: entry.id,
      entry,
      top: openUpwards ? undefined : top,
      bottom: openUpwards ? window.innerHeight - rect.top + 6 : undefined,
      left,
    });
  };

  const handleExportExcel = async () => {
    try {
      await exportPetitionsToExcel({
        search: debouncedSearch,
        district: districtFilter,
        status: statusFilter
      });
      showSuccess('Petitions exported to Excel successfully.');
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export petitions to Excel.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await apiFetch(`/petitions/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        showSuccess(`Petition ${deleteTarget.petitionNo} deleted successfully.`);
        fetchData();
      } else {
        showError('Failed to delete petition.');
      }
    } catch (error) {
      console.error('Delete error', error);
      showError('Error deleting petition.');
    } finally {
      setDeletingId(null);
    }
  };

  const renderPermissionBadge = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'obtain' || s === 'obtained') {
      return <span className="stamp stamp-success">OBTAINED</span>;
    }
    if (s === 'reject' || s === 'rejected') {
      return <span className="stamp stamp-danger">REJECTED</span>;
    }
    if (s === 'pending') {
      return <span className="stamp stamp-pending">PENDING</span>;
    }
    return <span className="text-[11px] text-ink-text-faint/60 italic font-mono px-2">—</span>;
  };

  const renderProposalBadge = (status) => {
    if (!status) return <span className="text-[12px] text-ink-text-faint/60 italic font-mono">—</span>;
    const s = status.toLowerCase().trim();
    if (s === 'accept') {
      return <span className="stamp stamp-success">ACCEPT</span>;
    }
    if (s === 'reject') {
      return <span className="stamp stamp-danger">REJECT</span>;
    }
    return <span className="stamp stamp-warning">{status.toUpperCase()}</span>;
  };

  const renderPeStatusBadge = (status) => {
    if (!status) return <span className="text-[12px] text-ink-text-faint/60 italic font-mono">—</span>;
    const s = status.toLowerCase().trim();
    if (s.includes('fir')) {
      return <span className="stamp stamp-danger">REGISTER FIR</span>;
    }
    if (s === 'close') {
      return <span className="stamp stamp-neutral">CLOSE</span>;
    }
    if (s.includes('de')) {
      return <span className="stamp stamp-info">RECOMMENDED TO DE</span>;
    }
    if (s.includes('pending')) {
      return <span className="stamp stamp-warning">PE PENDING</span>;
    }
    return <span className="stamp stamp-info">{status.toUpperCase()}</span>;
  };

  const activeDistricts = allDistricts.map(d => d.name).sort();

  // Skeleton rows for loading state
  const SkeletonRows = () => (
    <>
      {Array.from({ length: pageSize > 10 ? 8 : pageSize }).map((_, i) => (
        <tr key={i} className="pointer-events-none">
          {[40, 48, 90, 140, 130, 170, 80, 80, 100, 80].map((w, j) => (
            <td key={j} className="py-3.5 px-3">
              <div className={`h-4 skeleton-line rounded mx-auto`} style={{ width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  // Pagination helpers
  const goToPage = (p) => setPage(Math.max(1, Math.min(totalPages, p)));
  const startEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, total);

  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[22px] font-serif font-bold text-ink-text tracking-tight">17-A Proposals & Status Register</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-0.5">
            Petitions, sanction proposals under Sec. 17-A, and Preliminary Enquiry tracker
            {total > 0 && (
              <span className="ml-2.5 px-2 py-0.5 rounded-full text-[11.5px] font-bold bg-[#EAE4D2] text-[#4A3E25]">
                {total.toLocaleString()} total records
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn btn-excel no-print shadow-sm" title="Export to Excel" onClick={handleExportExcel}>
          <Download className="w-[15px] h-[15px]" />
          Export Excel
        </button>
      </div>

      {/* Filter Bar */}
      <section className="flex flex-col md:flex-row gap-3 mb-[22px] items-stretch md:items-center flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-text-faint pointer-events-none" />
          <input
            type="text"
            className="app-input pl-[38px] pr-8"
            placeholder="Search petitions, petitioners, respondents, districts…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-text-faint hover:text-ink-text transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <SearchableSelect
          className="w-auto min-w-[170px]"
          value={districtFilter}
          onChange={v => setDistrictFilter(v)}
          options={[{ value: '', label: 'All Districts' }, ...activeDistricts.map(d => ({ value: d, label: d }))]}
          label="Filter by District"
        />
        <select
          className="app-input w-auto min-w-[150px]"
          aria-label="Filter by PE status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All PE Status</option>
          <option value="PE Pending">PE Pending</option>
          <option value="Register FIR">Register FIR</option>
          <option value="Recommended to DE">Recommended to DE</option>
          <option value="Close">Close</option>
        </select>
        {(searchQuery || districtFilter || statusFilter) && (
          <button
            type="button"
            className="btn btn-secondary py-2 px-3 text-[12.5px]"
            onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setDistrictFilter(''); setStatusFilter(''); }}
            title="Reset all filters"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
        <button type="button" className="btn btn-primary md:ml-auto" onClick={() => navigate('/register/new')}>
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
          Add Petition
        </button>
      </section>

      {/* Table */}
      {!loading && entries.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 px-5 bg-white rounded-xl border border-[#D5CCA8] shadow-sm">
          <ArchiveX className="w-[52px] h-[52px] text-ink-text-faint mb-[18px]" strokeWidth={1.5} />
          <h3 className="text-[19px] text-ink-text mb-2 font-serif font-semibold">
            {debouncedSearch || districtFilter || statusFilter ? 'No results match your filters' : 'No petitions on file yet'}
          </h3>
          <p className="text-[13.5px] text-ink-text-soft mb-6 max-w-[340px]">
            {debouncedSearch || districtFilter || statusFilter
              ? 'Try adjusting your search or clearing the filters.'
              : 'Add the first petition to begin the register.'}
          </p>
          {(!debouncedSearch && !districtFilter && !statusFilter) && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('/register/new')}>
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
              Add Petition
            </button>
          )}
        </div>
      ) : (
        <section className="bg-white border border-[#D5CCA8] rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,14,137,0.05)]">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[60px] text-center">Case #</th>
                  <th className="w-[56px] text-center">Action</th>
                  <th className="min-w-[130px]">District</th>
                  <th className="min-w-[170px]">Petition No.</th>
                  <th className="min-w-[170px]">Petitioner</th>
                  <th className="min-w-[220px]">Respondents</th>
                  <th className="min-w-[110px]">Proposal</th>
                  <th className="min-w-[120px]">Permission</th>
                  <th className="min-w-[140px]">PE No. & Date</th>
                  <th className="min-w-[130px]">PE Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : (
                  entries.map((entry, idx) => {
                    const respondents = entry.respondents || [];
                    const hasMoreRespondents = respondents.length > 3;
                    const isExpanded = !!expandedCases[entry.id];
                    const visibleRespondents = hasMoreRespondents && !isExpanded
                      ? respondents.slice(0, 3)
                      : respondents;

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => handleOpenView(entry)}
                        className={`group transition-all duration-150 cursor-pointer case-row ${
                          idx % 2 === 0 ? 'case-row-odd' : 'case-row-even'
                        }`}
                      >
                        {/* Case Number Badge */}
                        <td className="text-center px-2 py-3 align-middle">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md bg-[#000E89] text-white font-mono text-[12px] font-bold shadow-xs">
                              {(page - 1) * pageSize + idx + 1}
                            </span>
                            <span className="text-[9px] font-bold tracking-wider text-[#7C88A2] uppercase">
                              Case
                            </span>
                          </div>
                        </td>

                        {/* Actions (placed immediately after Case # / SL No) */}
                        <td onClick={e => e.stopPropagation()} className="text-center px-2 align-middle">
                          <button
                            type="button"
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all border ${
                              actionMenu?.id === entry.id
                                ? 'bg-[#000E89] text-white border-[#000E89] shadow-xs'
                                : 'bg-[#F4F7FC] hover:bg-[#000E89] text-[#000E89] hover:text-white border-[#CBD8EF]'
                            }`}
                            title="Manage Case"
                            onClick={(e) => handleToggleActionMenu(e, entry)}
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                        </td>

                        {/* District */}
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-ink-text text-[13px]">
                            <MapPin className="w-3.5 h-3.5 text-brass flex-shrink-0" />
                            <span>{entry.district || '—'}</span>
                          </div>
                        </td>

                        {/* Petition No. */}
                        <td>
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-2.5 py-1 rounded-md shadow-xs whitespace-nowrap"
                              title={entry.petitionNo}
                            >
                              <FileText className="w-3.5 h-3.5 text-[#000E89]/70 flex-shrink-0" />
                              {entry.petitionNo}
                            </span>
                            {entry.type && (
                              <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                (entry.type || '').toLowerCase().includes('suo')
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}>
                                {entry.type}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Petitioner */}
                        <td className="max-w-[200px]">
                          <div className="font-semibold text-ink-text text-[13px] leading-snug line-clamp-2" title={entry.petitionerName}>
                            {entry.petitionerName}
                          </div>
                          {entry.petitionerAddress && (
                            <div className="text-[11px] text-ink-text-faint truncate mt-0.5" title={entry.petitionerAddress}>
                              {entry.petitionerAddress}
                            </div>
                          )}
                        </td>

                        {/* Respondents (clean professional sub-rows, collapsed to 3 if >3) */}
                        <td className="p-0 align-top">
                          <div className="divide-y divide-[#E2D9C2]">
                            {visibleRespondents.length > 0 ? (
                              visibleRespondents.map((r, i) => (
                                <div
                                  key={r.id || i}
                                  className="min-h-[46px] px-4 py-2 flex items-center gap-2 text-[12.5px] leading-tight"
                                  title={`${r.name}${r.designation ? ` (${r.designation})` : ''}${r.department ? ` · ${r.department}` : ''}`}
                                >
                                  <span className="w-5 h-5 rounded-full bg-[#EAE4D2] text-[#4A3E25] text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs border border-[#DDD5BE]">
                                    {i + 1}
                                  </span>
                                  <span className="font-semibold text-ink-text truncate">{r.name}</span>
                                  {r.designation && (
                                    <span className="text-[11.5px] text-ink-text-soft truncate font-normal">
                                      · {r.designation}
                                    </span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="min-h-[46px] px-4 py-2 flex items-center text-[12px] text-ink-text-faint italic font-mono">
                                —
                              </div>
                            )}
                          </div>
                          {hasMoreRespondents && (
                            <div className="p-1.5 bg-[#FAF6EC]/90 border-t border-[#E2D9C2] flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandCase(entry.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[#000E89] hover:bg-[#000E89] hover:text-white transition-all shadow-xs border border-[#CBD8EF] bg-white group/exp cursor-pointer"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5 text-[#000E89] group-hover/exp:text-white transition-transform" />
                                    <span>Show less</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-4 h-4 rounded-full bg-[#000E89]/10 group-hover/exp:bg-white/20 text-[#000E89] group-hover/exp:text-white flex items-center justify-center text-[10px] font-bold">
                                      +{respondents.length - 3}
                                    </span>
                                    <span>more</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-[#000E89] group-hover/exp:text-white transition-transform" />
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Proposal (aligned per respondent with divider lines) */}
                        <td className="p-0 align-top">
                          <div className="divide-y divide-[#E2D9C2]">
                            {visibleRespondents.length > 0 ? (
                              visibleRespondents.map((r, i) => (
                                <div key={r.id || i} className="min-h-[46px] px-4 py-2 flex items-center">
                                  {renderProposalBadge(entry.proposalStatus)}
                                </div>
                              ))
                            ) : (
                              <div className="min-h-[46px] px-4 py-2 flex items-center">
                                {renderProposalBadge(entry.proposalStatus)}
                              </div>
                            )}
                          </div>
                          {hasMoreRespondents && (
                            <div className="h-[37px] bg-[#FAF6EC]/40 border-t border-[#E2D9C2] flex items-center justify-center">
                              <span className="text-[10px] text-ink-text-faint/60 font-mono italic">
                                {isExpanded ? '—' : `+${respondents.length - 3}`}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Permission (aligned per respondent with divider lines) */}
                        <td className="p-0 align-top">
                          <div className="divide-y divide-[#E2D9C2]">
                            {visibleRespondents.length > 0 ? (
                              visibleRespondents.map((r, i) => (
                                <div key={r.id || i} className="min-h-[46px] px-4 py-2 flex items-center">
                                  {renderPermissionBadge(r.permissionStatus)}
                                </div>
                              ))
                            ) : (
                              <div className="min-h-[46px] px-4 py-2 flex items-center text-[12px] text-ink-text-faint italic font-mono">
                                —
                              </div>
                            )}
                          </div>
                          {hasMoreRespondents && (
                            <div className="h-[37px] bg-[#FAF6EC]/40 border-t border-[#E2D9C2] flex items-center justify-center">
                              <span className="text-[10px] text-ink-text-faint/60 font-mono italic">
                                {isExpanded ? '—' : `+${respondents.length - 3}`}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* PE No. & Date - displayed ONCE per petition */}
                        <td className="px-3.5 py-3 align-middle text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {entry.peNo ? (
                              <span className="font-mono text-[11px] font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-2 py-0.5 rounded shadow-2xs whitespace-nowrap">
                                PE #{entry.peNo}
                              </span>
                            ) : (
                              <span className="text-[12px] text-ink-text-faint/60 italic font-mono">—</span>
                            )}
                            {entry.peRegDate && (
                              <span className="text-[10px] text-ink-text-soft flex items-center gap-1 font-mono whitespace-nowrap">
                                <Calendar className="w-2.5 h-2.5 text-brass flex-shrink-0" />
                                {formatDate(entry.peRegDate)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* PE Status - displayed ONCE per petition */}
                        <td className="px-3.5 py-3 align-middle text-center">
                          <div className="flex items-center justify-center">
                            {renderPeStatusBadge(entry.peStatus)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 || total > 10 ? (
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-rule/60 bg-[#FFFDF9] flex-wrap gap-y-3">
              {/* Entry count */}
              <div className="text-[12.5px] text-ink-text-soft font-medium">
                Showing <span className="font-semibold text-ink-text">{startEntry}–{endEntry}</span> of{' '}
                <span className="font-semibold text-ink-text">{total.toLocaleString()}</span> records
              </div>

              {/* Page size + navigation */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-[12px] text-ink-text-soft">Rows:</label>
                <select
                  className="app-input py-1.5 px-2 text-[12.5px] w-auto min-w-0"
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="flex items-center gap-1 ml-1">
                  <button onClick={() => goToPage(1)} disabled={page === 1} className="icon-btn" title="First page">
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="icon-btn" title="Previous page">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[12.5px] font-medium text-ink-text px-2">
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="icon-btn" title="Next page">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="icon-btn" title="Last page">
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* ── Modern Floating Actions Menu ── */}
      {actionMenu && (
        <div
          className="fixed z-50 w-52 bg-white rounded-xl shadow-[0_12px_36px_rgba(0,14,137,0.2)] border border-[#D5CCA8] py-1 text-[13px] animate-in fade-in zoom-in-95 duration-100 divide-y divide-rule/40 font-sans"
          style={{
            top: actionMenu.top !== undefined ? `${actionMenu.top}px` : 'auto',
            bottom: actionMenu.bottom !== undefined ? `${actionMenu.bottom}px` : 'auto',
            left: actionMenu.left !== undefined ? `${actionMenu.left}px` : 'auto',
            right: actionMenu.right !== undefined ? `${actionMenu.right}px` : 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3.5 py-2 text-[11px] font-mono font-semibold text-ink-text-soft bg-[#FBF9F4] flex items-center justify-between">
            <span className="text-[10px] tracking-wide uppercase text-ink-text-faint font-sans font-bold">Action Menu</span>
            <span className="text-[#000E89] font-bold truncate max-w-[100px]" title={actionMenu.entry.petitionNo}>
              {actionMenu.entry.petitionNo}
            </span>
          </div>
          <div className="py-1">
            <button
              type="button"
              className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-ink-text hover:bg-[#E8EEF9] hover:text-[#000E89] font-medium transition-colors"
              onClick={() => {
                const entry = actionMenu.entry;
                setActionMenu(null);
                handleOpenView(entry);
              }}
            >
              <Eye className="w-4 h-4 text-[#000E89] flex-shrink-0" />
              <span>View Dossier (I–VI)</span>
            </button>
            <button
              type="button"
              className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium transition-colors"
              onClick={() => {
                const entry = actionMenu.entry;
                setActionMenu(null);
                exportPetitionToPdf(entry);
                showSuccess(`Downloading PDF for ${entry.petitionNo}…`);
              }}
            >
              <FileDown className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Download PDF Dossier</span>
            </button>
            {(role === 'admin' || actionMenu.entry.createdById === currentUserId || actionMenu.entry.createdBy?.supervisorUserId === currentUserId) && (
              <>
                <button
                  type="button"
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-ink-text hover:bg-amber-50 hover:text-amber-800 font-medium transition-colors"
                  onClick={() => {
                    const id = actionMenu.entry.id;
                    setActionMenu(null);
                    navigate(`/register/${id}/edit`);
                  }}
                >
                  <Pencil className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>Edit Petition</span>
                </button>
                <button
                  type="button"
                  disabled={deletingId === actionMenu.entry.id}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-colors disabled:opacity-40"
                  onClick={() => {
                    const entry = actionMenu.entry;
                    setActionMenu(null);
                    setDeleteTarget(entry);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>Delete Petition</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── New Tech Executive View Modal ── */}
      <Modal open={!!viewingEntry} onClose={() => setViewingEntry(null)} overlayClassName="bg-black/65 backdrop-blur-[6px]">
        {viewingEntry && (
          <div className="bg-[#FAF8F2] rounded-2xl shadow-[0_25px_70px_rgba(0,14,137,0.35)] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-[#D5CCA8] animate-in fade-in zoom-in-95 duration-200">

            {/* Header: Lokayukta Deep Navy & Gold */}
            <div className="relative bg-gradient-to-r from-[#000E89] via-[#081868] to-[#000E89] px-7 pt-6 pb-4 text-white flex-shrink-0">
              {/* Golden accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C9A15E] to-transparent" />

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C9A15E]/20 text-[#F5DEB3] border border-[#C9A15E]/40 text-[10.5px] font-bold tracking-widest uppercase">
                      <Shield className="w-3 h-3 text-[#C9A15E]" />
                      Karnataka Lokayukta · Sec. 17-A Case Docket
                    </span>
                    <span className="text-[11px] text-white/60 font-mono">
                      Filed: {formatDate(viewingEntry.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-[26px] font-serif font-bold text-white tracking-tight leading-none">
                      {viewingEntry.petitionNo}
                    </h3>
                    {viewingEntry.proposalStatus && renderProposalBadge(viewingEntry.proposalStatus)}
                    {viewingEntry.peStatus && renderPeStatusBadge(viewingEntry.peStatus)}
                  </div>

                  <div className="flex items-center gap-4 text-[13px] text-white/85 mt-2.5 flex-wrap">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A15E]" />
                      {viewingEntry.district}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      <Users className="w-3.5 h-3.5 text-[#C9A15E]" />
                      Petitioner: <span className="text-white font-semibold truncate">{viewingEntry.petitionerName}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A15E] hover:bg-[#b58e4e] text-[#000E89] text-[12px] font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                    onClick={() => {
                      exportPetitionToPdf(viewingEntry);
                      showSuccess(`Downloading PDF for ${viewingEntry.petitionNo}…`);
                    }}
                    title="Download Case PDF Dossier"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/15 flex-shrink-0"
                    onClick={() => setViewingEntry(null)}
                    title="Close Modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs Aligned with Form Flow I-VI */}
              <div className="flex gap-1.5 mt-5 pt-3 border-t border-white/15 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Complete Form Flow (I–VI)' },
                  { id: 'sec1', label: 'I. Petition' },
                  { id: 'sec2', label: `II. Respondents (${viewingEntry.respondents?.length || 0})` },
                  { id: 'sec3', label: 'III. 17-A Proposal' },
                  { id: 'sec4', label: 'IV. Competent Authority' },
                  { id: 'sec5', label: 'V. 17-A Permission' },
                  { id: 'sec6', label: 'VI. Preliminary Enquiry' },
                  ...(viewingEntry.remarks?.length > 0 ? [{ id: 'remarks', label: `Remarks (${viewingEntry.remarks.length})` }] : [])
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap ${
                      modalTab === tab.id
                        ? 'bg-white text-[#000E89] shadow-md font-bold'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Modal Content: Mirrors FormPage.jsx Sections I through VI */}
            <div className="flex-1 overflow-y-auto p-7 space-y-6">

              {/* ── Section I: Petition Details ── */}
              {(modalTab === 'all' || modalTab === 'sec1') && (
                <div className="bg-white rounded-xl p-5 border border-[#E2D9C2] shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-[#EFE8D8]">
                    <span className="font-mono text-[12px] font-bold text-white bg-[#000E89] px-2 py-0.5 rounded shadow-2xs">I.</span>
                    <h4 className="text-[14px] font-serif font-bold text-ink-text uppercase tracking-wide">Petition Details</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">District</span>
                      <div className="font-semibold text-ink-text flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brass" />
                        {viewingEntry.district || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Petition No.</span>
                      <div className="font-mono font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-2 py-0.5 rounded inline-block">
                        {viewingEntry.petitionNo}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Type</span>
                      <span className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] border ${
                        (viewingEntry.type || '').toLowerCase().includes('suo')
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {viewingEntry.type || 'Complaint'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Name of the Petitioner</span>
                      <div className="font-semibold text-ink-text">{viewingEntry.petitionerName || '—'}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Address of the Petitioner</span>
                      <div className="text-ink-text bg-[#FAF8F2] border border-[#EAE3D0] rounded-lg p-2.5 text-[12.5px]">
                        {viewingEntry.petitionerAddress || 'No address registered on record'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">SIR Officer Name</span>
                      <div className="font-semibold text-ink-text">{viewingEntry.sirOfficerName || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Officer Rank</span>
                      <div className="font-semibold text-ink-text">{viewingEntry.officerRank || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section II: Respondent Details ── */}
              {(modalTab === 'all' || modalTab === 'sec2') && (
                <div className="bg-white rounded-xl p-5 border border-[#E2D9C2] shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-[#EFE8D8]">
                    <span className="font-mono text-[12px] font-bold text-white bg-[#000E89] px-2 py-0.5 rounded shadow-2xs">II.</span>
                    <h4 className="text-[14px] font-serif font-bold text-ink-text uppercase tracking-wide">
                      Respondent Details ({viewingEntry.respondents?.length || 0})
                    </h4>
                  </div>
                  {(!viewingEntry.respondents || viewingEntry.respondents.length === 0) ? (
                    <div className="text-[12.5px] text-ink-text-faint italic py-2">No respondents added.</div>
                  ) : (
                    <div className="border border-[#E2D9C2] rounded-lg overflow-hidden">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="w-10 text-center">#</th>
                            <th>Respondent</th>
                            <th>Office</th>
                            <th>Department</th>
                            <th>Sub Department</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingEntry.respondents.map((r, i) => (
                            <tr key={r.id || i}>
                              <td className="text-center font-mono font-semibold text-ink-text-soft">{i + 1}</td>
                              <td>
                                <div className="font-bold text-ink-text text-[13px]">{r.name}</div>
                                {r.designation && <div className="text-[11.5px] text-ink-text-soft">{r.designation}</div>}
                              </td>
                              <td><span className="text-[12.5px]">{r.office || '—'}</span></td>
                              <td><span className="text-[12.5px] font-medium">{r.department || '—'}</span></td>
                              <td><span className="text-[12.5px] text-ink-text-soft">{r.subDepartment || '—'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Section III: 17-A Proposal ── */}
              {(modalTab === 'all' || modalTab === 'sec3') && (
                <div className="bg-white rounded-xl p-5 border border-[#E2D9C2] shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#EFE8D8]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold text-white bg-[#000E89] px-2 py-0.5 rounded shadow-2xs">III.</span>
                      <h4 className="text-[14px] font-serif font-bold text-ink-text uppercase tracking-wide">17-A Proposal</h4>
                    </div>
                    {renderProposalBadge(viewingEntry.proposalStatus)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Proposal Status</span>
                      <div className="font-semibold text-ink-text">{viewingEntry.proposalStatus || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Date Sent to CA</span>
                      <div className="font-semibold text-ink-text flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brass" />
                        {formatDate(viewingEntry.proposalSentDate)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section IV: Competent Authority (Per Respondent) ── */}
              {(modalTab === 'all' || modalTab === 'sec4') && (
                <div className="bg-white rounded-xl p-5 border border-[#E2D9C2] shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-[#EFE8D8]">
                    <span className="font-mono text-[12px] font-bold text-white bg-[#000E89] px-2 py-0.5 rounded shadow-2xs">IV.</span>
                    <h4 className="text-[14px] font-serif font-bold text-ink-text uppercase tracking-wide">Competent Authority (Per Respondent)</h4>
                  </div>
                  {(!viewingEntry.respondents || viewingEntry.respondents.length === 0) ? (
                    <div className="text-[12.5px] text-ink-text-faint italic py-2">No respondents registered.</div>
                  ) : (
                    <div className="border border-[#E2D9C2] rounded-lg overflow-hidden">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="w-10 text-center">#</th>
                            <th>Respondent</th>
                            <th>CA Designation</th>
                            <th>CA Department</th>
                            <th>CA Sub Department</th>
                            <th>CA Office / Place</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingEntry.respondents.map((r, i) => (
                            <tr key={r.id || i}>
                              <td className="text-center font-mono font-semibold text-ink-text-soft">{i + 1}</td>
                              <td>
                                <div className="font-bold text-ink-text text-[13px]">{r.name}</div>
                                {r.designation && <div className="text-[11.5px] text-ink-text-soft">{r.designation}</div>}
                              </td>
                              <td><span className="text-[12.5px] font-semibold text-[#000E89]">{r.caDesignation || '—'}</span></td>
                              <td><span className="text-[12.5px] font-medium">{r.caDepartment || '—'}</span></td>
                              <td><span className="text-[12.5px] text-ink-text-soft">{r.caSubDepartment || '—'}</span></td>
                              <td><span className="text-[12.5px]">{r.caPlace || '—'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Section V: 17-A Permission (Per Respondent) ── */}
              {(modalTab === 'all' || modalTab === 'sec5') && (
                <div className="bg-white rounded-xl p-5 border border-[#E2D9C2] shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-[#EFE8D8]">
                    <span className="font-mono text-[12px] font-bold text-white bg-[#000E89] px-2 py-0.5 rounded shadow-2xs">V.</span>
                    <h4 className="text-[14px] font-serif font-bold text-ink-text uppercase tracking-wide">17-A Permission (Per Respondent)</h4>
                  </div>
                  {(!viewingEntry.respondents || viewingEntry.respondents.length === 0) ? (
                    <div className="text-[12.5px] text-ink-text-faint italic py-2">No respondents registered.</div>
                  ) : (
                    <div className="border border-[#E2D9C2] rounded-lg overflow-hidden">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="w-10 text-center">#</th>
                            <th>Respondent</th>
                            <th>Status</th>
                            <th>Sent Date</th>
                            <th>Permission Received from CA</th>
                            <th>CA Sent to Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingEntry.respondents.map((r, i) => (
                            <tr key={r.id || i}>
                              <td className="text-center font-mono font-semibold text-ink-text-soft">{i + 1}</td>
                              <td>
                                <div className="font-bold text-ink-text text-[13px]">{r.name}</div>
                                {r.designation && <div className="text-[11.5px] text-ink-text-soft">{r.designation}</div>}
                              </td>
                              <td>{renderPermissionBadge(r.permissionStatus)}</td>
                              <td className="font-mono text-[12px]">{formatDate(r.permissionSentDate)}</td>
                              <td className="font-mono text-[12px]">{formatDate(r.permissionReceivedFromCA)}</td>
                              <td className="font-mono text-[12px]">{formatDate(r.caSentToUnit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Section VI: Preliminary Enquiry (PE) ── */}
              {(modalTab === 'all' || modalTab === 'sec6') && (
                <div className="bg-white rounded-xl p-5 border border-[#E2D9C2] shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#EFE8D8]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold text-white bg-[#000E89] px-2 py-0.5 rounded shadow-2xs">VI.</span>
                      <h4 className="text-[14px] font-serif font-bold text-ink-text uppercase tracking-wide">Preliminary Enquiry</h4>
                    </div>
                    {renderPeStatusBadge(viewingEntry.peStatus)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-[13px]">
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">PE No</span>
                      <div className="font-mono font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-2 py-0.5 rounded inline-block">
                        {viewingEntry.peNo ? `PE #${viewingEntry.peNo}` : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Date of PE Registration</span>
                      <div className="font-semibold text-ink-text flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brass" />
                        {formatDate(viewingEntry.peRegDate)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">PE Enquery Officer</span>
                      <div className="font-semibold text-ink-text">{viewingEntry.sirEo || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">PE Status</span>
                      <div className="font-semibold text-ink-text">{viewingEntry.peStatus || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[11.5px] font-bold text-ink-text-soft block mb-1">Date of PE report sent to HQ</span>
                      <div className="font-semibold text-ink-text flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brass" />
                        {formatDate(viewingEntry.peReportSentDate)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Diary Remarks & Chronology ── */}
              {(modalTab === 'all' || modalTab === 'remarks') && viewingEntry.remarks?.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-[#E2D9C2] shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-[#EFE8D8]">
                    <MessageSquare className="w-4 h-4 text-brass" />
                    <h4 className="text-[14px] font-serif font-bold text-ink-text uppercase tracking-wide">Diary Remarks & Chronology</h4>
                  </div>
                  <div className="space-y-3">
                    {viewingEntry.remarks.map((rm, idx) => (
                      <div key={rm.id || idx} className="bg-[#FAF8F2] border border-[#E2D9C2] rounded-lg p-3 text-[12.5px]">
                        <div className="font-bold text-[#000E89] mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-brass" />
                          {formatDate(rm.date)}
                        </div>
                        <p className="text-ink-text whitespace-pre-line">{rm.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-[#F0ECE1] border-t border-[#DFD6C2] px-7 py-3.5 flex justify-between items-center flex-shrink-0">
              <div className="text-[12px] text-ink-text-soft font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Case ID: <span className="font-bold text-ink-text">{viewingEntry.id}</span>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  className="btn btn-secondary py-2 px-4 text-[13px] bg-white border-[#D5CCA8] text-ink-text hover:bg-parchment-2"
                  onClick={() => setViewingEntry(null)}
                >
                  Close
                </button>
                {(role === 'admin' || viewingEntry.createdById === currentUserId || viewingEntry.createdBy?.supervisorUserId === currentUserId) && (
                  <button
                    className="btn btn-primary py-2 px-5 text-[13px] shadow-sm flex items-center gap-1.5"
                    onClick={() => { navigate(`/register/${viewingEntry.id}/edit`); setViewingEntry(null); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Petition
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Petition?"
        message={deleteTarget ? `Delete petition ${deleteTarget.petitionNo}? This action cannot be undone.` : ''}
        confirmLabel="Delete Permanently"
        loading={!!deletingId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

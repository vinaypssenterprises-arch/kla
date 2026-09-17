import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, ArchiveX, Eye, Pencil, Trash2, X, Download,
  FileText, Calendar, Users, MessageSquare, MapPin, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertCircle, Clock, Gavel, Shield
} from 'lucide-react';
import { exportPetitionsToExcel } from '../lib/exportExcel';
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
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showError, showSuccess } = useToast();

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

  const handleExportExcel = async () => {
    try {
      await exportPetitionsToExcel();
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
    switch (status) {
      case 'Obtain': return <span className="stamp stamp-success ml-1">Obtained</span>;
      case 'Reject': return <span className="stamp stamp-danger ml-1">Rejected</span>;
      case 'Pending': return <span className="stamp stamp-pending ml-1">Pending</span>;
      default: return null;
    }
  };

  const activeDistricts = allDistricts.map(d => d.name).sort();

  // Skeleton rows for loading state
  const SkeletonRows = () => (
    <>
      {Array.from({ length: pageSize > 10 ? 8 : pageSize }).map((_, i) => (
        <tr key={i} className="pointer-events-none">
          {[40, 80, 70, 120, 130, 70, 70, 70, 50].map((w, j) => (
            <td key={j} className="py-[14px] px-5">
              <div className={`h-4 skeleton-line rounded`} style={{ width: w }} />
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
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">Register — All Petitions</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">
            17-A proposals and preliminary enquiry status.
            {total > 0 && <span className="ml-2 font-semibold text-ink-text">{total.toLocaleString()} total records</span>}
          </p>
        </div>
        <button type="button" className="btn btn-excel no-print" title="Export to Excel" onClick={handleExportExcel}>
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
          <option value="Register FIR">Register FIR</option>
          <option value="Recommended to DE">Recommended to DE</option>
          <option value="Close">Close</option>
        </select>
        <button type="button" className="btn btn-primary md:ml-auto" onClick={() => navigate('/register/new')}>
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
          Add Petition
        </button>
      </section>

      {/* Table */}
      {!loading && entries.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 px-5 bg-[#FFFDF7] rounded-xl border border-rule shadow-soft">
          <ArchiveX className="w-[52px] h-[52px] text-ink-text-faint mb-[18px]" strokeWidth={1.5} />
          <h3 className="text-[19px] text-ink-text mb-2 font-serif">
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
        <section className="bg-[#FFFDF7] border border-rule rounded-m overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sl.No</th>
                  <th>District</th>
                  <th>Petition No.</th>
                  <th>Petitioner</th>
                  <th>Respondents</th>
                  <th>Proposal</th>
                  <th>Permission</th>
                  <th>PE Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : (
                  entries.map((entry, idx) => (
                    <tr key={entry.id} onClick={() => setViewingEntry(entry)}>
                      <td className="font-mono">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="font-semibold text-ink-text">{entry.district}</td>
                      <td className="font-mono">{entry.petitionNo}</td>
                      <td>{entry.petitionerName}</td>
                      <td>
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {entry.respondents.map((r) => (
                            <div key={r.id} className="text-[12px] truncate" title={r.name}>
                              &bull; {r.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        {entry.proposalStatus && (
                          <span className={`stamp ${entry.proposalStatus === 'Accept' ? 'stamp-success' : 'stamp-warning'}`}>
                            {entry.proposalStatus}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {entry.respondents.map((r) => r.permissionStatus ? renderPermissionBadge(r.permissionStatus) : null)}
                        </div>
                      </td>
                      <td>
                        {entry.peStatus && (
                          <span className={`stamp ${entry.peStatus === 'Register FIR' ? 'stamp-danger' : entry.peStatus === 'Close' ? 'stamp-neutral' : 'stamp-info'}`}>
                            {entry.peStatus}
                          </span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button type="button" className="icon-btn" title="View" onClick={() => setViewingEntry(entry)}>
                            <Eye className="w-4 h-4" />
                          </button>
                          {(role === 'admin' || entry.createdById === currentUserId || entry.createdBy?.supervisorUserId === currentUserId) && (
                            <>
                              <button type="button" className="icon-btn" title="Edit" onClick={() => navigate(`/register/${entry.id}/edit`)}>
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="icon-btn hover:!bg-brick-bg hover:!text-brick disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Delete"
                                disabled={deletingId === entry.id}
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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

      {/* ── Premium View Modal ── */}
      <Modal open={!!viewingEntry} onClose={() => setViewingEntry(null)} overlayClassName="bg-black/65 backdrop-blur-[8px]">
        {viewingEntry && (
          <div className="bg-[#0D1627] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.7)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10">

            {/* Modal Header — dark with brass accent */}
            <div className="relative bg-gradient-to-r from-[#0D1627] to-[#12192B] px-7 py-5 flex items-start justify-between flex-shrink-0 border-b border-white/10">
              {/* Top brass accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A15E] to-transparent" />

              <div className="flex-1 pr-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#C9A15E]/15 border border-[#C9A15E]/30 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#C9A15E]" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#8590A8] tracking-widest uppercase">
                    Karnataka Lokayukta · Sec. 17-A
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-[28px] font-serif font-bold text-[#F5EFE1] leading-none tracking-tight">
                    {viewingEntry.petitionNo}
                  </h3>
                  {viewingEntry.proposalStatus && (
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase border ${
                      viewingEntry.proposalStatus.toLowerCase() === 'accept'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : viewingEntry.proposalStatus.toLowerCase() === 'reject'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {viewingEntry.proposalStatus}
                    </span>
                  )}
                  {viewingEntry.peStatus && (
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase border ${
                      viewingEntry.peStatus.includes('FIR')
                        ? 'bg-red-500/15 text-red-300 border-red-500/30'
                        : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    }`}>
                      {viewingEntry.peStatus}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[13px] text-[#8590A8] flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brass opacity-70" />
                    {viewingEntry.district}
                  </span>
                  <span className="w-1 h-1 bg-[#3A4870] rounded-full" />
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 opacity-70" />
                    {viewingEntry.petitionerName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/10"
                onClick={() => setViewingEntry(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto bg-[#0F1B2D]">

              {/* Overview grid */}
              <div className="px-7 py-5 border-b border-white/8">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-[#C9A15E]" />
                  <h4 className="text-[11px] font-bold text-[#8590A8] uppercase tracking-widest">Case Overview</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: 'Proposal Status', value: viewingEntry.proposalStatus || '—' },
                    { label: 'Sent to CA', value: formatDate(viewingEntry.proposalSentDate) },
                    { label: 'PE Number', value: viewingEntry.peNo || '—' },
                    { label: 'PE Reg. Date', value: formatDate(viewingEntry.peRegDate) },
                    { label: 'PE Status', value: viewingEntry.peStatus || '—' },
                    { label: 'PE Report Sent', value: formatDate(viewingEntry.peReportSentDate) },
                    { label: 'Petitioner Address', value: viewingEntry.petitionerAddress || '—', span: 2 },
                  ].map(({ label, value, span }) => (
                    <div key={label} className={span === 2 ? 'col-span-2' : ''}>
                      <div className="text-[10.5px] text-[#536089] font-semibold uppercase tracking-wider mb-1">{label}</div>
                      <div className="text-[13px] font-medium text-[#C5D0E0]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Respondents */}
              <div className="px-7 py-5 border-b border-white/8">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-[#C9A15E]" />
                  <h4 className="text-[11px] font-bold text-[#8590A8] uppercase tracking-widest">
                    Respondents ({viewingEntry.respondents?.length || 0})
                  </h4>
                </div>
                {(!viewingEntry.respondents || viewingEntry.respondents.length === 0) ? (
                  <p className="text-[13px] text-[#536089] italic">No respondents recorded.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingEntry.respondents.map(r => (
                      <div key={r.id} className="flex items-start gap-3 p-4 bg-white/4 border border-white/8 rounded-xl hover:border-white/15 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-[#C9A15E]/15 border border-[#C9A15E]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-[#C9A15E]">
                            {r.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-semibold text-[13px] text-[#E8EEF5] truncate pr-2">{r.name}</div>
                            {renderPermissionBadge(r.permissionStatus)}
                          </div>
                          <div className="text-[11.5px] text-[#8590A8] truncate">
                            {[r.designation, r.department].filter(Boolean).join(' · ')}
                          </div>
                          {(r.caDesignation || r.caDepartment || r.caPlace) && (
                            <div className="text-[10.5px] text-[#536089] bg-white/5 px-2 py-1 rounded border border-white/10 mt-1.5 truncate">
                              <span className="font-semibold text-[#8590A8] mr-1">CA:</span>
                              {[r.caDesignation, r.caDepartment, r.caPlace].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div className="px-7 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-[#C9A15E]" />
                  <h4 className="text-[11px] font-bold text-[#8590A8] uppercase tracking-widest">
                    Remarks ({viewingEntry.remarks?.length || 0})
                  </h4>
                </div>
                {(!viewingEntry.remarks || viewingEntry.remarks.length === 0) ? (
                  <p className="text-[13px] text-[#536089] italic">No remarks recorded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {viewingEntry.remarks.map((rm) => (
                      <li key={rm.id} className="flex gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center flex-shrink-0">
                          <div className="text-[11px] font-bold text-[#C9A15E] leading-none">{new Date(rm.date).getDate()}</div>
                          <div className="text-[8.5px] uppercase font-semibold text-[#536089] leading-none mt-0.5">
                            {new Date(rm.date).toLocaleDateString('en-IN', { month: 'short' })}
                          </div>
                        </div>
                        <div className="flex-1 bg-white/4 rounded-xl p-3.5 border border-white/8">
                          <div className="text-[11px] text-[#536089] mb-1 font-medium">{formatDate(rm.date)}</div>
                          <div className="text-[13px] text-[#C5D0E0] leading-relaxed">{rm.text}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#0D1627] border-t border-white/10 px-7 py-4 flex justify-between items-center flex-shrink-0">
              <div className="text-[11px] text-[#536089] font-mono">
                Created: {formatDate(viewingEntry.createdAt)}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary py-2 px-4 text-[13px]"
                  onClick={() => setViewingEntry(null)}
                >
                  Close
                </button>
                {(role === 'admin' || viewingEntry.createdById === currentUserId || viewingEntry.createdBy?.supervisorUserId === currentUserId) && (
                  <button
                    className="btn btn-primary py-2 px-5 text-[13px]"
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

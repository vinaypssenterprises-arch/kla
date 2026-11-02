import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, ShieldOff, Eye, Pencil, Trash2, Download, RotateCcw, MapPin, AlertTriangle, UserCheck, UserX, FileClock, ArrowRightLeft } from 'lucide-react';
import { exportOfficersToExcel } from '../lib/exportExcel';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';
import { OFFICER_RANK_OPTIONS, compareDesignationsByRank, compareOfficersByRank } from '../lib/officerAnalytics';
import OfficerLifecycleModal from '../components/officers/OfficerLifecycleModal';
import OfficerLifecycleRequestsModal from '../components/officers/OfficerLifecycleRequestsModal';

const PAGE_SIZE = 10;

export default function OfficersList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [officers, setOfficers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const currentUserId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const userDistrictId = localStorage.getItem('districtId') || '';
  const userDistrictName = localStorage.getItem('districtName') || '';
  const isGlobalUser = role === 'admin' || isHeadOffice;

  const [search, setSearch] = useState('');
  // Dashboard / report drilldowns land here with ?districtId=, ?designation= and ?rank= pre-applied
  const [districtId, setDistrictId] = useState(!isGlobalUser && userDistrictId ? userDistrictId : (searchParams.get('districtId') || ''));
  const [designation, setDesignation] = useState(searchParams.get('designation') || '');
  const [rank, setRank] = useState(searchParams.get('rank') || '');
  const [postStatus, setPostStatus] = useState(searchParams.get('postStatus') || '');

  const [districts, setDistricts] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status Change Modal State (Working <-> Vacant with confirmation & validation)
  const [statusModal, setStatusModal] = useState(null); // { type: 'BLOCKED_VACANT' | 'CONFIRM_VACANT' | 'CONFIRM_WORKING', officer }
  const [statusOfficerName, setStatusOfficerName] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Lifecycle Modals State
  const [lifecycleOfficer, setLifecycleOfficer] = useState(null);
  const [requestsModalOpen, setRequestsModalOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { showError, showSuccess } = useToast();

  const handleInitiateStatusChange = (officer) => {
    if (role !== 'admin') return;
    const currentStatus = officer.workingStatus || 'Working';
    const officerName = (officer.name || '').trim();

    if (currentStatus === 'Working') {
      // Trying to switch to Vacant
      // User rule: "officer name idhre adhu vacant agbardhu error barbeku officer name empty idhre mathra vacant agbeku"
      if (officerName !== '' && officerName.toLowerCase() !== 'vacant') {
        setStatusModal({
          type: 'BLOCKED_VACANT',
          officer
        });
        return;
      }
      // Officer name is empty -> allowed to mark as Vacant with confirmation
      setStatusModal({
        type: 'CONFIRM_VACANT',
        officer
      });
    } else {
      // Current is Vacant -> prompt for confirmation and officer name to mark as Working
      setStatusOfficerName('');
      setStatusError('');
      setStatusModal({
        type: 'CONFIRM_WORKING',
        officer
      });
    }
  };

  const handleConfirmVacant = async () => {
    if (!statusModal || !statusModal.officer) return;
    setStatusSubmitting(true);
    const { officer } = statusModal;
    try {
      const res = await apiFetch(`/officers/${officer.id}/working-status`, {
        method: 'PATCH',
        body: JSON.stringify({ workingStatus: 'Vacant', name: '' })
      });
      if (res.ok) {
        setOfficers(prev => prev.map(o => o.id === officer.id ? { ...o, workingStatus: 'Vacant', name: '' } : o));
        showSuccess?.(`Status successfully changed to Vacant.`);
        setStatusModal(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.error || 'Failed to update working status.');
      }
    } catch (err) {
      console.error('Update status error', err);
      showError('Error updating status.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleConfirmWorking = async (e) => {
    if (e) e.preventDefault();
    if (!statusModal || !statusModal.officer) return;
    const trimmed = (statusOfficerName || '').trim();
    if (!trimmed || trimmed.toLowerCase() === 'vacant') {
      setStatusError('Officer name is required to mark this post as Working.');
      return;
    }

    setStatusSubmitting(true);
    const { officer } = statusModal;
    try {
      const res = await apiFetch(`/officers/${officer.id}/working-status`, {
        method: 'PATCH',
        body: JSON.stringify({ workingStatus: 'Working', name: trimmed })
      });
      if (res.ok) {
        setOfficers(prev => prev.map(o => o.id === officer.id ? { ...o, workingStatus: 'Working', name: trimmed } : o));
        showSuccess?.(`Status changed to Working with officer "${trimmed}".`);
        setStatusModal(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusError(err.error || 'Failed to update working status.');
      }
    } catch (err) {
      console.error('Update status error', err);
      setStatusError('Error updating status.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  useEffect(() => {
    apiFetch('/districts')
      .then(res => res.ok ? res.json() : [])
      .then(data => setDistricts(data.filter(d => d.isActive)))
      .catch(err => console.error('Failed to load districts', err));
    apiFetch('/officers/meta/designations')
      .then(res => res.ok ? res.json() : [])
      .then(data => setDesignations([...data].sort(compareDesignationsByRank)))
      .catch(err => console.error('Failed to load designations', err));
  }, []);

  const fetchOfficers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (districtId) params.set('districtId', districtId);
    if (designation) params.set('designation', designation);
    if (rank) params.set('rank', rank);
    if (postStatus) params.set('postStatus', postStatus);

    apiFetch(`/officers?${params.toString()}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setOfficers(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(err => console.error('Failed to load officers', err))
      .finally(() => setLoading(false));
  }, [page, search, districtId, designation, rank, postStatus]);

  useEffect(() => {
    const timer = setTimeout(fetchOfficers, 250);
    return () => clearTimeout(timer);
  }, [fetchOfficers]);

  useEffect(() => { setPage(1); }, [search, districtId, designation, rank, postStatus]);

  const fetchPendingCount = useCallback(() => {
    apiFetch('/officers/lifecycle/pending-count')
      .then(res => res.json())
      .then(data => setPendingRequestsCount(data.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  const resetFilters = () => {
    setSearch('');
    setDistrictId(!isGlobalUser && userDistrictId ? userDistrictId : '');
    setDesignation('');
    setRank('');
    setPostStatus('');
  };

  const handleExport = async () => {
    try {
      await exportOfficersToExcel({ search, districtId, designation, rank, postStatus });
    } catch (err) {
      console.error('Export failed', err);
      showError('Failed to export officers to Excel.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/officers/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        fetchOfficers();
        fetchPendingCount();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to delete officer.');
      }
    } catch (err) {
      console.error('Delete officer error', err);
      showError('Error deleting officer.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const summarizePlaces = (places) => {
    if (!places || places.length === 0) return '—';
    return places.slice(0, 2).map(p => {
      const parts = [p.designation, p.policeStation, p.district].filter(Boolean);
      const label = parts.length > 0 ? parts.join(', ') : (p.place || '—');
      const fromStr = p.fromDate ? formatDate(p.fromDate) : p.fromYear;
      const toStr = p.toDate ? formatDate(p.toDate) : p.toYear;
      const duration = fromStr || toStr ? ` (${fromStr || ''}${toStr ? '–' + toStr : ''})` : '';
      return `${label}${duration}`;
    }).join('; ') + (places.length > 2 ? `; +${places.length - 2} more` : '');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">Officers — All Officers</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">{total} officer{total === 1 ? '' : 's'} on record.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="btn btn-secondary relative"
            onClick={() => setRequestsModalOpen(true)}
          >
            <FileClock className="w-[15px] h-[15px] text-brass" />
            <span>Lifecycle Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="bg-amber-600 text-white text-[10.5px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button type="button" className="btn btn-excel" onClick={handleExport}>
            <Download className="w-[15px] h-[15px]" />
            Export
          </button>
        </div>
      </div>

      <section className="flex flex-col md:flex-row md:flex-wrap gap-3 mb-[22px] items-stretch md:items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-text-faint pointer-events-none" />
          <input
            type="text"
            className="app-input pl-[38px]"
            placeholder="Search by name, district, designation, mobile, KGID, native place…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {!isGlobalUser && userDistrictName ? (
          <span className="font-mono text-xs font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-3 py-2 rounded-lg shadow-2xs inline-flex items-center gap-1.5 flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-brass" />
            {userDistrictName}
          </span>
        ) : (
          <SearchableSelect
            className="w-auto min-w-[170px]"
            value={districtId}
            onChange={setDistrictId}
            options={[{ value: '', label: 'All Districts' }, ...districts.map(d => ({ value: d.id, label: d.name }))]}
            label="Filter by District"
          />
        )}
        <SearchableSelect
          className="w-auto min-w-[150px]"
          value={rank}
          onChange={setRank}
          options={[{ value: '', label: 'All Ranks' }, ...OFFICER_RANK_OPTIONS]}
          label="Filter by Rank"
        />
        <SearchableSelect
          className="w-auto min-w-[140px]"
          value={postStatus}
          onChange={setPostStatus}
          options={[
            { value: '', label: 'All Posts' },
            { value: 'filled', label: 'In Position' },
            { value: 'vacant', label: 'Vacant Posts' }
          ]}
          label="Filter by Post Status"
        />
        <SearchableSelect
          className="w-auto min-w-[170px]"
          value={designation}
          onChange={setDesignation}
          options={[{ value: '', label: 'All Designations' }, ...designations.map(d => ({ value: d, label: d }))]}
          label="Filter by Designation"
        />
        <button type="button" className="btn btn-secondary" onClick={resetFilters} title="Reset filters">
          <RotateCcw className="w-[15px] h-[15px]" />
          Reset
        </button>
        {role === 'admin' && (
          <button type="button" className="btn btn-primary md:ml-auto" onClick={() => navigate('/officers/new')}>
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
            Add Officer
          </button>
        )}
      </section>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-ink-text-soft">Loading...</div>
      ) : officers.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 px-5">
          <ShieldOff className="w-[52px] h-[52px] text-ink-text-faint mb-[18px]" strokeWidth={1.5} />
          <h3 className="text-[19px] text-ink-text mb-2 font-serif">No officers found</h3>
          <p className="text-[13.5px] text-ink-text-soft mb-6 max-w-[340px]">
            {search || districtId || designation || rank || postStatus ? 'No officers match these filters.' : 'Add the first officer to begin the roster.'}
          </p>
          {role === 'admin' && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('/officers/new')}>
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
              Add Officer
            </button>
          )}
        </div>
      ) : (
        <>
          <section className="bg-[#FFFDF7] border border-rule rounded-m overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sl No</th>
                    <th>District</th>
                    <th>Officer Name</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Previous Working Places</th>
                    <th>Reporting Date</th>
                    <th>Present Address</th>
                    <th>Govt (CUG) Mobile</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {officers.map((o, idx) => (
                    <tr key={o.id} onClick={() => navigate(`/officers/${o.id}`)}>
                      <td className="font-mono font-bold text-ink-text">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="font-bold text-ink-text">{o.district?.name}</td>
                      <td className="font-bold text-maroon text-[13.5px]">
                        <div>
                          {o.name && o.name.trim() && o.name.trim().toLowerCase() !== 'vacant' ? (
                            o.name
                          ) : (
                            <span className="text-ink-text-faint font-normal italic text-[12.5px]">—</span>
                          )}
                        </div>
                        {o.kgidNumber && <div className="text-[11px] font-mono text-ink-text-soft font-semibold">KGID: {o.kgidNumber}</div>}
                      </td>
                      <td><span className="stamp stamp-info">{o.designation}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        {role === 'admin' ? (
                          <button
                            type="button"
                            onClick={() => handleInitiateStatusChange(o)}
                            disabled={statusSubmitting}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold border tracking-wide transition-all duration-200 cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${
                              (o.workingStatus || 'Working') === 'Working'
                                ? 'bg-[#EBF7EE] text-[#1E6935] border-[#BBE5C6] hover:bg-[#DDF3E3]'
                                : 'bg-[#FEF6E7] text-[#9A6700] border-[#F2C94C] hover:bg-[#FDECC8]'
                            }`}
                            title={`Admin: Click to change status (${(o.workingStatus || 'Working') === 'Working' ? 'Mark as Vacant' : 'Mark as Working'})`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                (o.workingStatus || 'Working') === 'Working' ? 'bg-[#1E6935]' : 'bg-[#E68A00]'
                              }`}
                            />
                            <span>{o.workingStatus || 'Working'}</span>
                            <span className="text-[10px] text-ink-text-faint ml-0.5">⇄</span>
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border tracking-wide select-none ${
                              (o.workingStatus || 'Working') === 'Working'
                                ? 'bg-[#EBF7EE] text-[#1E6935] border-[#BBE5C6]'
                                : 'bg-[#FEF6E7] text-[#9A6700] border-[#F2C94C]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                (o.workingStatus || 'Working') === 'Working' ? 'bg-[#1E6935]' : 'bg-[#E68A00]'
                              }`}
                            />
                            {o.workingStatus || 'Working'}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[260px]"><span className="text-[12px] text-ink-text font-medium">{summarizePlaces(o.previousPlaces)}</span></td>
                      <td className="font-semibold text-ink-text">{formatDate(o.reportingDate)}</td>
                      <td className="max-w-[220px]"><span className="text-[12px] text-ink-text-soft truncate block">{o.presentAddress}</span></td>
                      <td className="font-mono text-xs font-bold text-ink-text">
                        <div>{o.mobile || '—'}</div>
                        {o.personalMobile && <div className="text-[11px] text-ink-text-soft font-normal">Personal: {o.personalMobile}</div>}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button type="button" className="icon-btn" title="View" onClick={() => navigate(`/officers/${o.id}`)}>
                            <Eye className="w-4 h-4" />
                          </button>
                          {(role === 'admin' || isHeadOffice || (userDistrictId && o.districtId === userDistrictId) || o.createdById === currentUserId) && (
                            <button type="button" className="icon-btn hover:!text-maroon" title="Edit" onClick={() => navigate(`/officers/${o.id}/edit`)}>
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {(role === 'admin' || isHeadOffice || (userDistrictId && o.districtId === userDistrictId) || o.createdById === currentUserId) && (o.workingStatus || 'Working') === 'Working' && o.name && o.name.toLowerCase() !== 'vacant' && (
                            <button
                              type="button"
                              className="icon-btn hover:!text-[#000E89]"
                              title="Transfer / Retire / Relieve"
                              onClick={() => setLifecycleOfficer(o)}
                            >
                              <ArrowRightLeft className="w-4 h-4 text-brass" />
                            </button>
                          )}
                          {role === 'admin' && (
                            <button type="button" className="icon-btn hover:!bg-brick-bg hover:!text-brick" title="Delete" onClick={() => setDeleteTarget(o)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Confirmation & Validation Dialog for Status Toggle */}
      {statusModal && (
        <Modal
          open={!!statusModal}
          onClose={statusSubmitting ? undefined : () => setStatusModal(null)}
          overlayClassName="bg-black/60 backdrop-blur-[6px]"
        >
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.55)] border border-white/10">
            {/* Accent top bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-[3px] ${
                statusModal.type === 'BLOCKED_VACANT'
                  ? 'bg-gradient-to-r from-rose-600 to-red-500'
                  : statusModal.type === 'CONFIRM_VACANT'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500'
                  : 'bg-gradient-to-r from-emerald-600 to-green-500'
              }`}
            />

            <div className="bg-[#12192B]/95 backdrop-blur-xl px-7 py-7 text-center">
              {/* Type 1: BLOCKED_VACANT — Error when officer name is present */}
              {statusModal.type === 'BLOCKED_VACANT' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/15 ring-2 ring-rose-500/25 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <AlertTriangle className="w-7 h-7 text-rose-400" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[19px] font-serif font-bold text-[#F5EFE1] mb-2 leading-tight">
                    Cannot Mark as Vacant
                  </h3>
                  <div className="text-[13px] text-[#A6B2C8] leading-relaxed mb-6 max-w-[340px] mx-auto text-left bg-rose-950/30 border border-rose-500/20 rounded-lg p-3">
                    <p className="mb-2">
                      <span className="font-semibold text-rose-300">Validation Error:</span> Officer Name <strong className="text-white">"{statusModal.officer.name}"</strong> is currently assigned to this post.
                    </p>
                    <p className="text-[12px] text-[#C4D0E5]">
                      As per validation rules, a post can only be marked as <strong className="text-amber-300">Vacant</strong> when the Officer Name field is completely empty. Please clear or reassign the officer name in Edit first.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary min-w-[100px]"
                      onClick={() => setStatusModal(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary min-w-[120px] bg-maroon hover:bg-maroon-dark text-white border-0"
                      onClick={() => {
                        const targetId = statusModal.officer.id;
                        setStatusModal(null);
                        navigate(`/officers/${targetId}/edit`);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1 inline" />
                      Edit Officer
                    </button>
                  </div>
                </>
              )}

              {/* Type 2: CONFIRM_VACANT — Confirmation when officer name is empty */}
              {statusModal.type === 'CONFIRM_VACANT' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/15 ring-2 ring-amber-500/25 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <UserX className="w-7 h-7 text-amber-400" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[19px] font-serif font-bold text-[#F5EFE1] mb-2 leading-tight">
                    Confirm Post as Vacant
                  </h3>
                  <p className="text-[13.5px] text-[#8590A8] leading-relaxed mb-4 max-w-[320px] mx-auto">
                    Are you sure you want to mark this post as <strong className="text-amber-400">Vacant</strong>?
                  </p>
                  <div className="text-[12px] text-ink-text-soft bg-white/5 border border-white/10 rounded-lg p-3 mb-6 text-left space-y-1">
                    <div><span className="text-[#8590A8]">Designation:</span> <strong className="text-[#F5EFE1]">{statusModal.officer.designation}</strong></div>
                    <div><span className="text-[#8590A8]">District:</span> <span className="text-[#F5EFE1]">{statusModal.officer.district?.name || '—'}</span></div>
                    <div><span className="text-[#8590A8]">Officer Name:</span> <span className="text-emerald-400 italic">Empty (Valid for Vacant)</span></div>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary min-w-[100px]"
                      onClick={() => setStatusModal(null)}
                      disabled={statusSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn min-w-[130px] bg-amber-600 hover:bg-amber-700 text-white font-semibold border-0"
                      onClick={handleConfirmVacant}
                      disabled={statusSubmitting}
                    >
                      {statusSubmitting ? 'Updating...' : 'Yes, Mark as Vacant'}
                    </button>
                  </div>
                </>
              )}

              {/* Type 3: CONFIRM_WORKING — Confirmation & prompt for Officer Name */}
              {statusModal.type === 'CONFIRM_WORKING' && (
                <form onSubmit={handleConfirmWorking}>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 ring-2 ring-emerald-500/25 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <UserCheck className="w-7 h-7 text-emerald-400" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[19px] font-serif font-bold text-[#F5EFE1] mb-2 leading-tight">
                    Mark Post as Working
                  </h3>
                  <p className="text-[13px] text-[#8590A8] leading-relaxed mb-4 max-w-[340px] mx-auto">
                    Are you sure you want to mark <strong className="text-white">{statusModal.officer.designation}</strong> as <strong className="text-emerald-400">Working</strong>? Enter the officer's name below:
                  </p>
                  
                  <div className="text-left mb-5">
                    <label className="text-[12px] font-semibold text-[#C4D0E5] mb-1.5 block">
                      Officer Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/20 text-[#F5EFE1] placeholder-[#5A6680] text-[13.5px] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                      placeholder="Enter officer full name"
                      value={statusOfficerName}
                      onChange={(e) => {
                        setStatusOfficerName(e.target.value);
                        if (statusError) setStatusError('');
                      }}
                      disabled={statusSubmitting}
                    />
                    {statusError && (
                      <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {statusError}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary min-w-[100px]"
                      onClick={() => setStatusModal(null)}
                      disabled={statusSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold border-0"
                      disabled={statusSubmitting}
                    >
                      {statusSubmitting ? 'Saving...' : 'Confirm & Mark Working'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Officer Record?"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.name}'s record? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Lifecycle Action Modal */}
      {lifecycleOfficer && (
        <OfficerLifecycleModal
          open={!!lifecycleOfficer}
          onClose={() => setLifecycleOfficer(null)}
          officer={lifecycleOfficer}
          districts={districts}
          onSuccess={() => {
            fetchOfficers();
            fetchPendingCount();
          }}
        />
      )}

      {/* Lifecycle Requests Queue Modal */}
      {requestsModalOpen && (
        <OfficerLifecycleRequestsModal
          open={requestsModalOpen}
          onClose={() => setRequestsModalOpen(false)}
          onActionCompleted={() => {
            fetchOfficers();
            fetchPendingCount();
          }}
        />
      )}
    </div>
  );
}

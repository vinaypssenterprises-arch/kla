import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ShieldOff, Eye, Pencil, Trash2, Download, RotateCcw } from 'lucide-react';
import { exportOfficersToExcel } from '../lib/exportExcel';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';

const PAGE_SIZE = 10;

export default function OfficersList() {
  const navigate = useNavigate();
  const [officers, setOfficers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const currentUserId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');

  const [search, setSearch] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [designation, setDesignation] = useState('');

  const [districts, setDistricts] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    apiFetch('/districts')
      .then(res => res.ok ? res.json() : [])
      .then(data => setDistricts(data.filter(d => d.isActive)))
      .catch(err => console.error('Failed to load districts', err));
    apiFetch('/officers/meta/designations')
      .then(res => res.ok ? res.json() : [])
      .then(setDesignations)
      .catch(err => console.error('Failed to load designations', err));
  }, []);

  const fetchOfficers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (districtId) params.set('districtId', districtId);
    if (designation) params.set('designation', designation);

    apiFetch(`/officers?${params.toString()}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setOfficers(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(err => console.error('Failed to load officers', err))
      .finally(() => setLoading(false));
  }, [page, search, districtId, designation]);

  useEffect(() => {
    const timer = setTimeout(fetchOfficers, 250);
    return () => clearTimeout(timer);
  }, [fetchOfficers]);

  useEffect(() => { setPage(1); }, [search, districtId, designation]);

  const resetFilters = () => {
    setSearch('');
    setDistrictId('');
    setDesignation('');
  };

  const handleExport = async () => {
    try {
      await exportOfficersToExcel({ search, districtId, designation });
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
    return places.slice(0, 2).map(p => `${p.place}${p.fromYear ? ` (${p.fromYear}${p.toYear ? '–' + p.toYear : ''})` : ''}`).join('; ') +
      (places.length > 2 ? `; +${places.length - 2} more` : '');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">Officers — All Officers</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">{total} officer{total === 1 ? '' : 's'} on record.</p>
        </div>
        <button type="button" className="btn btn-excel" onClick={handleExport}>
          <Download className="w-[15px] h-[15px]" />
          Export
        </button>
      </div>

      <section className="flex flex-col md:flex-row gap-3 mb-[22px] items-stretch md:items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-text-faint pointer-events-none" />
          <input
            type="text"
            className="app-input pl-[38px]"
            placeholder="Search by name, district, designation, mobile…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <SearchableSelect
          className="w-auto min-w-[170px]"
          value={districtId}
          onChange={setDistrictId}
          options={[{ value: '', label: 'All Districts' }, ...districts.map(d => ({ value: d.id, label: d.name }))]}
          label="Filter by District"
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
        <button type="button" className="btn btn-primary md:ml-auto" onClick={() => navigate('/officers/new')}>
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
          Add Officer
        </button>
      </section>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-ink-text-soft">Loading...</div>
      ) : officers.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 px-5">
          <ShieldOff className="w-[52px] h-[52px] text-ink-text-faint mb-[18px]" strokeWidth={1.5} />
          <h3 className="text-[19px] text-ink-text mb-2 font-serif">No officers found</h3>
          <p className="text-[13.5px] text-ink-text-soft mb-6 max-w-[340px]">
            {search || districtId || designation ? 'No officers match these filters.' : 'Add the first officer to begin the roster.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/officers/new')}>
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
            Add Officer
          </button>
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
                    <th>Previous Working Places</th>
                    <th>Reporting Date</th>
                    <th>Present Address</th>
                    <th>Mobile</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {officers.map((o, idx) => (
                    <tr key={o.id} onClick={() => navigate(`/officers/${o.id}`)}>
                      <td className="font-mono">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="font-semibold text-ink-text">{o.district?.name}</td>
                      <td className="font-semibold text-maroon">{o.name}</td>
                      <td><span className="stamp stamp-info">{o.designation}</span></td>
                      <td className="max-w-[260px]"><span className="text-[12px] text-ink-text-soft">{summarizePlaces(o.previousPlaces)}</span></td>
                      <td>{formatDate(o.reportingDate)}</td>
                      <td className="max-w-[220px]"><span className="text-[12px] text-ink-text-soft truncate block">{o.presentAddress}</span></td>
                      <td className="font-mono">{o.mobile}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button type="button" className="icon-btn" title="View" onClick={() => navigate(`/officers/${o.id}`)}>
                            <Eye className="w-4 h-4" />
                          </button>
                          {(role === 'admin' || o.createdById === currentUserId) && (
                            <>
                              <button type="button" className="icon-btn" title="Edit" onClick={() => navigate(`/officers/${o.id}/edit`)}>
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button type="button" className="icon-btn hover:!bg-brick-bg hover:!text-brick" title="Delete" onClick={() => setDeleteTarget(o)}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Officer Record?"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.name}'s record? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

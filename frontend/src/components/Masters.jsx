import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Compass, Shield, Building2, Network,
  Award, Activity, FileCheck, Plus, Pencil,
  Trash2, X, Search, CheckCircle2, AlertCircle,
  Filter, Sparkles, Check
} from 'lucide-react';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import SearchableSelect from './ui/SearchableSelect';
import { useToast } from './ui/ToastProvider';

const CATEGORIES = [
  {
    key: 'districts',
    label: 'Districts',
    singular: 'District',
    isDistrict: true,
    icon: MapPin,
    description: 'Administrative districts across Karnataka. Used in petition jurisdiction, SP unit assignment, and officer postings.'
  },
  {
    key: 'police-stations',
    label: 'Police Stations',
    singular: 'Police Station',
    apiCategory: 'policeStation',
    icon: Shield,
    description: 'Lokayukta and state police station jurisdictions handling preliminary enquiries and FIR registrations.'
  },
  {
    key: 'departments',
    label: 'Departments',
    singular: 'Department',
    apiCategory: 'department',
    icon: Building2,
    description: 'Karnataka State Government ministries, departments, and apex secretariats.'
  },
  {
    key: 'sub-departments',
    label: 'Sub Departments',
    singular: 'Sub Department',
    apiCategory: 'subDepartment',
    icon: Network,
    description: 'Directorates, boards, corporations, and subordinate offices mapped to parent departments.'
  },
  {
    key: 'designations',
    label: 'Designations',
    singular: 'Designation',
    apiCategory: 'designations',
    isCustom: true,
    icon: Award,
    description: 'Official government cadres, ranks, and designations of public servants and respondent officers.'
  },
  {
    key: 'pe-status',
    label: 'PE Status',
    singular: 'PE Status',
    apiCategory: 'peStatus',
    icon: Activity,
    description: 'Preliminary Enquiry outcome statuses (PE Pending, Register FIR, Recommended to DE, Close) used in Stage 6.'
  },
  {
    key: 'proposal-status',
    label: 'Proposal Status',
    singular: 'Proposal Status',
    apiCategory: 'proposalStatus',
    icon: FileCheck,
    description: 'Competent Authority 17-A proposal decision statuses (Pending, Accept, Returned with remarks).'
  }
];

export default function Masters() {
  const { category } = useParams();
  const navigate = useNavigate();
  const active = CATEGORIES.find(c => c.key === category) || CATEGORIES[0];
  const ActiveIcon = active.icon;

  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', shortName: '', isActive: true, parentId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showError, showSuccess } = useToast();

  const baseUrl = active.isDistrict
    ? '/districts'
    : active.isCustom
    ? `/${active.apiCategory}`
    : `/master-items/${active.apiCategory}`;

  useEffect(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
    fetchItems();
  }, [active.key]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(baseUrl);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }

      if (active.apiCategory === 'subDepartment') {
        const deptRes = await apiFetch('/master-items/department');
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(Array.isArray(deptData) ? deptData : []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch master items', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', shortName: '', isActive: true, parentId: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      shortName: item.shortName || '',
      isActive: item.isActive !== false,
      parentId: item.parentId || ''
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = form.name.trim();
    if (!cleanName) {
      setError(`${active.singular} name is required.`);
      return;
    }

    if (active.isDistrict && form.shortName?.trim()) {
      const cleanShort = form.shortName.trim().toUpperCase();
      if (!/^[A-Z0-9]{1,4}$/.test(cleanShort)) {
        setError('Short Name must be maximum 4 letters or numbers only (e.g. BLR, BLC1, MYS).');
        return;
      }
    }

    if (active.apiCategory === 'subDepartment' && !form.parentId) {
      setError(`Parent Department is required.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        isActive: form.isActive !== false,
        ...(active.isDistrict ? { shortName: form.shortName ? form.shortName.trim().toUpperCase() : null } : {}),
        ...(active.apiCategory === 'subDepartment' ? { parentId: form.parentId } : {})
      };

      const url = editingItem ? `${baseUrl}/${editingItem.id}` : baseUrl;
      const res = await apiFetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccess?.(`${active.singular} ${editingItem ? 'updated' : 'added'} successfully`);
        closeModal();
        fetchItems();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save entry.');
      }
    } catch (err) {
      console.error('Save master item error', err);
      setError('Error saving entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${baseUrl}/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess?.(`${active.singular} "${deleteTarget.name}" deleted successfully.`);
        setDeleteTarget(null);
        fetchItems();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to delete entry.');
      }
    } catch (err) {
      console.error('Delete master item error', err);
      showError('Error deleting entry.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered items based on search and status
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !item.isActive) return false;
      if (statusFilter === 'INACTIVE' && item.isActive) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const nameMatch = item.name?.toLowerCase().includes(q);
      const shortMatch = item.shortName?.toLowerCase().includes(q);
      const parentMatch = active.apiCategory === 'subDepartment'
        ? departments.find(d => d.id === item.parentId)?.name?.toLowerCase().includes(q)
        : false;

      return nameMatch || shortMatch || parentMatch;
    });
  }, [items, searchQuery, statusFilter, active.apiCategory, departments]);

  const activeCount = useMemo(() => items.filter(i => i.isActive).length, [items]);
  const inactiveCount = useMemo(() => items.filter(i => !i.isActive).length, [items]);

  // Badge preview renderer for PE Status & Proposal Status
  const renderStatusPreview = (itemName, categoryKey) => {
    if (!itemName) return null;
    const s = itemName.toLowerCase().trim();

    if (categoryKey === 'pe-status') {
      if (s.includes('pending')) {
        return <span className="stamp stamp-warning">PE PENDING</span>;
      }
      if (s.includes('fir')) {
        return <span className="stamp stamp-danger">REGISTER FIR</span>;
      }
      if (s === 'close') {
        return <span className="stamp stamp-neutral">CLOSE</span>;
      }
      if (s.includes('de')) {
        return <span className="stamp stamp-info">RECOMMENDED TO DE</span>;
      }
      return <span className="stamp stamp-info">{itemName.toUpperCase()}</span>;
    }

    if (categoryKey === 'proposal-status') {
      if (s === 'accept') {
        return <span className="stamp stamp-success">ACCEPT</span>;
      }
      if (s.includes('return') || s.includes('remark')) {
        return <span className="stamp stamp-danger">RETURNED WITH REMARKS</span>;
      }
      if (s.includes('pending')) {
        return <span className="stamp stamp-warning">PENDING</span>;
      }
      return <span className="stamp stamp-neutral">{itemName.toUpperCase()}</span>;
    }

    return null;
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-parchment-3 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#E8EEF9] text-[#000E89] border border-[#CBD8EF]">
              System Configuration
            </span>
            <span className="text-[12px] text-ink-text-faint">• Master Lookup Tables</span>
          </div>
          <h2 className="text-[26px] font-serif font-semibold text-ink-text tracking-tight">
            Master Data Records
          </h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">
            Manage standard drop-down entries used across 17-A petition registration, officer profiles, and status workflows.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-[#FFFDF7] border border-rule/80 px-4 py-2.5 rounded-xl shadow-xs text-right">
            <div className="text-[11px] font-semibold text-ink-text-soft uppercase tracking-wider">Total in Master</div>
            <div className="text-[20px] font-bold text-ink-text leading-tight">{items.length}</div>
          </div>
          <div className="bg-[#FFFDF7] border border-rule/80 px-4 py-2.5 rounded-xl shadow-xs text-right">
            <div className="text-[11px] font-semibold text-forest uppercase tracking-wider">Active Entries</div>
            <div className="text-[20px] font-bold text-forest leading-tight">{activeCount}</div>
          </div>
        </div>
      </div>

      {/* Top Category Tab Navigation */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map(c => {
            const Icon = c.icon;
            const isCurrent = active.key === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => navigate(`/masters/${c.key}`)}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-gradient-to-r from-maroon to-maroon-dark text-[#FDF9F0] shadow-md shadow-maroon/20 -translate-y-0.5 ring-2 ring-brass/40'
                    : 'bg-[#FFFDF7] text-ink-text-soft border border-rule/80 hover:bg-[#F7F2E6] hover:text-ink-text hover:border-rule shadow-xs'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isCurrent ? 'text-brass-light scale-110' : 'text-ink-text-faint group-hover:text-ink-text group-hover:scale-110'
                  }`}
                  strokeWidth={isCurrent ? 2.5 : 2}
                />
                <span>{c.label}</span>
                {isCurrent && (
                  <span className="ml-1 bg-white/20 text-[#FFFDF7] text-[11px] px-2 py-0.5 rounded-full font-mono font-bold">
                    {items.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Workspace Card */}
      <div className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
        {/* Card Header & Controls */}
        <div className="p-6 border-b border-parchment-3 bg-gradient-to-b from-[#FFFDF7] to-[#FAF6ED]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#EBF1FA] to-[#DCE4FA] border border-[#CBD8EF] text-[#000E89] flex items-center justify-center shadow-xs flex-shrink-0 mt-0.5">
                <ActiveIcon className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[18px] font-serif font-bold text-ink-text">
                    {active.label} Master
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-parchment-2 text-ink-text-soft border border-rule/60">
                    {filteredItems.length} {filteredItems.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="text-[13px] text-ink-text-soft mt-0.5 leading-relaxed max-w-2xl">
                  {active.description}
                </p>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex items-center gap-2.5 self-start lg:self-auto">
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-2 shadow-sm font-semibold text-[13px]"
                onClick={openCreate}
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>Add {active.singular}</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filter Row */}
          <div className="mt-5 pt-4 border-t border-parchment-2/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Live Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                className="app-input pl-10 pr-9 py-2 text-[13.5px] rounded-lg bg-white"
                placeholder={`Search ${active.label.toLowerCase()} by name${active.isDistrict ? ', short code' : active.apiCategory === 'subDepartment' ? ', department' : ''}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-text-faint hover:text-ink-text p-1"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Segmented Filter */}
            <div className="flex items-center gap-1 bg-[#F2EDE2] p-1 rounded-lg border border-rule/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-ink-text shadow-xs font-bold'
                    : 'text-ink-text-soft hover:text-ink-text'
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-forest shadow-xs font-bold'
                    : 'text-ink-text-soft hover:text-forest'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-brick shadow-xs font-bold'
                    : 'text-ink-text-soft hover:text-brick'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>
          </div>
        </div>

        {/* Content Table / Loading / Empty States */}
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 skeleton-line rounded-lg w-full animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-14 h-14 rounded-full bg-parchment-2 border border-rule/80 flex items-center justify-center text-ink-text-faint mb-3.5">
              <ActiveIcon className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <h4 className="text-[16px] font-serif font-semibold text-ink-text">
              {searchQuery ? 'No matching entries found' : `No ${active.label.toLowerCase()} registered yet`}
            </h4>
            <p className="text-[13px] text-ink-text-soft mt-1 max-w-sm">
              {searchQuery
                ? `No entries match "${searchQuery}". Clear your search query or check the status filter.`
                : `Click "Add ${active.singular}" above to record your first entry for this master.`}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                className="btn btn-secondary btn-sm mt-4 text-[12.5px]"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreate}
                className="btn btn-primary btn-sm mt-4 text-[12.5px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First {active.singular}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8F5EE] border-b border-[#E3DAC4]">
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-12 text-center">
                    #
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                    {active.singular} Name
                  </th>
                  {active.isDistrict && (
                    <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                      Short Code
                    </th>
                  )}
                  {active.apiCategory === 'subDepartment' && (
                    <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                      Parent Department
                    </th>
                  )}
                  {(active.key === 'pe-status' || active.key === 'proposal-status') && (
                    <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                      Register Badge Preview
                    </th>
                  )}
                  <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-32">
                    Status
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEAD9]">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F9F6EE] transition-colors duration-150 group"
                  >
                    {/* Index */}
                    <td className="py-3 px-4 text-[12px] font-mono text-ink-text-faint text-center">
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink-text text-[13.5px]">
                        {item.name}
                      </div>
                    </td>

                    {/* District Short Code */}
                    {active.isDistrict && (
                      <td className="py-3 px-4">
                        {item.shortName ? (
                          <span className="font-mono text-[12px] font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-2.5 py-0.5 rounded tracking-wider inline-flex items-center gap-1 shadow-2xs">
                            {item.shortName}
                          </span>
                        ) : (
                          <span className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded italic">
                            Not assigned
                          </span>
                        )}
                      </td>
                    )}

                    {/* SubDepartment Parent Dept */}
                    {active.apiCategory === 'subDepartment' && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[13px] text-ink-text-soft">
                          <Building2 className="w-3.5 h-3.5 text-ink-text-faint flex-shrink-0" />
                          <span>{departments.find(d => d.id === item.parentId)?.name || '—'}</span>
                        </div>
                      </td>
                    )}

                    {/* Register Badge Preview for PE Status / Proposal Status */}
                    {(active.key === 'pe-status' || active.key === 'proposal-status') && (
                      <td className="py-3 px-4">
                        <div className="inline-block scale-95 origin-left">
                          {renderStatusPreview(item.name, active.key)}
                        </div>
                      </td>
                    )}

                    {/* Status Pill */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                          item.isActive
                            ? 'bg-[#EBF7EE] text-[#1E6935] border-[#BBE5C6]'
                            : 'bg-[#F5F5F3] text-[#737373] border-[#D6D6D4]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? 'bg-[#1E6935]' : 'bg-[#999999]'
                          }`}
                        />
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-text-soft hover:bg-parchment-2 hover:text-ink-text transition-colors"
                          title={`Edit ${item.name}`}
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-text-faint hover:bg-brick-bg hover:text-brick transition-colors"
                          title={`Delete ${item.name}`}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info strip */}
        <div className="px-6 py-3.5 bg-[#FAF6ED] border-t border-[#EAE3D0] flex flex-col sm:flex-row items-center justify-between text-[12px] text-ink-text-soft gap-2">
          <div>
            Showing <strong className="text-ink-text font-bold">{filteredItems.length}</strong> of{' '}
            <strong className="text-ink-text font-bold">{items.length}</strong> total {active.label.toLowerCase()}
          </div>
          <div className="text-ink-text-faint text-[11.5px]">
            Changes take effect immediately across all petition and officer forms.
          </div>
        </div>
      </div>

      {/* Add / Edit Entry Modal */}
      <Modal open={modalOpen} onClose={closeModal}>
        <div className="bg-[#FFFDF7] border border-rule rounded-xl shadow-deep w-full max-w-[460px] p-7 relative">
          <button
            type="button"
            className="absolute top-4 right-4 text-ink-text-faint hover:text-ink-text p-1 rounded-lg hover:bg-parchment-2 transition-colors"
            onClick={closeModal}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-5 border-b border-parchment-3 pb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EBF1FA] to-[#DCE4FA] border border-[#CBD8EF] text-[#000E89] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <ActiveIcon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brass">
                {editingItem ? 'Edit Entry' : 'Create Entry'}
              </span>
              <h3 className="text-[18px] font-serif font-bold text-ink-text leading-tight">
                {editingItem ? `Edit ${active.singular}` : `Add New ${active.singular}`}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text">
                {active.singular} Name <span className="text-brick">*</span>
              </label>
              <input
                type="text"
                className="app-input"
                autoFocus
                placeholder={`Enter ${active.singular.toLowerCase()} name`}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* District Short Name Field */}
            {active.isDistrict && (
              <div className="flex flex-col gap-1.5 bg-[#FAF6ED] p-3.5 rounded-lg border border-rule/70">
                <div className="flex items-center justify-between">
                  <label className="text-[12.5px] font-semibold text-ink-text">
                    District Short Code
                  </label>
                  <span className="text-[11px] text-ink-text-faint font-mono">Max 4 alphanumeric</span>
                </div>
                <input
                  type="text"
                  className="app-input uppercase font-mono tracking-wider font-bold text-[#000E89]"
                  placeholder="e.g. BLR, BLC1, MYS"
                  maxLength={4}
                  value={form.shortName}
                  onChange={e => {
                    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
                    setForm({ ...form, shortName: clean });
                  }}
                />
                {/* Live Preview of the Badge */}
                <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-rule/40 text-[12px] text-ink-text-soft">
                  <span>Badge Preview:</span>
                  {form.shortName ? (
                    <span className="font-mono text-[11.5px] font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-2 py-0.5 rounded shadow-2xs">
                      {form.shortName}
                    </span>
                  ) : (
                    <span className="text-ink-text-faint italic text-[11px]">(Type to preview code)</span>
                  )}
                </div>
              </div>
            )}

            {/* SubDepartment Parent Department Selector */}
            {active.apiCategory === 'subDepartment' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text">
                  Parent Department <span className="text-brick">*</span>
                </label>
                <SearchableSelect
                  value={form.parentId}
                  onChange={v => setForm({ ...form, parentId: v })}
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                  label="Select Parent Department"
                  placeholder="Search and select department..."
                />
              </div>
            )}

            {/* Status Switch for Edit */}
            {editingItem && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text">Status</label>
                <select
                  className="app-input"
                  value={form.isActive ? '1' : '0'}
                  onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}
                >
                  <option value="1">Active (Available across all forms)</option>
                  <option value="0">Inactive (Hidden from new dropdown selections)</option>
                </select>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-lg bg-brick-bg text-brick border border-brick-soft text-[12.5px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-parchment-3 mt-1">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm flex items-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingItem ? 'Update Entry' : 'Create Entry'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${active.singular}?`}
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This removes it from future dropdown selections. Existing registered petitions will preserve their stored values.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, MapPin } from 'lucide-react';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import SearchableSelect from './ui/SearchableSelect';
import { useToast } from './ui/ToastProvider';

const CATEGORIES = [
  { key: 'districts', label: 'Districts', isDistrict: true },
  { key: 'designations', label: 'Designations', apiCategory: 'designations', isCustom: true },
  { key: 'taluks', label: 'Taluks', apiCategory: 'taluk' },
  { key: 'police-stations', label: 'Police Stations', apiCategory: 'policeStation' },
  { key: 'departments', label: 'Departments', apiCategory: 'department' },
  { key: 'sub-departments', label: 'Sub Departments', apiCategory: 'subDepartment' },
  { key: 'pe-status', label: 'PE Status', apiCategory: 'peStatus' },
  { key: 'proposal-status', label: 'Proposal Status', apiCategory: 'proposalStatus' }
];

export default function Masters() {
  const { category } = useParams();
  const navigate = useNavigate();
  const active = CATEGORIES.find(c => c.key === category) || CATEGORIES[0];

  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', isActive: true, parentId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showError } = useToast();

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const baseUrl = active.isDistrict
    ? 'http://localhost:5000/api/districts'
    : active.isCustom 
    ? `http://localhost:5000/api/${active.apiCategory}`
    : `http://localhost:5000/api/master-items/${active.apiCategory}`;

  useEffect(() => {
    fetchItems();
  }, [active.key]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(baseUrl, { headers: authHeaders() });
      if (res.ok) setItems(await res.json());
      
      if (active.apiCategory === 'subDepartment') {
        const deptRes = await apiFetch(`/master-items/department`, {  });
        if (deptRes.ok) setDepartments(await deptRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch master items', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', isActive: true, parentId: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, isActive: item.isActive, parentId: item.parentId || '' });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError(`${active.label.replace(/s$/, '')} name is required.`);
      return;
    }
    if (active.apiCategory === 'subDepartment' && !form.parentId) {
      setError(`Parent Department is required.`);
      return;
    }

    setSaving(true);
    try {
      const url = editingItem ? `${baseUrl}/${editingItem.id}` : baseUrl;
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form)
      });

      if (res.ok) {
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
      const res = await fetch(`${baseUrl}/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
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

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[21px] font-serif font-semibold text-ink-text">Masters</h2>
        <p className="text-[13.5px] text-ink-text-soft mt-1">Manage the lookup lists used across the register and officer records.</p>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap border-b border-parchment-3 pb-3">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            type="button"
            onClick={() => navigate(`/masters/${c.key}`)}
            className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors duration-150 ${
              active.key === c.key ? 'bg-maroon text-[#F8F1E2]' : 'bg-[#FFFDF7] text-ink-text-soft border border-rule hover:bg-parchment-2'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="max-w-[760px]">
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-1 font-serif font-semibold">{active.label} Master</h4>
          <p className="text-[13px] text-ink-text-soft mb-5">
            {active.isDistrict
              ? 'Districts managed here populate the District dropdown on the petition and officer forms.'
              : `${active.label} managed here populate the corresponding dropdown across the application.`}
          </p>

          <div className="flex justify-end mb-4">
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus className="w-[16px] h-[16px]" strokeWidth={2.3} />
              Add {active.label.replace(/s$/, '')}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16 text-ink-text-soft">Loading...</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center text-center py-16 px-5">
              <MapPin className="w-[44px] h-[44px] text-ink-text-faint mb-3" strokeWidth={1.5} />
              <p className="text-[13.5px] text-ink-text-soft">No entries on file yet.</p>
            </div>
          ) : (
            <div className="border border-parchment-3 rounded-lg overflow-hidden">
              <table className="data-table min-w-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    {active.apiCategory === 'subDepartment' && <th>Parent Department</th>}
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="font-semibold text-ink-text">{item.name}</td>
                      {active.apiCategory === 'subDepartment' && (
                        <td className="text-ink-text-soft">
                          {departments.find(d => d.id === item.parentId)?.name || '—'}
                        </td>
                      )}
                      <td>
                        <span className={`stamp ${item.isActive ? 'stamp-success' : 'stamp-neutral'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:!bg-brick-bg hover:!text-brick"
                            title="Delete"
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
        </div>
      </div>

      <Modal open={modalOpen} onClose={closeModal}>
        <div className="bg-[#FFFDF7] border border-rule rounded-m shadow-deep w-full max-w-[400px] p-7 relative">
          <button type="button" className="absolute top-3 right-3.5 text-ink-text-faint hover:text-ink-text" onClick={closeModal}>
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-[18px] font-serif text-ink mb-5">{editingItem ? `Edit ${active.label.replace(/s$/, '')}` : `Add ${active.label.replace(/s$/, '')}`}</h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Name <span className="text-brick">*</span></label>
              <input
                type="text"
                className="app-input"
                autoFocus
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            {active.apiCategory === 'subDepartment' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">Parent Department <span className="text-brick">*</span></label>
                <SearchableSelect
                  value={form.parentId}
                  onChange={v => setForm({ ...form, parentId: v })}
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                  label="Select Parent Department"
                  placeholder="Select Department"
                />
              </div>
            )}
            {editingItem && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">Status</label>
                <select className="app-input" value={form.isActive ? '1' : '0'} onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            )}

            {error && <p className="text-brick text-[12.5px]">{error}</p>}

            <div className="flex justify-end gap-2.5 mt-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${active.label.replace(/s$/, '')}?`}
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This only removes it from the master list — existing records keep their recorded value.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

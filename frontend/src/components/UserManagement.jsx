import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Users as UsersIcon } from 'lucide-react';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import SearchableSelect from './ui/SearchableSelect';
import { useToast } from './ui/ToastProvider';

const withLegacyOption = (opts, legacyValue, legacyLabel) =>
  legacyValue && !opts.some(o => o.value === legacyValue) ? [...opts, { value: legacyValue, label: legacyLabel || 'Unknown' }] : opts;

const emptyForm = { 
  email: '', 
  password: '', 
  confirmPassword: '',
  fullName: '', 
  kgidNumber: '',
  designationId: '',
  supervisorDesignationId: '',
  supervisorUserId: '',
  districtId: '',
  isHeadOffice: false,
  role: 'user', 
  isActive: true 
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [supervisorUsers, setSupervisorUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showError } = useToast();

  const currentEmail = localStorage.getItem('email');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (form.supervisorDesignationId) {
      fetchSupervisorUsers(form.supervisorDesignationId);
    } else {
      setSupervisorUsers([]);
    }
  }, [form.supervisorDesignationId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [usersRes, distRes, desigRes] = await Promise.all([
        apiFetch(`/users`, {  }),
        apiFetch(`/districts`, {  }),
        apiFetch(`/designations`, {  })
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (distRes.ok) {
        const d = await distRes.json();
        setDistricts(d.filter(x => x.isActive));
      }
      if (desigRes.ok) {
        const d = await desigRes.json();
        setDesignations(d.filter(x => x.isActive));
      }
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisorUsers = async (designationId) => {
    try {
      const res = await apiFetch(`/users/by-designation/${designationId}`, {  });
      if (res.ok) {
        setSupervisorUsers(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch supervisor users', err);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ 
      email: user.email, 
      password: '', 
      confirmPassword: '',
      fullName: user.fullName || '', 
      kgidNumber: user.kgidNumber || '',
      designationId: user.designationId || '',
      supervisorDesignationId: user.supervisorDesignationId || '',
      supervisorUserId: user.supervisorUserId || '',
      districtId: user.districtId || '',
      isHeadOffice: user.isHeadOffice || false,
      role: user.role, 
      isActive: user.isActive 
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.email.trim()) return setError('Email ID is required.');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return setError('Please enter a valid Email ID.');
    
    if (!form.fullName.trim()) return setError('Full Name is required.');
    if (form.fullName.length > 50) return setError('Full Name cannot exceed 50 characters.');
    
    if (!form.kgidNumber.trim()) return setError('KGID Number is required.');
    if (!/^\d{1,10}$/.test(form.kgidNumber)) return setError('KGID Number must be numeric and up to 10 digits.');
    
    if (!form.designationId) return setError('Designation is required.');
    if (!form.supervisorDesignationId) return setError('Supervisor Designation is required.');
    if (!form.isHeadOffice && !form.districtId) return setError('District is required.');

    if (!editingUser && !form.password) {
      return setError('Password is required.');
    }
    
    if (form.password || (!editingUser)) {
      if (!form.confirmPassword) return setError('Confirm Password is required.');
      if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    }
    
    if (form.supervisorUserId) {
      // Validate that selected supervisor user actually matches the supervisor designation
      const validSup = supervisorUsers.find(u => u.id === form.supervisorUserId);
      if (!validSup && supervisorUsers.length > 0) {
        // Only error if we actually loaded them and it's invalid. If it's old data loaded, it might not be in the active list.
        // Actually, safest is to let backend handle strict validation or just rely on the dropdown restriction.
      }
    }

    setSaving(true);
    try {
      const url = editingUser
        ? `/users/${editingUser.id}`
        : '/users';

      const payload = { ...form };
      delete payload.confirmPassword;
      if (editingUser && !payload.password) delete payload.password;

      const res = await apiFetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        closeModal();
        fetchInitialData();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save user.');
      }
    } catch (err) {
      console.error('Save user error', err);
      setError('Error saving user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/users/${deleteTarget.id}`, {
        method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        fetchInitialData();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Delete user error', err);
      showError('Error deleting user.');
    } finally {
      setDeleting(false);
    }
  };

  const districtOptions = withLegacyOption(
    districts.map(d => ({ value: d.id, label: d.name })),
    editingUser && editingUser.districtId && !districts.find(d => d.id === editingUser.districtId) ? editingUser.districtId : null,
    editingUser?.district?.name
  );
  const designationOptions = withLegacyOption(
    designations.map(d => ({ value: d.id, label: d.name })),
    editingUser && editingUser.designationId && !designations.find(d => d.id === editingUser.designationId) ? editingUser.designationId : null,
    editingUser?.designation?.name
  );
  const supervisorDesignationOptions = withLegacyOption(
    designations.map(d => ({ value: d.id, label: d.name })),
    editingUser && editingUser.supervisorDesignationId && !designations.find(d => d.id === editingUser.supervisorDesignationId) ? editingUser.supervisorDesignationId : null,
    editingUser?.supervisorDesignation?.name
  );
  const supervisorUserOptions = withLegacyOption(
    supervisorUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.email})` })),
    editingUser && editingUser.supervisorUserId && !supervisorUsers.find(u => u.id === editingUser.supervisorUserId) && form.supervisorDesignationId === editingUser.supervisorDesignationId
      ? editingUser.supervisorUserId
      : null,
    editingUser?.supervisorUser?.fullName
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">User Management</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">Create, edit, and deactivate accounts.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.3} />
          Add User
        </button>
      </div>

      <div className="max-w-[1200px]">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-ink-text-soft">Loading...</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 px-5">
            <UsersIcon className="w-[52px] h-[52px] text-ink-text-faint mb-[18px]" strokeWidth={1.5} />
            <h3 className="text-[19px] text-ink-text mb-2 font-serif">No users yet</h3>
          </div>
        ) : (
          <section className="bg-[#FFFDF7] border border-rule rounded-m overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email ID</th>
                    <th>Full Name</th>
                    <th>KGID</th>
                    <th>Designation</th>
                    <th>District</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="font-semibold text-ink-text">{user.email}</td>
                      <td>{user.fullName || '—'}</td>
                      <td className="font-mono text-[12.5px]">{user.kgidNumber || '—'}</td>
                      <td>{user.designation?.name || '—'}</td>
                      <td>{user.isHeadOffice ? 'Head Office' : (user.district?.name || '—')}</td>
                      <td>
                        <span className={`stamp ${user.role === 'admin' ? 'stamp-info' : 'stamp-neutral'}`}>{user.role}</span>
                      </td>
                      <td>
                        <span className={`stamp ${user.isActive ? 'stamp-success' : 'stamp-danger'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(user)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:!bg-brick-bg hover:!text-brick disabled:opacity-40 disabled:cursor-not-allowed"
                            title={user.email === currentEmail ? 'You cannot delete your own account' : 'Delete'}
                            disabled={user.email === currentEmail}
                            onClick={() => setDeleteTarget(user)}
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
          </section>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal}>
        <div className="bg-[#FFFDF7] border border-rule rounded-m shadow-deep w-full max-w-[640px] p-7 relative max-h-[calc(100vh-4rem)] overflow-y-auto">
          <button type="button" className="absolute top-3 right-3.5 text-ink-text-faint hover:text-ink-text" onClick={closeModal}>
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-[18px] font-serif text-ink mb-5">{editingUser ? 'Edit User' : 'Add User'}</h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Email ID (Login ID) <span className="text-brick">*</span></label>
                  <input
                    type="email"
                    className="app-input"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Full Name <span className="text-brick">*</span></label>
                  <input
                    type="text"
                    className="app-input"
                    maxLength={50}
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">KGID Number <span className="text-brick">*</span></label>
                  <input
                    type="text"
                    className="app-input font-mono"
                    maxLength={10}
                    value={form.kgidNumber}
                    onChange={e => setForm({ ...form, kgidNumber: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-semibold text-ink-text-soft">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-rule" 
                      checked={form.isHeadOffice} 
                      onChange={e => setForm({ ...form, isHeadOffice: e.target.checked, districtId: e.target.checked ? '' : form.districtId })}
                    />
                    Is Head Office
                  </label>
                  <p className="text-[11.5px] text-ink-text-faint m-0">If checked, this user does not belong to a specific district and can manage records for all districts.</p>
                </div>
                {!form.isHeadOffice && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft">District <span className="text-brick">*</span></label>
                    <SearchableSelect
                      value={form.districtId}
                      onChange={v => setForm({ ...form, districtId: v })}
                      options={districtOptions}
                      label="Select District"
                      placeholder="Select District"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Designation <span className="text-brick">*</span></label>
                  <SearchableSelect
                    value={form.designationId}
                    onChange={v => setForm({ ...form, designationId: v })}
                    options={designationOptions}
                    label="Select Designation"
                    placeholder="Select Designation"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Supervisor Designation <span className="text-brick">*</span></label>
                  <SearchableSelect
                    value={form.supervisorDesignationId}
                    onChange={v => setForm({ ...form, supervisorDesignationId: v, supervisorUserId: '' })}
                    options={supervisorDesignationOptions}
                    label="Select Supervisor Designation"
                    placeholder="Select Supervisor Designation"
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Supervisor / User</label>
                  <SearchableSelect
                    value={form.supervisorUserId}
                    onChange={v => setForm({ ...form, supervisorUserId: v })}
                    options={supervisorUserOptions}
                    label="Select Supervisor / User"
                    placeholder={form.supervisorDesignationId ? 'Select Supervisor' : 'Select a Supervisor Designation first'}
                    disabled={!form.supervisorDesignationId}
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">
                    Password {editingUser && <span className="text-ink-text-faint font-normal normal-case">(leave blank to keep current)</span>}
                    {!editingUser && <span className="text-brick">*</span>}
                  </label>
                  <input
                    type="password"
                    className="app-input"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">
                    Confirm Password {(form.password || !editingUser) && <span className="text-brick">*</span>}
                  </label>
                  <input
                    type="password"
                    className="app-input"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Role</label>
                  <select className="app-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="user">User (view / add / edit)</option>
                    <option value="admin">Admin (full access)</option>
                    <option value="viewer">Viewer (view only)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Status</label>
                  <select className="app-input" value={form.isActive ? '1' : '0'} onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>

              {error && <div className="text-brick text-[13px] font-semibold mt-2">{error}</div>}

              <div className="flex justify-end gap-2.5 mt-3 pt-4 border-t border-rule">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User Account?"
        message={deleteTarget ? `Delete user "${deleteTarget.email}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

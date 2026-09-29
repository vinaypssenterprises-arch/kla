import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users as UsersIcon, Plus, Pencil, Trash2, X, Search,
  Shield, UserCheck, UserX, MapPin, Building2,
  Award, Eye, EyeOff, Lock, AlertCircle, Check,
  Filter, Key, Sparkles, ChevronDown
} from 'lucide-react';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import SearchableSelect from './ui/SearchableSelect';
import { useToast } from './ui/ToastProvider';

const withLegacyOption = (opts, legacyValue, legacyLabel) =>
  legacyValue && !opts.some(o => o.value === legacyValue)
    ? [...opts, { value: legacyValue, label: legacyLabel || 'Unknown' }]
    : opts;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL, admin, user, viewer
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [jurisdictionFilter, setJurisdictionFilter] = useState('ALL'); // ALL, HEAD_OFFICE, DISTRICTS

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showError, showSuccess } = useToast();

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
        apiFetch(`/users`),
        apiFetch(`/districts`),
        apiFetch(`/designations`)
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
      const res = await apiFetch(`/users/by-designation/${designationId}`);
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
    setShowPassword(false);
    setShowConfirmPassword(false);
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
      isActive: user.isActive !== false
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!form.email.trim()) return setError('Email ID is required.');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) return setError('Please enter a valid Email ID.');

    if (!form.fullName.trim()) return setError('Full Name is required.');
    if (form.fullName.trim().length > 50) return setError('Full Name cannot exceed 50 characters.');

    if (!form.kgidNumber.trim()) return setError('KGID Number is required.');
    if (!/^\d{1,10}$/.test(form.kgidNumber.trim())) return setError('KGID Number must be numeric and up to 10 digits.');

    if (!form.designationId) return setError('Designation is required.');
    if (!form.supervisorDesignationId) return setError('Supervisor Designation is required.');
    if (!form.isHeadOffice && !form.districtId) return setError('District is required.');

    if (!editingUser && !form.password) {
      return setError('Password is required.');
    }

    if (form.password || (!editingUser)) {
      if (!form.confirmPassword) return setError('Confirm Password is required.');
      if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
      if (form.password.length < 6) return setError('Password must be at least 6 characters long.');
    }

    setSaving(true);
    try {
      const url = editingUser ? `/users/${editingUser.id}` : '/users';
      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
        fullName: form.fullName.trim(),
        kgidNumber: form.kgidNumber.trim()
      };
      delete payload.confirmPassword;
      if (editingUser && !payload.password) delete payload.password;

      const res = await apiFetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccess?.(`User ${editingUser ? 'updated' : 'created'} successfully`);
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
      const res = await apiFetch(`/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess?.(`User account for ${deleteTarget.fullName || deleteTarget.email} deleted.`);
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

  // Filtered Users logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Role filter
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === 'ACTIVE' && !user.isActive) return false;
      if (statusFilter === 'INACTIVE' && user.isActive) return false;

      // Jurisdiction filter
      if (jurisdictionFilter === 'HEAD_OFFICE' && !user.isHeadOffice) return false;
      if (jurisdictionFilter === 'DISTRICTS' && user.isHeadOffice) return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const nameMatch = user.fullName?.toLowerCase().includes(q);
      const emailMatch = user.email?.toLowerCase().includes(q);
      const kgidMatch = user.kgidNumber?.toLowerCase().includes(q);
      const desigMatch = user.designation?.name?.toLowerCase().includes(q);
      const distMatch = user.district?.name?.toLowerCase().includes(q);
      const roleMatch = user.role?.toLowerCase().includes(q);

      return nameMatch || emailMatch || kgidMatch || desigMatch || distMatch || roleMatch;
    });
  }, [users, searchQuery, roleFilter, statusFilter, jurisdictionFilter]);

  // Metric counts
  const totalCount = users.length;
  const activeCount = useMemo(() => users.filter(u => u.isActive).length, [users]);
  const inactiveCount = useMemo(() => users.filter(u => !u.isActive).length, [users]);
  const adminCount = useMemo(() => users.filter(u => u.role === 'admin').length, [users]);
  const userRoleCount = useMemo(() => users.filter(u => u.role === 'user').length, [users]);
  const viewerCount = useMemo(() => users.filter(u => u.role === 'viewer').length, [users]);
  const headOfficeCount = useMemo(() => users.filter(u => u.isHeadOffice).length, [users]);

  // Options for modal dropdowns
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

  // Helper for user initials avatar
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return (email ? email.slice(0, 2) : 'US').toUpperCase();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-parchment-3 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#E8EEF9] text-[#000E89] border border-[#CBD8EF]">
              Access & Security
            </span>
            <span className="text-[12px] text-ink-text-faint">• User Accounts & Roles</span>
          </div>
          <h2 className="text-[26px] font-serif font-semibold text-ink-text tracking-tight">
            User Management
          </h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">
            Manage officer and administrative accounts, role privileges, district postings, and supervisor reporting lines.
          </p>
        </div>

        {/* Global Summary Stats Cards */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="bg-[#FFFDF7] border border-rule/80 px-4 py-2 rounded-xl shadow-xs text-center min-w-[90px]">
            <div className="text-[10.5px] font-semibold text-ink-text-soft uppercase tracking-wider">Total Users</div>
            <div className="text-[19px] font-bold text-ink-text leading-tight">{totalCount}</div>
          </div>
          <div className="bg-[#FFFDF7] border border-rule/80 px-4 py-2 rounded-xl shadow-xs text-center min-w-[90px]">
            <div className="text-[10.5px] font-semibold text-forest uppercase tracking-wider">Active</div>
            <div className="text-[19px] font-bold text-forest leading-tight">{activeCount}</div>
          </div>
          <div className="bg-[#FFFDF7] border border-rule/80 px-4 py-2 rounded-xl shadow-xs text-center min-w-[90px]">
            <div className="text-[10.5px] font-semibold text-[#000E89] uppercase tracking-wider">Admins</div>
            <div className="text-[19px] font-bold text-[#000E89] leading-tight">{adminCount}</div>
          </div>
          <div className="bg-[#FFFDF7] border border-rule/80 px-4 py-2 rounded-xl shadow-xs text-center min-w-[90px]">
            <div className="text-[10.5px] font-semibold text-brass uppercase tracking-wider">Head Office</div>
            <div className="text-[19px] font-bold text-brass leading-tight">{headOfficeCount}</div>
          </div>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-[#FFFDF7] border border-rule rounded-xl shadow-soft overflow-hidden">
        {/* Card Header & Controls */}
        <div className="p-6 border-b border-parchment-3 bg-gradient-to-b from-[#FFFDF7] to-[#FAF6ED]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#EBF1FA] to-[#DCE4FA] border border-[#CBD8EF] text-[#000E89] flex items-center justify-center shadow-xs flex-shrink-0 mt-0.5">
                <UsersIcon className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[18px] font-serif font-bold text-ink-text">
                    Officer & User Accounts
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-parchment-2 text-ink-text-soft border border-rule/60">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'Account' : 'Accounts'}
                  </span>
                </div>
                <p className="text-[13px] text-ink-text-soft mt-0.5 leading-relaxed max-w-2xl">
                  Filter users by role, search by name or KGID, or create new officer credentials for register management.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-2.5 self-start lg:self-auto">
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-2 shadow-sm font-semibold text-[13px]"
                onClick={openCreate}
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="mt-5 pt-4 border-t border-parchment-2/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Live Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                className="app-input pl-10 pr-9 py-2 text-[13.5px] rounded-lg bg-white"
                placeholder="Search users by name, email, KGID, district..."
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

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Role Segmented Filter */}
              <div className="flex items-center gap-1 bg-[#F2EDE2] p-1 rounded-lg border border-rule/80">
                <button
                  type="button"
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    roleFilter === 'ALL'
                      ? 'bg-white text-ink-text shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-ink-text'
                  }`}
                >
                  All Roles ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('admin')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    roleFilter === 'admin'
                      ? 'bg-white text-[#000E89] shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-[#000E89]'
                  }`}
                >
                  Admin ({adminCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('user')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    roleFilter === 'user'
                      ? 'bg-white text-maroon shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-maroon'
                  }`}
                >
                  User ({userRoleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('viewer')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    roleFilter === 'viewer'
                      ? 'bg-white text-brass shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-brass'
                  }`}
                >
                  Viewer ({viewerCount})
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[#F2EDE2] p-1 rounded-lg border border-rule/80">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-ink-text shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-ink-text'
                  }`}
                >
                  All Status
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
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
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    statusFilter === 'INACTIVE'
                      ? 'bg-white text-brick shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-brick'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>

              {/* Jurisdiction Toggle */}
              <div className="flex items-center gap-1 bg-[#F2EDE2] p-1 rounded-lg border border-rule/80">
                <button
                  type="button"
                  onClick={() => setJurisdictionFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    jurisdictionFilter === 'ALL'
                      ? 'bg-white text-ink-text shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-ink-text'
                  }`}
                >
                  All Units
                </button>
                <button
                  type="button"
                  onClick={() => setJurisdictionFilter('HEAD_OFFICE')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    jurisdictionFilter === 'HEAD_OFFICE'
                      ? 'bg-white text-[#000E89] shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-[#000E89]'
                  }`}
                  title="Head Office only"
                >
                  Head Office ({headOfficeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setJurisdictionFilter('DISTRICTS')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                    jurisdictionFilter === 'DISTRICTS'
                      ? 'bg-white text-ink-text shadow-xs font-bold'
                      : 'text-ink-text-soft hover:text-ink-text'
                  }`}
                  title="Districts only"
                >
                  Districts ({totalCount - headOfficeCount})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 skeleton-line rounded-lg w-full animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-14 h-14 rounded-full bg-parchment-2 border border-rule/80 flex items-center justify-center text-ink-text-faint mb-3.5">
              <UsersIcon className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <h4 className="text-[16px] font-serif font-semibold text-ink-text">
              {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' || jurisdictionFilter !== 'ALL'
                ? 'No matching users found'
                : 'No users registered yet'}
            </h4>
            <p className="text-[13px] text-ink-text-soft mt-1 max-w-sm">
              {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' || jurisdictionFilter !== 'ALL'
                ? 'Try adjusting your search terms or clearing role/status filters.'
                : 'Click "Add User" above to create the first system account.'}
            </p>
            {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' || jurisdictionFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                  setJurisdictionFilter('ALL');
                }}
                className="btn btn-secondary btn-sm mt-4 text-[12.5px]"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreate}
                className="btn btn-primary btn-sm mt-4 text-[12.5px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First User
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8F5EE] border-b border-[#E3DAC4]">
                  <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-12">
                    #
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                    User / Login ID
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                    KGID & Designation
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                    Jurisdiction / Unit
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                    Supervisor Line
                  </th>
                  <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-28">
                    Role
                  </th>
                  <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-28">
                    Status
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEAD9]">
                {filteredUsers.map((user, idx) => {
                  const initials = getInitials(user.fullName, user.email);
                  const isCurrent = user.email === currentEmail;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#F9F6EE] transition-colors duration-150 group"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-[12px] font-mono text-ink-text-faint text-center">
                        {idx + 1}
                      </td>

                      {/* User Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 shadow-2xs ${
                              user.role === 'admin'
                                ? 'bg-gradient-to-br from-[#000E89] to-[#001DFF] text-white ring-2 ring-[#CBD8EF]'
                                : user.role === 'user'
                                ? 'bg-gradient-to-br from-maroon to-maroon-dark text-[#FDF9F0] ring-1 ring-rule'
                                : 'bg-[#E3DEC7] text-ink-text'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-ink-text text-[13.5px] flex items-center gap-1.5">
                              <span>{user.fullName || '—'}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-parchment-2 text-ink-text font-bold px-1.5 py-0.2 rounded border border-rule/60">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-ink-text-soft font-mono">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* KGID & Designation */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11.5px] font-bold text-ink-text bg-[#F3EFE3] border border-rule/70 px-2 py-0.5 rounded shadow-2xs">
                              KGID: {user.kgidNumber || '—'}
                            </span>
                          </div>
                          <div className="text-[12px] text-ink-text-soft flex items-center gap-1 mt-0.5">
                            <Award className="w-3 h-3 text-ink-text-faint flex-shrink-0" />
                            <span>{user.designation?.name || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Jurisdiction */}
                      <td className="py-3 px-4">
                        {user.isHeadOffice ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8EEF9] text-[#000E89] border border-[#CBD8EF] shadow-2xs">
                            <Shield className="w-3 h-3" />
                            Head Office (All Districts)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-[13px] text-ink-text font-medium">
                            <MapPin className="w-3.5 h-3.5 text-maroon flex-shrink-0" />
                            <span>{user.district?.name || '—'}</span>
                          </div>
                        )}
                      </td>

                      {/* Supervisor Line */}
                      <td className="py-3 px-4">
                        <div className="text-[12px] text-ink-text-soft">
                          <div className="font-medium text-ink-text">
                            {user.supervisorUser?.fullName || '—'}
                          </div>
                          {user.supervisorDesignation?.name && (
                            <div className="text-[11px] text-ink-text-faint">
                              {user.supervisorDesignation.name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role Stamp */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`stamp ${
                            user.role === 'admin'
                              ? 'stamp-info'
                              : user.role === 'viewer'
                              ? 'stamp-warning'
                              : 'stamp-neutral'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                            user.isActive
                              ? 'bg-[#EBF7EE] text-[#1E6935] border-[#BBE5C6]'
                              : 'bg-[#F5F5F3] text-[#737373] border-[#D6D6D4]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.isActive ? 'bg-[#1E6935]' : 'bg-[#999999]'
                            }`}
                          />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-text-soft hover:bg-parchment-2 hover:text-ink-text transition-colors"
                            title={`Edit ${user.fullName || user.email}`}
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-text-faint hover:bg-brick-bg hover:text-brick transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-text-faint"
                            title={isCurrent ? 'You cannot delete your own account' : `Delete ${user.fullName || user.email}`}
                            disabled={isCurrent}
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info strip */}
        <div className="px-6 py-3.5 bg-[#FAF6ED] border-t border-[#EAE3D0] flex flex-col sm:flex-row items-center justify-between text-[12px] text-ink-text-soft gap-2">
          <div>
            Showing <strong className="text-ink-text font-bold">{filteredUsers.length}</strong> of{' '}
            <strong className="text-ink-text font-bold">{users.length}</strong> total users
          </div>
          <div className="text-ink-text-faint text-[11.5px]">
            Password updates and deactivations apply on the next login session.
          </div>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal open={modalOpen} onClose={closeModal}>
        <div className="bg-[#FFFDF7] border border-rule rounded-xl shadow-deep w-full max-w-[680px] p-7 relative max-h-[calc(100vh-3.5rem)] overflow-y-auto">
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
              <UsersIcon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brass">
                {editingUser ? 'Account Maintenance' : 'User Provisioning'}
              </span>
              <h3 className="text-[19px] font-serif font-bold text-ink-text leading-tight">
                {editingUser ? `Edit User: ${editingUser.fullName || editingUser.email}` : 'Add New User'}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Section 1: Basic Identity */}
            <div className="bg-[#FAF6ED] p-4 rounded-xl border border-rule/70 space-y-3">
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-text-soft flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5 text-brass" />
                <span>Identity & Contact</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-ink-text">
                    Email ID (Login ID) <span className="text-brick">*</span>
                  </label>
                  <input
                    type="email"
                    className="app-input text-[13.5px] py-2 bg-white"
                    placeholder="e.g. officer@lokayukta.gov.in"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-ink-text">
                    Full Name <span className="text-brick">*</span>
                  </label>
                  <input
                    type="text"
                    className="app-input text-[13.5px] py-2 bg-white"
                    maxLength={50}
                    placeholder="e.g. Anand Kumar IPS"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-ink-text">
                      KGID Number <span className="text-brick">*</span>
                    </label>
                    <span className="text-[11px] text-ink-text-faint font-mono">Max 10 digits</span>
                  </div>
                  <input
                    type="text"
                    className="app-input font-mono text-[13.5px] py-2 bg-white"
                    maxLength={10}
                    placeholder="e.g. 1045982"
                    value={form.kgidNumber}
                    onChange={e => setForm({ ...form, kgidNumber: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Jurisdiction & District */}
            <div className="bg-[#FAF6ED] p-4 rounded-xl border border-rule/70 space-y-3">
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-text-soft flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brass" />
                <span>Jurisdiction & District Unit</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2.5 cursor-pointer bg-white p-2.5 rounded-lg border border-rule/70 hover:border-rule transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-rule mt-0.5 accent-maroon"
                    checked={form.isHeadOffice}
                    onChange={e =>
                      setForm({
                        ...form,
                        isHeadOffice: e.target.checked,
                        districtId: e.target.checked ? '' : form.districtId
                      })
                    }
                  />
                  <div>
                    <span className="text-[12.5px] font-semibold text-ink-text block">
                      Head Office Personnel (All Districts)
                    </span>
                    <span className="text-[11.5px] text-ink-text-faint block mt-0.5">
                      Check this for ADGP, DIG, SP Headquarters, and state-wide administrators who require access to all Karnataka districts.
                    </span>
                  </div>
                </label>

                {!form.isHeadOffice && (
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[12px] font-semibold text-ink-text">
                      Assigned District <span className="text-brick">*</span>
                    </label>
                    <SearchableSelect
                      value={form.districtId}
                      onChange={v => setForm({ ...form, districtId: v })}
                      options={districtOptions}
                      label="Select District"
                      placeholder="Search and select district jurisdiction..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Designation & Hierarchy */}
            <div className="bg-[#FAF6ED] p-4 rounded-xl border border-rule/70 space-y-3">
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-text-soft flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-brass" />
                <span>Cadre & Supervisor Hierarchy</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-ink-text">
                    Officer Designation <span className="text-brick">*</span>
                  </label>
                  <SearchableSelect
                    value={form.designationId}
                    onChange={v => setForm({ ...form, designationId: v })}
                    options={designationOptions}
                    label="Select Designation"
                    placeholder="Select designation..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-ink-text">
                    Supervisor Designation <span className="text-brick">*</span>
                  </label>
                  <SearchableSelect
                    value={form.supervisorDesignationId}
                    onChange={v =>
                      setForm({
                        ...form,
                        supervisorDesignationId: v,
                        supervisorUserId: ''
                      })
                    }
                    options={supervisorDesignationOptions}
                    label="Select Supervisor Designation"
                    placeholder="Select supervisor rank..."
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[12px] font-semibold text-ink-text">
                    Reporting Supervisor User
                  </label>
                  <SearchableSelect
                    value={form.supervisorUserId}
                    onChange={v => setForm({ ...form, supervisorUserId: v })}
                    options={supervisorUserOptions}
                    label="Select Supervisor User"
                    placeholder={
                      form.supervisorDesignationId
                        ? 'Search supervisor name...'
                        : 'Select supervisor designation above first'
                    }
                    disabled={!form.supervisorDesignationId}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Credentials */}
            <div className="bg-[#FAF6ED] p-4 rounded-xl border border-rule/70 space-y-3">
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-text-soft flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-brass" />
                <span>Security Credentials</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-ink-text">
                      Password {!editingUser && <span className="text-brick">*</span>}
                    </label>
                    {editingUser && (
                      <span className="text-[11px] text-ink-text-faint">(Leave blank to keep)</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="app-input text-[13.5px] py-2 pr-10 bg-white"
                      placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-text-faint hover:text-ink-text p-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-ink-text">
                    Confirm Password {(form.password || !editingUser) && <span className="text-brick">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="app-input text-[13.5px] py-2 pr-10 bg-white"
                      placeholder={editingUser ? '••••••••' : 'Re-enter password'}
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-text-faint hover:text-ink-text p-1"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Role & Account Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-ink-text">Role Privileges</label>
                <select
                  className="app-input text-[13.5px] py-2 bg-white"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="user">User (Standard entry, register, and reports)</option>
                  <option value="admin">Admin (Full administrative & configuration access)</option>
                  <option value="viewer">Viewer (Read-only observation access)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-ink-text">Account Status</label>
                <select
                  className="app-input text-[13.5px] py-2 bg-white"
                  value={form.isActive ? '1' : '0'}
                  onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}
                >
                  <option value="1">Active (Allow system login)</option>
                  <option value="0">Inactive (Revoke login access)</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-brick-bg text-brick border border-brick-soft text-[12.5px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-parchment-3 mt-1">
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
                    <span>{editingUser ? 'Update User' : 'Create User'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User Account?"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete the user account "${deleteTarget.fullName || deleteTarget.email}" (${deleteTarget.email})? This action cannot be reversed.`
            : ''
        }
        confirmLabel="Delete Account"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

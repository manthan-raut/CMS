'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Users, UserPlus, Search, Shield, MoreVertical,
  KeyRound, UserX, Mail, Phone, Hash, ChevronDown
} from 'lucide-react';

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  HR_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'HR Admin' },
  FINANCE_MANAGER: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Finance Manager' },
  HOD: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'HOD' },
  REPORTING_MANAGER: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Reporting Manager' },
  PROJECT_MANAGER: { bg: 'bg-green-100', text: 'text-green-700', label: 'Project Manager' },
  EMPLOYEE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Employee' },
};

const ALL_ROLES = ['HR_ADMIN', 'FINANCE_MANAGER', 'HOD', 'REPORTING_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', role: 'EMPLOYEE', reportingManagerId: '',
  });
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string; password?: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<any[]>('/api/users');
    if (res.success && res.data) setUsers(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Close action menus on click outside
  useEffect(() => {
    const handler = () => setActionMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.employeeId?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const managers = users.filter(u => ['HOD', 'REPORTING_MANAGER', 'PROJECT_MANAGER'].includes(u.role) && u.isActive !== false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setCreateResult(null);
    const res = await apiFetch<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify(form),
    }) as any;
    setActionLoading(false);
    if (res.success) {
      setCreateResult({ success: true, message: `User created! Temp password: ${res.data?.tempPassword || res.tempPassword || 'Check email'}`, password: res.data?.tempPassword || res.tempPassword });
      setForm({ name: '', email: '', mobile: '', role: 'EMPLOYEE', reportingManagerId: '' });
      fetchUsers();
    } else {
      setCreateResult({ success: false, message: res.message || 'Failed to create user' });
    }
  }

  async function handleDeactivate(userId: string) {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    setActionLoading(true);
    await apiFetch(`/api/users/${userId}/deactivate`, { method: 'PATCH' });
    setActionLoading(false);
    setActionMenu(null);
    fetchUsers();
  }

  async function handleResetPassword(userId: string) {
    if (!confirm('Reset this user\'s password?')) return;
    setActionLoading(true);
    const res = await apiFetch<any>(`/api/users/${userId}/reset-password`, { method: 'POST' }) as any;
    setActionLoading(false);
    setActionMenu(null);
    if (res.success) {
      alert(`Password reset! New temp password: ${res.data?.tempPassword || res.tempPassword || 'Sent via email'}`);
    }
  }

  const activeCount = users.filter(u => u.isActive !== false).length;
  const roleBreakdown = ALL_ROLES.map(r => ({
    role: r,
    count: users.filter(u => u.role === r && u.isActive !== false).length,
    ...ROLE_STYLES[r],
  }));

  return (
    <ProtectedRoute>
      <div className="p-6 md:p-8 animate-fade-in-up">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-gray-400 flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-[#F37338]" /> Administration
              </p>
              <h1 className="text-2xl font-semibold text-[#141413] tracking-tight">User Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">{activeCount} active users · {users.length} total</p>
            </div>
            <button
              onClick={() => { setShowCreateModal(true); setCreateResult(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-orange text-white text-sm font-medium hover:shadow-lg hover:shadow-orange-200 transition-all duration-200"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {/* Role Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
            {roleBreakdown.map(r => (
              <button
                key={r.role}
                onClick={() => setRoleFilter(roleFilter === r.role ? '' : r.role)}
                className={`rounded-xl p-3.5 text-center transition-all duration-200 card-hover border-2 ${
                  roleFilter === r.role ? 'border-[#F37338] shadow-md' : 'border-transparent bg-white shadow-sm'
                }`}
              >
                <p className="text-2xl font-bold text-[#141413]">{r.count}</p>
                <p className={`text-[11px] font-medium uppercase tracking-wider mt-0.5 ${r.text}`}>{r.label}</p>
              </button>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#F37338] focus:ring-2 focus:ring-[#F37338]/10 transition-all"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#F37338] transition-colors"
            >
              <option value="">All Roles</option>
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_STYLES[r]?.label || r}</option>
              ))}
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-48" />
                      <div className="skeleton h-3 w-32" />
                    </div>
                    <div className="skeleton h-6 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No users found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['User', 'Employee ID', 'Contact', 'Role', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const roleStyle = ROLE_STYLES[u.role] || ROLE_STYLES.EMPLOYEE;
                      return (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${u.isActive !== false ? 'gradient-orange' : 'bg-gray-300'}`}>
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-[#141413]">{u.name}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{u.employeeId}</span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500">{u.mobile || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                              {roleStyle.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                              u.isActive !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                              {u.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === u.id ? null : u.id); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {actionMenu === u.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleResetPassword(u.id)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <KeyRound className="w-4 h-4 text-gray-400" />
                                    Reset Password
                                  </button>
                                  {u.isActive !== false && u.id !== currentUser?.id && (
                                    <button
                                      onClick={() => handleDeactivate(u.id)}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <UserX className="w-4 h-4" />
                                      Deactivate
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#141413]">Create New User</h3>
                <p className="text-sm text-gray-500">Fill in the details below</p>
              </div>
            </div>

            {createResult && (
              <div className={`mb-5 p-4 rounded-xl text-sm ${createResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {createResult.message}
                {createResult.password && (
                  <p className="mt-1 font-mono font-bold text-lg">{createResult.password}</p>
                )}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Full Name *</label>
                  <input
                    required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F37338] focus:ring-2 focus:ring-[#F37338]/10 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Email *</label>
                  <input
                    required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F37338] focus:ring-2 focus:ring-[#F37338]/10 transition-all"
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Mobile</label>
                  <input
                    value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F37338] focus:ring-2 focus:ring-[#F37338]/10 transition-all"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Role *</label>
                  <select
                    required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F37338] transition-colors"
                  >
                    {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_STYLES[r]?.label || r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Reporting Manager</label>
                <select
                  value={form.reportingManagerId} onChange={e => setForm({ ...form, reportingManagerId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F37338] transition-colors"
                >
                  <option value="">— None —</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({ROLE_STYLES[m.role]?.label})</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl gradient-orange text-white text-sm font-medium hover:shadow-lg hover:shadow-orange-200 disabled:opacity-60 transition-all"
                >
                  {actionLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

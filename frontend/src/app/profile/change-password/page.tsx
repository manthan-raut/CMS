'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { apiChangePassword } from '@/lib/api';

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await apiChangePassword(oldPassword, newPassword);
    setLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Password changed successfully. Please use your new password next time you sign in.' });
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
    } else {
      setMessage({ type: 'error', text: (res.message as string) || 'Failed to change password.' });
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F3F0EE] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[40px] shadow-[0_24px_48px_rgba(0,0,0,0.08)] px-10 py-12">
            <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1 mb-2">
              <span className="text-[#F37338]">•</span> Security
            </p>
            <h1 className="text-2xl font-medium text-[#141413] tracking-tight mb-1">Change Password</h1>
            <p className="text-sm text-[#696969] mb-8">Update your account password</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {[
                { id: 'old-password', label: 'Current Password', value: oldPassword, setter: setOldPassword },
                { id: 'new-password', label: 'New Password', value: newPassword, setter: setNewPassword },
                { id: 'confirm-password', label: 'Confirm New Password', value: confirm, setter: setConfirm },
              ].map(({ id, label, value, setter }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-sm font-medium text-[#141413] mb-1.5">{label}</label>
                  <input
                    id={id}
                    type="password"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-[20px] border border-[#141413]/20 bg-[#F3F0EE] text-[#141413] placeholder:text-[#696969] focus:outline-none focus:border-[#141413] transition-colors text-sm"
                    placeholder="••••••••"
                  />
                </div>
              ))}

              {message && (
                <div className={`px-4 py-3 rounded-[20px] text-sm border ${
                  message.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                id="change-password-submit"
                disabled={loading}
                className="w-full bg-[#141413] text-[#F3F0EE] font-medium text-base py-3.5 rounded-[20px] hover:bg-[#262627] transition-colors disabled:opacity-60 tracking-[-0.02em]"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

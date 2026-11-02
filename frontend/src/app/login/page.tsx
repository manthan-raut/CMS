'use client';

import { useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || 'Login failed. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Gradient Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-dark relative overflow-hidden items-center justify-center p-12">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#F37338]/5 -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 translate-y-1/4 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/[0.03]" />

        <div className="relative z-10 text-center max-w-md animate-fade-in-up">
          <div className="w-20 h-20 rounded-2xl gradient-orange mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-8">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
            Precision Mapping GIS
          </h1>
          <p className="text-lg text-white/50 leading-relaxed">
            Enterprise Suite for Rent Management & Reimbursement Systems
          </p>
          <div className="flex items-center justify-center gap-6 mt-10">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">RMS</p>
              <p className="text-xs text-white/30 uppercase tracking-wider">Rent Mgmt</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">ReMS</p>
              <p className="text-xs text-white/30 uppercase tracking-wider">Reimbursement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#FAFAFA]">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile brand header */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-14 h-14 rounded-xl gradient-orange mx-auto flex items-center justify-center shadow-lg mb-4">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#141413]">PMGIS Enterprise Suite</h2>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/[0.04] p-8 md:p-10 border border-gray-100">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#141413] tracking-tight">
                Welcome back
              </h1>
              <p className="text-gray-500 text-sm mt-1.5">Sign in to your enterprise account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-[#141413] placeholder:text-gray-400 focus:outline-none focus:border-[#F37338] focus:ring-2 focus:ring-[#F37338]/10 focus:bg-white transition-all text-sm"
                    placeholder="you@precisionmappinggis.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 text-[#141413] placeholder:text-gray-400 focus:outline-none focus:border-[#F37338] focus:ring-2 focus:ring-[#F37338]/10 focus:bg-white transition-all text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-fade-in-up">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                id="login-submit"
                disabled={loading}
                className="w-full gradient-orange text-white font-semibold text-sm py-3.5 rounded-xl hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              For account access, contact your HR Administrator
            </p>
          </div>

          <p className="text-center text-[11px] text-gray-300 mt-6 tracking-wider uppercase">
            PMGIS Enterprise Suite · Internal Use Only
          </p>
        </div>
      </div>
    </div>
  );
}

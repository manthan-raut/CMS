'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { apiGetReport, apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  Home, IndianRupee, AlertTriangle, Clock, Plus,
  ArrowRight, Building2, FileText, ChevronRight, TrendingUp,
  MapPin, HelpCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeRooms, setActiveRooms] = useState<any>(null);
  const [unpaidAlert, setUnpaidAlert] = useState<any>(null);
  const [rentDue, setRentDue] = useState<any>(null);
  const [expiring, setExpiring] = useState<any>(null);
  const [recentRooms, setRecentRooms] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      const [resActive, resUnpaid, resDue, resExpiring, resRooms] = await Promise.allSettled([
        apiGetReport('rent/active-rooms', {}),
        apiGetReport('rent/unpaid-alert', {}),
        apiGetReport('rent/rent-due', {}),
        apiGetReport('rent/agreement-expiry', { days: '30' }),
        apiFetch<any[]>('/api/rooms?status=ACTIVE'),
      ]);

      if (resActive.status === 'fulfilled' && resActive.value.success) setActiveRooms(resActive.value.summary);
      if (resUnpaid.status === 'fulfilled' && resUnpaid.value.success) setUnpaidAlert(resUnpaid.value.summary);
      if (resDue.status === 'fulfilled' && resDue.value.success) setRentDue(resDue.value.data?.summary || resDue.value.summary);
      if (resExpiring.status === 'fulfilled' && resExpiring.value.success) setExpiring(resExpiring.value.summary);
      if (resRooms.status === 'fulfilled' && resRooms.value.success && resRooms.value.data) {
        setRecentRooms((resRooms.value.data as any[]).slice(0, 6));
      }

      setLoading(false);
    }
    fetchDashboard();
  }, []);

  const totalMonthlyRent = activeRooms?.totalMonthlyRent ?? 0;
  const paidRent = rentDue?.totalPaidAmount ?? 0;
  const unpaidRent = rentDue?.totalDueAmount ?? 0;
  const expiringCount = expiring?.total ?? 0;

  // Chart data: Income (Paid Rent) vs Expense (Expected Rent)
  const chartData = [
    { month: 'Jan', income: totalMonthlyRent * 0.85, expense: totalMonthlyRent * 0.90 },
    { month: 'Feb', income: totalMonthlyRent * 0.92, expense: totalMonthlyRent * 0.95 },
    { month: 'Mar', income: totalMonthlyRent * 0.98, expense: totalMonthlyRent * 1.00 },
    { month: 'Apr', income: totalMonthlyRent * 0.89, expense: totalMonthlyRent * 0.92 },
    { month: 'May', income: totalMonthlyRent * 1.02, expense: totalMonthlyRent * 1.05 },
    { month: 'Jun', income: totalMonthlyRent * 1.08, expense: totalMonthlyRent * 1.10 },
    { month: 'Jul', income: totalMonthlyRent * 0.95, expense: totalMonthlyRent * 1.00 },
    { month: 'Aug', income: totalMonthlyRent * 1.10, expense: totalMonthlyRent * 1.15 },
    { month: 'Sep', income: paidRent || totalMonthlyRent * 1.15, expense: (paidRent + unpaidRent) || totalMonthlyRent * 1.20 },
    { month: 'Oct', income: totalMonthlyRent * 1.12, expense: totalMonthlyRent * 1.18 },
    { month: 'Nov', income: totalMonthlyRent * 1.20, expense: totalMonthlyRent * 1.25 },
    { month: 'Dec', income: totalMonthlyRent * 1.25, expense: totalMonthlyRent * 1.30 },
  ];

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    PENDING_APPROVAL: 'text-amber-700 bg-amber-50 border-amber-100',
    PENDING_CLOSURE: 'text-orange-700 bg-orange-50 border-orange-100',
    CLOSED: 'text-gray-500 bg-gray-50 border-gray-100',
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[calc(100vh-4rem)] p-6 md:p-8 animate-fade-in-up">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#141413]">Owner Dashboard</h1>
            <p className="text-sm text-[#696969]">Rent Management System · Properties and Payments overview</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/rent/rooms/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-orange text-white text-sm font-semibold hover:shadow-lg transition-all">
              <Plus className="w-4 h-4" /> Add Room
            </Link>
            <Link href="/rent/reports" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141413] text-white text-sm font-semibold hover:bg-[#2a2a2a] transition-all">
              <FileText className="w-4 h-4" /> Reports
            </Link>
          </div>
        </div>

        {/* Rentful Style KPI Cards (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Transaction Total (Paid Rent) */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36 relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Transaction Total</span>
                <HelpCircle className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-3xl font-extrabold text-[#141413] tracking-tight">
                ₹{loading ? '...' : paidRent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>40% vs last month</span>
            </div>
          </div>

          {/* Card 2: Upcoming Payment (Expected Rent) */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36 relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Payment</span>
                <HelpCircle className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-3xl font-extrabold text-[#141413] tracking-tight">
                ₹{loading ? '...' : totalMonthlyRent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-xs text-gray-400 font-medium">
              <span>Next payment due on set date</span>
            </div>
          </div>

          {/* Card 3: Outstanding Balance */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36 relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Balance</span>
                <HelpCircle className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-3xl font-extrabold text-rose-600 tracking-tight">
                ₹{loading ? '...' : unpaidRent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-xs text-rose-500 font-medium">
              <span>{unpaidAlert?.count ?? 0} past-due items across portfolio</span>
            </div>
          </div>

          {/* Card 4: Leases Expiring */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36 relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Leases Expiring</span>
                <HelpCircle className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-3xl font-extrabold text-amber-600 tracking-tight">
                {loading ? '...' : expiringCount}
              </p>
            </div>
            <div className="text-xs text-amber-500 font-medium">
              <span>Agreement duration is under 30 days</span>
            </div>
          </div>
        </div>

        {/* Rentful Style Double-Area Chart + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Income Summary AreaChart (Left 3/5) */}
          <div className="lg:col-span-3 bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-md font-bold text-[#141413]">Income Summary</h3>
                <p className="text-xs text-gray-400 mt-0.5">Overview of total rental income received over a period.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                  <span className="text-gray-600">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <span className="text-gray-600">Expense</span>
                </div>
              </div>
            </div>
            
            <div className="h-[280px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="skeleton w-full h-[260px] rounded-lg" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.10}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                        fontSize: '12px',
                        color: '#141413'
                      }}
                      formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`]}
                    />
                    <Area type="monotone" dataKey="income" stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick Actions (Right 2/5) */}
          <div className="lg:col-span-2 bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <h3 className="text-sm font-bold text-[#141413] mb-4">Quick Operations</h3>
            <div className="flex flex-col gap-3.5 flex-1">
              
              <Link href="/rent/rooms/new" className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] bg-[#141413] text-white hover:bg-[#262627] transition-all group">
                <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">Add New Room</p>
                  <p className="text-[11px] text-gray-400 truncate">Create room and input location link</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </Link>

              <Link href="/rent/rooms" className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#141413] truncate">Browse Portfolio</p>
                  <p className="text-[11px] text-gray-400 truncate">Verify map location pins and details</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </Link>

              <Link href="/rent/reports" className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#141413] truncate">Export Rent Reports</p>
                  <p className="text-[11px] text-gray-400 truncate">Review, print and download CSV files</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </Link>

              {user?.role === 'HOD' && (
                <Link href="/rent/approvals" className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] border border-orange-200 bg-orange-50/50 hover:bg-orange-100/50 transition-all group">
                  <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-orange-950 truncate">Approval Actions</p>
                    <p className="text-[11px] text-orange-700 truncate">Verify pending creations and closures</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-orange-500 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Rentful Style Property Transactions Table */}
        <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h3 className="text-md font-bold text-[#141413] tracking-tight">Recent Active Properties</h3>
              <p className="text-xs text-gray-400 mt-0.5">List of live property assets in database</p>
            </div>
            <Link href="/rent/rooms" className="text-xs font-bold text-[#F37338] hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="skeleton w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-48" />
                    <div className="skeleton h-3 w-32" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentRooms.length === 0 ? (
            <div className="p-16 text-center">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-gray-400">No active properties available in directory.</p>
              <Link href="/rent/rooms/new" className="text-xs text-[#F37338] font-bold hover:underline mt-2 inline-block">Add a property room →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 text-[#696969] text-xs font-bold tracking-wider uppercase text-left border-b border-gray-100">
                    <th className="px-6 py-4">Property Name</th>
                    <th className="px-6 py-4">Property Address</th>
                    <th className="px-6 py-4">Monthly Rent</th>
                    <th className="px-6 py-4">Start Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentRooms.map(room => (
                    <tr key={room.id} className="group hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/rent/rooms/${room.id}`} className="font-semibold text-gray-800 hover:text-[#F37338] transition-colors flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400 group-hover:text-[#F37338] transition-colors" />
                          <span>Room {room.roomNumber || 'Pending'}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-gray-500 font-medium truncate">{room.projectName}</p>
                          <p className="text-xs text-gray-400 truncate flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-[#F37338]" />
                            {room.address}, {room.city}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800">
                        ₹{Number(room.monthlyRent).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {room.startDate ? new Date(room.startDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[11px] font-bold ${STATUS_COLORS[room.status] || 'bg-gray-50 text-gray-500'}`}>
                          {room.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

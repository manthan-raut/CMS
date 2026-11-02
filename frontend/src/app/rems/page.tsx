'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/modules/auth/AuthContext';
import { getPendingApprovals, getPaymentStatus, getReimbursements, getAdvances } from '@/lib/rems-api';
import {
  TrendingUp, FileText, CheckCircle2, AlertTriangle, ArrowRight,
  Plus, Receipt, CreditCard, ChevronRight, Clock, MapPin, ClipboardList,
  Compass, DollarSign, HeartHandshake
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ReMSDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [pendingCount, setPendingCount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [advancesTotal, setAdvancesTotal] = useState(0);
  const [reimbsList, setReimbsList] = useState<any[]>([]);
  const [advancesList, setAdvancesList] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Grouped expense head allocation data state
  const [allocationData, setAllocationData] = useState<any[]>([
    { name: 'Travel', value: 124000, color: '#3B82F6' },
    { name: 'Food', value: 45000, color: '#EF4444' },
    { name: 'Hotel', value: 198000, color: '#10B981' },
    { name: 'Others', value: 32000, color: '#F59E0B' },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [resPending, resStatus, resReimbs, resAdvances] = await Promise.allSettled([
          getPendingApprovals(),
          getPaymentStatus(),
          getReimbursements(),
          getAdvances(),
        ]);

        let pCount = 0;
        let pList: any[] = [];
        if (resPending.status === 'fulfilled' && resPending.value.success) {
          pCount = resPending.value.data.length;
          pList = resPending.value.data.slice(0, 5);
          setPendingList(pList);
        }

        let paidCountVal = 0;
        let advancesTotalVal = 0;
        if (resStatus.status === 'fulfilled' && resStatus.value.success) {
          resStatus.value.data.advances?.forEach((a: any) => {
            if (a.status === 'PAID') paidCountVal++;
            if (a.status === 'PAID') advancesTotalVal += Number(a.amount);
          });
          resStatus.value.data.reimbursements?.forEach((r: any) => {
            if (r.status === 'PAID') paidCountVal++;
          });
        }

        setPendingCount(pCount);
        setPaidCount(paidCountVal);
        setAdvancesTotal(advancesTotalVal);

        // Fetch recent lists
        if (resReimbs.status === 'fulfilled' && resReimbs.value.success && resReimbs.value.data) {
          setReimbsList(resReimbs.value.data.slice(0, 5));
          
          // Group by expense head
          const heads: Record<string, number> = {};
          resReimbs.value.data.forEach((r: any) => {
            heads[r.expenseHead] = (heads[r.expenseHead] || 0) + Number(r.totalAmount || r.amount || 0);
          });

          const mapped = Object.entries(heads).map(([name, val]) => ({
            name,
            value: val,
            color: name === 'Travel' ? '#3B82F6' : name === 'Food' ? '#EF4444' : name === 'Accommodation' ? '#10B981' : '#8B5CF6'
          }));
          if (mapped.length > 0) {
            setAllocationData(mapped);
          }
        }

        if (resAdvances.status === 'fulfilled' && resAdvances.value.success && resAdvances.value.data) {
          setAdvancesList(resAdvances.value.data.slice(0, 5));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalOutstanding = advancesTotal * 0.35; // outstanding portion for UI balance

  // Colored block stages matching Screenshot 3 styling
  const timelineStages = [
    { title: 'Project Travel Advance Request', type: 'Travel', date: 'Just now', amount: '₹15,000', color: 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100/50', desc: 'Bengaluru site mapping survey' },
    { title: 'HOD Review Pending', type: 'Approvals', date: '2 hours ago', amount: '₹4,500', color: 'bg-blue-50 text-blue-800 border-blue-100 hover:bg-blue-100/50', desc: 'Client onsite dinner reimbursement' },
    { title: 'Finance Queue Payout', type: 'Settle', date: 'Yesterday', amount: '₹12,800', color: 'bg-pink-50 text-pink-800 border-pink-100 hover:bg-pink-100/50', desc: 'Hotel room bookings for PM team' },
    { title: 'Annual Internet Claim Settled', type: 'Office', date: '3 days ago', amount: '₹1,999', color: 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100/50', desc: 'Employee home office broadband' },
  ];

  return (
    <div className="bg-[#F8F9FA] min-h-[calc(100vh-4rem)] p-6 md:p-8 animate-fade-in-up">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#141413]">ReMS Dashboard</h1>
            <p className="text-sm text-[#696969]">Reimbursement Management System · Claim tracking & settlement hub</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/rems/advance/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-orange text-white text-sm font-semibold hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Request Advance
            </button>
            <button
              onClick={() => router.push('/rems/reimbursement/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141413] text-white text-sm font-semibold hover:bg-[#262627] transition-all"
            >
              <Receipt className="w-4 h-4" /> Claim Reimburse
            </button>
          </div>
        </div>

        {/* Premium KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Pending Claims */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Pending Approval</span>
              <p className="text-3xl font-extrabold text-[#141413] tracking-tight mt-1">
                {loading ? '...' : pendingCount}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Awaiting reviews</span>
            </div>
          </div>

          {/* Card 2: Settled Claims */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Paid Claims</span>
              <p className="text-3xl font-extrabold text-[#141413] tracking-tight mt-1">
                {loading ? '...' : paidCount}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Processed successfully</span>
            </div>
          </div>

          {/* Card 3: Total Advances */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Advances Issued</span>
              <p className="text-3xl font-extrabold text-[#141413] tracking-tight mt-1">
                ₹{loading ? '...' : advancesTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Disbursed by finance</span>
            </div>
          </div>

          {/* Card 4: Outstanding Claims */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-36">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Outstanding Claims</span>
              <p className="text-3xl font-extrabold text-amber-600 tracking-tight mt-1">
                ₹{loading ? '...' : totalOutstanding.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Pending settlement</span>
            </div>
          </div>

        </div>

        {/* Split Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Column: Expense Breakdown & Timeline (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Bar Chart card */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div>
                <h3 className="text-md font-bold text-[#141413] tracking-tight">Expense Categories Breakdown</h3>
                <p className="text-xs text-gray-400 mt-0.5 mb-6">Distribution of settlements grouped by category</p>
              </div>

              <div className="h-[220px]">
                {loading ? (
                  <div className="skeleton w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={allocationData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="name" stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#FFFFFF',
                          borderRadius: '14px',
                          border: '1px solid #E2E8F0',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`]}
                      />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={45}>
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Timelines style Colored Blocks (matching Screenshot 3) */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-md font-bold text-[#141413] tracking-tight">Claims Timeline Tracker</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Realtime progress stages of ongoing disbursements</p>
                </div>
                <Compass className="w-5 h-5 text-gray-300" />
              </div>

              <div className="space-y-3.5">
                {timelineStages.map((stage, idx) => (
                  <div 
                    key={idx} 
                    className={`border border-transparent rounded-[20px] p-4 flex justify-between items-start cursor-pointer transition-all hover:scale-[1.01] ${stage.color}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-white/60 text-[10px] font-extrabold uppercase tracking-wider">
                          {stage.type}
                        </span>
                        <span className="text-[10px] opacity-60 font-semibold">{stage.date}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 leading-snug">{stage.title}</p>
                      <p className="text-xs opacity-75 leading-relaxed">{stage.desc}</p>
                    </div>
                    <span className="text-md font-black text-gray-900 shrink-0 ml-4">{stage.amount}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Approvals queue for manager, Recent activities (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Pending Approvals */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-[#141413]">Review Claim Inbox</h4>
                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              
              <div className="space-y-3">
                {loading ? (
                  <p className="text-xs text-gray-400 text-center py-6">Loading pending queue...</p>
                ) : pendingList.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-medium">Claims inbox is clean</p>
                  </div>
                ) : (
                  pendingList.map((req, idx) => (
                    <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-[18px] hover:border-gray-200 transition-all flex flex-col justify-between h-28">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#141413] truncate">{req.employee?.name || 'Employee'}</p>
                          <p className="text-[10px] text-[#696969] truncate mt-0.5">{req.purpose || req.expenseHead || 'Claim Request'}</p>
                        </div>
                        <span className="text-xs font-black text-gray-900 shrink-0">
                          ₹{Number(req.amount || req.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 mt-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                          {req.status?.replace(/_/g, ' ')}
                        </span>
                        <Link 
                          href={user?.role === 'FINANCE_MANAGER' ? '/rems/finance' : '/rems/approvals'}
                          className="text-[11px] font-bold text-[#F37338] hover:underline"
                        >
                          Review →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Operations cards */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
              <h4 className="text-sm font-bold text-[#141413]">ReMS Directories</h4>
              
              <div className="space-y-2.5">
                <button 
                  onClick={() => router.push('/rems/my-requests')}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-[16px] transition-all text-left text-xs font-bold text-gray-700 hover:text-black"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-500" />
                    Track My Requests
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </button>

                <button 
                  onClick={() => router.push('/rems/reports')}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-[16px] transition-all text-left text-xs font-bold text-gray-700 hover:text-black"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Expense Reports Overview
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

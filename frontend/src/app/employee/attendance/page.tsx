'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Clock, Calendar, UserCheck, FileText, CheckCircle2,
  AlertCircle, AlertTriangle, Plus, Play, Square, RefreshCw
} from 'lucide-react';

interface AttendanceLog {
  id: string;
  date: string;
  punchIn: string;
  punchOut: string | null;
  duration: string; // e.g. "08:15 hrs"
  status: 'ACTIVE' | 'COMPLETED';
}

interface LeaveRequest {
  id: string;
  leaveType: 'Casual' | 'Sick' | 'Annual' | 'Loss of Pay';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export default function AttendanceAndLeaves() {
  const { user } = useAuth();
  
  // Realtime clock
  const [time, setTime] = useState<Date | null>(null);
  
  // Logs states
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchLogs, setPunchLogs] = useState<AttendanceLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  
  // Form states
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Clock ticking
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load database from localStorage
  useEffect(() => {
    const savedPunches = localStorage.getItem('employee_attendance_punches');
    const savedLeaves = localStorage.getItem('employee_leaves');

    if (savedPunches) {
      const logs: AttendanceLog[] = JSON.parse(savedPunches);
      setPunchLogs(logs);
      // If there's an active punch, user is currently punched in
      setPunchedIn(logs.some(l => l.status === 'ACTIVE'));
    } else {
      // Seed default logs for aesthetics
      const seed: AttendanceLog[] = [
        { id: '1', date: '2026-07-09', punchIn: '09:05 AM', punchOut: '05:32 PM', duration: '08h 27m', status: 'COMPLETED' },
        { id: '2', date: '2026-07-08', punchIn: '08:58 AM', punchOut: '05:45 PM', duration: '08h 47m', status: 'COMPLETED' },
        { id: '3', date: '2026-07-07', punchIn: '09:12 AM', punchOut: '06:01 PM', duration: '08h 49m', status: 'COMPLETED' }
      ];
      setPunchLogs(seed);
      localStorage.setItem('employee_attendance_punches', JSON.stringify(seed));
    }

    if (savedLeaves) {
      setLeaves(JSON.parse(savedLeaves));
    } else {
      // Seed default leaves for aesthetics
      const seed: LeaveRequest[] = [
        { id: '1', leaveType: 'Casual', startDate: '2026-07-15', endDate: '2026-07-16', reason: 'Family function attendance', status: 'PENDING', createdAt: '2026-07-10' },
        { id: '2', leaveType: 'Sick', startDate: '2026-06-12', endDate: '2026-06-12', reason: 'Medical appointment', status: 'APPROVED', createdAt: '2026-06-10' }
      ];
      setLeaves(seed);
      localStorage.setItem('employee_leaves', JSON.stringify(seed));
    }
  }, []);

  // Punch Operations
  const handlePunchToggle = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (!punchedIn) {
      // PUNCH IN
      const newPunch: AttendanceLog = {
        id: Math.random().toString(),
        date: todayStr,
        punchIn: nowTimeStr,
        punchOut: null,
        duration: '--',
        status: 'ACTIVE',
      };
      const updated = [newPunch, ...punchLogs];
      setPunchLogs(updated);
      localStorage.setItem('employee_attendance_punches', JSON.stringify(updated));
      setPunchedIn(true);
    } else {
      // PUNCH OUT
      const updated = punchLogs.map(log => {
        if (log.status === 'ACTIVE') {
          // Calculate duration (dummy calculation for representation)
          return {
            ...log,
            punchOut: nowTimeStr,
            duration: '08h 15m',
            status: 'COMPLETED' as const,
          };
        }
        return log;
      });
      setPunchLogs(updated);
      localStorage.setItem('employee_attendance_punches', JSON.stringify(updated));
      setPunchedIn(false);
    }
  };

  // Leave Form Submit
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!startDate || !endDate || !reason) {
      setFormError('Please fill out all fields.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Start date cannot be after end date.');
      return;
    }

    const newRequest: LeaveRequest = {
      id: Math.random().toString(),
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'PENDING',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newRequest, ...leaves];
    setLeaves(updated);
    localStorage.setItem('employee_leaves', JSON.stringify(updated));
    
    // Clear state
    setStartDate('');
    setEndDate('');
    setReason('');
    setFormSuccess('Leave request applied successfully!');
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'APPROVED':
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'REJECTED':
        return 'text-rose-600 bg-rose-50 border-rose-100';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <ProtectedRoute>
      <div className="bg-[#F8F9FA] min-h-[calc(100vh-4rem)] p-6 md:p-8 animate-fade-in-up">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F37338]" /> HR Self Service
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-[#141413]">Attendance & Leaves</h1>
              <p className="text-sm text-gray-500 mt-0.5">Punch working logs and request leave claims</p>
            </div>
          </div>

          {/* Grid Layout (Left Punch Card, Right Request Form) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* Left Section: Live Punch clock & History (2/5) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Glassmorphism Clock Punch Card */}
              <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between items-center text-center relative overflow-hidden">
                {/* Visual glow bg */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-[#F37338] to-purple-500" />
                
                <div className="space-y-1 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Digital Workspace Clock</span>
                  <div className="text-3xl font-black text-[#141413] tracking-tighter tabular-nums h-10 flex items-center justify-center">
                    {time ? time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '00:00:00 AM'}
                  </div>
                  <span className="text-xs text-gray-400 block font-semibold">
                    {time ? time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </span>
                </div>

                <div className="my-6">
                  <button
                    onClick={handlePunchToggle}
                    className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-md ${
                      punchedIn
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {punchedIn ? (
                      <>
                        <Square className="w-6 h-6 fill-rose-500" />
                        <span className="text-xs font-black uppercase tracking-wider">Punch Out</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 fill-emerald-500 ml-1" />
                        <span className="text-xs font-black uppercase tracking-wider">Punch In</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="w-full pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    Status: {punchedIn ? 'Checked In' : 'Checked Out'}
                  </span>
                  <span className="text-gray-400">Today: 08 hrs standard</span>
                </div>
              </div>

              {/* Punch Logs History */}
              <div className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#141413] tracking-tight">Recent Punch Logs</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last 7 Days</span>
                </div>

                <div className="space-y-3.5">
                  {punchLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-[18px]">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-800">
                          {new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">In: {log.punchIn} · Out: {log.punchOut || 'Active'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          log.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {log.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Section: Leave request form & history (3/5) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Leave request form */}
              <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div>
                  <h3 className="text-md font-bold text-[#141413] tracking-tight">Apply for Leave Request</h3>
                  <p className="text-xs text-gray-400 mt-0.5 mb-5">Submit a formal request to your supervisor</p>
                </div>

                <form onSubmit={handleLeaveSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Leave Type *</label>
                      <select
                        value={leaveType}
                        onChange={e => setLeaveType(e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50 font-medium text-gray-700"
                      >
                        <option value="Casual">Casual Leave</option>
                        <option value="Sick">Sick Leave</option>
                        <option value="Annual">Annual Leave</option>
                        <option value="Loss of Pay">Loss of Pay</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">End Date *</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Reason for Absence *</label>
                    <textarea
                      required
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Write leave details..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50 resize-none text-gray-700"
                    />
                  </div>

                  {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-[12px] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-[12px] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-50 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#141413] text-white hover:bg-[#262627] text-sm font-semibold transition-colors shadow-sm"
                    >
                      Apply Leave
                    </button>
                  </div>
                </form>
              </div>

              {/* Leaves ledger */}
              <div className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#141413]">Leave Request Ledger</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">History</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-[#696969] text-xs font-bold tracking-wider uppercase border-b border-gray-50">
                        <th className="pb-3">Leave Type</th>
                        <th className="pb-3">Duration</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leaves.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-gray-400">No leave requests logged.</td>
                        </tr>
                      ) : (
                        leaves.map(req => (
                          <tr key={req.id}>
                            <td className="py-3 font-semibold text-gray-800">{req.leaveType} Leave</td>
                            <td className="py-3 text-gray-500 text-xs font-medium">
                              {new Date(req.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(req.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="py-3 text-gray-400 text-xs max-w-[150px] truncate" title={req.reason}>
                              {req.reason}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${getStatusClass(req.status)}`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}

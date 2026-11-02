'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2,
  Clock, CheckCircle, AlertCircle, FileText, Check, Layers, AlertTriangle
} from 'lucide-react';

interface WorkEntry {
  id: string;
  title: string;
  description: string;
  startTime: string; // e.g. "08:00 AM"
  endTime: string;   // e.g. "09:00 AM"
  status: 'COMPLETED' | 'INCOMPLETE' | 'BLOCKED';
  category: 'Mapping Sync' | 'Development' | 'Documentation' | 'Field Visit' | 'General Update';
  date: string; // e.g. "2026-08-30"
}

const CATEGORY_STYLES: Record<string, string> = {
  'Mapping Sync': 'bg-pink-50 text-pink-700 border-pink-100 hover:bg-pink-100/50',
  'Development': 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50',
  'Documentation': 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50',
  'Field Visit': 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50',
  'General Update': 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/50',
};

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
];

export default function DailyWorkCalendar() {
  const { user } = useAuth();
  
  // Date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<WorkEntry | null>(null);
  
  // Add Entry Modal state
  const [addModal, setAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [category, setCategory] = useState<WorkEntry['category']>('Development');
  const [status, setStatus] = useState<WorkEntry['status']>('COMPLETED');

  // Load from localStorage on client-side
  useEffect(() => {
    const saved = localStorage.getItem('employee_work_entries');
    if (saved) {
      setEntries(JSON.parse(saved));
    } else {
      // Seed default items for first-time premium look (matching Screenshot 3)
      const seed: WorkEntry[] = [
        {
          id: '1',
          title: 'Consultation & RMS Sync',
          description: 'Client review of room lease layouts and mapping assets.',
          startTime: '08:00 AM',
          endTime: '09:00 AM',
          status: 'COMPLETED',
          category: 'Mapping Sync',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: '2',
          title: 'Vite Frontend Development',
          description: 'Refactoring reimbursement dashboard card components.',
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          status: 'COMPLETED',
          category: 'Development',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: '3',
          title: 'Generate Weekly Audit Report',
          description: 'Export CSV sheets for HOD reporting.',
          startTime: '11:00 AM',
          endTime: '12:00 PM',
          status: 'INCOMPLETE',
          category: 'Documentation',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: '4',
          title: 'Field Survey Visit',
          description: 'Survey coordinates of new properties.',
          startTime: '01:00 PM',
          endTime: '03:00 PM',
          status: 'BLOCKED',
          category: 'Field Visit',
          date: new Date().toISOString().split('T')[0]
        }
      ];
      setEntries(seed);
      localStorage.setItem('employee_work_entries', JSON.stringify(seed));
    }
  }, []);

  // Save entries to localStorage
  const saveEntries = (newEntries: WorkEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('employee_work_entries', JSON.stringify(newEntries));
  };

  const getFormattedDateString = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  const currentDayString = getFormattedDateString(selectedDate);

  // Handle Add Entry
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const newEntry: WorkEntry = {
      id: Math.random().toString(),
      title,
      description,
      startTime,
      endTime,
      category,
      status,
      date: currentDayString,
    };

    const updated = [...entries, newEntry];
    saveEntries(updated);
    
    // Reset state
    setTitle('');
    setDescription('');
    setStartTime('09:00 AM');
    setEndTime('10:00 AM');
    setCategory('Development');
    setStatus('COMPLETED');
    setAddModal(false);
  };

  // Handle Delete Entry
  const handleDeleteEntry = (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }
  };

  // Handle Status Update from Details Panel
  const handleUpdateStatus = (id: string, nextStatus: WorkEntry['status']) => {
    const updated = entries.map(e => e.id === id ? { ...e, status: nextStatus } : e);
    saveEntries(updated);
    const updatedSel = updated.find(e => e.id === id);
    if (updatedSel) {
      setSelectedEntry(updatedSel);
    }
  };

  // Navigation
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
    setSelectedEntry(null);
  };

  // Filter entries for selected day
  const dayEntries = entries.filter(e => e.date === currentDayString);

  // Calculations for KPI board
  const completedCount = dayEntries.filter(e => e.status === 'COMPLETED').length;
  const incompleteCount = dayEntries.filter(e => e.status === 'INCOMPLETE').length;
  const blockedCount = dayEntries.filter(e => e.status === 'BLOCKED').length;

  return (
    <ProtectedRoute>
      <div className="bg-[#F8F9FA] min-h-[calc(100vh-4rem)] p-6 md:p-8 animate-fade-in-up">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Workspace */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F37338]" /> Daily Reports & Logs
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-[#141413]">Daily Work Entry</h1>
              <p className="text-sm text-gray-500 mt-0.5">Google Calendar-like daily reporting scheduler for employees</p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-white border border-gray-200 rounded-[14px] p-1.5 shadow-sm">
                <button onClick={() => changeDate(-1)} className="p-1.5 rounded-[10px] hover:bg-gray-50 text-gray-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-1 text-xs font-bold text-[#141413]">
                  {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => changeDate(1)} className="p-1.5 rounded-[10px] hover:bg-gray-50 text-gray-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setAddModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#141413] text-white hover:bg-[#262627] text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Log Daily Report
              </button>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-[16px] border border-gray-100 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.01)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Completed</p>
                <p className="text-md font-bold text-gray-800">{completedCount} tasks</p>
              </div>
            </div>
            <div className="bg-white rounded-[16px] border border-gray-100 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.01)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Incomplete</p>
                <p className="text-md font-bold text-gray-800">{incompleteCount} items</p>
              </div>
            </div>
            <div className="bg-white rounded-[16px] border border-gray-100 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.01)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Blocked</p>
                <p className="text-md font-bold text-gray-800">{blockedCount} logs</p>
              </div>
            </div>
          </div>

          {/* Main Workspace Layout (Left: Grid, Right: Details Sidepanel) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Left: Google Calendar Hourly Grid (3/4) */}
            <div className="lg:col-span-3 bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-md font-bold text-[#141413] tracking-tight">Timeline logs</h3>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Hourly View</span>
              </div>

              {/* Grid timeline */}
              <div className="divide-y divide-gray-50 border-t border-b border-gray-100">
                {TIME_SLOTS.map((time, idx) => {
                  // Find entries active at this start time
                  const active = dayEntries.filter(e => e.startTime === time);

                  return (
                    <div key={idx} className="flex min-h-[58px] items-stretch group hover:bg-gray-50/20 transition-colors">
                      {/* Left: Time Label */}
                      <div className="w-20 text-xs font-semibold text-gray-400 py-3 select-none flex items-start gap-1">
                        <Clock className="w-3.5 h-3.5 mt-0.5 text-gray-300" />
                        {time.split(' ')[0]}
                      </div>
                      
                      {/* Right: Grid Slot cell */}
                      <div className="flex-1 py-1.5 pl-4 pr-1 flex flex-wrap gap-2.5 relative">
                        {active.map(entry => (
                          <div
                            key={entry.id}
                            onClick={() => setSelectedEntry(entry)}
                            className={`border border-transparent rounded-[16px] px-4 py-2 flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.01] max-w-[280px] shrink-0 shadow-sm ${
                              selectedEntry?.id === entry.id ? 'ring-2 ring-[#141413]/60' : ''
                            } ${CATEGORY_STYLES[entry.category]}`}
                          >
                            <span className="text-[9px] font-extrabold uppercase tracking-wide opacity-75">{entry.category}</span>
                            <h4 className="text-xs font-bold truncate leading-snug">{entry.title}</h4>
                            <p className="text-[10px] opacity-75 truncate">{entry.startTime} - {entry.endTime}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Google Calendar Appointment Detail Sidepanel (1/4) */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] min-h-[420px] flex flex-col justify-between">
              {selectedEntry ? (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 border rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-50 border-gray-100">
                        {selectedEntry.category}
                      </span>
                      <p className="text-xs text-gray-400 font-semibold">{selectedEntry.startTime} - {selectedEntry.endTime}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(selectedEntry.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[10px] transition-colors"
                      title="Delete Log"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-800 leading-snug">{selectedEntry.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line bg-gray-50 p-3.5 rounded-[16px] border border-gray-100">
                      {selectedEntry.description || <span className="italic text-gray-400">No additional details recorded.</span>}
                    </p>
                  </div>

                  {/* Status update selector */}
                  <div className="space-y-2 pt-2 border-t border-gray-50">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Update Status</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(selectedEntry.id, 'COMPLETED')}
                        className={`py-1 text-[10px] font-bold border rounded-[10px] transition-colors ${
                          selectedEntry.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedEntry.id, 'INCOMPLETE')}
                        className={`py-1 text-[10px] font-bold border rounded-[10px] transition-colors ${
                          selectedEntry.status === 'INCOMPLETE' ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedEntry.id, 'BLOCKED')}
                        className={`py-1 text-[10px] font-bold border rounded-[10px] transition-colors ${
                          selectedEntry.status === 'BLOCKED' ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Blocked
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                  <FileText className="w-12 h-12 text-gray-200 mb-3 animate-pulse" />
                  <p className="text-sm font-semibold">Select Log Details</p>
                  <p className="text-[11px] text-gray-400 px-4 mt-1">Click any entry block inside the hourly timeline grid to view notes and perform status updates.</p>
                </div>
              )}

              <div className="pt-6 border-t border-gray-50 mt-6 text-[10px] text-gray-400 leading-normal">
                <p className="font-bold uppercase tracking-wider text-gray-500 mb-1">Logging Guidelines</p>
                <p>Provide specific mapping counts, site verification results, and operational task status updates daily.</p>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* LOG WORK ENTRY MODAL */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-xl w-full max-w-md p-6 overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#141413]">Log Daily Work</h2>
              <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Work Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Sync lease documents"
                  className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Description / Progress details</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add details about task outcomes..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Start Time Slot *</label>
                  <select
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">End Time Slot *</label>
                  <select
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                  >
                    <option value="Mapping Sync">Mapping Sync</option>
                    <option value="Development">Development</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Field Visit">Field Visit</option>
                    <option value="General Update">General Update</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="INCOMPLETE">Incomplete</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  className="w-1/2 py-2.5 rounded-[14px] border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-[14px] bg-[#141413] text-white text-sm font-semibold hover:bg-[#262627] transition-colors"
                >
                  Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { apiGetRentReport } from '@/lib/rooms-api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const REPORTS = [
  { key: 'monthly-rent-payable', label: 'Monthly Rent Payable', params: ['month', 'year'], description: 'View all active rooms with rent payment status for the selected month.' },
  { key: 'rent-due', label: 'Rent Due Report', params: ['month', 'year'], description: 'Paid vs unpaid rooms with due amounts for the month.' },
  { key: 'year-wise-payments', label: 'Year-Wise Payments', params: ['year'], description: 'Month-by-month payment totals for the full year.' },
  { key: 'agreement-expiry', label: 'Agreement Expiry Alert', params: ['days'], description: 'Rooms with agreements expiring within the selected days.' },
  { key: 'project-wise-rooms', label: 'Project-Wise Rooms', params: ['projectName'], description: 'Room count and rent totals grouped by project.' },
  { key: 'city-wise', label: 'City-Wise Summary', params: [], description: 'Room count and rent totals grouped by city.' },
  { key: 'active-rooms', label: 'Active Rooms', params: ['project', 'city'], description: 'All currently active rooms with filters.' },
  { key: 'closed-rooms', label: 'Closed Rooms', params: ['project', 'city'], description: 'Rooms that have been closed.' },
  { key: 'brokerage', label: 'Brokerage Report', params: ['projectName'], description: 'Rooms with broker details and brokerage charges.' },
  { key: 'pending-hod-approval', label: 'Pending HOD Approvals', params: [], description: 'Rooms and closures awaiting HOD action.' },
  { key: 'owner-wise', label: 'Owner-Wise Report', params: ['year'], description: 'Rooms and payments grouped by owner.' },
  { key: 'monthly-advance-payable', label: 'Advance Payable', params: ['month', 'year'], description: 'Advance amounts recorded for the selected month.' },
];

function ParamInput({ param, value, onChange }: { param: string; value: string; onChange: (v: string) => void }) {
  const now = new Date();
  if (param === 'month') return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-2 rounded-[12px] border border-[#141413]/20 bg-white text-sm focus:outline-none focus:border-[#141413]">
      <option value="">All Months</option>
      {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
    </select>
  );
  if (param === 'year') return (
    <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={String(now.getFullYear())}
      className="px-3 py-2 rounded-[12px] border border-[#141413]/20 bg-white text-sm focus:outline-none w-24" />
  );
  if (param === 'days') return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-2 rounded-[12px] border border-[#141413]/20 bg-white text-sm focus:outline-none">
      <option value="30">30 days</option>
      <option value="60">60 days</option>
      <option value="90">90 days</option>
    </select>
  );
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={param}
      className="px-3 py-2 rounded-[12px] border border-[#141413]/20 bg-white text-sm focus:outline-none w-36" />
  );
}

export default function RentReportsPage() {
  const [selected, setSelected] = useState(REPORTS[0]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const setParam = (key: string) => (v: string) => setParams(p => ({ ...p, [key]: v }));

  const runReport = useCallback(async () => {
    setLoading(true);
    setResult(null);
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
    const res = await apiGetRentReport(selected.key, filteredParams);
    setResult(res);
    setLoading(false);
  }, [selected, params]);

  // Extract tabular data dynamically
  let rowsData: any[] = [];
  if (result && result.success) {
    if (Array.isArray(result.data)) {
      rowsData = result.data;
    } else if (result.data && Array.isArray(result.data.rows)) {
      rowsData = result.data.rows;
    } else if (result.data && Array.isArray(result.data.pendingRooms)) {
      // Pending HOD Approval has pendingRooms and pendingClosures
      rowsData = result.data.pendingRooms;
    }
  }

  // Extract summary metrics robustly
  const summary = result?.success
    ? (result.data?.summary || result.summary || null)
    : null;

  const formatHeader = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getHeaders = (dataList: any[]) => {
    if (!dataList || dataList.length === 0) return [];
    const first = dataList[0];
    return Object.keys(first).filter(k => k !== 'id' && k !== 'roomId' && typeof first[k] !== 'object');
  };

  const renderCell = (key: string, val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') {
      if (val.name) return val.name;
      if (val.roomNumber) return val.roomNumber;
      return JSON.stringify(val);
    }
    if (typeof val === 'number' || !isNaN(Number(val))) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('rent') || lowerKey.includes('amount') || lowerKey.includes('deposit') || lowerKey.includes('charges') || lowerKey.includes('payable') || lowerKey.includes('paid') || lowerKey.includes('due') || lowerKey.includes('brokerage')) {
        return `₹${Number(val).toLocaleString('en-IN')}`;
      }
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(val).toLocaleDateString('en-IN');
    }
    return String(val);
  };

  const exportToCSV = () => {
    if (!rowsData || rowsData.length === 0) return;
    const headers = getHeaders(rowsData);
    const csvHeaders = headers.map(h => formatHeader(h)).join(',');
    const csvRows = rowsData.map(row => 
      headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) val = '';
        else if (typeof val === 'object') val = val.name || val.roomNumber || '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selected.key}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  const headers = getHeaders(rowsData);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar: report picker */}
        <div className="w-64 bg-white border-r border-gray-100 p-5 flex-shrink-0 overflow-y-auto print:hidden">
          <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1 mb-4">
            <span className="text-[#F37338]">•</span> RMS-Rent Reports
          </p>
          <div className="space-y-1">
            {REPORTS.map(r => (
              <button
                key={r.key}
                id={`report-${r.key}`}
                onClick={() => { setSelected(r); setParams({}); setResult(null); }}
                className={`w-full text-left px-4 py-2.5 rounded-[12px] text-sm transition-colors ${selected.key === r.key ? 'bg-[#141413] text-white font-medium' : 'text-[#696969] hover:bg-[#F3F0EE] hover:text-[#141413]'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8 overflow-auto print:p-0 print:overflow-visible">
          <div className="max-w-5xl mx-auto">
            
            {/* Report Title Section */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-medium text-[#141413] tracking-tight mb-1">{selected.label}</h1>
                <p className="text-sm text-[#696969] print:hidden">{selected.description}</p>
              </div>
              {result && (
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 rounded-[14px] border border-[#141413]/20 hover:border-[#141413] text-sm font-medium transition-all"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={printReport}
                    className="px-4 py-2 rounded-[14px] bg-[#141413] text-white hover:bg-[#262627] text-sm font-medium transition-all"
                  >
                    Print Report
                  </button>
                </div>
              )}
            </div>

            {/* Params + Run */}
            <div className="bg-white rounded-[20px] p-5 flex flex-wrap items-center gap-4 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] print:hidden">
              {selected.params.map(p => (
                <div key={p} className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#696969]">{p}</span>
                  <ParamInput param={p} value={params[p] ?? ''} onChange={setParam(p)} />
                </div>
              ))}
              <button
                id="run-report-btn"
                onClick={runReport}
                disabled={loading}
                className="px-6 py-2.5 rounded-[14px] bg-[#141413] text-[#F3F0EE] text-sm font-medium hover:bg-[#262627] disabled:opacity-60 transition-colors ml-auto"
              >
                {loading ? 'Running…' : 'Run Report'}
              </button>
            </div>

            {/* Results Preview */}
            {result && result.success && (
              <div className="space-y-6">
                
                {/* Summary Metrics */}
                {summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(summary).map(([k, v]) => (
                      <div key={k} className="bg-white border border-gray-100 rounded-[20px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                        <p className="text-xs text-[#696969] uppercase tracking-wider font-semibold mb-1">{k.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-xl font-bold text-[#141413]">
                          {typeof v === 'number' && (k.toLowerCase().includes('rent') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('paid') || k.toLowerCase().includes('due') || k.toLowerCase().includes('brokerage'))
                            ? `₹${Number(v).toLocaleString('en-IN')}`
                            : String(v ?? '—')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Data Table */}
                <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                  <div className="overflow-x-auto">
                    {rowsData.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        No records found for the selected report filters.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {headers.map(h => (
                              <th key={h} className="text-left px-6 py-4 text-xs font-bold tracking-[0.04em] uppercase text-[#696969]">
                                {formatHeader(h)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rowsData.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              {headers.map(h => (
                                <td key={h} className="px-6 py-4 text-[#141413]">
                                  {renderCell(h, row[h])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Raw JSON details (collapsed by default) */}
                <details className="bg-white rounded-[16px] border border-gray-100 p-4 print:hidden">
                  <summary className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] cursor-pointer outline-none">
                    Raw API Response Details
                  </summary>
                  <pre className="text-xs bg-gray-50 rounded-[12px] p-4 mt-3 overflow-auto max-h-[250px] text-[#141413]">
                    {JSON.stringify(result.data ?? result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            
            {result && !result.success && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-[16px] text-sm">
                Error running report: {result.message || 'Unknown error occurred'}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

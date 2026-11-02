'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const REPORT_TABS = [
  { value: 'project-wise', label: 'Project Wise', description: 'Reimbursement claims grouped and filtered by project details.' },
  { value: 'expense-head-wise', label: 'Expense Head Wise', description: 'Aggregated totals grouped by expense categories (e.g. Travel, Food).' },
  { value: 'employee-wise', label: 'Employee Wise', description: 'Expense statistics and breakdown by employee.' },
  { value: 'advance-vs-settlement', label: 'Advance vs Settlement', description: 'Compare employee advance request balances against actual claims settled.' },
  { value: 'pending-approvals', label: 'Pending Approvals', description: 'Aging overview of claims currently awaiting manager or finance approval.' },
  { value: 'payment-status', label: 'Payment Status', description: 'Reimbursements and advances filtered by their financial payout status.' },
];

export default function ReMSReportsPage() {
  const [reportType, setReportType] = useState('project-wise');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async (type: string) => {
    setLoading(true);
    setError('');
    setReportData(null);
    try {
      const res = await apiFetch<any>(`/api/reports/rems/${type}`);
      if (res.success) {
        setReportData(res.data);
      } else {
        setError(res.message || 'Failed to fetch report data');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading the report');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]);

  // Extract tabular rows
  let rowsData: any[] = [];
  if (reportData) {
    if (Array.isArray(reportData)) {
      rowsData = reportData;
    } else if (typeof reportData === 'object') {
      // If it is grouped like { "Project A": { "Travel": 100 } } (project-and-head-wise), let's flatten it
      const keys = Object.keys(reportData);
      if (keys.length > 0 && typeof reportData[keys[0]] === 'object' && !Array.isArray(reportData[keys[0]])) {
        const flat: any[] = [];
        Object.entries(reportData).forEach(([proj, headMap]: [string, any]) => {
          Object.entries(headMap).forEach(([head, amt]: [string, any]) => {
            flat.push({ project: proj, expenseHead: head, amount: amt });
          });
        });
        rowsData = flat;
      } else {
        // Just extract values or wrap in array
        rowsData = Object.entries(reportData).map(([k, v]) => ({ name: k, ...((v as any) || {}) }));
      }
    }
  }

  const formatHeader = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getHeaders = (dataList: any[]) => {
    if (!dataList || dataList.length === 0) return [];
    const first = dataList[0];
    return Object.keys(first).filter(k => k !== 'id' && k !== 'employeeId' && typeof first[k] !== 'object');
  };

  const renderCell = (key: string, val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') {
      if (val.name) return val.name;
      if (val.employeeId) return `${val.name} (${val.employeeId})`;
      return JSON.stringify(val);
    }
    if (typeof val === 'number' || !isNaN(Number(val))) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('amount') || lowerKey.includes('sum') || lowerKey.includes('total') || lowerKey.includes('balance') || lowerKey.includes('settlement') || lowerKey.includes('advance')) {
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
        else if (typeof val === 'object') val = val.name || val.employeeId || '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rems_${reportType}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const headers = getHeaders(rowsData);
  const activeTab = REPORT_TABS.find(t => t.value === reportType);

  return (
    <div className="space-y-6">
        {/* Title & Actions */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-medium text-[#141413] tracking-tight">ReMS Reports</h1>
            <p className="text-sm text-[#696969] mt-1 print:hidden">View aggregated reimburse claims and employee cash claims.</p>
          </div>
          {reportData && (
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 rounded-[14px] border border-[#141413]/20 hover:border-[#141413] text-sm font-medium transition-all"
              >
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-[14px] bg-[#141413] text-white hover:bg-[#262627] text-sm font-medium transition-all"
              >
                Print Report
              </button>
            </div>
          )}
        </div>

        {/* Tab Picker */}
        <div className="bg-white rounded-[20px] p-2 flex flex-wrap gap-1 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100 print:hidden">
          {REPORT_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setReportType(tab.value)}
              className={`px-4 py-2 rounded-[12px] text-xs font-semibold uppercase tracking-wider transition-colors ${reportType === tab.value ? 'bg-[#141413] text-white' : 'text-[#696969] hover:bg-[#F3F0EE] hover:text-[#141413]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Description (shown on active report) */}
        {activeTab && (
          <div className="bg-[#F3F0EE]/40 border border-[#141413]/5 rounded-[16px] px-5 py-4 print:hidden">
            <h3 className="text-xs font-bold uppercase text-[#141413] tracking-wide mb-0.5">{activeTab.label} Details</h3>
            <p className="text-xs text-[#696969]">{activeTab.description}</p>
          </div>
        )}

        {/* Result Table Container */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#141413]" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-[16px] text-sm">
            {error}
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
              <div className="overflow-x-auto">
                {rowsData.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm">
                    No records found for this reimbursement report.
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
                Raw JSON Data
              </summary>
              <pre className="text-xs bg-gray-50 rounded-[12px] p-4 mt-3 overflow-auto max-h-[250px] text-[#141413]">
                {JSON.stringify(reportData, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>
  );
}

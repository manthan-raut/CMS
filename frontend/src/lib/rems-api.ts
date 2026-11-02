import { apiFetch } from '@/lib/api';

// Advance Requests
export const submitAdvance = (data: any) => apiFetch<any>('/api/advance-requests', { method: 'POST', body: JSON.stringify(data) });
export const getAdvances = (params?: any) => {
  const query = new URLSearchParams(params || {}).toString();
  return apiFetch<any>(`/api/advance-requests${query ? '?' + query : ''}`);
};
export const getAdvanceDetails = (id: string) => apiFetch<any>(`/api/advance-requests/${id}`);
export const approveAdvance = (id: string, managerRemark: string) => apiFetch<any>(`/api/advance-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ managerRemark }) });
export const rejectAdvance = (id: string, managerRemark: string) => apiFetch<any>(`/api/advance-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ managerRemark }) });
export const processAdvancePayment = (id: string, financeRemark: string) => apiFetch<any>(`/api/advance-requests/${id}/process-payment`, { method: 'POST', body: JSON.stringify({ financeRemark }) });

// Reimbursements
export const submitReimbursement = (data: any) => apiFetch<any>('/api/reimbursements', { method: 'POST', body: JSON.stringify(data) });
export const getReimbursements = (params?: any) => {
  const query = new URLSearchParams(params || {}).toString();
  return apiFetch<any>(`/api/reimbursements${query ? '?' + query : ''}`);
};
export const getReimbursementDetails = (id: string) => apiFetch<any>(`/api/reimbursements/${id}`);
export const approveReimbursement = (id: string, managerRemark: string) => apiFetch<any>(`/api/reimbursements/${id}/approve`, { method: 'POST', body: JSON.stringify({ managerRemark }) });
export const rejectReimbursement = (id: string, managerRemark: string) => apiFetch<any>(`/api/reimbursements/${id}/reject`, { method: 'POST', body: JSON.stringify({ managerRemark }) });
export const processReimbursementPayment = (id: string, financeRemark: string) => apiFetch<any>(`/api/reimbursements/${id}/process-payment`, { method: 'POST', body: JSON.stringify({ financeRemark }) });

// Reports
export const getPendingApprovals = () => apiFetch<any>('/api/reports/rems/pending-approvals');
export const getPaymentStatus = () => apiFetch<any>('/api/reports/rems/payment-status');

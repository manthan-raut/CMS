import { apiFetch } from '@/lib/api';
import { ApiResponse } from '@/types';

export interface Room {
  id: string;
  roomNumber: string | null;
  projectName: string;
  city: string;
  address: string;
  googleMapLocation?: string;
  monthlyRent: number;
  deposit: number;
  occupancyCapacity: number;
  electricityIncluded: boolean;
  waterIncluded: boolean;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'PENDING_CLOSURE' | 'CLOSED';
  startDate: string;
  agreementStartDate?: string;
  agreementEndDate?: string;
  owner: { id: string; name: string; mobile: string };
  broker?: { id: string; name: string; mobile: string } | null;
  createdBy: { id: string; name: string; employeeId: string };
  approvedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface CreateRoomPayload {
  projectName: string; city: string; address: string;
  googleMapLocation?: string;
  facilities?: string; electricityIncluded?: boolean; waterIncluded?: boolean;
  otherUtilities?: string; startDate: string;
  monthlyRent: number; deposit?: number; occupancyCapacity?: number; remark?: string;
  agreementFileUrl?: string; agreementStartDate?: string; agreementEndDate?: string; agreementRemark?: string;
  owner: { name: string; mobile: string; aadhaar?: string; pan?: string; bankName?: string; accountNumber?: string; ifscCode?: string };
  broker?: { name: string; mobile: string; brokerageCharges?: number; bankName?: string; accountNumber?: string; ifscCode?: string };
}

export async function apiListRooms(params?: { status?: string; city?: string; page?: number }): Promise<ApiResponse<Room[]>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.city) qs.set('city', params.city);
  if (params?.page) qs.set('page', String(params.page));
  return apiFetch<Room[]>(`/api/rooms?${qs.toString()}`);
}

export async function apiGetRoom(id: string): Promise<ApiResponse<Room>> {
  return apiFetch<Room>(`/api/rooms/${id}`);
}

export async function apiCreateRoom(data: CreateRoomPayload): Promise<ApiResponse<Room>> {
  return apiFetch<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiApproveRoom(id: string): Promise<ApiResponse> {
  return apiFetch(`/api/rooms/${id}/approve`, { method: 'POST' });
}

export async function apiRejectRoom(id: string, remark: string): Promise<ApiResponse> {
  return apiFetch(`/api/rooms/${id}/reject`, { method: 'POST', body: JSON.stringify({ remark }) });
}

export async function apiRecordPayment(roomId: string, data: {
  paymentMonth: number; paymentYear: number; rentAmount: number;
  advanceAmount?: number; paymentDate: string; remark?: string;
}): Promise<ApiResponse> {
  return apiFetch(`/api/rooms/${roomId}/payments`, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiRequestClosure(roomId: string, data: {
  closureDate: string; reason: string; remark?: string;
}): Promise<ApiResponse> {
  return apiFetch(`/api/rooms/${roomId}/closure`, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiGetRentReport(report: string, params?: Record<string, string>): Promise<ApiResponse> {
  const qs = new URLSearchParams(params ?? {});
  return apiFetch(`/api/reports/rent/${report}?${qs.toString()}`);
}

export async function apiApproveClosure(roomId: string, closureId: string, reviewRemark?: string): Promise<ApiResponse> {
  return apiFetch(`/api/rooms/${roomId}/closure/${closureId}/approve`, { method: 'POST', body: JSON.stringify({ reviewRemark }) });
}

export async function apiRejectClosure(roomId: string, closureId: string, reviewRemark: string): Promise<ApiResponse> {
  return apiFetch(`/api/rooms/${roomId}/closure/${closureId}/reject`, { method: 'POST', body: JSON.stringify({ reviewRemark }) });
}

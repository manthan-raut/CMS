import { apiFetch } from '@/lib/api';
import { ApiResponse } from '@/types';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
  updateRemark: string | null;
  assignedToId: string;
  assignedTo: { id: string; name: string; email: string; role: string; employeeId: string };
  assignedById: string;
  assignedBy: { id: string; name: string; email: string; role: string; employeeId: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assignedToId: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string | null;
}

export interface UpdateTaskStatusPayload {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  updateRemark?: string;
}

export async function apiListTasks(params?: { assignedToId?: string; status?: string }): Promise<ApiResponse<Task[]>> {
  const qs = new URLSearchParams();
  if (params?.assignedToId) qs.set('assignedToId', params.assignedToId);
  if (params?.status) qs.set('status', params.status);
  
  const query = qs.toString();
  return apiFetch<Task[]>(`/api/tasks${query ? '?' + query : ''}`);
}

export async function apiGetTask(id: string): Promise<ApiResponse<Task>> {
  return apiFetch<Task>(`/api/tasks/${id}`);
}

export async function apiCreateTask(data: CreateTaskPayload): Promise<ApiResponse<Task>> {
  return apiFetch<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateTaskStatus(id: string, data: UpdateTaskStatusPayload): Promise<ApiResponse<Task>> {
  return apiFetch<Task>(`/api/tasks/${id}/update`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteTask(id: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

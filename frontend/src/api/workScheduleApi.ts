import { apiClient } from './client';
import type {
  WorkSchedule,
  WorkScheduleListResponse,
  WorkSchedulePayload,
  WorkScheduleQuery,
  WorkScheduleStatsResponse,
  WorkScheduleStatus,
} from '../types/workSchedule';

function buildParams(query: WorkScheduleQuery = {}) {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.status) params.set('status', query.status);
  if (query.field) params.set('field', query.field);
  if (query.executorId) params.set('executorId', query.executorId);
  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  return params;
}

export async function getWorkSchedules(query: WorkScheduleQuery = {}) {
  const params = buildParams(query);
  const response = await apiClient.get<WorkScheduleListResponse>(`/work-schedules?${params.toString()}`);
  return response.data;
}

export async function getWorkSchedule(id: string) {
  const response = await apiClient.get<WorkSchedule>(`/work-schedules/${id}`);
  return response.data;
}

export async function createWorkSchedule(payload: WorkSchedulePayload) {
  const response = await apiClient.post<WorkSchedule>('/work-schedules', payload);
  return response.data;
}

export async function updateWorkSchedule(id: string, payload: WorkSchedulePayload) {
  const response = await apiClient.patch<WorkSchedule>(`/work-schedules/${id}`, payload);
  return response.data;
}

export async function updateWorkScheduleStatus(id: string, payload: { status: WorkScheduleStatus; cancelReason?: string }) {
  const response = await apiClient.patch<WorkSchedule>(`/work-schedules/${id}/status`, payload);
  return response.data;
}

export async function uploadWorkScheduleFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<{ path: string }>('/work-schedules/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function deleteWorkSchedule(id: string) {
  const response = await apiClient.delete<{ success: boolean }>(`/work-schedules/${id}`);
  return response.data;
}

export async function getWorkScheduleAttachmentUrl(id: string) {
  const response = await apiClient.get<{ url: string }>(`/work-schedules/${id}/attachment`);
  return response.data.url;
}

export async function getWorkScheduleStats(query: Pick<WorkScheduleQuery, 'from' | 'to'> = {}) {
  const params = buildParams(query);
  const response = await apiClient.get<WorkScheduleStatsResponse>(`/work-schedules/stats?${params.toString()}`);
  return response.data;
}

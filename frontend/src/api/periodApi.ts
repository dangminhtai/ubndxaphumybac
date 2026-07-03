import { apiClient } from './client';
import type { ReportPeriod } from '../types/report';

export interface PeriodPayload {
  type: 'weekly' | 'monthly';
  title?: string;
  weekNumber?: number;
  month?: number;
  year: number;
  startDate: string;
  dueDate: string;
  status?: 'draft' | 'open';
}

export async function getPeriods(type?: 'weekly' | 'monthly') {
  const response = await apiClient.get<ReportPeriod[]>('/periods', { params: { type } });
  return response.data;
}

export async function getCurrentPeriod(type: 'weekly' | 'monthly') {
  const response = await apiClient.get<ReportPeriod | null>('/periods/current', { params: { type } });
  return response.data;
}

export async function createPeriod(payload: PeriodPayload) {
  const response = await apiClient.post<ReportPeriod>('/periods', payload);
  return response.data;
}

export async function openPeriod(id: string) {
  const response = await apiClient.patch<ReportPeriod>(`/periods/${id}/open`);
  return response.data;
}

export async function lockPeriod(id: string) {
  const response = await apiClient.patch<ReportPeriod>(`/periods/${id}/lock`);
  return response.data;
}

export async function archivePeriod(id: string) {
  const response = await apiClient.patch<ReportPeriod>(`/periods/${id}/archive`);
  return response.data;
}

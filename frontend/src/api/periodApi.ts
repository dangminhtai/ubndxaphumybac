import { apiClient } from './client';
import type { ReportPeriod } from '../types/report';

export async function getPeriods(type?: 'weekly' | 'monthly') {
  const response = await apiClient.get<ReportPeriod[]>('/periods', { params: { type } });
  return response.data;
}

export async function getCurrentPeriod(type: 'weekly' | 'monthly') {
  const response = await apiClient.get<ReportPeriod | null>('/periods/current', { params: { type } });
  return response.data;
}

export async function updatePeriodDueDate(id: string, dueDate: string) {
  const response = await apiClient.patch<ReportPeriod>(`/periods/${id}/due-date`, { dueDate });
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

import { apiClient } from './client';
import type { Report } from '../types/report';

export async function getRecentReports() {
  const response = await apiClient.get<Report[]>('/reports');
  return response.data;
}

export async function seedReports() {
  const response = await apiClient.post<{ message: string }>('/reports/seed');
  return response.data;
}

import { apiClient } from './client';

export interface MonthlySummary {
  _id: string;
  periodId: string;
  periodTitle: string;
  content: string;
  difficulties: string;
  proposals: string;
  nextTasks: string;
  status: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  employeeReports?: any[];
  totalStaffUsers?: number;
}

export async function getMonthlySummary(periodId: string) {
  const response = await apiClient.get<MonthlySummary>(`/monthly-summaries/${periodId}`);
  return response.data;
}

export async function generateMonthlySummary(periodId: string) {
  const response = await apiClient.post<MonthlySummary>(`/monthly-summaries/${periodId}/generate`);
  return response.data;
}

export async function updateMonthlySummary(periodId: string, payload: Partial<MonthlySummary>) {
  const response = await apiClient.patch<MonthlySummary>(`/monthly-summaries/${periodId}`, payload);
  return response.data;
}

export async function exportMonthlySummaryDocx(periodId: string) {
  const response = await apiClient.post<Blob>(`/monthly-summaries/${periodId}/export-docx`, undefined, {
    responseType: 'blob',
  });
  return response.data;
}

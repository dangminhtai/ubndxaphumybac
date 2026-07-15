import { apiClient } from './client';
import type { ReportPeriod } from '../types/report';

export interface WeeklySummary {
  _id?: string;
  periodId: string;
  periodTitle: string;
  content: string;
  difficulties: string;
  proposals: string;
  nextTasks: string;
  status: 'draft' | 'published' | 'archived';
}

export interface WeeklyEmployeeReport {
  _id: string;
  sender: string;
  department: string;
  field?: string;
  status: string;
  content: string;
  difficulties?: string;
  proposals?: string;
  nextTasks?: string;
  submittedAt?: string;
  isLate: boolean;
}

export interface MissingEmployee {
  _id: string;
  fullName: string;
  department: string;
}

export interface WeeklySummaryResponse {
  summary: WeeklySummary;
  period: ReportPeriod;
  employeeReports: WeeklyEmployeeReport[];
  missingEmployees: MissingEmployee[];
  submissionStats: {
    expected: number;
    submitted: number;
    missing: number;
    late: number;
    duplicateReports: number;
  };
}

export async function getWeeklySummary(periodId: string) {
  const response = await apiClient.get<WeeklySummaryResponse>(`/weekly-summaries/${periodId}`);
  return response.data;
}

export async function generateWeeklySummary(periodId: string) {
  const response = await apiClient.post<WeeklySummaryResponse>(`/weekly-summaries/${periodId}/generate`);
  return response.data;
}

export async function updateWeeklySummary(periodId: string, payload: Partial<WeeklySummary>) {
  const response = await apiClient.patch<WeeklySummaryResponse>(`/weekly-summaries/${periodId}`, payload);
  return response.data;
}

export async function exportWeeklySummaryDocx(periodId: string) {
  const response = await apiClient.post<Blob>(`/weekly-summaries/${periodId}/export-docx`, undefined, {
    responseType: 'blob',
  });
  return response.data;
}

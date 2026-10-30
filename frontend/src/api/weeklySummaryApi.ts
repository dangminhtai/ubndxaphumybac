import { apiClient } from './client';
import type { ReportPeriod } from '../types/report';

export interface WeeklySummary {
  sourceReportIds?: string[];
  entries?: SummaryEntry[];
  _id?: string;
  periodId: string;
  periodTitle: string;
  status: 'draft' | 'published' | 'archived';
}

export interface SummaryEntry {
  contentFormat?: 'html-v1';
  id: string;
  sourceReportId?: string;
  groupId: string | null;
  section: 'results' | 'nextTasks';
  text: string;
}

export interface SummaryGroup { id: string; title: string }

export interface WeeklyEmployeeReport {
  contentFormat?: 'html-v1';
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
  autoFilled?: boolean;
  sourceIssues?: Array<{ reportId: string; code: string; fieldCode?: string }>;
  fieldCoverage?: { expected: number; submitted: number };
  groups: SummaryGroup[];
  nextPeriodTitle: string;
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
    timeout: 120_000,
  });
  return response.data;
}

export async function exportWeeklySummaryPdf(periodId: string) {
  const response = await apiClient.post<Blob>(`/weekly-summaries/${periodId}/export-pdf`, undefined, {
    responseType: 'blob',
    timeout: 120_000,
  });
  return response.data;
}

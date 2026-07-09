import { apiClient } from './client';
import type { Report, WeeklyCurrentResponse, WeeklyReportPayload } from '../types/report';

export async function getRecentReports() {
  const response = await apiClient.get<Report[]>('/reports/recent');
  return response.data;
}

export async function getReports() {
  const response = await apiClient.get<Report[]>('/reports');
  return response.data;
}

export async function createWeeklyReport(payload: WeeklyReportPayload) {
  const response = await apiClient.post<Report>('/reports/weekly', payload);
  return response.data;
}

export async function getCurrentWeeklyReport(periodId?: string) {
  const response = await apiClient.get<WeeklyCurrentResponse>('/reports/weekly/current', { params: { periodId } });
  return response.data;
}

export async function submitWeeklyReport(reportId: string) {
  const response = await apiClient.post<Report>(`/reports/${reportId}/submit`);
  return response.data;
}

export async function exportWeeklyReportDocx(payload: WeeklyReportPayload) {
  const response = await apiClient.post<Blob>('/reports/weekly/export-docx', payload, {
    responseType: 'blob',
  });
  return response.data;
}

export async function exportWeeklyReportDocxById(reportId: string) {
  const response = await apiClient.post<Blob>(`/reports/${reportId}/export-docx`, undefined, {
    responseType: 'blob',
  });
  return response.data;
}

export async function createMonthlyStaffReport(payload: any) {
  const response = await apiClient.post<Report>('/reports/monthly-staff', payload);
  return response.data;
}

export async function getMonthlyStaffCurrent(periodId?: string) {
  const response = await apiClient.get<WeeklyCurrentResponse>('/reports/monthly-staff/current', { params: { periodId } });
  return response.data;
}

export async function submitMonthlyStaffReport(id: string) {
  const response = await apiClient.post<Report>(`/reports/${id}/submit-monthly`);
  return response.data;
}

export async function returnReport(id: string, reason: string) {
  const response = await apiClient.post<Report>(`/reports/${id}/return`, { reason });
  return response.data;
}

export async function recallReport(id: string) {
  const response = await apiClient.post<Report>(`/reports/${id}/recall`);
  return response.data;
}

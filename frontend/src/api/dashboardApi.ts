import { apiClient } from './client';

export interface DashboardOverview {
  totalReports: number;
  pendingReports: number;
  approvedReports: number;
  weeklySubmitted: number;
}

export interface SubmissionProgress {
  department: string;
  submitted: number;
  total: number;
  status: string;
}

export async function getDashboardOverview() {
  const response = await apiClient.get<DashboardOverview>('/dashboard/overview');
  return response.data;
}

export async function getSubmissionProgress() {
  const response = await apiClient.get<SubmissionProgress[]>('/dashboard/submission-progress');
  return response.data;
}

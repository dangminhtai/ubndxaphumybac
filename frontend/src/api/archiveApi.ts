import { apiClient } from './client';

export interface ArchivedReport {
  _id: string;
  title: string;
  reportType: string;
  periodId: string;
  periodInfo?: {
    _id: string;
    title: string;
    type: string;
    year: number;
    month?: number;
    weekNumber?: number;
  };
  sender: string;
  department: string;
  status: string;
  submittedAt: string;
}

export interface ArchiveResponse {
  data: ArchivedReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ArchiveQuery {
  page?: number;
  limit?: number;
  year?: number;
  month?: number;
  weekNumber?: number;
  reportType?: string;
  sender?: string;
}

export async function getArchivedReports(query: ArchiveQuery = {}): Promise<ArchiveResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.year) params.set('year', String(query.year));
  if (query.month) params.set('month', String(query.month));
  if (query.weekNumber) params.set('weekNumber', String(query.weekNumber));
  if (query.reportType) params.set('reportType', query.reportType);
  if (query.sender) params.set('sender', query.sender);

  const res = await apiClient.get<ArchiveResponse>(`/archive/reports?${params.toString()}`);
  return res.data;
}

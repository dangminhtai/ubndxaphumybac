import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  category: string;
  userId?: string;
  username?: string;
  fullName?: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.category) params.set('category', query.category);
  if (query.action) params.set('action', query.action);
  if (query.userId) params.set('userId', query.userId);
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);

  const res = await axios.get<AuditLogResponse>(`${API}/admin/logs?${params.toString()}`, {
    headers: authHeaders(),
  });
  return res.data;
}

import { apiClient } from './client';

/* ── Types ── */

export interface RegistrationStatus {
  isOpen: boolean;
  isWeekend: boolean;
  earlyOpened: boolean;
  canOpenEarly: boolean;
  dayName: string;
  dayOfWeek: number;
  targetWeekStart: string;
  weekLabel: string;
  currentWeekStart?: string;
  currentWeekLabel?: string;
}

export interface WeeklyTaskUser {
  _id: string;
  fullName: string;
  username: string;
  department: string;
  position?: string;
}

export interface WeeklyTaskData {
  _id: string;
  userId: WeeklyTaskUser | string;
  targetWeekStart: string;
  weekLabel: string;
  content: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  isRegistered?: boolean;
}

export interface MyTaskResponse {
  task: WeeklyTaskData | null;
  weekLabel: string;
  targetWeekStart: string;
}

export interface TaskListResponse {
  tasks: WeeklyTaskData[];
  weekLabel: string;
  targetWeekStart: string;
  totalStaff: number;
  registeredCount: number;
}

export interface WeekOption {
  targetWeekStart: string;
  weekLabel: string;
  taskCount: number;
}

/* ── API calls ── */

export async function getRegistrationStatus() {
  const res = await apiClient.get<RegistrationStatus>('/weekly-tasks/status');
  return res.data;
}

export async function openRegistrationEarly() {
  const res = await apiClient.post<{ success: boolean; weekLabel: string }>('/weekly-tasks/open-early');
  return res.data;
}

export async function closeRegistrationEarly() {
  const res = await apiClient.post<{ success: boolean; weekLabel: string }>('/weekly-tasks/close-early');
  return res.data;
}

export async function getMyWeeklyTask(targetWeekStart?: string) {
  const res = await apiClient.get<MyTaskResponse>('/weekly-tasks/mine', {
    params: targetWeekStart ? { targetWeekStart } : undefined,
  });
  return res.data;
}

export async function getWeeklyTasks(targetWeekStart?: string) {
  const res = await apiClient.get<TaskListResponse>('/weekly-tasks', {
    params: targetWeekStart ? { targetWeekStart } : undefined,
  });
  return res.data;
}

export async function upsertWeeklyTask(input: {
  content: string;
  deadline?: string;
  targetWeekStart?: string;
}) {
  const res = await apiClient.post<WeeklyTaskData>('/weekly-tasks', input);
  return res.data;
}

export async function deleteWeeklyTask(taskId: string) {
  const res = await apiClient.delete<{ success: boolean }>(`/weekly-tasks/${taskId}`);
  return res.data;
}

export async function getAvailableWeeks() {
  const res = await apiClient.get<WeekOption[]>('/weekly-tasks/weeks');
  return res.data;
}

export async function exportWeeklyTasksExcel(targetWeekStart?: string) {
  const res = await apiClient.get('/weekly-tasks/export', {
    params: targetWeekStart ? { targetWeekStart } : undefined,
    responseType: 'blob',
  });

  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');

  const disposition = res.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  a.download = match ? decodeURIComponent(match[1]) : 'nhiem-vu-tuan.xlsx';
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

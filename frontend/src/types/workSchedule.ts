export type WorkSchedulePriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkScheduleStatus = 'not_started' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';

export interface WorkScheduleUser {
  _id: string;
  username: string;
  fullName: string;
  department?: string;
  position?: string;
}

export interface WorkSchedule {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  field: string;
  priority: WorkSchedulePriority;
  status: WorkScheduleStatus;
  chairPerson?: string;
  executorIds: Array<string | WorkScheduleUser>;
  participantText?: string;
  preparingAgency?: string;
  monitoringOfficer?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  content?: string;
  notes?: string;
  cancelReason?: string;
  completedAt?: string;
  createdBy: string | WorkScheduleUser;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSchedulePayload {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  field: string;
  priority: WorkSchedulePriority;
  status: WorkScheduleStatus;
  chairPerson?: string;
  executorIds?: string[];
  participantText?: string;
  preparingAgency?: string;
  monitoringOfficer?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  content?: string;
  notes?: string;
  cancelReason?: string;
}

export interface WorkScheduleQuery {
  from?: string;
  to?: string;
  status?: WorkScheduleStatus;
  field?: string;
  executorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkScheduleListResponse {
  data: WorkSchedule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkScheduleStatsResponse {
  total: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  completedCount: number;
  completionRate: number;
  byStatus: Array<{ status: WorkScheduleStatus; count: number }>;
  byField: Array<{ field: string; count: number }>;
}

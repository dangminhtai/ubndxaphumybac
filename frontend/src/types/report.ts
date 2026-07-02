export interface Report {
  _id: string;
  title: string;
  ownerId?: string;
  periodId?: string;
  reportType?: string;
  period?: string;
  reportTitle?: string;
  startDate?: string;
  endDate?: string;
  nextPeriod?: string;
  field?: string;
  department: string;
  sender: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | string;
  content?: string;
  administrativeReform?: string;
  digitalTransformation?: string;
  nextTasks?: string;
  difficulties?: string;
  proposals?: string;
  dueDate?: string;
  submittedAt?: string;
}

export interface WeeklyReportPayload {
  periodId?: string;
  period: string;
  reportTitle: string;
  startDate: string;
  endDate: string;
  nextPeriod: string;
  field: string;
  sender: string;
  department: string;
  content: string;
  administrativeReform?: string;
  digitalTransformation?: string;
  nextTasks?: string;
  difficulties?: string;
  proposals?: string;
  dueDate?: string;
  status: 'draft' | 'pending';
}

export interface MonthlyStaffPayload {
  periodId?: string;
  period: string;
  sender: string;
  department: string;
  status: 'draft' | 'pending';
  content: string;
  difficulties?: string;
  proposals?: string;
  nextTasks?: string;
}

export interface ReportPeriod {
  _id: string;
  type: 'weekly' | 'monthly';
  title: string;
  weekNumber?: number;
  month?: number;
  year: number;
  startDate: string;
  dueDate: string;
  status: 'draft' | 'open' | 'locked' | 'archived';
}

export interface WeeklyCurrentResponse {
  period: ReportPeriod;
  report: Report | null;
}

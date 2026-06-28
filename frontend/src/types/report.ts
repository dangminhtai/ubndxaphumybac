export interface Report {
  _id: string;
  title: string;
  department: string;
  sender: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | string;
  content?: string;
  dueDate?: string;
  submittedAt?: string;
}

import { useState } from 'react';
import Modal from '../ui/Modal';
import type { WorkSchedule, WorkScheduleStatus } from '../../types/workSchedule';
import { updateWorkScheduleStatus } from '../../api/workScheduleApi';
import { useNavigate } from 'react-router-dom';
import type { User as CurrentUser } from '../../types/user';

function readUser() {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser) as CurrentUser;
  } catch {
    return null;
  }
}

interface WorkScheduleViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: WorkSchedule | null;
  onStatusChanged?: () => void;
}

const statusMap: Record<WorkScheduleStatus, { label: string; color: string }> = {
  not_started: { label: 'Chưa thực hiện', color: 'bg-surface-variant text-on-surface-variant' },
  in_progress: { label: 'Đang thực hiện', color: 'bg-primary-container text-on-primary-container' },
  completed: { label: 'Đã thực hiện', color: 'bg-success-container text-on-success-container' },
  postponed: { label: 'Tạm hoãn', color: 'bg-warning-container text-on-warning-container' },
  cancelled: { label: 'Hủy bỏ', color: 'bg-error-container text-on-error-container' },
};

export default function WorkScheduleViewModal({ isOpen, onClose, schedule, onStatusChanged }: WorkScheduleViewModalProps) {
  const user = readUser();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  if (!schedule) return null;

  const canEdit = user?.role === 'admin' || user?.role === 'department_lead';

  const handleStatusChange = async (newStatus: WorkScheduleStatus) => {
    if (!canEdit) return;
    setUpdating(true);
    setError('');
    try {
      await updateWorkScheduleStatus(schedule._id, { status: newStatus });
      if (onStatusChanged) onStatusChanged();
      // update local schedule optimistically
      schedule.status = newStatus;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không cập nhật được trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex border-b border-outline-variant/30 py-3 last:border-b-0">
      <div className="w-1/3 sm:w-1/4 font-semibold text-on-surface flex-shrink-0 text-sm">
        {label}:
      </div>
      <div className="w-2/3 sm:w-3/4 text-on-surface-variant text-sm whitespace-pre-wrap">
        {value || <span className="text-outline-variant italic">Không có dữ liệu</span>}
      </div>
    </div>
  );

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCreatorName = (createdBy: any) => {
    if (typeof createdBy === 'object' && createdBy?.fullName) {
      return `${createdBy.fullName}${createdBy.username ? ` (${createdBy.username})` : ''}`;
    }
    return createdBy;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lịch công tác" maxWidth="max-w-3xl">
      <div className="flex flex-col">
        {error && (
          <div className="mb-4 rounded-lg bg-error-container p-3 text-sm text-on-error-container">
            {error}
          </div>
        )}
        
        <div className="flex flex-col border border-outline-variant/30 rounded-lg p-1">
          <InfoRow label="Đơn vị" value="UBND xã Phù Mỹ Bắc - tỉnh Gia Lai" />
          <InfoRow label="Nội dung" value={<span className="font-medium text-on-surface">{schedule.title}</span>} />
          <InfoRow label="Thời gian" value={`${formatDate(schedule.date)}; ${schedule.startTime} - ${schedule.endTime || '23:00'}`} />
          <InfoRow label="Địa điểm" value={schedule.location} />
          <InfoRow label="Chủ trì" value={schedule.chairPerson} />
          <InfoRow label="Thành phần" value={schedule.participantText} />
          <InfoRow label="CQCB nội dung" value={schedule.preparingAgency} />
          <InfoRow label="LDVP/CV theo dõi" value={schedule.monitoringOfficer} />
          <InfoRow label="Người tạo" value={getCreatorName(schedule.createdBy)} />
          <InfoRow label="Đã tạo" value={schedule.createdAt ? formatDateTime(schedule.createdAt) : ''} />
          <InfoRow label="Đã sửa đổi" value={schedule.updatedAt ? formatDateTime(schedule.updatedAt) : ''} />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/30 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-on-surface">Trạng thái:</span>
            {canEdit ? (
              <select
                value={schedule.status}
                onChange={(e) => handleStatusChange(e.target.value as WorkScheduleStatus)}
                disabled={updating}
                className={`text-sm rounded-lg border border-outline-variant px-3 py-1.5 focus:border-primary outline-none bg-surface ${updating ? 'opacity-50' : ''}`}
              >
                {Object.entries(statusMap).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            ) : (
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusMap[schedule.status as WorkScheduleStatus].color}`}>
                {statusMap[schedule.status as WorkScheduleStatus].label}
              </span>
            )}
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/work-schedules/${schedule._id}/edit`);
                }}
                className="flex-1 sm:flex-none rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-container transition-colors text-center"
              >
                Chỉnh sửa
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors text-center"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

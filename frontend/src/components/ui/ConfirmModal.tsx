import type { ReactNode } from 'react';
import Modal from './Modal';
import { Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isLoading = false,
  isDanger = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="text-sm text-on-surface-variant mb-6 whitespace-pre-wrap">
        {message}
      </div>
      
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
            isDanger 
              ? 'bg-error text-on-error hover:bg-error/90' 
              : 'bg-primary text-on-primary hover:bg-primary/90'
          }`}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

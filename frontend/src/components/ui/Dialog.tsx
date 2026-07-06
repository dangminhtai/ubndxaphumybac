import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type DialogType = 'alert' | 'confirm' | 'prompt';

interface DialogProps {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message?: string;
  inputPlaceholder?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export default function Dialog({
  isOpen,
  type,
  title,
  message,
  inputPlaceholder = 'Nhập giá trị...',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDanger = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      if (type === 'prompt') {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'prompt') {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  const Icon = isDanger ? AlertCircle : type === 'confirm' ? Info : CheckCircle2;
  const iconColor = isDanger ? 'text-error' : 'text-primary';
  const confirmBtnColor = isDanger ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-xl bg-white p-6 shadow-level-3">
        <button 
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex gap-4">
          <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
          
          <div className="w-full">
            <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
            {message && <p className="mt-2 text-sm text-on-surface-variant whitespace-pre-wrap">{message}</p>}
            
            {type === 'prompt' && (
              <div className="mt-4">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder={inputPlaceholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirm();
                    if (e.key === 'Escape') onCancel();
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {type !== 'alert' && (
            <button
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${confirmBtnColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

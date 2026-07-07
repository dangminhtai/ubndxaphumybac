import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-2xl', 'max-w-4xl'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 rounded-xl bg-white shadow-level-3 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          {title && <h2 className="text-lg font-semibold text-on-surface">{title}</h2>}
          <button 
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

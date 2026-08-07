import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
  };

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg border ${bgColor[type]} flex items-center gap-3`}>
      <Icon size={20} className={textColor[type]} />
      <span className={textColor[type]}>{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-black/10 rounded">
        <X size={16} />
      </button>
    </div>
  );
}

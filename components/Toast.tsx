import React, { useEffect } from 'react';
import { XCircleIcon } from './icons';

interface ToastProps {
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-50 w-full max-w-sm animate-fade-in-down">
      <div className="bg-red-500 text-white p-4 rounded-lg shadow-2xl flex items-start justify-between">
        <div className="flex items-start">
            <XCircleIcon className="h-6 w-6 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 -mt-1 -mr-1 p-1 rounded-full text-red-200 hover:text-white hover:bg-red-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;

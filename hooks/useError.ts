import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

interface ErrorContextType {
  showError: (message: string) => void;
  errorMessage: string | null;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Fix: Replaced JSX with React.createElement to be compatible with a .ts file extension.
  return React.createElement(ErrorContext.Provider, { value: { showError, errorMessage, clearError } }, children);
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

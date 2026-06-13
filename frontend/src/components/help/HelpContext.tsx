'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface HelpContextValue {
  isOpen: boolean;
  currentPage: string;
  openHelp: (page: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('default');

  const openHelp = useCallback((page: string) => {
    setCurrentPage(page);
    setIsOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <HelpContext.Provider value={{ isOpen, currentPage, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return ctx;
}

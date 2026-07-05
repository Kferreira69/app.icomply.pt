'use client';

import { useHelp } from './HelpContext';

interface HelpButtonProps {
  page: string;
}

export function HelpButton({ page }: HelpButtonProps) {
  const { openHelp } = useHelp();

  return (
    <button
      onClick={() => openHelp(page)}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#1e40af] text-white shadow-lg flex items-center justify-center text-xl font-bold hover:bg-[#1e3a8a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:ring-offset-2"
      aria-label="Abrir ajuda"
      title="Ajuda"
    >
      ?
    </button>
  );
}

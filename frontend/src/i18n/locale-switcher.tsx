'use client';

import { useState, useEffect } from 'react';
import { locales, localeNames, localeFlags, defaultLocale, type Locale } from './config';
import { cn } from '@/lib/utils';

interface LocaleSwitcherProps {
  collapsed?: boolean;
}

export function LocaleSwitcher({ collapsed }: LocaleSwitcherProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = document.cookie
      .split('; ')
      .find(r => r.startsWith('locale='))
      ?.split('=')[1] as Locale | undefined;
    if (stored && locales.includes(stored)) {
      setLocaleState(stored);
    }
  }, []);

  const changeLocale = (next: Locale) => {
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setLocaleState(next);
    setOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title={localeNames[locale]}
        className={cn(
          'flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800',
          'rounded-lg px-3 py-2 text-sm w-full transition-colors',
        )}
      >
        <span className="text-base leading-none flex-shrink-0">{localeFlags[locale]}</span>
        {!collapsed && (
          <span className="truncate">{localeNames[locale]}</span>
        )}
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-20 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden shadow-lg min-w-[140px]">
            {locales.map(l => (
              <button
                key={l}
                onClick={() => changeLocale(l)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left',
                  locale === l
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-200 hover:bg-gray-700',
                )}
              >
                <span>{localeFlags[l]}</span>
                <span>{localeNames[l]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

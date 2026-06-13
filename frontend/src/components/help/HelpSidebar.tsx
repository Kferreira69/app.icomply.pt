'use client';

import { useHelp } from './HelpContext';
import { helpContent } from './helpContent';

export function HelpSidebar() {
  const { isOpen, currentPage, closeHelp } = useHelp();
  const content = helpContent[currentPage] ?? helpContent['default'];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={closeHelp}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <div
        className={[
          'fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col',
          'transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e40af] shrink-0">
          <h2 className="text-white font-semibold text-base truncate">{content.title}</h2>
          <button
            onClick={closeHelp}
            className="text-white/80 hover:text-white transition-colors ml-4 shrink-0"
            aria-label="Fechar ajuda"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">{content.description}</p>

          {/* Sections */}
          {content.sections.map((section, i) => (
            <div key={i} className="space-y-1.5">
              <h3 className="text-sm font-semibold text-gray-900">{section.heading}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{section.text}</p>
            </div>
          ))}

          {/* Tips */}
          {content.tips.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <span aria-hidden="true">💡</span> Dicas
              </h3>
              <ul className="space-y-1.5">
                {content.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-blue-700 leading-relaxed flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" aria-hidden="true" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-3">
          <p className="text-xs text-gray-500 text-center">
            Precisa de mais ajuda?{' '}
            <a
              href="mailto:suporte@icomply.pt"
              className="text-[#1e40af] hover:underline"
            >
              suporte@icomply.pt
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

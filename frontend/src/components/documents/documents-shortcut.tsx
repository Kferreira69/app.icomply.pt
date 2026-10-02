import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';

/**
 * Shortcut from a standard's module page to its controlled documents. Document control is one
 * module for every ISO standard (Gestão Documental); this opens it already filtered by the standard.
 */
export function DocumentsShortcut({ standard, label }: { standard: string; label: string }) {
  return (
    <Link
      href={`/quality/documents?standard=${standard}`}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
    >
      <span className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="font-medium text-gray-900">Documentos {label}</span>
        <span className="block text-xs text-gray-500">Manual, procedimentos, instruções e registos, com versões e aprovação</span>
      </span>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
    </Link>
  );
}

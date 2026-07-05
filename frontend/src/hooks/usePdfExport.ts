import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '@/store/auth-store';

function today(): string {
  return '2026-06-18';
}

function makeHeader(doc: jsPDF, title: string, orgName: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Left: bold "iComply" + org name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('iComply', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(orgName, 14, 20);

  // Center: report title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 14, { align: 'center' });

  // Right: generated date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em: ${today()}`, pageWidth - 14, 14, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Horizontal separator
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 24, pageWidth - 14, 24);

  return 30; // y position after header
}

export function usePdfExport() {
  const orgName = useAuthStore(s => s.user?.organization?.name ?? 'iComply');

  function exportAudits(audits: any[]): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    makeHeader(doc, 'Relatório de Auditorias', orgName);

    autoTable(doc, {
      startY: 30,
      head: [['Referência', 'Título', 'Tipo', 'Estado', 'Auditor Líder', 'Data', 'Pontuação']],
      body: audits.map((a: any) => [
        a.reference ?? a.id?.slice(0, 8) ?? '—',
        a.title ?? '—',
        a.type ?? '—',
        a.status ?? '—',
        a.leadAuditor ?? '—',
        a.startDate ? a.startDate.slice(0, 10) : '—',
        a.score ?? a.overallScore ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`icomply-auditorias-${today()}.pdf`);
  }

  function exportRisks(risks: any[]): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    makeHeader(doc, 'Relatório de Riscos', orgName);

    autoTable(doc, {
      startY: 30,
      head: [['ID', 'Título', 'Categoria', 'Probabilidade', 'Impacto', 'Score', 'Estado', 'Responsável']],
      body: risks.map((r: any) => [
        r.id?.slice(0, 8) ?? '—',
        r.title ?? '—',
        r.category ?? '—',
        r.likelihood ?? '—',
        r.impact ?? '—',
        r.inherentScore ?? '—',
        r.status ?? '—',
        r.owner ?? r.treatmentOwner ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
    });

    doc.save(`icomply-riscos-${today()}.pdf`);
  }

  function exportCapas(capas: any[]): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    makeHeader(doc, 'Relatório de CAPA', orgName);

    autoTable(doc, {
      startY: 30,
      head: [['Ref.', 'Título', 'Tipo', 'Prioridade', 'Estado', 'Responsável', 'Prazo']],
      body: capas.map((c: any) => [
        c.reference ?? c.id?.slice(0, 8) ?? '—',
        c.title ?? '—',
        c.type ?? '—',
        c.priority ?? '—',
        c.status ?? '—',
        c.assignee
          ? `${c.assignee.firstName ?? ''} ${c.assignee.lastName ?? ''}`.trim()
          : '—',
        c.dueDate ? c.dueDate.slice(0, 10) : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`icomply-capa-${today()}.pdf`);
  }

  return { exportAudits, exportRisks, exportCapas };
}

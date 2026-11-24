import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { CalendarEventPayload, HomesteadRecord } from '../types/homestead';

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatIcsDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const cleanTime = (timeStr || '09:00').replace(':', '').padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

function formatIcsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function foldIcsLine(line: string): string {
  const bytes: string[] = [];
  let current = line;
  while (current.length > 72) {
    bytes.push(current.slice(0, 72));
    current = ' ' + current.slice(72);
  }
  bytes.push(current);
  return bytes.join('\r\n');
}

export function buildIcsContent(events: HomesteadRecord<CalendarEventPayload>[]): string {
  const nowStamp = formatIcsStamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hof und Garten//Mellenbach-Glasbach//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Hof & Garten (Mellenbach-Glasbach)',
    'X-WR-TIMEZONE:Europe/Berlin',
  ];

  for (const ev of events) {
    const p = ev.payload;
    const dtStart = formatIcsDateTime(p.date, p.startTime || '09:00');
    const dtEnd = formatIcsDateTime(p.date, p.endTime || '10:00');
    const summary = `[${p.assignee}] ${ev.title}`;
    const descParts = [
      p.description || '',
      p.category ? `Kategorie: ${p.category}` : '',
      p.areaName ? `Bereich: ${p.areaName}` : '',
      p.notes ? `Notizen: ${p.notes}` : '',
    ].filter(Boolean);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@hof-und-garten.mellenbach`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;TZID=Europe/Berlin:${dtStart}`);
    lines.push(`DTEND;TZID=Europe/Berlin:${dtEnd}`);
    lines.push(foldIcsLine(`SUMMARY:${escapeIcsText(summary)}`));
    if (descParts.length > 0) {
      lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`));
    }
    if (p.areaName) {
      lines.push(foldIcsLine(`LOCATION:${escapeIcsText(p.areaName + ', Mellenbach-Glasbach')}`));
    }
    lines.push(`CATEGORIES:${escapeIcsText(p.category || 'Hof')}`);
    if (p.recurrence && p.recurrence !== 'none') {
      const freqMap: Record<string, string> = {
        daily: 'DAILY',
        weekly: 'WEEKLY',
        monthly: 'MONTHLY',
        yearly: 'YEARLY',
      };
      if (freqMap[p.recurrence]) {
        lines.push(`RRULE:FREQ=${freqMap[p.recurrence]}`);
      }
    }
    if (p.reminderMinutes && p.reminderMinutes > 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(ev.title)}`));
      lines.push(`TRIGGER:-PT${Math.round(p.reminderMinutes)}M`);
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function downloadIcsFile(events: HomesteadRecord<CalendarEventPayload>[], filename: string): void {
  const content = buildIcsContent(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.ics') ? filename : `${filename}.ics`);
}

export function exportCsv(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const escapeCsv = (val: unknown) => {
    const str = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csvLines = [
    headers.map(escapeCsv).join(';'),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(';')),
  ];
  // UTF-8 BOM for clean German umlaut handling in Excel
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportExcelWorkbook(
  sheets: Array<{ name: string; rows: Record<string, unknown>[] }>,
  filename: string
): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const safeRows = sheet.rows.length > 0 ? sheet.rows : [{ Hinweis: 'Keine Einträge vorhanden' }];
    const ws = XLSX.utils.json_to_sheet(safeRows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportSummaryPdf(
  title: string,
  subtitle: string,
  sections: Array<{ heading: string; lines: string[] }>,
  filename: string
): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 18;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text(title, 15, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(90, 90, 90);
  pdf.text(subtitle, 15, y);
  pdf.setTextColor(20, 20, 20);
  y += 8;

  for (const sec of sections) {
    if (y > 268) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(sec.heading, 15, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    for (const line of sec.lines) {
      const wrapped = pdf.splitTextToSize(line, 180) as string[];
      for (const w of wrapped) {
        if (y > 278) {
          pdf.addPage();
          y = 18;
        }
        pdf.text(w, 15, y);
        y += 5;
      }
    }
    y += 4;
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export function exportJsonBackup(data: Record<string, unknown>, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

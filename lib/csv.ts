/**
 * A list as a CSV file, for a spreadsheet. UTF-8 with a byte-order mark, so
 * Excel opens Dari and Pashto as letters rather than as noise; every value
 * quoted, so a comma in a name never shifts a column; and a leading = + - @
 * neutralised, so a name cannot run as a formula in the operator's Excel.
 */

export interface CsvColumn<T> {
  header: string;
  value(row: T): string | number | null | undefined;
}

function cell(raw: string | number | null | undefined): string {
  let text = raw === null || raw === undefined ? '' : String(raw);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((column) => cell(column.header)).join(',')];
  for (const row of rows) lines.push(columns.map((column) => cell(column.value(row))).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 2026-10-13, for file names. */
export function stamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

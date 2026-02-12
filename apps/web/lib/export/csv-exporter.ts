import { jsonToCSV } from 'react-papaparse';

/**
 * Formats ISO date string to Czech date format (dd.MM.yyyy)
 * @param date ISO date string
 * @returns Formatted date string
 */
export function formatCSVDate(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Downloads data as CSV file with Czech diacritic support (BOM prefix)
 * @param data Array of objects to export
 * @param filename Filename for the download (without .csv extension)
 */
export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Convert JSON to CSV
  const csv = jsonToCSV(data);

  // Add BOM prefix for Excel Czech diacritic support
  const csvWithBOM = '\uFEFF' + csv;

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Downloads a Blob as a file
 * @param blob Blob to download
 * @param filename Filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Create object URL
  const url = URL.createObjectURL(blob);

  // Create hidden anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

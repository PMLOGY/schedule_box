import * as XLSX from 'xlsx';

/**
 * Downloads data as XLSX file with proper Czech diacritics support.
 * XLSX uses UTF-8 natively, no BOM needed.
 *
 * @param data Array of objects to export
 * @param filename Filename for the download (without .xlsx extension)
 * @param sheetName Optional sheet name (defaults to 'Data')
 */
export function downloadXLSX(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Data',
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create worksheet from JSON data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns based on content
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLen = Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length));
    return { wch: Math.min(maxLen + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Trigger browser download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

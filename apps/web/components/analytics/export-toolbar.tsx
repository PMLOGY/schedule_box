'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadCSV, downloadBlob, formatCSVDate } from '@/lib/export/csv-exporter';

interface ExportToolbarProps {
  revenueData:
    | Array<{
        date: string;
        revenue: number;
        bookings: number;
      }>
    | undefined;
  bookingData:
    | Array<{
        date: string;
        completed: number;
        cancelled: number;
        noShows: number;
        total: number;
      }>
    | undefined;
  days: number;
  isLoading: boolean;
}

export function ExportToolbar({ revenueData, bookingData, days, isLoading }: ExportToolbarProps) {
  const t = useTranslations('analytics.export');
  const [isExportingRevenuePdf, setIsExportingRevenuePdf] = useState(false);
  const [isExportingBookingsPdf, setIsExportingBookingsPdf] = useState(false);

  const handleRevenueCSV = () => {
    try {
      if (!revenueData || revenueData.length === 0) {
        toast.error(t('error'));
        return;
      }

      // Format data for CSV export with Czech date format
      const csvData = revenueData.map((row) => ({
        Datum: formatCSVDate(row.date),
        'Tržby (CZK)': row.revenue,
        Rezervace: row.bookings,
      }));

      const filename = `revenue-${new Date().toISOString().split('T')[0]}`;
      downloadCSV(csvData, filename);
      toast.success(t('success'));
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error(t('error'));
    }
  };

  const handleBookingsCSV = () => {
    try {
      if (!bookingData || bookingData.length === 0) {
        toast.error(t('error'));
        return;
      }

      // Format data for CSV export with Czech date format
      const csvData = bookingData.map((row) => ({
        Datum: formatCSVDate(row.date),
        Dokončené: row.completed,
        Zrušené: row.cancelled,
        'No-shows': row.noShows,
        Celkem: row.total,
      }));

      const filename = `bookings-${new Date().toISOString().split('T')[0]}`;
      downloadCSV(csvData, filename);
      toast.success(t('success'));
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error(t('error'));
    }
  };

  const handleRevenuePDF = async () => {
    try {
      setIsExportingRevenuePdf(true);

      const response = await fetch(`/api/v1/reports/revenue/pdf?days=${days}`);

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      const filename = `revenue-report-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
      toast.success(t('success'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('error'));
    } finally {
      setIsExportingRevenuePdf(false);
    }
  };

  const handleBookingsPDF = async () => {
    try {
      setIsExportingBookingsPdf(true);

      const response = await fetch(`/api/v1/reports/bookings/pdf?days=${days}`);

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      const filename = `bookings-report-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
      toast.success(t('success'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('error'));
    } finally {
      setIsExportingBookingsPdf(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Revenue CSV Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRevenueCSV}
        disabled={isLoading || !revenueData || revenueData.length === 0}
        aria-label="Export revenue data as CSV file"
      >
        <Download className="mr-2 h-4 w-4" />
        Export Tržeb CSV
      </Button>

      {/* Bookings CSV Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleBookingsCSV}
        disabled={isLoading || !bookingData || bookingData.length === 0}
        aria-label="Export booking data as CSV file"
      >
        <Download className="mr-2 h-4 w-4" />
        Export Rezervací CSV
      </Button>

      {/* Revenue PDF Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRevenuePDF}
        disabled={isLoading || !revenueData || revenueData.length === 0 || isExportingRevenuePdf}
        aria-label="Export revenue report as PDF file"
      >
        <FileText className="mr-2 h-4 w-4" />
        {isExportingRevenuePdf ? t('downloading') : 'Export Tržeb PDF'}
      </Button>

      {/* Bookings PDF Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleBookingsPDF}
        disabled={isLoading || !bookingData || bookingData.length === 0 || isExportingBookingsPdf}
        aria-label="Export booking report as PDF file"
      >
        <FileText className="mr-2 h-4 w-4" />
        {isExportingBookingsPdf ? t('downloading') : 'Export Rezervací PDF'}
      </Button>
    </div>
  );
}

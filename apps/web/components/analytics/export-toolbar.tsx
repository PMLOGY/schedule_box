'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { downloadCSV, downloadBlob, formatCSVDate } from '@/lib/export/csv-exporter';

interface CustomerRetentionData {
  repeatRate: number;
  totalCustomers: number;
  repeatCustomers: number;
  churned: number;
  atRisk: number;
  active: number;
}

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
  customerRetentionData?: CustomerRetentionData | undefined;
  days: number;
  isLoading: boolean;
}

export function ExportToolbar({
  revenueData,
  bookingData,
  customerRetentionData,
  days,
  isLoading,
}: ExportToolbarProps) {
  const t = useTranslations('analytics.export');
  const locale = useLocale();
  const [isExportingRevenuePdf, setIsExportingRevenuePdf] = useState(false);
  const [isExportingBookingsPdf, setIsExportingBookingsPdf] = useState(false);
  const [isExportingCustomerPdf, setIsExportingCustomerPdf] = useState(false);

  const handleRevenueCSV = () => {
    try {
      if (!revenueData || revenueData.length === 0) {
        toast.error(t('error'));
        return;
      }

      const csvData = revenueData.map((row) => ({
        [t('csvColumns.date')]: formatCSVDate(row.date),
        [t('csvColumns.revenue')]: row.revenue,
        [t('csvColumns.bookings')]: row.bookings,
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

      const csvData = bookingData.map((row) => ({
        [t('csvColumns.date')]: formatCSVDate(row.date),
        [t('csvColumns.completed')]: row.completed,
        [t('csvColumns.cancelled')]: row.cancelled,
        [t('csvColumns.noShows')]: row.noShows,
        [t('csvColumns.total')]: row.total,
      }));

      const filename = `bookings-${new Date().toISOString().split('T')[0]}`;
      downloadCSV(csvData, filename);
      toast.success(t('success'));
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error(t('error'));
    }
  };

  const handleCustomerCSV = () => {
    try {
      if (!customerRetentionData) {
        toast.error(t('error'));
        return;
      }

      const metricLabel = locale === 'en' ? 'Metric' : 'Metrika';
      const valueLabel = locale === 'en' ? 'Value' : 'Hodnota';

      const csvData = [
        {
          [metricLabel]: locale === 'en' ? 'Repeat Booking Rate' : 'Mira opakovanosti',
          [valueLabel]: `${(customerRetentionData.repeatRate * 100).toFixed(1)}%`,
        },
        {
          [metricLabel]: locale === 'en' ? 'Total Customers' : 'Celkem zakazniku',
          [valueLabel]: customerRetentionData.totalCustomers,
        },
        {
          [metricLabel]: locale === 'en' ? 'Repeat Customers' : 'Opakujici zakaznici',
          [valueLabel]: customerRetentionData.repeatCustomers,
        },
        {
          [metricLabel]: locale === 'en' ? 'Active' : 'Aktivni',
          [valueLabel]: customerRetentionData.active,
        },
        {
          [metricLabel]: locale === 'en' ? 'At Risk' : 'Ohrozeni',
          [valueLabel]: customerRetentionData.atRisk,
        },
        {
          [metricLabel]: locale === 'en' ? 'Churned' : 'Odchozeni',
          [valueLabel]: customerRetentionData.churned,
        },
      ];

      const filename = `customers-${new Date().toISOString().split('T')[0]}`;
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

      const blob = await apiClient.getBlob('/reports/revenue/pdf', { days, locale });
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

      const blob = await apiClient.getBlob('/reports/bookings/pdf', { days, locale });
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

  const handleCustomerPDF = async () => {
    try {
      setIsExportingCustomerPdf(true);

      const blob = await apiClient.getBlob('/reports/customers/pdf', { days, locale });
      const filename = `customer-report-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
      toast.success(t('success'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('error'));
    } finally {
      setIsExportingCustomerPdf(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRevenueCSV}
        disabled={isLoading || !revenueData || revenueData.length === 0}
      >
        <Download className="mr-2 h-4 w-4" />
        {t('revenueCSV')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleBookingsCSV}
        disabled={isLoading || !bookingData || bookingData.length === 0}
      >
        <Download className="mr-2 h-4 w-4" />
        {t('bookingsCSV')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRevenuePDF}
        disabled={isLoading || !revenueData || revenueData.length === 0 || isExportingRevenuePdf}
      >
        <FileText className="mr-2 h-4 w-4" />
        {isExportingRevenuePdf ? t('downloading') : t('revenuePDF')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleBookingsPDF}
        disabled={isLoading || !bookingData || bookingData.length === 0 || isExportingBookingsPdf}
      >
        <FileText className="mr-2 h-4 w-4" />
        {isExportingBookingsPdf ? t('downloading') : t('bookingsPDF')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCustomerCSV}
        disabled={isLoading || !customerRetentionData}
      >
        <Download className="mr-2 h-4 w-4" />
        {t('customerCSV')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCustomerPDF}
        disabled={isLoading || !customerRetentionData || isExportingCustomerPdf}
      >
        <FileText className="mr-2 h-4 w-4" />
        {isExportingCustomerPdf ? t('downloading') : t('customerPDF')}
      </Button>
    </div>
  );
}

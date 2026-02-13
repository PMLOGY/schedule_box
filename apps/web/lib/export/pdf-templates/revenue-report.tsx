import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getPdfTranslations, formatPdfCurrency, formatPdfDate } from './pdf-config';

interface RevenueReportProps {
  data: Array<{ date: string; revenue: number; bookings: number }>;
  period: string;
  totals: {
    totalRevenue: number;
    totalBookings: number;
    avgRevenue: number;
  };
  locale?: string;
  currency?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  summarySection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: 2,
    borderColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottom: 0.5,
    borderColor: '#ccc',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottom: 0.5,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  colDate: {
    width: '40%',
  },
  colRevenue: {
    width: '30%',
    textAlign: 'right',
  },
  colBookings: {
    width: '30%',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#666',
    borderTop: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export function RevenueReport({
  data,
  period,
  totals,
  locale = 'cs',
  currency = 'CZK',
}: RevenueReportProps) {
  const t = getPdfTranslations(locale);
  const generatedDate = formatPdfDate(new Date().toISOString(), locale);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.revenueTitle}</Text>
          <Text style={styles.subtitle}>
            {t.period}: {period}
          </Text>
          <Text style={styles.subtitle}>
            {t.generated}: {generatedDate}
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t.summary}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.totalRevenue}</Text>
              <Text style={styles.summaryValue}>
                {formatPdfCurrency(totals.totalRevenue, currency, locale)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.bookingCount}</Text>
              <Text style={styles.summaryValue}>{totals.totalBookings}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.avgPerDay}</Text>
              <Text style={styles.summaryValue}>
                {formatPdfCurrency(totals.avgRevenue, currency, locale)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>{t.date}</Text>
            <Text style={styles.colRevenue}>{t.revenue}</Text>
            <Text style={styles.colBookings}>{t.bookings}</Text>
          </View>
          {data.map((row, index) => (
            <View key={row.date} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.colDate}>{formatPdfDate(row.date, locale)}</Text>
              <Text style={styles.colRevenue}>
                {formatPdfCurrency(row.revenue, currency, locale)}
              </Text>
              <Text style={styles.colBookings}>{row.bookings}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>{t.footer}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber} ${t.of} ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}

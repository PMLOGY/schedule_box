import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getPdfTranslations, formatPdfDate } from './pdf-config';

interface BookingReportProps {
  data: Array<{
    date: string;
    completed: number;
    cancelled: number;
    noShows: number;
    total: number;
  }>;
  period: string;
  totals: {
    completed: number;
    cancelled: number;
    noShows: number;
    total: number;
  };
  locale?: string;
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
    width: '25%',
  },
  colCompleted: {
    width: '20%',
    textAlign: 'right',
  },
  colCancelled: {
    width: '20%',
    textAlign: 'right',
  },
  colNoShows: {
    width: '20%',
    textAlign: 'right',
  },
  colTotal: {
    width: '15%',
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

export function BookingReport({ data, period, totals, locale = 'cs' }: BookingReportProps) {
  const t = getPdfTranslations(locale);
  const generatedDate = formatPdfDate(new Date().toISOString(), locale);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.bookingsTitle}</Text>
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
              <Text style={styles.summaryLabel}>{t.completed}</Text>
              <Text style={styles.summaryValue}>{totals.completed}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.cancelled}</Text>
              <Text style={styles.summaryValue}>{totals.cancelled}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.noShows}</Text>
              <Text style={styles.summaryValue}>{totals.noShows}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.total}</Text>
              <Text style={styles.summaryValue}>{totals.total}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>{t.date}</Text>
            <Text style={styles.colCompleted}>{t.completed}</Text>
            <Text style={styles.colCancelled}>{t.cancelled}</Text>
            <Text style={styles.colNoShows}>{t.noShows}</Text>
            <Text style={styles.colTotal}>{t.total}</Text>
          </View>
          {data.map((row, index) => (
            <View key={row.date} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.colDate}>{formatPdfDate(row.date, locale)}</Text>
              <Text style={styles.colCompleted}>{row.completed}</Text>
              <Text style={styles.colCancelled}>{row.cancelled}</Text>
              <Text style={styles.colNoShows}>{row.noShows}</Text>
              <Text style={styles.colTotal}>{row.total}</Text>
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

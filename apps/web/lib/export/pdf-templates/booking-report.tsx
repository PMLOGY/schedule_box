import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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
}

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
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

/**
 * Formats date to Czech format (dd.MM.yyyy)
 */
function formatDate(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function BookingReport({ data, period, totals }: BookingReportProps) {
  const generatedDate = new Date().toLocaleDateString('cs-CZ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ScheduleBox - Report rezervací</Text>
          <Text style={styles.subtitle}>Období: {period}</Text>
          <Text style={styles.subtitle}>Vygenerováno: {generatedDate}</Text>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Souhrn</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Dokončené</Text>
              <Text style={styles.summaryValue}>{totals.completed}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Zrušené</Text>
              <Text style={styles.summaryValue}>{totals.cancelled}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>No-shows</Text>
              <Text style={styles.summaryValue}>{totals.noShows}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Celkem</Text>
              <Text style={styles.summaryValue}>{totals.total}</Text>
            </View>
          </View>
        </View>

        {/* Data Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Datum</Text>
            <Text style={styles.colCompleted}>Dokončené</Text>
            <Text style={styles.colCancelled}>Zrušené</Text>
            <Text style={styles.colNoShows}>No-shows</Text>
            <Text style={styles.colTotal}>Celkem</Text>
          </View>
          {data.map((row, index) => (
            <View key={row.date} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.colDate}>{formatDate(row.date)}</Text>
              <Text style={styles.colCompleted}>{row.completed}</Text>
              <Text style={styles.colCancelled}>{row.cancelled}</Text>
              <Text style={styles.colNoShows}>{row.noShows}</Text>
              <Text style={styles.colTotal}>{row.total}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Vygenerováno automaticky systémem ScheduleBox</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Strana ${pageNumber} z ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}

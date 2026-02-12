import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface RevenueReportProps {
  data: Array<{ date: string; revenue: number; bookings: number }>;
  period: string;
  totals: {
    totalRevenue: number;
    totalBookings: number;
    avgRevenue: number;
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

/**
 * Formats number with Czech locale (space thousands separator, comma decimal)
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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

export function RevenueReport({ data, period, totals }: RevenueReportProps) {
  const generatedDate = new Date().toLocaleDateString('cs-CZ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ScheduleBox - Report tržeb</Text>
          <Text style={styles.subtitle}>Období: {period}</Text>
          <Text style={styles.subtitle}>Vygenerováno: {generatedDate}</Text>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Souhrn</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Celkové tržby</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.totalRevenue)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Počet rezervací</Text>
              <Text style={styles.summaryValue}>{totals.totalBookings}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Průměr na den</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.avgRevenue)}</Text>
            </View>
          </View>
        </View>

        {/* Data Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Datum</Text>
            <Text style={styles.colRevenue}>Tržby (CZK)</Text>
            <Text style={styles.colBookings}>Rezervace</Text>
          </View>
          {data.map((row, index) => (
            <View key={row.date} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.colDate}>{formatDate(row.date)}</Text>
              <Text style={styles.colRevenue}>{formatCurrency(row.revenue)}</Text>
              <Text style={styles.colBookings}>{row.bookings}</Text>
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

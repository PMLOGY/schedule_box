import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getPdfTranslations } from './pdf-config';

interface CustomerReportProps {
  data: {
    repeatRate: number;
    totalCustomers: number;
    repeatCustomers: number;
    churned: number;
    atRisk: number;
    active: number;
    clvDistribution: Array<{ range: string; count: number }>;
  };
  period: string;
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
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
  colRange: {
    width: '50%',
  },
  colCount: {
    width: '50%',
    textAlign: 'right',
  },
  churnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  churnLabel: {
    fontSize: 10,
    color: '#333',
  },
  churnValue: {
    fontSize: 10,
    fontWeight: 'bold',
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

export function CustomerReport({ data, period, locale = 'cs' }: CustomerReportProps) {
  const t = getPdfTranslations(locale);

  const generatedDate = new Date().toLocaleDateString(
    locale === 'cs' ? 'cs-CZ' : locale === 'sk' ? 'sk-SK' : 'en-GB',
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.customersTitle}</Text>
          <Text style={styles.subtitle}>
            {t.period}: {period}
          </Text>
          <Text style={styles.subtitle}>
            {t.generated}: {generatedDate}
          </Text>
        </View>

        {/* Summary: Repeat Booking Rate */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t.summary}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.repeatBookingRate}</Text>
              <Text style={styles.summaryValue}>{(data.repeatRate * 100).toFixed(1)}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.totalCustomers}</Text>
              <Text style={styles.summaryValue}>{data.totalCustomers}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t.repeatCustomers}</Text>
              <Text style={styles.summaryValue}>{data.repeatCustomers}</Text>
            </View>
          </View>
        </View>

        {/* Churn Breakdown */}
        <Text style={styles.sectionTitle}>{t.churnBreakdown}</Text>
        <View style={styles.summarySection}>
          <View style={styles.churnRow}>
            <Text style={styles.churnLabel}>{t.active}</Text>
            <Text style={styles.churnValue}>{data.active}</Text>
          </View>
          <View style={styles.churnRow}>
            <Text style={styles.churnLabel}>{t.atRisk}</Text>
            <Text style={styles.churnValue}>{data.atRisk}</Text>
          </View>
          <View style={styles.churnRow}>
            <Text style={styles.churnLabel}>{t.churned}</Text>
            <Text style={styles.churnValue}>{data.churned}</Text>
          </View>
        </View>

        {/* CLV Distribution Table */}
        <Text style={styles.sectionTitle}>{t.clvDistribution}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colRange}>{t.range} (CZK)</Text>
            <Text style={styles.colCount}>{t.count}</Text>
          </View>
          {data.clvDistribution.map((row, index) => (
            <View key={row.range} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.colRange}>{row.range}</Text>
              <Text style={styles.colCount}>{row.count}</Text>
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

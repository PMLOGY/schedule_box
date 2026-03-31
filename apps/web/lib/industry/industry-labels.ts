/**
 * Industry Label Overrides
 *
 * Per-vertical Czech business logic label overrides.
 * NOT i18n translations — these are domain terminology per vertical
 * (e.g., medical uses "Pacient" instead of "Zákazník").
 *
 * Used by: useIndustryLabels hook, booking forms, dashboard UI
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IndustryLabels {
  /** Entity that books (customer / patient / vehicle) */
  customer: string;
  /** Scheduled appointment / order */
  booking: string;
  /** What is being offered (service / procedure / repair) */
  service: string;
  /** CTA label for creating a new booking */
  newBooking: string;
  /** Search placeholder label */
  customerSearch: string;
  /** Detail panel heading */
  bookingDetail: string;
  /** List page heading */
  serviceList: string;
}

// ============================================================================
// DEFAULT LABELS (generic business)
// ============================================================================

export const DEFAULT_LABELS: IndustryLabels = {
  customer: 'Zákazník',
  booking: 'Rezervace',
  service: 'Služba',
  newBooking: 'Nová rezervace',
  customerSearch: 'Hledat zákazníka',
  bookingDetail: 'Detail rezervace',
  serviceList: 'Seznam služeb',
};

// ============================================================================
// VERTICAL OVERRIDES
// ============================================================================

export const INDUSTRY_LABEL_MAP: Record<string, Partial<IndustryLabels>> = {
  medical_clinic: {
    customer: 'Pacient',
    booking: 'Termín',
    service: 'Vyšetření',
    newBooking: 'Nový termín',
    customerSearch: 'Hledat pacienta',
    bookingDetail: 'Detail termínu',
    serviceList: 'Seznam vyšetření',
  },
  auto_service: {
    customer: 'Vozidlo',
    booking: 'Zakázka',
    service: 'Servis',
    newBooking: 'Nová zakázka',
    customerSearch: 'Hledat vozidlo',
    bookingDetail: 'Detail zakázky',
    serviceList: 'Seznam servisu',
  },
  cleaning_service: {
    customer: 'Klient',
    booking: 'Objednávka',
    service: 'Úklid',
    newBooking: 'Nová objednávka',
    customerSearch: 'Hledat klienta',
    bookingDetail: 'Detail objednávky',
    serviceList: 'Seznam úklidů',
  },
  tutoring: {
    customer: 'Student',
    booking: 'Lekce',
    service: 'Předmět',
    newBooking: 'Nová lekce',
    customerSearch: 'Hledat studenta',
    bookingDetail: 'Detail lekce',
    serviceList: 'Seznam předmětů',
  },
};

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Returns Czech UI labels for the given industry vertical.
 * Falls back to generic defaults for unknown or 'general' industry types.
 */
export function getIndustryLabels(industryType: string): IndustryLabels {
  const overrides = INDUSTRY_LABEL_MAP[industryType] ?? {};
  return { ...DEFAULT_LABELS, ...overrides };
}

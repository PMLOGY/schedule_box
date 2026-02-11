/**
 * Czech QR Payment Client (SPD Format)
 * Implements Short Payment Descriptor standard for Czech/Slovak banking apps
 *
 * SPD Format Spec: https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
 * Compatible with all Czech and Slovak banking apps
 */

import QRCode from 'qrcode';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parameters for SPD string generation
 */
export interface SPDParams {
  iban: string;
  amount: number;
  currency: string;
  variableSymbol: string;
  message: string;
}

/**
 * QR payment generation result
 */
export interface QRPaymentResult {
  spdString: string;
  qrCodeBase64: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate IBAN format for Czech and Slovak IBANs
 * CZ: 24 characters (CZ + 22 digits)
 * SK: 24 characters (SK + 22 digits)
 */
function validateIBAN(iban: string): void {
  const trimmedIban = iban.replace(/\s/g, ''); // Remove spaces

  if (!trimmedIban.startsWith('CZ') && !trimmedIban.startsWith('SK')) {
    throw new Error('IBAN must be Czech (CZ) or Slovak (SK) bank account');
  }

  if (trimmedIban.length !== 24) {
    throw new Error(`Invalid IBAN length. Expected 24 characters, got ${trimmedIban.length}`);
  }

  // Check if all characters after country code are digits
  const accountPart = trimmedIban.slice(2);
  if (!/^\d+$/.test(accountPart)) {
    throw new Error('IBAN must contain only digits after country code');
  }
}

/**
 * Validate variable symbol (max 10 digits)
 */
function validateVariableSymbol(variableSymbol: string): void {
  if (!/^\d{1,10}$/.test(variableSymbol)) {
    throw new Error('Variable symbol must be 1-10 digits');
  }
}

// ============================================================================
// SPD STRING GENERATION
// ============================================================================

/**
 * Generate SPD format string for Czech QR payments
 *
 * Format: SPD*1.0*ACC:{iban}*AM:{amount}*CC:{currency}*X-VS:{variableSymbol}*MSG:{message}
 *
 * @param params - SPD parameters (IBAN, amount, currency, variable symbol, message)
 * @returns SPD format string
 * @throws Error if validation fails
 */
export function generateSPDString(params: SPDParams): string {
  const { iban, amount, currency, variableSymbol, message } = params;

  // Validate inputs
  const cleanIban = iban.replace(/\s/g, ''); // Remove spaces for validation
  validateIBAN(cleanIban);
  validateVariableSymbol(variableSymbol);

  // Format amount to 2 decimal places
  const formattedAmount = amount.toFixed(2);

  // Truncate message to 60 characters (SPD spec limit)
  const truncatedMessage = message.slice(0, 60);

  // Build SPD string
  // Format: SPD*1.0*ACC:{iban}*AM:{amount}*CC:{currency}*X-VS:{variableSymbol}*MSG:{message}
  const spdString = [
    'SPD*1.0',
    `ACC:${cleanIban}`,
    `AM:${formattedAmount}`,
    `CC:${currency}`,
    `X-VS:${variableSymbol}`,
    `MSG:${truncatedMessage}`,
  ].join('*');

  return spdString;
}

// ============================================================================
// QR CODE GENERATION
// ============================================================================

/**
 * Generate Czech QR payment (SPD format QR code)
 *
 * Returns both the SPD string (for display/debugging) and the QR code as base64 PNG data URL.
 *
 * @param params - Payment parameters
 * @returns Object with spdString and qrCodeBase64 (data URL)
 * @throws Error if validation or QR generation fails
 */
export async function generateCzechQRPayment(params: SPDParams): Promise<QRPaymentResult> {
  // Generate SPD string
  const spdString = generateSPDString(params);

  // Generate QR code as base64 data URL
  // Error correction level 'M' (15% recovery) is sufficient for payment data
  // Width 300px is standard for mobile scanning
  const qrCodeBase64 = await QRCode.toDataURL(spdString, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
  });

  return {
    spdString,
    qrCodeBase64,
  };
}

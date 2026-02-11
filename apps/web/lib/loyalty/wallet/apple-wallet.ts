/**
 * Apple Wallet Pass Generation Service
 *
 * Generates .pkpass files for Apple Wallet using passkit-generator.
 * Passes contain loyalty card data: points balance, tier, QR code.
 *
 * Prerequisites:
 * - APPLE_WWDR_CERT_PATH: Path to Apple WWDR (G4) certificate
 * - APPLE_PASS_CERT_PATH: Path to Pass Type ID certificate
 * - APPLE_PASS_KEY_PATH: Path to private key (.pem)
 * - APPLE_PASS_KEY_PASSPHRASE: Private key passphrase (optional)
 * - APPLE_TEAM_ID: Apple Developer Team Identifier
 *
 * @see https://developer.apple.com/documentation/walletpasses
 */

import { readFileSync } from 'fs';
import { eq } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyPrograms, loyaltyTiers, customers } from '@schedulebox/database';
import { ValidationError } from '@schedulebox/shared';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Check if Apple Wallet certificates are configured and read them
 * Throws ConfigurationError with descriptive message if not
 */
function getAppleWalletConfig(): {
  wwdrCert: Buffer;
  signerCert: Buffer;
  signerKey: Buffer;
  signerKeyPassphrase: string;
  teamIdentifier: string;
} {
  const wwdrPath = process.env.APPLE_WWDR_CERT_PATH;
  const certPath = process.env.APPLE_PASS_CERT_PATH;
  const keyPath = process.env.APPLE_PASS_KEY_PATH;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!wwdrPath || !certPath || !keyPath) {
    throw new ConfigurationError(
      'Apple Wallet certificates not configured. Set APPLE_WWDR_CERT_PATH, APPLE_PASS_CERT_PATH, APPLE_PASS_KEY_PATH environment variables.',
    );
  }

  if (!teamId) {
    throw new ConfigurationError(
      'Apple Team ID not configured. Set APPLE_TEAM_ID environment variable.',
    );
  }

  try {
    return {
      wwdrCert: readFileSync(wwdrPath),
      signerCert: readFileSync(certPath),
      signerKey: readFileSync(keyPath),
      signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE ?? '',
      teamIdentifier: teamId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(
      `Failed to read Apple Wallet certificate files: ${message}. Verify APPLE_WWDR_CERT_PATH, APPLE_PASS_CERT_PATH, and APPLE_PASS_KEY_PATH point to valid files.`,
    );
  }
}

// ============================================================================
// CONFIGURATION ERROR
// ============================================================================

/**
 * Custom error class for missing wallet configuration
 * Distinct from ValidationError to allow API routes to return 503
 */
export class ConfigurationError extends Error {
  public readonly statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ============================================================================
// HELPER: HEX TO RGB
// ============================================================================

/**
 * Convert hex color (#RRGGBB) to rgb() string for Apple Wallet
 */
function hexToRgb(hex: string): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) {
    return 'rgb(59, 130, 246)'; // Default ScheduleBox blue
  }
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return 'rgb(59, 130, 246)'; // Default ScheduleBox blue
  }
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// GENERATE APPLE PASS
// ============================================================================

/**
 * Generate an Apple Wallet .pkpass file for a loyalty card
 *
 * Fetches card data from the database, creates a signed .pkpass buffer
 * using passkit-generator with certificate files from environment variables.
 *
 * @param cardId - Internal card ID (SERIAL)
 * @returns Buffer containing the signed .pkpass file
 * @throws ValidationError if card not found
 * @throws ConfigurationError if Apple certificates not configured
 */
export async function generateApplePass(cardId: number): Promise<Buffer> {
  // Step 1: Fetch card data with program, tier, and customer info
  const [card] = await db
    .select({
      id: loyaltyCards.id,
      uuid: loyaltyCards.uuid,
      cardNumber: loyaltyCards.cardNumber,
      pointsBalance: loyaltyCards.pointsBalance,
      stampsBalance: loyaltyCards.stampsBalance,
      programName: loyaltyPrograms.name,
      programId: loyaltyPrograms.id,
      tierName: loyaltyTiers.name,
      tierColor: loyaltyTiers.color,
      customerName: customers.name,
    })
    .from(loyaltyCards)
    .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
    .leftJoin(loyaltyTiers, eq(loyaltyCards.tierId, loyaltyTiers.id))
    .innerJoin(customers, eq(loyaltyCards.customerId, customers.id))
    .where(eq(loyaltyCards.id, cardId))
    .limit(1);

  if (!card) {
    throw new ValidationError('Loyalty card not found');
  }

  // Step 2: Check Apple Wallet configuration
  const config = getAppleWalletConfig();

  // Step 3: Dynamically import passkit-generator (ESM module)
  const { PKPass } = await import('passkit-generator');

  // Step 4: Create pass.json template as buffer
  const passJson = JSON.stringify({
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.schedulebox.loyalty',
    teamIdentifier: config.teamIdentifier,
    organizationName: 'ScheduleBox',
  });

  // Step 5: Determine pass colors based on tier
  const backgroundColor = card.tierColor ? hexToRgb(card.tierColor) : 'rgb(59, 130, 246)';

  // Step 6: Create PKPass with properties via constructor
  // passkit-generator v3 uses constructor props for serialNumber, description, colors
  const pass = new PKPass(
    {
      'pass.json': Buffer.from(passJson),
    },
    {
      wwdr: config.wwdrCert,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase,
    },
    {
      serialNumber: card.cardNumber,
      description: `${card.programName} - Loyalty Card`,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor,
      logoText: card.programName,
    },
  );

  // Step 7: Set pass type (must be set before accessing fields)
  pass.type = 'storeCard';

  // Step 8: Set fields
  // Primary field: Points balance
  pass.primaryFields.push({
    key: 'points',
    label: 'Body',
    value: String(card.pointsBalance ?? 0),
  });

  // Auxiliary field: Tier name
  pass.auxiliaryFields.push({
    key: 'tier',
    label: 'Uroven',
    value: card.tierName ?? 'Zakladni',
  });

  // Back fields: Additional info
  pass.backFields.push({
    key: 'customer',
    label: 'Zakaznik',
    value: card.customerName ?? '',
  });

  pass.backFields.push({
    key: 'cardNumber',
    label: 'Cislo karty',
    value: card.cardNumber,
  });

  // Step 9: Set barcode (QR code with card number)
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: card.cardNumber,
    messageEncoding: 'iso-8859-1',
  });

  // Step 10: Generate and return buffer
  const passBuffer = pass.getAsBuffer();

  return passBuffer;
}

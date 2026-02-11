/**
 * Google Wallet Pass Generation Service
 *
 * Generates Google Wallet save URLs for loyalty cards using JWT-based approach.
 * Uses "skinny JWT" pattern: class and object definitions embedded in JWT claims,
 * avoiding direct REST API calls to Google Wallet API.
 *
 * Prerequisites:
 * - GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH: Path to service account JSON key file
 * - GOOGLE_WALLET_ISSUER_ID: Google Wallet issuer ID from Merchant Center
 *
 * @see https://developers.google.com/wallet/loyalty/web
 */

import { readFileSync } from 'fs';
import { sign } from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyPrograms, loyaltyTiers, customers } from '@schedulebox/database';
import { ValidationError } from '@schedulebox/shared';
import { ConfigurationError } from './apple-wallet';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Service account key file structure (Google Cloud JSON format)
 */
interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Load and validate Google Wallet configuration
 * Throws ConfigurationError with descriptive message if not configured
 */
function getGoogleWalletConfig(): {
  serviceAccountKey: ServiceAccountKey;
  issuerId: string;
} {
  const keyPath = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;

  if (!keyPath) {
    throw new ConfigurationError(
      'Google Wallet service account not configured. Set GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH environment variable to the path of your service account JSON key file.',
    );
  }

  if (!issuerId) {
    throw new ConfigurationError(
      'Google Wallet issuer ID not configured. Set GOOGLE_WALLET_ISSUER_ID environment variable. Obtain it from Google Wallet API Merchant Center.',
    );
  }

  try {
    const keyFileContent = readFileSync(keyPath, 'utf-8');
    const serviceAccountKey = JSON.parse(keyFileContent) as ServiceAccountKey;

    // Validate key structure
    if (!serviceAccountKey.private_key || !serviceAccountKey.client_email) {
      throw new Error('Invalid service account key: missing private_key or client_email');
    }

    return { serviceAccountKey, issuerId };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(
      `Failed to read Google Wallet service account key: ${message}. Verify GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH points to a valid JSON key file.`,
    );
  }
}

// ============================================================================
// GOOGLE WALLET LOYALTY CLASS
// ============================================================================

/**
 * Build Google Wallet LoyaltyClass object for the program
 * Defines the template (appearance) shared by all cards in the program
 */
function buildLoyaltyClass(
  issuerId: string,
  programId: number,
  programName: string,
): Record<string, unknown> {
  return {
    id: `${issuerId}.schedulebox_loyalty_${programId}`,
    issuerName: programName,
    programName: programName,
    reviewStatus: 'UNDER_REVIEW',
    programLogo: {
      sourceUri: {
        uri: 'https://schedulebox.cz/logo-wallet.png',
      },
      contentDescription: {
        defaultValue: {
          language: 'cs',
          value: `${programName} logo`,
        },
      },
    },
    hexBackgroundColor: '#3B82F6',
    // Localized for Czech market
    localizedIssuerName: {
      defaultValue: {
        language: 'cs',
        value: programName,
      },
    },
    localizedProgramName: {
      defaultValue: {
        language: 'cs',
        value: programName,
      },
    },
  };
}

// ============================================================================
// GOOGLE WALLET LOYALTY OBJECT
// ============================================================================

/**
 * Build Google Wallet LoyaltyObject for a specific card
 * Represents the individual loyalty card with points and tier info
 */
function buildLoyaltyObject(
  issuerId: string,
  classId: string,
  card: {
    cardNumber: string;
    pointsBalance: number;
    tierName: string;
    tierColor: string;
    customerName: string;
  },
): Record<string, unknown> {
  return {
    id: `${issuerId}.card_${card.cardNumber.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
    classId,
    state: 'ACTIVE',
    accountId: card.cardNumber,
    accountName: card.tierName,
    loyaltyPoints: {
      label: 'Body',
      balance: {
        int: card.pointsBalance,
      },
    },
    barcode: {
      type: 'QR_CODE',
      value: card.cardNumber,
    },
    // Card holder info
    textModulesData: [
      {
        header: 'Zakaznik',
        body: card.customerName,
        id: 'customer_name',
      },
      {
        header: 'Cislo karty',
        body: card.cardNumber,
        id: 'card_number',
      },
    ],
    hexBackgroundColor: card.tierColor,
  };
}

// ============================================================================
// GENERATE GOOGLE PASS URL
// ============================================================================

/**
 * Generate a Google Wallet save URL for a loyalty card
 *
 * Uses the "skinny JWT" approach: class and object definitions are embedded
 * in the JWT claims, so Google creates them on-the-fly when the user saves.
 * This avoids the need for direct REST API calls to the Google Wallet API.
 *
 * @param cardId - Internal card ID (SERIAL)
 * @returns Save URL: https://pay.google.com/gp/v/save/{jwt}
 * @throws ValidationError if card not found
 * @throws ConfigurationError if Google credentials not configured
 */
export async function generateGooglePassUrl(cardId: number): Promise<string> {
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

  // Step 2: Load Google Wallet configuration
  const { serviceAccountKey, issuerId } = getGoogleWalletConfig();

  // Step 3: Build class and object definitions
  const classId = `${issuerId}.schedulebox_loyalty_${card.programId}`;

  const loyaltyClass = buildLoyaltyClass(issuerId, card.programId, card.programName);

  const loyaltyObject = buildLoyaltyObject(issuerId, classId, {
    cardNumber: card.cardNumber,
    pointsBalance: card.pointsBalance ?? 0,
    tierName: card.tierName ?? 'Zakladni',
    tierColor: card.tierColor ?? '#3B82F6',
    customerName: card.customerName ?? '',
  });

  // Step 4: Create JWT with embedded class and object
  // Google Wallet "skinny JWT" pattern: class and object created on-the-fly
  const claims = {
    iss: serviceAccountKey.client_email,
    aud: 'google',
    origins: ['https://schedulebox.cz'],
    typ: 'savetowallet',
    payload: {
      loyaltyClasses: [loyaltyClass],
      loyaltyObjects: [loyaltyObject],
    },
  };

  // Sign JWT with service account private key (RS256)
  const token = sign(claims, serviceAccountKey.private_key, {
    algorithm: 'RS256',
  });

  // Step 5: Build save URL
  const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

  return saveUrl;
}

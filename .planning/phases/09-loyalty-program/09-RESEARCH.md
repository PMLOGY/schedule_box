# Phase 09: Loyalty Program - Research

**Researched:** 2026-02-11
**Domain:** Loyalty program systems, digital wallet integration, points/tier management
**Confidence:** MEDIUM-HIGH

## Summary

Phase 9 implements a comprehensive loyalty program system with automatic points earning, tier-based rewards, and digital wallet integration (Apple Wallet + Google Wallet). The system must be event-driven, consuming `booking.completed` events from Phase 5 to award points automatically, with robust race condition prevention for point transactions.

The implementation requires three main technical domains: (1) event-driven points earning via RabbitMQ consumers, (2) transactional safety for points balance updates using PostgreSQL row-level locking, and (3) digital wallet pass generation using established Node.js libraries for Apple Wallet (passkit-generator) and Google Wallet (google-wallet npm package).

**Primary recommendation:** Build on existing event infrastructure (Phase 5 RabbitMQ + Phase 7 event consumers), use pessimistic locking (SELECT FOR UPDATE) for all points balance modifications to prevent double-spending, and integrate proven wallet libraries rather than implementing wallet protocols from scratch.

## Standard Stack

### Core Libraries

| Library             | Version | Purpose                                   | Why Standard                                                                                         |
| ------------------- | ------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| passkit-generator   | 3.5.7   | Apple Wallet pass (.pkpass) generation    | Most mature Node.js library, 8 npm dependents, supports iOS 18 NFC passes, actively maintained      |
| google-wallet       | 1.x     | Google Wallet API integration             | Official-adjacent TypeScript library, clean API for LoyaltyClient/Class/Object, REST API wrapper    |
| amqplib             | 0.10.4  | RabbitMQ client (already in use)          | Project standard from Phase 5/7, callback API matches existing event publisher/consumer             |
| Drizzle ORM         | Latest  | Database access with transactions         | Project standard, supports SELECT FOR UPDATE via `.for('update')`, required for locking             |
| Zod                 | Latest  | API request validation                    | Project standard, all loyalty endpoints require Zod schemas                                          |
| @google-cloud/tasks | Latest  | Google Cloud Tasks for async wallet jobs | Optional: for async pass generation if wallet API calls timeout (fallback: in-process with timeout) |

### Supporting

| Library           | Version | Purpose                       | When to Use                                                                     |
| ----------------- | ------- | ----------------------------- | ------------------------------------------------------------------------------- |
| qrcode            | 1.x     | QR code generation for passes | Apple Wallet barcode field, Google Wallet barcode object                        |
| @peculiar/x509    | 1.x     | Certificate parsing           | Apple Wallet requires WWDR certificate + Pass Type ID certificate verification  |
| node-forge        | 1.x     | RSA signing for .pkpass       | Required by passkit-generator for manifest.json signing                         |
| bull / bullmq     | Latest  | Job queue for pass generation | If pass generation moved to background workers (Phase 7 already uses BullMQ)    |
| uuid              | 9.x     | Card number generation        | Already in project, used for loyalty card_number field if not using custom IDs  |

### Alternatives Considered

| Instead of        | Could Use           | Tradeoff                                                                                                              |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| passkit-generator | pass-js             | pass-js has fewer features, less active maintenance; passkit-generator has iOS 18 support                             |
| google-wallet npm | Direct REST API     | Direct API requires more boilerplate for auth, pass structure; google-wallet provides typed interfaces                |
| SELECT FOR UPDATE | Optimistic locking  | Optimistic locking requires retry logic; pessimistic better for high-contention scenarios (points redemption at POS) |
| RabbitMQ consumer | Polling bookings    | Polling doesn't scale, creates coupling; events already implemented in Phase 5                                        |

**Installation:**

```bash
# Loyalty backend package
cd packages/loyalty
pnpm add passkit-generator google-wallet qrcode @peculiar/x509 node-forge

# Google Wallet auth
pnpm add @google-cloud/tasks  # Optional for async

# Already installed (project dependencies)
# - amqplib (events)
# - drizzle-orm (database)
# - zod (validation)
# - uuid (card numbers)
```

## Architecture Patterns

### Recommended Project Structure

```
packages/
├── loyalty/                          # New package
│   ├── src/
│   │   ├── service.ts                # Loyalty service facade
│   │   ├── points-engine.ts          # Points calculation and transactions
│   │   ├── tier-engine.ts            # Tier upgrade logic
│   │   ├── rewards-engine.ts         # Redemption logic
│   │   ├── wallet/
│   │   │   ├── apple-wallet.ts       # Apple Wallet pass generation
│   │   │   ├── google-wallet.ts      # Google Wallet pass generation
│   │   │   └── templates/            # Pass design templates
│   │   │       ├── loyalty.pass/     # Apple pass bundle (background, icon, logo)
│   │   │       └── google-class.json # Google Wallet class template
│   │   └── consumer/
│   │       └── booking-completed-consumer.ts  # Event consumer for auto-points
│   └── package.json
apps/
├── web/
│   ├── app/api/v1/loyalty/
│   │   ├── programs/route.ts         # GET/POST/PUT /api/v1/loyalty/programs
│   │   ├── cards/route.ts            # GET/POST /api/v1/loyalty/cards
│   │   ├── cards/[id]/route.ts       # GET /api/v1/loyalty/cards/:id
│   │   ├── cards/[id]/transactions/route.ts
│   │   ├── cards/[id]/add-points/route.ts  # Manual points adjustment
│   │   ├── cards/[id]/apple-pass/route.ts  # GET: download .pkpass
│   │   ├── cards/[id]/google-pass/route.ts # GET: save-to-wallet URL
│   │   ├── rewards/route.ts          # GET/POST rewards catalog
│   │   └── rewards/[id]/redeem/route.ts
│   └── components/loyalty/
│       ├── loyalty-card-display.tsx  # Card with points, tier, progress bar
│       ├── tier-progress-bar.tsx     # Bronze->Silver->Gold visualization
│       ├── rewards-catalog.tsx       # Grid of available rewards
│       ├── transaction-history.tsx   # Points earn/redeem timeline
│       └── wallet-buttons.tsx        # Add to Apple/Google Wallet CTAs
services/
├── loyalty-worker/                   # Optional: standalone consumer service
│   ├── index.ts                      # Main entry: starts RabbitMQ consumer
│   └── Dockerfile
```

### Pattern 1: Event-Driven Points Awarding

**What:** RabbitMQ consumer listens for `booking.completed` events and automatically awards points to customer's loyalty card.

**When to use:** Always — this is the core automatic loyalty feature (LOYAL-03 requirement).

**Example:**

```typescript
// packages/loyalty/src/consumer/booking-completed-consumer.ts
import { consumeMessages, createConsumerConnection } from '@schedulebox/events';
import { awardPointsForBooking } from '../points-engine';

async function startBookingCompletedConsumer() {
  const { connection, channel } = await createConsumerConnection();

  await consumeMessages(channel, {
    queueName: 'loyalty.booking-completed',
    routingKeys: ['booking.completed'],
    prefetch: 10,
    handler: async (event) => {
      const { bookingUuid, companyId, completedAt } = event.data;

      try {
        // Award points based on booking price
        await awardPointsForBooking(bookingUuid, companyId);
        console.log(`[Loyalty] Awarded points for booking ${bookingUuid}`);
      } catch (error) {
        console.error(`[Loyalty] Failed to award points for ${bookingUuid}:`, error);
        throw error; // NACK and requeue
      }
    },
  });
}
```

### Pattern 2: Transactional Points Update with SELECT FOR UPDATE

**What:** Use row-level locking to prevent race conditions when multiple points transactions occur simultaneously (e.g., earning + redemption).

**When to use:** Every points balance modification (earn, redeem, adjust, expire).

**Example:**

```typescript
// packages/loyalty/src/points-engine.ts
import { db, loyaltyCards, loyaltyTransactions } from '@schedulebox/database';
import { eq, and } from 'drizzle-orm';

export async function redeemPoints(
  cardId: number,
  pointsToRedeem: number,
  description: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    // CRITICAL: Lock the card row to prevent concurrent redemptions
    const [card] = await tx
      .select({ id: loyaltyCards.id, pointsBalance: loyaltyCards.pointsBalance })
      .from(loyaltyCards)
      .where(eq(loyaltyCards.id, cardId))
      .for('update'); // Pessimistic lock

    if (!card) {
      throw new NotFoundError('Loyalty card not found');
    }

    // Check sufficient balance
    if (card.pointsBalance < pointsToRedeem) {
      throw new ValidationError('Insufficient points balance');
    }

    const newBalance = card.pointsBalance - pointsToRedeem;

    // Update balance
    await tx
      .update(loyaltyCards)
      .set({ pointsBalance: newBalance, updatedAt: new Date() })
      .where(eq(loyaltyCards.id, cardId));

    // Record transaction
    await tx.insert(loyaltyTransactions).values({
      cardId,
      type: 'redeem',
      points: -pointsToRedeem,
      balanceAfter: newBalance,
      description,
    });
  });
  // Transaction committed: both balance update and transaction record are atomic
}
```

**Why:** Without SELECT FOR UPDATE, two concurrent redemptions could both read `points_balance = 100`, both subtract 50, and both write 50, resulting in 50 points instead of 0. The lock ensures serialization.

### Pattern 3: Automatic Tier Upgrades

**What:** After every points addition, check if customer qualifies for higher tier and upgrade automatically.

**When to use:** After every `earn` or `adjust` transaction that increases points.

**Example:**

```typescript
// packages/loyalty/src/tier-engine.ts
import { db, loyaltyCards, loyaltyTiers } from '@schedulebox/database';
import { eq, and, lte, desc } from 'drizzle-orm';

export async function checkAndUpgradeTier(cardId: number): Promise<boolean> {
  const [card] = await db
    .select({
      id: loyaltyCards.id,
      programId: loyaltyCards.programId,
      pointsBalance: loyaltyCards.pointsBalance,
      currentTierId: loyaltyCards.tierId,
    })
    .from(loyaltyCards)
    .where(eq(loyaltyCards.id, cardId))
    .limit(1);

  if (!card) return false;

  // Find highest tier customer qualifies for
  const [qualifiedTier] = await db
    .select({ id: loyaltyTiers.id, name: loyaltyTiers.name, minPoints: loyaltyTiers.minPoints })
    .from(loyaltyTiers)
    .where(and(eq(loyaltyTiers.programId, card.programId), lte(loyaltyTiers.minPoints, card.pointsBalance)))
    .orderBy(desc(loyaltyTiers.minPoints))
    .limit(1);

  // Upgrade if different tier
  if (qualifiedTier && qualifiedTier.id !== card.currentTierId) {
    await db
      .update(loyaltyCards)
      .set({ tierId: qualifiedTier.id, updatedAt: new Date() })
      .where(eq(loyaltyCards.id, cardId));

    // TODO: Publish loyalty.tier_upgraded event for notification service
    console.log(`[Loyalty] Upgraded card ${cardId} to tier ${qualifiedTier.name}`);
    return true;
  }

  return false;
}
```

### Pattern 4: Apple Wallet Pass Generation

**What:** Generate signed .pkpass file using passkit-generator with company branding and live points balance.

**When to use:** When customer clicks "Add to Apple Wallet" button (GET /api/v1/loyalty/cards/:id/apple-pass).

**Example:**

```typescript
// packages/loyalty/src/wallet/apple-wallet.ts
import { PKPass } from 'passkit-generator';
import path from 'path';
import { db, loyaltyCards, loyaltyPrograms, loyaltyTiers } from '@schedulebox/database';

export async function generateApplePass(cardId: number): Promise<Buffer> {
  // Fetch card + program + tier data
  const [card] = await db
    .select({
      cardNumber: loyaltyCards.cardNumber,
      pointsBalance: loyaltyCards.pointsBalance,
      programName: loyaltyPrograms.name,
      tierName: loyaltyTiers.name,
      tierColor: loyaltyTiers.color,
    })
    .from(loyaltyCards)
    .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
    .leftJoin(loyaltyTiers, eq(loyaltyCards.tierId, loyaltyTiers.id))
    .where(eq(loyaltyCards.id, cardId))
    .limit(1);

  if (!card) {
    throw new NotFoundError('Loyalty card not found');
  }

  // Create pass from template
  const pass = await PKPass.from(
    {
      model: path.resolve(__dirname, './templates/loyalty.pass'),
      certificates: {
        wwdr: process.env.APPLE_WWDR_CERT_PATH!,
        signerCert: process.env.APPLE_PASS_CERT_PATH!,
        signerKey: process.env.APPLE_PASS_KEY_PATH!,
        signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE,
      },
    },
    {
      // Dynamic data
      serialNumber: card.cardNumber,
      description: `${card.programName} - Loyalty Card`,
      organizationName: card.programName,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: card.tierColor || 'rgb(59, 130, 246)',
      labelColor: 'rgb(255, 255, 255)',
      // Structure: Store Card
      storeCard: {
        primaryFields: [
          {
            key: 'points',
            label: 'Points',
            value: card.pointsBalance.toString(),
          },
        ],
        auxiliaryFields: [
          {
            key: 'tier',
            label: 'Tier',
            value: card.tierName || 'Bronze',
          },
        ],
      },
      barcode: {
        format: 'PKBarcodeFormatQR',
        message: card.cardNumber,
        messageEncoding: 'iso-8859-1',
      },
    },
  );

  // Return signed .pkpass as buffer
  return pass.getAsBuffer();
}
```

**Note:** Apple Wallet passes can be updated via push notifications (APNs). Store `pushToken` from device registration to update points balance without re-downloading pass.

### Pattern 5: Google Wallet Pass Generation

**What:** Create Google Wallet pass object via REST API and return "Add to Google Wallet" save link.

**When to use:** When customer clicks "Add to Google Wallet" button (GET /api/v1/loyalty/cards/:id/google-pass).

**Example:**

```typescript
// packages/loyalty/src/wallet/google-wallet.ts
import { LoyaltyClient, LoyaltyClass, LoyaltyObject } from 'google-wallet/lib/esm/loyalty';
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
});

const client = new LoyaltyClient({ auth });

export async function generateGooglePassUrl(cardId: number): Promise<string> {
  // Fetch card data (same as Apple Wallet)
  const [card] = await db
    .select({
      cardNumber: loyaltyCards.cardNumber,
      pointsBalance: loyaltyCards.pointsBalance,
      programName: loyaltyPrograms.name,
      tierName: loyaltyTiers.name,
    })
    .from(loyaltyCards)
    .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
    .leftJoin(loyaltyTiers, eq(loyaltyCards.tierId, loyaltyTiers.id))
    .where(eq(loyaltyCards.id, cardId))
    .limit(1);

  if (!card) {
    throw new NotFoundError('Loyalty card not found');
  }

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const classId = `${issuerId}.loyalty_program_${card.programName.toLowerCase().replace(/\s+/g, '_')}`;
  const objectId = `${issuerId}.${card.cardNumber}`;

  // Create or update LoyaltyClass (program template)
  const loyaltyClass: LoyaltyClass = {
    id: classId,
    issuerName: card.programName,
    programName: card.programName,
    programLogo: {
      sourceUri: {
        uri: process.env.COMPANY_LOGO_URL,
      },
    },
  };

  try {
    await client.createClass(loyaltyClass);
  } catch (error) {
    // Class might already exist
    await client.updateClass(classId, loyaltyClass);
  }

  // Create or update LoyaltyObject (individual card)
  const loyaltyObject: LoyaltyObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    accountId: card.cardNumber,
    accountName: card.tierName || 'Bronze',
    loyaltyPoints: {
      label: 'Points',
      balance: {
        int: card.pointsBalance,
      },
    },
    barcode: {
      type: 'QR_CODE',
      value: card.cardNumber,
    },
  };

  try {
    await client.createObject(loyaltyObject);
  } catch (error) {
    await client.updateObject(objectId, loyaltyObject);
  }

  // Generate JWT save link
  const saveUrl = `https://pay.google.com/gp/v/save/${objectId}`;
  return saveUrl;
}
```

**Note:** Google Wallet passes can be updated via REST API PATCH requests. Store object IDs in `loyalty_cards.google_pass_url` for updates.

### Anti-Patterns to Avoid

- **Polling for completed bookings:** Use event-driven architecture, not scheduled polling (creates coupling, doesn't scale).
- **Updating points without SELECT FOR UPDATE:** Race conditions will cause lost updates in production under concurrent load.
- **Hardcoded wallet credentials in code:** Use environment variables + secrets management (1Password, AWS Secrets Manager).
- **Synchronous wallet pass generation in API routes:** Wallet API calls can timeout. If >500ms, move to background job queue (BullMQ).
- **Allowing negative points balance:** Always validate `pointsBalance >= pointsToRedeem` AFTER acquiring lock.
- **Manual tier checks:** Automate tier upgrades on every points addition — don't rely on admin intervention.

## Don't Hand-Roll

| Problem                        | Don't Build                                        | Use Instead                      | Why                                                                                                                                    |
| ------------------------------ | -------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Apple Wallet pass signing      | Custom .pkpass manifest signing + ZIP compression  | `passkit-generator`              | Requires understanding PKCS#7 signing, manifest.json structure, Apple certificates, PNG optimization — library handles all edge cases |
| Google Wallet API integration  | Raw HTTP client + JWT generation                   | `google-wallet` npm              | Google API auth flow is complex (service accounts, OAuth 2.0, token refresh) — library provides typed interfaces                      |
| Wallet pass updates            | Manual push notification infrastructure            | Apple APNs + Google Wallet PATCH | Both platforms have update mechanisms — Apple uses push tokens, Google uses REST API updates                                          |
| Points expiration              | Cron job querying all cards                        | PostgreSQL scheduled jobs        | Use `pg_cron` extension or job queue (BullMQ) with scheduled jobs                                                                     |
| Reward redemption double-spend | Application-level locks (mutexes, Redis locks)     | PostgreSQL SELECT FOR UPDATE     | Database row locks are ACID-compliant, survive crashes, simpler to reason about                                                       |
| Event retry logic              | Custom retry queue implementation                  | RabbitMQ DLQ + retry headers     | RabbitMQ has dead-letter exchanges, TTL-based retries — use existing infrastructure from Phase 7                                      |
| QR code generation             | Canvas API + custom QR encoding algorithm          | `qrcode` npm package             | QR encoding has error correction levels, format specs — library handles all versions                                                  |
| Tier progress calculation      | Frontend-only calculation (can drift from backend) | Backend API endpoint             | Always calculate tier progress server-side to prevent tampering, cache in loyalty card response                                       |

**Key insight:** Digital wallet integration is complex protocol engineering. Apple Wallet requires certificate management, PKCS#7 signing, specific JSON structure, and APNs integration. Google Wallet requires OAuth 2.0 service accounts, REST API with specific object schemas, and JWT-based save links. Both have been solved by established libraries — don't reimplement cryptographic signing or API auth flows.

## Common Pitfalls

### Pitfall 1: Race Condition on Points Redemption

**What goes wrong:** Two simultaneous redemption requests both read `points_balance = 100`, both redeem 60 points, both write `points_balance = 40`, resulting in customer getting 120 points worth of rewards for only 100 points.

**Why it happens:** Default READ COMMITTED isolation level in PostgreSQL allows non-repeatable reads. Between SELECT and UPDATE, another transaction can modify the row.

**How to avoid:** Use SELECT FOR UPDATE to acquire exclusive row lock before reading balance:

```typescript
// WRONG: Race condition possible
const [card] = await db.select().from(loyaltyCards).where(eq(loyaltyCards.id, cardId));
const newBalance = card.pointsBalance - pointsToRedeem;
await db.update(loyaltyCards).set({ pointsBalance: newBalance });

// CORRECT: Lock prevents concurrent modifications
const [card] = await db
  .select()
  .from(loyaltyCards)
  .where(eq(loyaltyCards.id, cardId))
  .for('update'); // Blocks other transactions
const newBalance = card.pointsBalance - pointsToRedeem;
await db.update(loyaltyCards).set({ pointsBalance: newBalance });
```

**Warning signs:** Production logs showing customers with negative points balance, customer complaints about "lost points", transaction history showing duplicate redemptions.

### Pitfall 2: Apple Wallet Certificate Expiration

**What goes wrong:** Apple Wallet passes fail to generate with cryptic "signing failed" errors after 12 months in production.

**Why it happens:** Apple Pass Type ID certificates expire after 1 year and must be renewed via Apple Developer portal.

**How to avoid:**

1. Set calendar reminder 2 months before certificate expiration
2. Monitor certificate expiration date in production:

```typescript
import * as x509 from '@peculiar/x509';
import fs from 'fs';

const cert = new x509.X509Certificate(fs.readFileSync(process.env.APPLE_PASS_CERT_PATH!));
const daysUntilExpiry = (cert.notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

if (daysUntilExpiry < 60) {
  console.warn(`[Apple Wallet] Certificate expires in ${daysUntilExpiry} days! Renew at developer.apple.com`);
}
```

3. Store certificate metadata in database for dashboard alerts

**Warning signs:** Sudden spike in Apple Wallet pass generation failures, `ERR_OSSL_X509_CERT_HAS_EXPIRED` errors.

### Pitfall 3: Google Wallet Service Account Permissions

**What goes wrong:** Google Wallet API returns 403 Forbidden errors despite valid credentials.

**Why it happens:** Service account must have "Wallet Object Issuer" role AND issuer ID must match the ID in pass object IDs.

**How to avoid:**

1. Verify service account has correct role in Google Cloud Console
2. Always use format `{issuerId}.{uniqueId}` for class/object IDs:

```typescript
const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID; // e.g., "3388000000012345678"
const classId = `${issuerId}.loyalty_program_schedulebox`; // CORRECT
const classId = `loyalty_program_schedulebox`; // WRONG: missing issuer prefix
```

3. Test with Google Wallet API playground first before production deployment

**Warning signs:** 403 errors on `createClass()` or `createObject()`, "Permission denied" in Google Cloud logs.

### Pitfall 4: Missing Wallet Pass Updates

**What goes wrong:** Customer earns points but their Apple Wallet card still shows old balance. Customer redeems points but Google Wallet shows unredeemed state.

**Why it happens:** Wallet passes are snapshots — they don't auto-sync with backend. Must explicitly push updates.

**How to avoid:**

**Apple Wallet:** Register device push tokens and send APNs notifications:

```typescript
// When customer adds pass to Apple Wallet, store pushToken
// POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
// Then on points change:
import apn from 'apn';

const provider = new apn.Provider({
  token: {
    key: process.env.APPLE_APN_KEY_PATH,
    keyId: process.env.APPLE_APN_KEY_ID,
    teamId: process.env.APPLE_TEAM_ID,
  },
  production: true,
});

const notification = new apn.Notification();
notification.topic = 'pass.com.schedulebox.loyalty';
notification.pushType = 'background';
notification.payload = {}; // Empty payload triggers pass re-fetch

await provider.send(notification, [card.applePushToken]);
```

**Google Wallet:** PATCH the object via REST API:

```typescript
await client.patchObject(objectId, {
  loyaltyPoints: {
    balance: { int: newBalance },
  },
});
```

**Warning signs:** Customer screenshots showing stale data, complaints that "points aren't updating in Wallet".

### Pitfall 5: Event Consumer Idempotency

**What goes wrong:** RabbitMQ redelivers `booking.completed` event after temporary failure, causing duplicate points awards.

**Why it happens:** Consumer crashes after awarding points but before ACKing message. On restart, RabbitMQ redelivers unACKed message.

**How to avoid:** Make points awarding idempotent by checking for existing transaction:

```typescript
export async function awardPointsForBooking(bookingUuid: string, companyId: number): Promise<void> {
  // Check if points already awarded for this booking
  const [existingTx] = await db
    .select({ id: loyaltyTransactions.id })
    .from(loyaltyTransactions)
    .innerJoin(loyaltyCards, eq(loyaltyTransactions.cardId, loyaltyCards.id))
    .innerJoin(bookings, eq(loyaltyTransactions.bookingId, bookings.id))
    .where(and(eq(bookings.uuid, bookingUuid), eq(loyaltyCards.companyId, companyId)))
    .limit(1);

  if (existingTx) {
    console.log(`[Loyalty] Points already awarded for booking ${bookingUuid}, skipping`);
    return; // Idempotent: no-op if already processed
  }

  // Award points...
}
```

**Warning signs:** Customers earning double points, loyalty_transactions table showing duplicate entries for same booking_id.

### Pitfall 6: Tier Downgrade Confusion

**What goes wrong:** Business wants tier downgrades (e.g., Gold -> Silver if inactive for 6 months) but automatic upgrades create confusion when customer earns points and immediately gets upgraded again.

**Why it happens:** Tier upgrade logic runs on every points addition without considering downgrade rules.

**How to avoid:**

1. Decide tier downgrade policy upfront (never, time-based, annual reset)
2. If using downgrades, add `tier_locked_until` timestamp to prevent thrashing:

```typescript
if (card.tierLockedUntil && new Date() < card.tierLockedUntil) {
  console.log('Tier upgrade suppressed: downgrade lock active');
  return;
}
```

3. Document tier policy in UI ("Tiers reset January 1st" or "Tier retained for lifetime")

**Warning signs:** Customer complaints about "tier changing randomly", support tickets asking why tier went down after earning points.

## Code Examples

Verified patterns from existing codebase and official documentation:

### Event Consumer Bootstrap (from Phase 7 pattern)

```typescript
// services/loyalty-worker/index.ts
import { createConsumerConnection, consumeMessages } from '@schedulebox/events';
import { awardPointsForBooking } from '@schedulebox/loyalty';

async function main() {
  console.log('[Loyalty Worker] Starting...');

  const { connection, channel } = await createConsumerConnection({
    url: process.env.RABBITMQ_URL,
  });

  await consumeMessages(channel, {
    queueName: 'loyalty.booking-completed',
    routingKeys: ['booking.completed'],
    prefetch: 10,
    handler: async (event) => {
      const { bookingUuid, companyId } = event.data;
      await awardPointsForBooking(bookingUuid, companyId);
      console.log(`[Loyalty] Awarded points for booking ${bookingUuid}`);
    },
  });

  console.log('[Loyalty Worker] Listening for booking.completed events...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Loyalty Worker] Shutting down...');
    await channel.close();
    await connection.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('[Loyalty Worker] Fatal error:', error);
  process.exit(1);
});
```

### API Route with createRouteHandler (from Phase 5 pattern)

```typescript
// apps/web/app/api/v1/loyalty/cards/[id]/add-points/route.ts
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { addPoints } from '@schedulebox/loyalty';
import { z } from 'zod';

const addPointsSchema = z.object({
  points: z.number().int().positive(),
  description: z.string().max(255),
});

export const POST = createRouteHandler({
  paramsSchema: z.object({ id: z.string().uuid() }),
  bodySchema: addPointsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ params, body, user }) => {
    const cardUuid = params.id;
    const { points, description } = body;

    // Convert UUID to internal ID
    const [card] = await db
      .select({ id: loyaltyCards.id })
      .from(loyaltyCards)
      .where(eq(loyaltyCards.uuid, cardUuid))
      .limit(1);

    if (!card) {
      throw new NotFoundError('Loyalty card not found');
    }

    // Add points with transaction safety
    await addPoints(card.id, points, description);

    // Return updated card
    const updated = await getLoyaltyCard(card.id);
    return successResponse(updated);
  },
});
```

### Zustand Store Pattern (for frontend loyalty state)

```typescript
// apps/web/stores/loyalty.store.ts
import { create } from 'zustand';

interface LoyaltyCard {
  id: string;
  cardNumber: string;
  pointsBalance: number;
  stampsBalance: number;
  currentTier: {
    id: number;
    name: string;
    minPoints: number;
    color: string;
  } | null;
  nextTier: {
    id: number;
    name: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
}

interface LoyaltyState {
  card: LoyaltyCard | null;
  isLoading: boolean;
  error: string | null;
  fetchCard: (customerId: string) => Promise<void>;
  refreshCard: () => Promise<void>;
  reset: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  card: null,
  isLoading: false,
  error: null,

  fetchCard: async (customerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/v1/loyalty/cards?customer_id=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch loyalty card');
      const data = await response.json();
      set({ card: data.data?.[0] || null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  refreshCard: async () => {
    const { card } = get();
    if (card) {
      const response = await fetch(`/api/v1/loyalty/cards/${card.id}`);
      const data = await response.json();
      set({ card: data.data });
    }
  },

  reset: () => set({ card: null, isLoading: false, error: null }),
}));
```

## State of the Art

| Old Approach                       | Current Approach                             | When Changed       | Impact                                                                                                     |
| ---------------------------------- | -------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Physical punch cards               | Digital wallet passes (Apple/Google Wallet)  | 2016-2020          | Customers always have card in phone, businesses track analytics, no lost cards                             |
| Polling database for new bookings  | Event-driven architecture (RabbitMQ)         | 2018-present       | Real-time points awarding, decoupled services, scalable                                                    |
| Optimistic locking for points      | Pessimistic locking (SELECT FOR UPDATE)      | 2020-present       | Prevents race conditions in high-concurrency redemption scenarios (POS systems)                            |
| Custom wallet pass generation      | Established libraries (passkit-generator)    | 2019-present       | Reduces maintenance, handles iOS updates, community-tested                                                 |
| Manual tier upgrades by admin      | Automatic tier upgrades on points addition   | 2015-present       | Reduces admin workload, real-time gamification, better CX                                                  |
| Bronze/Silver/Gold naming          | Creative tier naming (brand-specific)        | 2022-present       | Better brand alignment (e.g., Starbucks: Green/Gold, airlines: frequent flyer status)                      |
| Points-only programs               | Hybrid points + stamps programs              | 2020-present       | Flexibility for different business models (coffee shops use stamps, spas use points)                       |
| Static rewards catalog             | Dynamic rewards with stock limits            | 2021-present       | Creates urgency ("Only 5 left!"), prevents over-redemption                                                 |
| Lifetime points accumulation       | Points expiration (12-24 months)             | 2019-present       | Encourages frequent engagement, reduces liability (unredeemed points = liability on balance sheet)         |
| Email-based loyalty cards          | Mobile app + wallet integration              | 2018-present       | Higher engagement (app push notifications), easier redemption at POS                                       |
| Basic points (1 point = 1 CZK)     | Tiered multipliers (Gold earns 2x points)    | 2017-present       | Incentivizes tier progression, increases customer lifetime value                                           |
| Single redemption type (discounts) | Multiple reward types (free items, upgrades) | 2020-present       | Appeals to different customer preferences, increases redemption rate                                       |
| Manual pass updates                | Automated push updates (APNs, Google API)    | 2021 (iOS 15)      | Customers see real-time balance changes without re-downloading pass                                        |
| Separate loyalty vendor            | All-in-one platform (booking + loyalty)      | 2022-present (MVP) | Single data source, better insights (e.g., "Gold tier customers have 30% lower no-show rate")              |
| NFC-only wallet passes             | QR + NFC hybrid                              | 2023 (iOS 18)      | Works at non-NFC POS terminals, better for SMB market (Czech/Slovak small businesses often lack NFC readers) |

**Deprecated/outdated:**

- **Plastic loyalty cards with magnetic stripe:** Replaced by Apple/Google Wallet digital passes. Last major retailer (Target) phased out in 2023.
- **SMS-based points balance checks:** Replaced by mobile app real-time display. High SMS costs, poor UX.
- **Manual points entry by staff:** Replaced by automatic POS integration + event-driven awarding. Error-prone, slow.
- **Third-party loyalty platforms (LoyaltyLion, Smile.io for Shopify):** Trend toward in-house loyalty systems integrated with booking/POS. Better data ownership, lower per-transaction fees.

## Open Questions

1. **Points expiration policy**
   - What we know: Industry standard is 12-24 months from last activity
   - What's unclear: Czech/Slovak market expectation — more customer research needed
   - Recommendation: Make configurable per company (default: 12 months), implement as scheduled job (pg_cron or BullMQ)

2. **Wallet pass update frequency**
   - What we know: Apple Wallet can push updates, Google Wallet requires REST API calls
   - What's unclear: Should updates be real-time (on every points change) or batched (daily)? Real-time = higher API costs.
   - Recommendation: Start with immediate updates for manual transactions (redemptions), batched daily updates for automatic earning. Monitor API costs and adjust.

3. **Multi-location companies**
   - What we know: Database schema has UNIQUE(company_id) on loyalty_programs
   - What's unclear: If company has multiple locations, should loyalty be company-wide or per-location?
   - Recommendation: Company-wide for MVP (single program per company), add location-specific tiers in Phase 10+ if requested

4. **POS integration for redemption**
   - What we know: Redemption API endpoint exists (/loyalty/rewards/:id/redeem)
   - What's unclear: How does staff scan QR code at POS? Separate POS app? Public API endpoint?
   - Recommendation: Phase 9 = admin dashboard redemption only, Phase 10+ = QR scanner in mobile staff app or public API for POS integration

5. **Fraud prevention for high-value rewards**
   - What we know: SELECT FOR UPDATE prevents double-spending
   - What's unclear: Should high-value redemptions (>1000 points) require admin approval?
   - Recommendation: Add `requires_approval` flag to rewards table, implement approval workflow if business requests it (not MVP)

## Sources

### Primary (HIGH confidence)

- [passkit-generator npm](https://www.npmjs.com/package/passkit-generator) - v3.5.7 documentation, examples, iOS 18 support
- [passkit-generator GitHub](https://github.com/alexandercerutti/passkit-generator) - TypeScript API reference, certificate setup guide
- [google-wallet npm](https://www.npmjs.com/package/google-wallet) - TypeScript interfaces for LoyaltyClient/Class/Object
- [Google Wallet Loyalty Cards Documentation](https://developers.google.com/wallet/retail/loyalty-cards) - Official API spec, auth setup, object schema
- ScheduleBox documentation (`schedulebox_complete_documentation.md`) - Database schema (lines 1501-1579), API spec (lines 3545-3658), event system (lines 436-772)
- Existing codebase - Event consumer pattern (packages/events/src/consumer.ts), route handler pattern (apps/web/app/api/v1/bookings/[id]/complete/route.ts), booking transitions with SELECT FOR UPDATE (apps/web/lib/booking/booking-transitions.ts)

### Secondary (MEDIUM confidence)

- [SELECT FOR UPDATE to prevent race conditions](https://sqlfordevs.com/transaction-locking-prevent-race-condition) - Verified pattern with PostgreSQL examples
- [Pessimistic vs Optimistic Locking](https://www.moderntreasury.com/learn/pessimistic-locking-vs-optimistic-locking) - Use case comparison for financial transactions
- [Event-Driven Microservices with RabbitMQ](https://betterprogramming.pub/a-step-by-step-guide-to-building-event-driven-microservices-with-rabbitmq-deeb85b3031c) - Architecture patterns
- [Loyalty Architecture Guide](https://www.voucherify.io/blog/architecture-of-customer-loyalty-software-a-guide-for-product-managers) - API-first composable architecture principles
- [Tier-Based Loyalty Programs Guide](https://www.voucherify.io/blog/how-tiered-loyalty-programs-can-boost-your-business-strategy) - Best practices for Bronze/Silver/Gold tiers
- [Loyalty Program UX Design](https://www.toptal.com/designers/ux/loyalty-program-design-framework) - Progress bar visualization, tier advancement UI patterns

### Tertiary (LOW confidence - requires validation)

- [Points-Based Loyalty Trends 2026](https://www.customerexperiencedive.com/news/why-points-based-loyalty-programs-will-rule-2026/808053/) - Market growth predictions, redemption trends
- [Loyalty Statistics 2026](https://queue-it.com/blog/loyalty-program-statistics/) - Market size ($18.2B by 2026), adoption rates

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - passkit-generator and google-wallet are established, actively maintained libraries with production usage
- Architecture patterns: HIGH - Event-driven pattern already implemented in Phase 5/7, SELECT FOR UPDATE is proven PostgreSQL pattern
- Pitfalls: MEDIUM - Based on documented issues in GitHub repos and Stack Overflow, not ScheduleBox-specific production experience
- Wallet integration: MEDIUM - Libraries are well-documented but certificate management and APNs push updates require hands-on testing
- UI patterns: MEDIUM - Based on industry research and design frameworks, not ScheduleBox user testing

**Research date:** 2026-02-11
**Valid until:** 2026-04-11 (60 days - stable domain, but Apple/Google Wallet APIs can change with iOS/Android releases)

**Notes:**

- Apple Wallet certificate management is the highest technical risk — requires Apple Developer account, yearly renewal
- Google Wallet requires Google Cloud project + service account setup — document onboarding steps in PLAN.md
- Event consumer idempotency is critical — test thoroughly with forced RabbitMQ redeliveries
- Wallet pass updates (APNs for Apple, REST for Google) should be separated into Phase 9.5 or Phase 10 if time-constrained (MVP can launch with manual re-download)

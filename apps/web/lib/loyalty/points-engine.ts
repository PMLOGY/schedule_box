/**
 * Loyalty Points Engine
 *
 * Transactional points management with SELECT FOR UPDATE locking to prevent race conditions.
 * All balance modifications use pessimistic locking for concurrent safety.
 *
 * Functions:
 * - earnPoints: Add points to card with automatic tier upgrade check
 * - redeemPoints: Deduct points from card with balance validation
 * - adjustPoints: Manual points adjustment (positive or negative)
 * - awardPointsForBooking: Idempotent booking-based points earning
 */

import { eq, and } from 'drizzle-orm';
import {
  db,
  loyaltyCards,
  loyaltyTransactions,
  loyaltyPrograms,
  bookings,
  customers,
} from '@schedulebox/database';
import { ValidationError } from '@schedulebox/shared';
import { publishEvent, createPointsEarnedEvent } from '@schedulebox/events';
import { checkAndUpgradeTier } from './tier-engine';

// ============================================================================
// EARN POINTS
// ============================================================================

/**
 * Earn points on a loyalty card
 *
 * Uses SELECT FOR UPDATE to prevent race conditions on concurrent balance modifications.
 * After transaction commits, triggers automatic tier upgrade check.
 *
 * @param cardId - Internal card ID (SERIAL)
 * @param points - Points to add (positive integer)
 * @param description - Transaction description
 * @param bookingId - Optional booking ID for audit trail
 * @throws ValidationError if card not found, inactive, or balance overflow
 */
export async function earnPoints(
  cardId: number,
  points: number,
  description: string,
  bookingId?: number,
): Promise<void> {
  if (points <= 0) {
    throw new ValidationError('Points must be positive');
  }

  await db.transaction(async (tx) => {
    // SELECT FOR UPDATE: Lock the card row to prevent concurrent modifications
    const [card] = await tx
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        programId: loyaltyCards.programId,
        customerId: loyaltyCards.customerId,
        pointsBalance: loyaltyCards.pointsBalance,
        isActive: loyaltyCards.isActive,
      })
      .from(loyaltyCards)
      .where(eq(loyaltyCards.id, cardId))
      .for('update');

    if (!card) {
      throw new ValidationError('Loyalty card not found');
    }

    if (!card.isActive) {
      throw new ValidationError('Loyalty card is inactive');
    }

    // Calculate new balance
    const currentBalance = card.pointsBalance ?? 0;
    const newBalance = currentBalance + points;

    // Update card balance
    await tx
      .update(loyaltyCards)
      .set({
        pointsBalance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyCards.id, cardId));

    // Insert transaction record
    await tx.insert(loyaltyTransactions).values({
      cardId: card.id,
      bookingId: bookingId ?? null,
      type: 'earn',
      points: points,
      balanceAfter: newBalance,
      description,
    });

    // Get customer UUID and company ID for event
    const [customer] = await tx
      .select({
        uuid: customers.uuid,
      })
      .from(customers)
      .where(eq(customers.id, card.customerId))
      .limit(1);

    const [program] = await tx
      .select({
        companyId: loyaltyPrograms.companyId,
      })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.id, card.programId))
      .limit(1);

    if (!customer || !program) {
      throw new ValidationError('Customer or program not found');
    }

    // Get booking UUID if bookingId provided
    let bookingUuid: string | null = null;
    if (bookingId) {
      const [booking] = await tx
        .select({ uuid: bookings.uuid })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
      bookingUuid = booking?.uuid ?? null;
    }

    // Publish PointsEarnedEvent (after transaction commits)
    try {
      await publishEvent(
        createPointsEarnedEvent({
          cardUuid: card.uuid,
          companyId: program.companyId,
          customerUuid: customer.uuid,
          points,
          balanceAfter: newBalance,
          bookingUuid,
          description,
        }),
      );
    } catch (error) {
      console.error('[Points Engine] Failed to publish points.earned event:', error);
    }
  });

  // After transaction commits, check for tier upgrade
  await checkAndUpgradeTier(cardId);
}

// ============================================================================
// REDEEM POINTS
// ============================================================================

/**
 * Redeem points from a loyalty card
 *
 * Uses SELECT FOR UPDATE to prevent race conditions.
 * Validates sufficient balance before deduction.
 *
 * @param cardId - Internal card ID (SERIAL)
 * @param pointsToRedeem - Points to deduct (positive integer)
 * @param description - Redemption description
 * @throws ValidationError if card not found, inactive, or insufficient balance
 */
export async function redeemPoints(
  cardId: number,
  pointsToRedeem: number,
  description: string,
): Promise<void> {
  if (pointsToRedeem <= 0) {
    throw new ValidationError('Points to redeem must be positive');
  }

  await db.transaction(async (tx) => {
    // SELECT FOR UPDATE: Lock the card row
    const [card] = await tx
      .select({
        id: loyaltyCards.id,
        pointsBalance: loyaltyCards.pointsBalance,
        isActive: loyaltyCards.isActive,
      })
      .from(loyaltyCards)
      .where(eq(loyaltyCards.id, cardId))
      .for('update');

    if (!card) {
      throw new ValidationError('Loyalty card not found');
    }

    if (!card.isActive) {
      throw new ValidationError('Loyalty card is inactive');
    }

    const currentBalance = card.pointsBalance ?? 0;

    // Check sufficient balance
    if (currentBalance < pointsToRedeem) {
      throw new ValidationError(
        `Insufficient points balance. Have: ${currentBalance}, Need: ${pointsToRedeem}`,
      );
    }

    // Calculate new balance
    const newBalance = currentBalance - pointsToRedeem;

    // Update card balance
    await tx
      .update(loyaltyCards)
      .set({
        pointsBalance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyCards.id, cardId));

    // Insert transaction record (negative points)
    await tx.insert(loyaltyTransactions).values({
      cardId: card.id,
      bookingId: null,
      type: 'redeem',
      points: -pointsToRedeem,
      balanceAfter: newBalance,
      description,
    });
  });
}

// ============================================================================
// ADJUST POINTS
// ============================================================================

/**
 * Manually adjust points (admin action)
 *
 * Allows positive or negative adjustments with validation.
 * Uses SELECT FOR UPDATE for concurrency safety.
 *
 * @param cardId - Internal card ID (SERIAL)
 * @param points - Points to adjust (positive or negative)
 * @param description - Adjustment reason
 * @throws ValidationError if card not found, inactive, or resulting balance negative
 */
export async function adjustPoints(
  cardId: number,
  points: number,
  description: string,
): Promise<void> {
  if (points === 0) {
    throw new ValidationError('Adjustment cannot be zero');
  }

  await db.transaction(async (tx) => {
    // SELECT FOR UPDATE: Lock the card row
    const [card] = await tx
      .select({
        id: loyaltyCards.id,
        pointsBalance: loyaltyCards.pointsBalance,
        isActive: loyaltyCards.isActive,
      })
      .from(loyaltyCards)
      .where(eq(loyaltyCards.id, cardId))
      .for('update');

    if (!card) {
      throw new ValidationError('Loyalty card not found');
    }

    if (!card.isActive) {
      throw new ValidationError('Loyalty card is inactive');
    }

    const currentBalance = card.pointsBalance ?? 0;
    const newBalance = currentBalance + points;

    // Validate new balance is not negative
    if (newBalance < 0) {
      throw new ValidationError(
        `Adjustment would result in negative balance. Current: ${currentBalance}, Adjustment: ${points}`,
      );
    }

    // Update card balance
    await tx
      .update(loyaltyCards)
      .set({
        pointsBalance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyCards.id, cardId));

    // Insert transaction record
    await tx.insert(loyaltyTransactions).values({
      cardId: card.id,
      bookingId: null,
      type: 'adjust',
      points: points,
      balanceAfter: newBalance,
      description,
    });
  });

  // If points added, check for tier upgrade
  if (points > 0) {
    await checkAndUpgradeTier(cardId);
  }
}

// ============================================================================
// AWARD POINTS FOR BOOKING
// ============================================================================

/**
 * Award points for completed booking (idempotent handler for booking.completed events)
 *
 * Idempotency: Checks if points already awarded for this booking.
 * Auto-enrollment: Creates loyalty card if customer doesn't have one and program allows.
 *
 * @param bookingUuid - Booking UUID (public identifier)
 * @param companyId - Company ID for tenant isolation
 * @throws ValidationError if booking not found or loyalty program not configured
 */
export async function awardPointsForBooking(bookingUuid: string, companyId: number): Promise<void> {
  // Look up booking by UUID
  const [booking] = await db
    .select({
      id: bookings.id,
      uuid: bookings.uuid,
      customerId: bookings.customerId,
      price: bookings.price,
      status: bookings.status,
    })
    .from(bookings)
    .where(and(eq(bookings.uuid, bookingUuid), eq(bookings.companyId, companyId)))
    .limit(1);

  if (!booking) {
    throw new ValidationError('Booking not found');
  }

  // Only award points for completed bookings
  if (booking.status !== 'completed') {
    console.log(`[Points Engine] Booking ${bookingUuid} not completed, skipping points award`);
    return;
  }

  // IDEMPOTENCY CHECK: Check if points already awarded for this booking
  const [existingTransaction] = await db
    .select({ id: loyaltyTransactions.id })
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.bookingId, booking.id))
    .limit(1);

  if (existingTransaction) {
    console.log(`[Points Engine] Points already awarded for booking ${bookingUuid}, skipping`);
    return;
  }

  // Look up loyalty program for company
  const [program] = await db
    .select({
      id: loyaltyPrograms.id,
      uuid: loyaltyPrograms.uuid,
      pointsPerCurrency: loyaltyPrograms.pointsPerCurrency,
      isActive: loyaltyPrograms.isActive,
    })
    .from(loyaltyPrograms)
    .where(and(eq(loyaltyPrograms.companyId, companyId), eq(loyaltyPrograms.isActive, true)))
    .limit(1);

  if (!program) {
    console.log(`[Points Engine] No active loyalty program for company ${companyId}, skipping`);
    return;
  }

  // Look up or create loyalty card for customer
  let [card] = await db
    .select({
      id: loyaltyCards.id,
    })
    .from(loyaltyCards)
    .where(
      and(eq(loyaltyCards.programId, program.id), eq(loyaltyCards.customerId, booking.customerId)),
    )
    .limit(1);

  // Auto-enroll: Create card if not exists
  if (!card) {
    console.log(`[Points Engine] Auto-enrolling customer ${booking.customerId} in loyalty program`);

    // Generate card number (format: XXXX-XXXX-XXXX-XXXX)
    const cardNumber = `${randomDigits(4)}-${randomDigits(4)}-${randomDigits(4)}-${randomDigits(4)}`;

    const [newCard] = await db
      .insert(loyaltyCards)
      .values({
        programId: program.id,
        customerId: booking.customerId,
        cardNumber,
        pointsBalance: 0,
        stampsBalance: 0,
        isActive: true,
      })
      .returning({ id: loyaltyCards.id });

    card = newCard;
  }

  // Calculate points to award
  const bookingPrice = parseFloat(booking.price ?? '0');
  const pointsPerCurrency = parseFloat(program.pointsPerCurrency ?? '1');
  const pointsToAward = Math.floor(bookingPrice * pointsPerCurrency);

  if (pointsToAward <= 0) {
    console.log(`[Points Engine] Booking price ${bookingPrice} results in 0 points, skipping`);
    return;
  }

  // Award points using earnPoints (which handles locking, events, tier upgrade)
  await earnPoints(card.id, pointsToAward, `Booking ${bookingUuid}`, booking.id);

  console.log(
    `[Points Engine] Awarded ${pointsToAward} points for booking ${bookingUuid} (price: ${bookingPrice}, rate: ${pointsPerCurrency})`,
  );
}

/**
 * Generate random N-digit number string
 */
function randomDigits(n: number): string {
  const min = Math.pow(10, n - 1);
  const max = Math.pow(10, n) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

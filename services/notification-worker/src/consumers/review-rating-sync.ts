/**
 * Review Rating Sync Consumer
 * Listens to review.created events and updates marketplace listing aggregate ratings
 */

import type { Channel, Message } from 'amqplib';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db, reviews, marketplaceListings } from '@schedulebox/database';
import type { ReviewCreatedEvent } from '@schedulebox/events';

/**
 * Handle review.created event - recalculate and update marketplace listing rating
 */
async function handleReviewCreated(event: ReviewCreatedEvent): Promise<void> {
  const { companyId } = event.data;

  console.log(`[Review Rating Sync] Processing review.created for company ${companyId}`);

  // Calculate aggregate rating: AVG(rating), COUNT(*)
  // Only include published, non-deleted reviews
  const result = await db
    .select({
      avgRating: sql<string>`AVG(${reviews.rating})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.companyId, companyId),
        eq(reviews.isPublished, true),
        isNull(reviews.deletedAt),
      ),
    );

  if (!result || result.length === 0) {
    console.log(`[Review Rating Sync] No published reviews found for company ${companyId}`);
    return;
  }

  const { avgRating, count } = result[0];

  // Round average to 2 decimal places
  const averageRating = avgRating ? parseFloat(Number(avgRating).toFixed(2)).toString() : '0';
  const reviewCount = count || 0;

  console.log(
    `[Review Rating Sync] Calculated rating for company ${companyId}: ${averageRating} (${reviewCount} reviews)`,
  );

  // Update marketplace listing
  // Check if listing exists first
  const listing = await db.query.marketplaceListings.findFirst({
    where: eq(marketplaceListings.companyId, companyId),
  });

  if (!listing) {
    console.log(
      `[Review Rating Sync] No marketplace listing found for company ${companyId}, skipping update`,
    );
    return;
  }

  // Update the listing with new aggregate data
  await db
    .update(marketplaceListings)
    .set({
      averageRating,
      reviewCount,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceListings.companyId, companyId));

  console.log(
    `[Review Rating Sync] Updated marketplace rating for company ${companyId}: ${averageRating} (${reviewCount} reviews)`,
  );
}

/**
 * Setup review rating sync consumer
 */
export async function setupReviewRatingSyncConsumer(channel: Channel): Promise<void> {
  const queueName = 'review-rating-sync';

  // Assert durable queue
  await channel.assertQueue(queueName, { durable: true });

  // Bind to review.created routing key
  await channel.bindQueue(queueName, 'schedulebox.events', 'review.created');

  // Set prefetch
  channel.prefetch(10);

  // Consume messages
  await channel.consume(queueName, async (msg: Message | null) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as ReviewCreatedEvent;

      console.log(`[Review Rating Sync] Received event: ${event.type}`);

      // Handle the event
      await handleReviewCreated(event);

      // ACK message on success
      channel.ack(msg);
    } catch (error) {
      console.error('[Review Rating Sync] Error processing message:', error);

      // NACK without requeue to prevent infinite retry loops on bad data
      // (e.g., malformed event payload, constraint violations)
      channel.nack(msg, false, false);
    }
  });

  console.log('[Review Rating Sync] Started - listening to review.created');
}

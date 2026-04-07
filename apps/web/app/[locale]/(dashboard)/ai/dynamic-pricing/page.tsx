import { redirect } from 'next/navigation';

/**
 * Redirect /ai/dynamic-pricing -> /ai/pricing
 * The canonical route for dynamic pricing is /ai/pricing.
 * This redirect avoids 404 for anyone navigating to the old/alternative URL.
 */
export default function DynamicPricingRedirect() {
  redirect('/ai/pricing');
}

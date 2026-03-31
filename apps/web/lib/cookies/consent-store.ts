/**
 * Cookie Consent Preferences Store
 *
 * Manages category-based cookie consent preferences in localStorage.
 * Categories: necessary (always true), analytics (opt-in), marketing (opt-in).
 */

const STORAGE_KEY = 'sb_cookie_preferences';

export interface CookiePreferences {
  /** Always true - cannot be toggled off */
  necessary: true;
  /** Analytics cookies (e.g. Google Analytics, Sentry) */
  analytics: boolean;
  /** Marketing cookies (e.g. ad tracking, remarketing) */
  marketing: boolean;
}

/**
 * Read stored cookie preferences from localStorage.
 * Returns null if user has not yet made a choice.
 */
export function getConsentPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ensure necessary is always true regardless of stored value
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

/**
 * Save cookie preferences to localStorage.
 */
export function setConsentPreferences(prefs: CookiePreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      necessary: true,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
    }),
  );
}

/**
 * Check whether the user has already made a consent choice.
 */
export function hasConsented(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Convenience: check if analytics cookies are allowed.
 */
export function isAnalyticsAllowed(): boolean {
  const prefs = getConsentPreferences();
  return prefs?.analytics ?? false;
}

/**
 * Convenience: check if marketing cookies are allowed.
 */
export function isMarketingAllowed(): boolean {
  const prefs = getConsentPreferences();
  return prefs?.marketing ?? false;
}

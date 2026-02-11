/**
 * Template Renderer Service
 * Handlebars template compilation with caching and Czech locale helpers
 */

import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Template cache
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Register Handlebars helpers for Czech locale formatting
 */
function registerHelpers() {
  // Format date to Czech locale string
  Handlebars.registerHelper('formatDate', function (date: Date | string, locale = 'cs-CZ') {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // Format time to HH:MM
  Handlebars.registerHelper('formatTime', function (date: Date | string, locale = 'cs-CZ') {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  // Format currency with Czech locale
  Handlebars.registerHelper('formatCurrency', function (amount: number | string, currency = 'CZK') {
    if (amount === null || amount === undefined) return '';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency,
    }).format(num);
  });

  // Conditional helper for equality check
  Handlebars.registerHelper(
    'ifEquals',
    function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
  );
}

// Register helpers once on module load
registerHelpers();

/**
 * Render template from string
 * @param templateString Handlebars template string
 * @param data Template data
 */
export function renderTemplate(templateString: string, data: Record<string, unknown>): string {
  const cacheKey = templateString.substring(0, 100); // Cache by prefix

  let template = templateCache.get(cacheKey);

  if (!template) {
    template = Handlebars.compile(templateString);
    templateCache.set(cacheKey, template);
  }

  return template(data);
}

/**
 * Render template from file
 * @param templateName Template filename (without .hbs extension)
 * @param channel Channel type (email or sms)
 * @param data Template data
 */
export function renderTemplateFile(
  templateName: string,
  channel: 'email' | 'sms',
  data: Record<string, unknown>,
): string {
  const cacheKey = `${channel}:${templateName}`;

  let template = templateCache.get(cacheKey);

  if (!template) {
    // Load template file from templates/{channel}/{templateName}.hbs
    const templatePath = join(__dirname, '..', 'templates', channel, `${templateName}.hbs`);
    const templateString = readFileSync(templatePath, 'utf-8');
    template = Handlebars.compile(templateString);
    templateCache.set(cacheKey, template);
  }

  return template(data);
}

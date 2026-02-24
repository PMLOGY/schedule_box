/**
 * Role-Based Access Control (RBAC) middleware
 * Checks user permissions against required permissions
 */

import { type JWTPayload } from '@/lib/auth/jwt';
import { ForbiddenError } from '@schedulebox/shared';

/**
 * All 23 permission strings from documentation (line 1010-1033)
 * Used for RBAC checks across the application
 */
export const PERMISSIONS = {
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_READ: 'bookings.read',
  BOOKINGS_UPDATE: 'bookings.update',
  BOOKINGS_DELETE: 'bookings.delete',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',
  SERVICES_CREATE: 'services.create',
  SERVICES_READ: 'services.read',
  SERVICES_UPDATE: 'services.update',
  SERVICES_DELETE: 'services.delete',
  EMPLOYEES_MANAGE: 'employees.manage',
  RESOURCES_MANAGE: 'resources.manage',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_VIEW: 'payments.read', // Alias for backward compatibility
  PAYMENTS_REFUND: 'payments.refund',
  INVOICES_READ: 'invoices.read',
  REPORTS_READ: 'reports.read',
  SETTINGS_MANAGE: 'settings.manage',
  LOYALTY_MANAGE: 'loyalty.manage',
  COUPONS_MANAGE: 'coupons.manage',
  MARKETPLACE_MANAGE: 'marketplace.manage',
  AI_USE: 'ai.use',
  WHITELABEL_MANAGE: 'whitelabel.manage',
  ORGANIZATIONS_MANAGE: 'organizations.manage',
  ORGANIZATIONS_READ: 'organizations.read',
} as const;

/**
 * Check if user has all required permissions
 *
 * @param user - JWT payload containing user permissions
 * @param requiredPermissions - Array of permission strings to check
 * @throws ForbiddenError if user lacks any required permission
 */
export function checkPermissions(user: JWTPayload, requiredPermissions: string[]): void {
  // No permissions required, allow access
  if (requiredPermissions.length === 0) {
    return;
  }

  // Check if user has all required permissions
  const hasAllPermissions = requiredPermissions.every((permission) =>
    user.permissions.includes(permission),
  );

  if (!hasAllPermissions) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

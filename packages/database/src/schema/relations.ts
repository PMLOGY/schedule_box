/**
 * Drizzle Relations
 *
 * Defines relationships between tables for query builder and nested queries.
 * Enables type-safe joins and automatic relationship traversal.
 */

import { relations } from 'drizzle-orm';
import {
  companies,
  users,
  roles,
  permissions,
  rolePermissions,
  refreshTokens,
  apiKeys,
} from './auth.js';
import { customers, customerTags, tags } from './customers.js';
import { services, serviceCategories } from './services.js';
import { employees, employeeServices, workingHours, workingHoursOverrides } from './employees.js';
import { resources, resourceTypes, serviceResources } from './resources.js';
import { bookings, bookingResources, availabilitySlots } from './bookings.js';
import { payments, invoices } from './payments.js';
import { coupons, couponUsage } from './coupons.js';
import { giftCards, giftCardTransactions } from './gift-cards.js';
import { loyaltyPrograms, loyaltyTiers, loyaltyCards, loyaltyTransactions } from './loyalty.js';
import { notifications, notificationTemplates } from './notifications.js';
import { reviews } from './reviews.js';
import { aiPredictions } from './ai.js';
import { marketplaceListings } from './marketplace.js';
import { videoMeetings } from './video.js';
import { whitelabelApps } from './apps.js';
import { automationRules, automationLogs } from './automation.js';
import { auditLogs, analyticsEvents } from './analytics.js';

// ============================================================================
// COMPANIES RELATIONS
// ============================================================================

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  services: many(services),
  serviceCategories: many(serviceCategories),
  employees: many(employees),
  resources: many(resources),
  resourceTypes: many(resourceTypes),
  bookings: many(bookings),
  availabilitySlots: many(availabilitySlots),
  payments: many(payments),
  invoices: many(invoices),
  coupons: many(coupons),
  giftCards: many(giftCards),
  loyaltyPrograms: many(loyaltyPrograms),
  notifications: many(notifications),
  notificationTemplates: many(notificationTemplates),
  reviews: many(reviews),
  marketplace: many(marketplaceListings),
  apps: many(whitelabelApps),
  automations: many(automationRules),
  analytics: many(analyticsEvents),
  apiKeys: many(apiKeys),
  tags: many(tags),
  workingHours: many(workingHours),
}));

// ============================================================================
// USERS RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  refreshTokens: many(refreshTokens),
  customers: many(customers),
  employees: many(employees),
}));

// ============================================================================
// ROLES & PERMISSIONS RELATIONS
// ============================================================================

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// ============================================================================
// REFRESH TOKENS & API KEYS RELATIONS
// ============================================================================

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  company: one(companies, {
    fields: [apiKeys.companyId],
    references: [companies.id],
  }),
}));

// ============================================================================
// CUSTOMERS RELATIONS
// ============================================================================

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
  payments: many(payments),
  reviews: many(reviews),
  loyaltyCards: many(loyaltyCards),
  customerTags: many(customerTags),
  giftCards: many(giftCards),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  company: one(companies, {
    fields: [tags.companyId],
    references: [companies.id],
  }),
  customerTags: many(customerTags),
}));

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTags.customerId],
    references: [customers.id],
  }),
  tag: one(tags, {
    fields: [customerTags.tagId],
    references: [tags.id],
  }),
}));

// ============================================================================
// SERVICES RELATIONS
// ============================================================================

export const serviceCategoriesRelations = relations(serviceCategories, ({ one, many }) => ({
  company: one(companies, {
    fields: [serviceCategories.companyId],
    references: [companies.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  company: one(companies, {
    fields: [services.companyId],
    references: [companies.id],
  }),
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  employeeServices: many(employeeServices),
  bookings: many(bookings),
  reviews: many(reviews),
}));

// ============================================================================
// EMPLOYEES RELATIONS
// ============================================================================

export const employeesRelations = relations(employees, ({ one, many }) => ({
  company: one(companies, {
    fields: [employees.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  employeeServices: many(employeeServices),
  workingHours: many(workingHours),
  workingHoursOverrides: many(workingHoursOverrides),
  bookings: many(bookings),
  reviews: many(reviews),
  availabilitySlots: many(availabilitySlots),
}));

export const employeeServicesRelations = relations(employeeServices, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeServices.employeeId],
    references: [employees.id],
  }),
  service: one(services, {
    fields: [employeeServices.serviceId],
    references: [services.id],
  }),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  company: one(companies, {
    fields: [workingHours.companyId],
    references: [companies.id],
  }),
  employee: one(employees, {
    fields: [workingHours.employeeId],
    references: [employees.id],
  }),
}));

export const workingHoursOverridesRelations = relations(workingHoursOverrides, ({ one }) => ({
  employee: one(employees, {
    fields: [workingHoursOverrides.employeeId],
    references: [employees.id],
  }),
}));

// ============================================================================
// RESOURCES RELATIONS
// ============================================================================

export const resourceTypesRelations = relations(resourceTypes, ({ one, many }) => ({
  company: one(companies, {
    fields: [resourceTypes.companyId],
    references: [companies.id],
  }),
  resources: many(resources),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  company: one(companies, {
    fields: [resources.companyId],
    references: [companies.id],
  }),
  resourceType: one(resourceTypes, {
    fields: [resources.resourceTypeId],
    references: [resourceTypes.id],
  }),
  bookingResources: many(bookingResources),
  serviceResources: many(serviceResources),
}));

export const serviceResourcesRelations = relations(serviceResources, ({ one }) => ({
  resource: one(resources, {
    fields: [serviceResources.resourceId],
    references: [resources.id],
  }),
}));

// ============================================================================
// BOOKINGS RELATIONS
// ============================================================================

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  company: one(companies, {
    fields: [bookings.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  employee: one(employees, {
    fields: [bookings.employeeId],
    references: [employees.id],
  }),
  bookingResources: many(bookingResources),
  payments: many(payments),
  reviews: many(reviews),
  videoMeeting: one(videoMeetings, {
    fields: [bookings.videoMeetingId],
    references: [videoMeetings.id],
  }),
}));

export const bookingResourcesRelations = relations(bookingResources, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingResources.bookingId],
    references: [bookings.id],
  }),
  resource: one(resources, {
    fields: [bookingResources.resourceId],
    references: [resources.id],
  }),
}));

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  company: one(companies, {
    fields: [availabilitySlots.companyId],
    references: [companies.id],
  }),
  employee: one(employees, {
    fields: [availabilitySlots.employeeId],
    references: [employees.id],
  }),
}));

// ============================================================================
// PAYMENTS & INVOICES RELATIONS
// ============================================================================

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  company: one(companies, {
    fields: [payments.companyId],
    references: [companies.id],
  }),
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  payment: one(payments, {
    fields: [invoices.paymentId],
    references: [payments.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
}));

// ============================================================================
// COUPONS RELATIONS
// ============================================================================

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  company: one(companies, {
    fields: [coupons.companyId],
    references: [companies.id],
  }),
  couponUsage: many(couponUsage),
}));

export const couponUsageRelations = relations(couponUsage, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsage.couponId],
    references: [coupons.id],
  }),
}));

// ============================================================================
// GIFT CARDS RELATIONS
// ============================================================================

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  company: one(companies, {
    fields: [giftCards.companyId],
    references: [companies.id],
  }),
  purchasedBy: one(customers, {
    fields: [giftCards.purchasedByCustomerId],
    references: [customers.id],
  }),
  giftCardTransactions: many(giftCardTransactions),
}));

export const giftCardTransactionsRelations = relations(giftCardTransactions, ({ one }) => ({
  giftCard: one(giftCards, {
    fields: [giftCardTransactions.giftCardId],
    references: [giftCards.id],
  }),
}));

// ============================================================================
// LOYALTY RELATIONS
// ============================================================================

export const loyaltyProgramsRelations = relations(loyaltyPrograms, ({ one, many }) => ({
  company: one(companies, {
    fields: [loyaltyPrograms.companyId],
    references: [companies.id],
  }),
  loyaltyTiers: many(loyaltyTiers),
  loyaltyCards: many(loyaltyCards),
}));

export const loyaltyTiersRelations = relations(loyaltyTiers, ({ one }) => ({
  program: one(loyaltyPrograms, {
    fields: [loyaltyTiers.programId],
    references: [loyaltyPrograms.id],
  }),
}));

export const loyaltyCardsRelations = relations(loyaltyCards, ({ one, many }) => ({
  program: one(loyaltyPrograms, {
    fields: [loyaltyCards.programId],
    references: [loyaltyPrograms.id],
  }),
  customer: one(customers, {
    fields: [loyaltyCards.customerId],
    references: [customers.id],
  }),
  tier: one(loyaltyTiers, {
    fields: [loyaltyCards.tierId],
    references: [loyaltyTiers.id],
  }),
  loyaltyTransactions: many(loyaltyTransactions),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  card: one(loyaltyCards, {
    fields: [loyaltyTransactions.cardId],
    references: [loyaltyCards.id],
  }),
}));

// ============================================================================
// NOTIFICATIONS RELATIONS
// ============================================================================

export const notificationsRelations = relations(notifications, ({ one }) => ({
  company: one(companies, {
    fields: [notifications.companyId],
    references: [companies.id],
  }),
  template: one(notificationTemplates, {
    fields: [notifications.templateId],
    references: [notificationTemplates.id],
  }),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one, many }) => ({
  company: one(companies, {
    fields: [notificationTemplates.companyId],
    references: [companies.id],
  }),
  notifications: many(notifications),
}));

// ============================================================================
// REVIEWS RELATIONS
// ============================================================================

export const reviewsRelations = relations(reviews, ({ one }) => ({
  company: one(companies, {
    fields: [reviews.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  service: one(services, {
    fields: [reviews.serviceId],
    references: [services.id],
  }),
  employee: one(employees, {
    fields: [reviews.employeeId],
    references: [employees.id],
  }),
}));

// ============================================================================
// AI RELATIONS
// ============================================================================

export const aiPredictionsRelations = relations(aiPredictions, ({ one }) => ({
  company: one(companies, {
    fields: [aiPredictions.companyId],
    references: [companies.id],
  }),
}));

// Note: aiModelMetrics is a global table without company_id, no relations

// ============================================================================
// MARKETPLACE RELATIONS
// ============================================================================

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one }) => ({
  company: one(companies, {
    fields: [marketplaceListings.companyId],
    references: [companies.id],
  }),
}));

// ============================================================================
// VIDEO MEETINGS RELATIONS
// ============================================================================

export const videoMeetingsRelations = relations(videoMeetings, ({ many }) => ({
  bookings: many(bookings),
}));

// ============================================================================
// INTEGRATIONS RELATIONS
// ============================================================================

export const whitelabelAppsRelations = relations(whitelabelApps, ({ one }) => ({
  company: one(companies, {
    fields: [whitelabelApps.companyId],
    references: [companies.id],
  }),
}));

// ============================================================================
// AUTOMATION RELATIONS
// ============================================================================

export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  company: one(companies, {
    fields: [automationRules.companyId],
    references: [companies.id],
  }),
  automationLogs: many(automationLogs),
}));

export const automationLogsRelations = relations(automationLogs, ({ one }) => ({
  rule: one(automationRules, {
    fields: [automationLogs.ruleId],
    references: [automationRules.id],
  }),
}));

// ============================================================================
// ANALYTICS & AUDIT RELATIONS
// ============================================================================

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  company: one(companies, {
    fields: [auditLogs.companyId],
    references: [companies.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  company: one(companies, {
    fields: [analyticsEvents.companyId],
    references: [companies.id],
  }),
}));

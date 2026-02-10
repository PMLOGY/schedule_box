/**
 * AI Schema
 *
 * AI prediction and model metrics tracking:
 * - ai_predictions: Polymorphic predictions for various entity types
 * - ai_model_metrics: ML model performance tracking (global table)
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  real,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';

// ============================================================================
// AI_PREDICTIONS TABLE
// ============================================================================

export const aiPredictions = pgTable(
  'ai_predictions',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 30 }).notNull(),
    entityType: varchar('entity_type', { length: 30 }).notNull(),
    entityId: integer('entity_id').notNull(),
    score: real('score').notNull(),
    confidence: real('confidence'),
    details: jsonb('details').default({}),
    modelVersion: varchar('model_version', { length: 50 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    typeCheck: check(
      'ai_prediction_type_check',
      sql`${table.type} IN ('no_show', 'clv', 'demand', 'churn', 'upsell', 'optimal_price', 'reminder_timing')`,
    ),
    entityTypeCheck: check(
      'ai_prediction_entity_type_check',
      sql`${table.entityType} IN ('booking', 'customer', 'service', 'timeslot')`,
    ),
    confidenceCheck: check(
      'ai_prediction_confidence_check',
      sql`${table.confidence} BETWEEN 0 AND 1 OR ${table.confidence} IS NULL`,
    ),
    companyIdx: index('idx_ai_predictions_company').on(table.companyId),
    entityIdx: index('idx_ai_predictions_entity').on(table.entityType, table.entityId),
    typeIdx: index('idx_ai_predictions_type').on(table.companyId, table.type),
  }),
);

// ============================================================================
// AI_MODEL_METRICS TABLE
// ============================================================================

export const aiModelMetrics = pgTable(
  'ai_model_metrics',
  {
    id: serial('id').primaryKey(),
    modelName: varchar('model_name', { length: 100 }).notNull(),
    modelVersion: varchar('model_version', { length: 50 }).notNull(),
    metricName: varchar('metric_name', { length: 50 }).notNull(),
    metricValue: real('metric_value').notNull(),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow(),
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    modelIdx: index('idx_ai_metrics_model').on(table.modelName, table.modelVersion),
  }),
);

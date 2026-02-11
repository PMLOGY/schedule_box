/**
 * Automation TypeScript Types
 *
 * Type definitions for automation rules and logs
 */

import { type z } from 'zod';
import {
  type automationRuleCreateSchema,
  type automationRuleUpdateSchema,
  type automationRuleListQuerySchema,
  type automationTriggerTypeEnum,
  type automationActionTypeEnum,
} from '../schemas/automation';

/**
 * Automation trigger type
 */
export type AutomationTriggerType = z.infer<typeof automationTriggerTypeEnum>;

/**
 * Automation action type
 */
export type AutomationActionType = z.infer<typeof automationActionTypeEnum>;

/**
 * Automation log status
 * Matches DB check constraint
 */
export type AutomationLogStatus = 'pending' | 'executed' | 'failed' | 'skipped';

/**
 * Automation rule create input
 */
export type AutomationRuleCreate = z.infer<typeof automationRuleCreateSchema>;

/**
 * Automation rule update input
 */
export type AutomationRuleUpdate = z.infer<typeof automationRuleUpdateSchema>;

/**
 * Automation rule list query parameters
 */
export type AutomationRuleListQuery = z.infer<typeof automationRuleListQuerySchema>;

/**
 * Platform Audit Log Helper
 *
 * Writes admin action audit entries to platform_audit_logs table.
 * Captures IP address, request ID, and before/after values for full traceability.
 *
 * Security requirement: NO try/catch — audit log failures must propagate to callers.
 * A failed audit log write must abort the request, not silently succeed.
 */

import type { NextRequest } from 'next/server';
import { db } from '@schedulebox/database';
import { platformAuditLogs } from '@schedulebox/database';

export interface AuditLogEntry {
  req: NextRequest;
  adminUuid: string;
  adminId: number;
  actionType: string;
  targetEntityType?: string;
  targetEntityId?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry for an admin action.
 *
 * Does NOT try/catch — callers must handle errors. A failed audit write
 * must prevent the associated action from being recorded silently.
 *
 * @param entry - Audit log data including request context and action details
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const {
    req,
    adminUuid,
    adminId,
    actionType,
    targetEntityType,
    targetEntityId,
    beforeValue,
    afterValue,
    metadata,
  } = entry;

  // Extract IP: prefer x-forwarded-for (first IP in chain), fallback to x-real-ip
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp ?? 'unknown');

  // Extract or generate request ID
  const vercelId = req.headers.get('x-vercel-id');
  const requestIdHeader = req.headers.get('x-request-id');
  const requestId = vercelId ?? requestIdHeader ?? crypto.randomUUID().slice(0, 16);

  await db.insert(platformAuditLogs).values({
    adminId,
    adminUuid,
    actionType,
    targetEntityType: targetEntityType ?? null,
    targetEntityId: targetEntityId ?? null,
    ipAddress,
    requestId,
    beforeValue: beforeValue ?? null,
    afterValue: afterValue ?? null,
    metadata: metadata ?? {},
  });
}

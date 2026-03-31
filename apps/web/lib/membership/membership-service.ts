/**
 * Membership Service Layer
 * Business logic for membership types CRUD, customer membership assignment,
 * booking-time validation, and punch card decrement.
 */

import { eq, and, or, gte, isNull } from 'drizzle-orm';
import {
  db,
  dbTx,
  membershipTypes,
  customerMemberships,
  customers,
  services,
} from '@schedulebox/database';
import { NotFoundError, ValidationError } from '@schedulebox/shared';
import type {
  MembershipTypeCreate,
  MembershipTypeUpdate,
  CustomerMembershipAssign,
} from '@/validations/membership';

// ============================================================================
// TYPES
// ============================================================================

export interface MembershipTypeResponse {
  id: string; // UUID
  name: string;
  description: string | null;
  type: 'monthly' | 'annual' | 'punch_card';
  price: string;
  currency: string | null;
  punchesIncluded: number | null;
  durationDays: number | null;
  serviceIds: string[] | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerMembershipResponse {
  id: string; // UUID
  membershipType: {
    id: string;
    name: string;
    type: 'monthly' | 'annual' | 'punch_card';
  };
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  startDate: string;
  endDate: string | null;
  remainingUses: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipValidationResult {
  valid: boolean;
  membership: CustomerMembershipResponse | null;
  reason?:
    | 'no_active_membership'
    | 'membership_expired'
    | 'service_not_covered'
    | 'no_remaining_uses';
}

// ============================================================================
// MEMBERSHIP TYPES CRUD
// ============================================================================

/**
 * Create a new membership type
 */
export async function createMembershipType(
  data: MembershipTypeCreate,
  companyId: number,
): Promise<MembershipTypeResponse> {
  // Validate punch_card requires punchesIncluded
  if (data.type === 'punch_card' && (!data.punchesIncluded || data.punchesIncluded <= 0)) {
    throw new ValidationError(
      'punchesIncluded is required and must be positive for punch_card type',
    );
  }

  // Auto-calculate durationDays for monthly/annual if not provided
  let durationDays = data.durationDays ?? null;
  if (data.type === 'monthly' && !durationDays) {
    durationDays = 30;
  } else if (data.type === 'annual' && !durationDays) {
    durationDays = 365;
  }

  const [created] = await db
    .insert(membershipTypes)
    .values({
      companyId,
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      price: data.price,
      currency: data.currency || 'CZK',
      punchesIncluded: data.punchesIncluded ?? null,
      durationDays,
      serviceIds: data.serviceIds ?? null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    })
    .returning();

  return mapMembershipType(created);
}

/**
 * Update an existing membership type by UUID
 */
export async function updateMembershipType(
  typeId: string,
  data: MembershipTypeUpdate,
  companyId: number,
): Promise<MembershipTypeResponse> {
  const [existing] = await db
    .select()
    .from(membershipTypes)
    .where(and(eq(membershipTypes.uuid, typeId), eq(membershipTypes.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Membership type not found');
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.punchesIncluded !== undefined) updateData.punchesIncluded = data.punchesIncluded;
  if (data.durationDays !== undefined) updateData.durationDays = data.durationDays;
  if (data.serviceIds !== undefined) updateData.serviceIds = data.serviceIds;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(membershipTypes)
    .set(updateData)
    .where(and(eq(membershipTypes.uuid, typeId), eq(membershipTypes.companyId, companyId)))
    .returning();

  return mapMembershipType(updated);
}

/**
 * Soft delete a membership type (set isActive=false)
 */
export async function deleteMembershipType(typeId: string, companyId: number): Promise<void> {
  const [existing] = await db
    .select({ id: membershipTypes.id })
    .from(membershipTypes)
    .where(and(eq(membershipTypes.uuid, typeId), eq(membershipTypes.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Membership type not found');
  }

  await db
    .update(membershipTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(membershipTypes.uuid, typeId), eq(membershipTypes.companyId, companyId)));
}

/**
 * List all active membership types for a company
 */
export async function listMembershipTypes(companyId: number): Promise<MembershipTypeResponse[]> {
  const rows = await db
    .select()
    .from(membershipTypes)
    .where(and(eq(membershipTypes.companyId, companyId), eq(membershipTypes.isActive, true)))
    .orderBy(membershipTypes.name);

  return rows.map(mapMembershipType);
}

/**
 * Get a single membership type by UUID
 */
export async function getMembershipType(
  typeId: string,
  companyId: number,
): Promise<MembershipTypeResponse> {
  const [row] = await db
    .select()
    .from(membershipTypes)
    .where(and(eq(membershipTypes.uuid, typeId), eq(membershipTypes.companyId, companyId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Membership type not found');
  }

  return mapMembershipType(row);
}

// ============================================================================
// CUSTOMER MEMBERSHIP ASSIGNMENT
// ============================================================================

/**
 * Assign a membership to a customer
 */
export async function assignMembership(
  customerUuid: string,
  data: CustomerMembershipAssign,
  companyId: number,
): Promise<CustomerMembershipResponse> {
  // 1. Resolve customer UUID to internal ID
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.uuid, customerUuid), eq(customers.companyId, companyId)))
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  // 2. Resolve membership type UUID to internal ID
  const [mType] = await db
    .select()
    .from(membershipTypes)
    .where(
      and(
        eq(membershipTypes.uuid, data.membershipTypeId),
        eq(membershipTypes.companyId, companyId),
        eq(membershipTypes.isActive, true),
      ),
    )
    .limit(1);

  if (!mType) {
    throw new NotFoundError('Membership type not found');
  }

  // 3. Calculate endDate from startDate + durationDays if not provided
  let endDate: string | null = data.endDate ?? null;
  if (!endDate && mType.durationDays) {
    const start = new Date(data.startDate);
    start.setDate(start.getDate() + mType.durationDays);
    endDate = start.toISOString().split('T')[0];
  }

  // 4. For punch_card type, set remainingUses
  const remainingUses = mType.type === 'punch_card' ? mType.punchesIncluded : null;

  // 5. Insert customer membership
  const [created] = await db
    .insert(customerMemberships)
    .values({
      companyId,
      customerId: customer.id,
      membershipTypeId: mType.id,
      status: 'active',
      startDate: data.startDate,
      endDate,
      remainingUses,
    })
    .returning();

  return {
    id: created.uuid,
    membershipType: {
      id: mType.uuid,
      name: mType.name,
      type: mType.type as 'monthly' | 'annual' | 'punch_card',
    },
    status: (created.status as 'active' | 'expired' | 'cancelled' | 'suspended') ?? 'active',
    startDate: created.startDate,
    endDate: created.endDate,
    remainingUses: created.remainingUses,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * List all memberships for a customer (includes membership type info via join)
 */
export async function listCustomerMemberships(
  customerUuid: string,
  companyId: number,
): Promise<CustomerMembershipResponse[]> {
  // Resolve customer UUID
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.uuid, customerUuid), eq(customers.companyId, companyId)))
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  const rows = await db
    .select({
      id: customerMemberships.uuid,
      status: customerMemberships.status,
      startDate: customerMemberships.startDate,
      endDate: customerMemberships.endDate,
      remainingUses: customerMemberships.remainingUses,
      createdAt: customerMemberships.createdAt,
      updatedAt: customerMemberships.updatedAt,
      typeId: membershipTypes.uuid,
      typeName: membershipTypes.name,
      typeType: membershipTypes.type,
      punchesIncluded: membershipTypes.punchesIncluded,
    })
    .from(customerMemberships)
    .innerJoin(membershipTypes, eq(customerMemberships.membershipTypeId, membershipTypes.id))
    .where(
      and(
        eq(customerMemberships.customerId, customer.id),
        eq(customerMemberships.companyId, companyId),
      ),
    )
    .orderBy(customerMemberships.createdAt);

  return rows.map((row) => ({
    id: row.id,
    membershipType: {
      id: row.typeId,
      name: row.typeName,
      type: row.typeType as 'monthly' | 'annual' | 'punch_card',
    },
    status: (row.status as 'active' | 'expired' | 'cancelled' | 'suspended') ?? 'active',
    startDate: row.startDate,
    endDate: row.endDate,
    remainingUses: row.remainingUses,
    punchesIncluded: row.punchesIncluded,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

// ============================================================================
// BOOKING-TIME VALIDATION
// ============================================================================

/**
 * Validate membership for a booking
 * Returns whether the customer has a valid active membership that covers the given service.
 */
export async function validateMembershipForBooking(
  customerId: number,
  serviceId: number,
  companyId: number,
): Promise<MembershipValidationResult> {
  const today = new Date().toISOString().split('T')[0];

  // Find active customer memberships
  const activeMemberships = await db
    .select({
      cmId: customerMemberships.id,
      cmUuid: customerMemberships.uuid,
      cmStatus: customerMemberships.status,
      cmStartDate: customerMemberships.startDate,
      cmEndDate: customerMemberships.endDate,
      cmRemainingUses: customerMemberships.remainingUses,
      cmCreatedAt: customerMemberships.createdAt,
      cmUpdatedAt: customerMemberships.updatedAt,
      mtUuid: membershipTypes.uuid,
      mtName: membershipTypes.name,
      mtType: membershipTypes.type,
      mtServiceIds: membershipTypes.serviceIds,
      mtPunchesIncluded: membershipTypes.punchesIncluded,
    })
    .from(customerMemberships)
    .innerJoin(membershipTypes, eq(customerMemberships.membershipTypeId, membershipTypes.id))
    .where(
      and(
        eq(customerMemberships.customerId, customerId),
        eq(customerMemberships.companyId, companyId),
        eq(customerMemberships.status, 'active'),
        or(isNull(customerMemberships.endDate), gte(customerMemberships.endDate, today)),
      ),
    );

  if (activeMemberships.length === 0) {
    return { valid: false, membership: null, reason: 'no_active_membership' };
  }

  // Resolve service UUID for serviceIds matching
  const [service] = await db
    .select({ uuid: services.uuid })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  const serviceUuid = service?.uuid;

  // Check each membership for service coverage
  for (const m of activeMemberships) {
    // Check service coverage: null serviceIds means all services covered
    const svcIds = m.mtServiceIds as string[] | null;
    if (svcIds !== null && serviceUuid && !svcIds.includes(serviceUuid)) {
      continue; // This membership doesn't cover this service
    }

    // For punch_card: check remaining uses
    if (m.mtType === 'punch_card') {
      if (m.cmRemainingUses !== null && m.cmRemainingUses <= 0) {
        continue; // No remaining uses on this punch card
      }
    }

    // Found a valid membership
    const membershipResponse: CustomerMembershipResponse = {
      id: m.cmUuid,
      membershipType: {
        id: m.mtUuid,
        name: m.mtName,
        type: m.mtType as 'monthly' | 'annual' | 'punch_card',
      },
      status: (m.cmStatus as 'active' | 'expired' | 'cancelled' | 'suspended') ?? 'active',
      startDate: m.cmStartDate,
      endDate: m.cmEndDate,
      remainingUses: m.cmRemainingUses,
      createdAt: m.cmCreatedAt,
      updatedAt: m.cmUpdatedAt,
    };

    return { valid: true, membership: membershipResponse };
  }

  // No membership covers this service or all are exhausted
  // Determine the best reason
  const hasServiceCoverage = activeMemberships.some((m) => {
    const svcIds = m.mtServiceIds as string[] | null;
    return svcIds === null || (serviceUuid && svcIds.includes(serviceUuid));
  });

  if (!hasServiceCoverage) {
    return { valid: false, membership: null, reason: 'service_not_covered' };
  }

  return { valid: false, membership: null, reason: 'no_remaining_uses' };
}

/**
 * Decrement punch card remaining uses (atomic)
 * If remaining uses reaches 0, set status to 'expired'
 */
export async function decrementPunchCard(
  customerMembershipId: number,
  companyId: number,
): Promise<void> {
  await dbTx.transaction(async (tx) => {
    // Get current membership
    const [membership] = await tx
      .select({
        id: customerMemberships.id,
        remainingUses: customerMemberships.remainingUses,
      })
      .from(customerMemberships)
      .where(
        and(
          eq(customerMemberships.id, customerMembershipId),
          eq(customerMemberships.companyId, companyId),
        ),
      )
      .for('update')
      .limit(1);

    if (!membership) {
      throw new NotFoundError('Customer membership not found');
    }

    if (membership.remainingUses === null || membership.remainingUses <= 0) {
      throw new ValidationError('No remaining uses on this punch card');
    }

    const newRemaining = membership.remainingUses - 1;
    const newStatus = newRemaining === 0 ? 'expired' : undefined;

    await tx
      .update(customerMemberships)
      .set({
        remainingUses: newRemaining,
        ...(newStatus ? { status: newStatus } : {}),
        updatedAt: new Date(),
      })
      .where(eq(customerMemberships.id, customerMembershipId));
  });
}

/**
 * Decrement punch card by UUID (used from booking flow)
 */
export async function decrementPunchCardByUuid(
  membershipUuid: string,
  companyId: number,
): Promise<void> {
  const [membership] = await db
    .select({ id: customerMemberships.id })
    .from(customerMemberships)
    .where(
      and(
        eq(customerMemberships.uuid, membershipUuid),
        eq(customerMemberships.companyId, companyId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new NotFoundError('Customer membership not found');
  }

  await decrementPunchCard(membership.id, companyId);
}

// ============================================================================
// HELPERS
// ============================================================================

function mapMembershipType(row: typeof membershipTypes.$inferSelect): MembershipTypeResponse {
  return {
    id: row.uuid,
    name: row.name,
    description: row.description,
    type: row.type as 'monthly' | 'annual' | 'punch_card',
    price: row.price,
    currency: row.currency,
    punchesIncluded: row.punchesIncluded,
    durationDays: row.durationDays,
    serviceIds: row.serviceIds as string[] | null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Password hashing and history management using Argon2id
 *
 * Security parameters (OWASP recommendations, Doc section 24.1):
 * - Algorithm: Argon2id (resistant to side-channel and GPU attacks)
 * - Memory: 65536 KiB (64 MB)
 * - Time cost: 3 iterations
 * - Parallelism: 4 threads
 * - History: Last 5 passwords tracked to prevent reuse
 */
import argon2 from 'argon2';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { users, passwordHistory } from '@schedulebox/database';

// Argon2id parameters matching OWASP recommendations (Doc sec 24.1)
const ARGON2_OPTIONS: argon2.Options & { type: number } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 threads
};

const PASSWORD_HISTORY_LIMIT = 5;

/**
 * Hash password using Argon2id with OWASP parameters
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify password against Argon2id hash
 *
 * Returns false on error instead of throwing to prevent timing attacks
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Invalid hash format or verification error
    return false;
  }
}

/**
 * Check if new password exists in user's password history
 *
 * @returns true if password is NOT in history (safe to use), false if found in history
 */
export async function checkPasswordHistory(userId: number, newPassword: string): Promise<boolean> {
  // Fetch last N password hashes
  const history = await db
    .select({
      passwordHash: passwordHistory.passwordHash,
    })
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(PASSWORD_HISTORY_LIMIT);

  // Check if new password matches any historical hash
  for (const record of history) {
    const matches = await verifyPassword(record.passwordHash, newPassword);
    if (matches) {
      return false; // Password found in history
    }
  }

  return true; // Password is not in history (safe to use)
}

/**
 * Update user password and maintain password history
 *
 * Steps:
 * 1. Hash new password
 * 2. Update users.passwordHash and passwordChangedAt
 * 3. Insert into password_history
 * 4. Clean up old history entries beyond limit
 */
export async function updatePassword(userId: number, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  const passwordChangedAt = new Date();

  await db.transaction(async (tx) => {
    // Update user's password
    await tx
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt,
      })
      .where(eq(users.id, userId));

    // Insert into password history
    await tx.insert(passwordHistory).values({
      userId,
      passwordHash,
    });

    // Clean up old history entries (keep only last N)
    const allHistory = await tx
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt));

    // Delete entries beyond the limit
    const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT);
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map((h) => h.id);
      await tx.delete(passwordHistory).where(inArray(passwordHistory.id, idsToDelete));
    }
  });
}

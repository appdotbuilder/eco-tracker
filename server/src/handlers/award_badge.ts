import { db } from '../db';
import { badgesTable, usersTable } from '../db/schema';
import { type Badge, type BadgeType } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function awardBadge(userId: number, badgeType: BadgeType, title: string, description?: string): Promise<Badge> {
  try {
    // Check if user already has this specific badge type
    const existingBadge = await db.select()
      .from(badgesTable)
      .where(
        and(
          eq(badgesTable.user_id, userId),
          eq(badgesTable.badge_type, badgeType)
        )
      )
      .execute();

    // If badge already exists, return the existing one
    if (existingBadge.length > 0) {
      return existingBadge[0];
    }

    // Create new badge record
    const result = await db.insert(badgesTable)
      .values({
        user_id: userId,
        badge_type: badgeType,
        title: title,
        description: description || null
      })
      .returning()
      .execute();

    const newBadge = result[0];

    // Update user's total points (award 10 points per badge)
    const currentUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (currentUser.length > 0) {
      await db.update(usersTable)
        .set({ 
          total_points: currentUser[0].total_points + 10
        })
        .where(eq(usersTable.id, userId))
        .execute();
    }

    return newBadge;
  } catch (error) {
    console.error('Badge awarding failed:', error);
    throw error;
  }
}
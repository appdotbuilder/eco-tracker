import { db } from '../db';
import { badgesTable } from '../db/schema';
import { type Badge } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserBadges(userId: number): Promise<Badge[]> {
  try {
    const result = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, userId))
      .orderBy(desc(badgesTable.earned_at))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch user badges:', error);
    throw error;
  }
}
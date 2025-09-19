import { db } from '../db';
import { challengesTable } from '../db/schema';
import { type Challenge } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserChallenges = async (userId: number): Promise<Challenge[]> => {
  try {
    // Query challenges for the specific user, ordered by most recent first
    const results = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.user_id, userId))
      .orderBy(desc(challengesTable.created_at))
      .execute();

    // Convert date fields and return properly typed challenges
    return results.map(challenge => ({
      ...challenge,
      start_date: new Date(challenge.start_date),
      end_date: challenge.end_date ? new Date(challenge.end_date) : null,
      created_at: new Date(challenge.created_at)
    }));
  } catch (error) {
    console.error('Failed to get user challenges:', error);
    throw error;
  }
};
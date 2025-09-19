import { db } from '../db';
import { goalsTable } from '../db/schema';
import { type Goal } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserGoals = async (userId: number): Promise<Goal[]> => {
  try {
    // Query goals for the specific user, ordered by created date (most recent first)
    const results = await db.select()
      .from(goalsTable)
      .where(eq(goalsTable.user_id, userId))
      .orderBy(desc(goalsTable.created_at))
      .execute();

    // Convert numeric fields and dates to proper types for schema compliance
    return results.map(goal => ({
      ...goal,
      target_value: parseFloat(goal.target_value),
      current_value: parseFloat(goal.current_value),
      start_date: new Date(goal.start_date),
      end_date: goal.end_date ? new Date(goal.end_date) : null,
      created_at: new Date(goal.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch user goals:', error);
    throw error;
  }
};
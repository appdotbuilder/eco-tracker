import { db } from '../db';
import { challengesTable, usersTable, type NewChallenge } from '../db/schema';
import { type CreateChallengeInput, type Challenge } from '../schema';
import { eq } from 'drizzle-orm';

export const createChallenge = async (input: CreateChallengeInput): Promise<Challenge> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Calculate end_date based on start_date and target_days
    const endDate = new Date(input.start_date);
    endDate.setDate(endDate.getDate() + input.target_days);

    // Prepare the insert data
    const insertData: NewChallenge = {
      user_id: input.user_id,
      challenge_type: input.challenge_type,
      title: input.title,
      description: input.description,
      target_days: input.target_days,
      start_date: input.start_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      end_date: endDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      // Default values are handled by the database schema:
      // completed_days: 0, is_completed: false, created_at: now()
    };

    // Insert challenge record
    const result = await db.insert(challengesTable)
      .values(insertData)
      .returning()
      .execute();

    // Convert date fields back to Date objects before returning
    const challenge = result[0];
    return {
      ...challenge,
      start_date: new Date(challenge.start_date),
      end_date: challenge.end_date ? new Date(challenge.end_date) : null,
      created_at: new Date(challenge.created_at)
    };
  } catch (error) {
    console.error('Challenge creation failed:', error);
    throw error;
  }
};
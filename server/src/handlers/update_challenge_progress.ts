import { db } from '../db';
import { challengesTable, usersTable, badgesTable } from '../db/schema';
import { type UpdateChallengeProgressInput, type Challenge } from '../schema';
import { eq, sql, and } from 'drizzle-orm';

export const updateChallengeProgress = async (input: UpdateChallengeProgressInput): Promise<Challenge> => {
  try {
    // First, get the current challenge to validate it exists
    const existingChallenge = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.id, input.challenge_id))
      .execute();

    if (existingChallenge.length === 0) {
      throw new Error(`Challenge with id ${input.challenge_id} not found`);
    }

    const challenge = existingChallenge[0];
    
    // Check if challenge is completed based on completed_days vs target_days
    const isCompleted = input.completed_days >= challenge.target_days;
    
    // Update challenge progress
    const updatedChallenges = await db.update(challengesTable)
      .set({
        completed_days: input.completed_days,
        is_completed: isCompleted,
        end_date: isCompleted ? sql`CURRENT_DATE` : challenge.end_date
      })
      .where(eq(challengesTable.id, input.challenge_id))
      .returning()
      .execute();

    const updatedChallenge = updatedChallenges[0];

    // If challenge just got completed (wasn't completed before but is now)
    if (isCompleted && !challenge.is_completed) {
      // Award points to user (50 points for completing a challenge)
      await db.update(usersTable)
        .set({
          total_points: sql`${usersTable.total_points} + 50`
        })
        .where(eq(usersTable.id, challenge.user_id))
        .execute();

      // Award appropriate badge based on challenge type
      let badgeType: 'eco_warrior' | 'diet_champion' | 'transport_hero' = 'eco_warrior';
      let badgeTitle = 'Eco Warrior';
      let badgeDescription = 'Completed an environmental challenge';

      if (challenge.challenge_type === 'meatless_week') {
        badgeType = 'diet_champion';
        badgeTitle = 'Diet Champion';
        badgeDescription = 'Completed a week of plant-based meals';
      } else if (challenge.challenge_type === 'public_transport_challenge') {
        badgeType = 'transport_hero';
        badgeTitle = 'Transport Hero';
        badgeDescription = 'Completed a public transport challenge';
      }

      // Check if user already has this badge type to avoid duplicates
      const existingBadge = await db.select()
        .from(badgesTable)
        .where(and(
          eq(badgesTable.user_id, challenge.user_id),
          eq(badgesTable.badge_type, badgeType)
        ))
        .execute();

      if (existingBadge.length === 0) {
        await db.insert(badgesTable)
          .values({
            user_id: challenge.user_id,
            badge_type: badgeType,
            title: badgeTitle,
            description: badgeDescription
          })
          .execute();
      }
    }

    // Convert date fields to Date objects for return type compatibility
    return {
      ...updatedChallenge,
      start_date: new Date(updatedChallenge.start_date),
      end_date: updatedChallenge.end_date ? new Date(updatedChallenge.end_date) : null,
      created_at: updatedChallenge.created_at
    };
  } catch (error) {
    console.error('Challenge progress update failed:', error);
    throw error;
  }
};
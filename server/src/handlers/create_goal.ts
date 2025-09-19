import { db } from '../db';
import { goalsTable, usersTable, type NewGoal } from '../db/schema';
import { type CreateGoalInput, type Goal } from '../schema';
import { eq } from 'drizzle-orm';

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  try {
    // Verify user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Create the goal using the proper database type
    const goalData: NewGoal = {
      user_id: input.user_id,
      goal_type: input.goal_type,
      title: input.title,
      description: input.description,
      target_value: input.target_value.toString(), // Convert number to string for numeric column
      start_date: input.start_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      end_date: input.end_date ? input.end_date.toISOString().split('T')[0] : null
      // current_value and is_achieved will use their defaults
    };

    const result = await db.insert(goalsTable)
      .values(goalData)
      .returning()
      .execute();

    const createdGoal = result[0];

    // Award points to user for goal setting (10 points)
    await db.update(usersTable)
      .set({
        total_points: existingUser[0].total_points + 10,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .execute();

    // Convert numeric and date fields back to proper types before returning
    return {
      ...createdGoal,
      target_value: parseFloat(createdGoal.target_value),
      current_value: parseFloat(createdGoal.current_value),
      start_date: new Date(createdGoal.start_date),
      end_date: createdGoal.end_date ? new Date(createdGoal.end_date) : null
    };
  } catch (error) {
    console.error('Goal creation failed:', error);
    throw error;
  }
}
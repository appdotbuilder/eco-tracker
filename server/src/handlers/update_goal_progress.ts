import { db } from '../db';
import { goalsTable, usersTable } from '../db/schema';
import { type UpdateGoalProgressInput, type Goal } from '../schema';
import { eq } from 'drizzle-orm';

export const updateGoalProgress = async (input: UpdateGoalProgressInput): Promise<Goal> => {
  try {
    // First, get the current goal to check if it exists
    const existingGoals = await db.select()
      .from(goalsTable)
      .where(eq(goalsTable.id, input.goal_id))
      .execute();

    if (existingGoals.length === 0) {
      throw new Error(`Goal with ID ${input.goal_id} not found`);
    }

    const existingGoal = existingGoals[0];
    
    // Check if goal is achieved based on current_value >= target_value
    const isAchieved = input.current_value >= parseFloat(existingGoal.target_value);
    
    // Update the goal with new current_value and achievement status
    const updatedGoals = await db.update(goalsTable)
      .set({
        current_value: input.current_value.toString(),
        is_achieved: isAchieved
      })
      .where(eq(goalsTable.id, input.goal_id))
      .returning()
      .execute();

    const updatedGoal = updatedGoals[0];

    // If the goal was just achieved (wasn't achieved before but is now), award points
    if (isAchieved && !existingGoal.is_achieved) {
      // Get current points and add 100
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, existingGoal.user_id))
        .execute();

      if (users.length > 0) {
        const currentPoints = users[0].total_points;
        await db.update(usersTable)
          .set({
            total_points: currentPoints + 100
          })
          .where(eq(usersTable.id, existingGoal.user_id))
          .execute();
      }
    }

    // Convert numeric fields and dates back to proper types before returning
    return {
      ...updatedGoal,
      target_value: parseFloat(updatedGoal.target_value),
      current_value: parseFloat(updatedGoal.current_value),
      start_date: new Date(updatedGoal.start_date),
      end_date: updatedGoal.end_date ? new Date(updatedGoal.end_date) : null
    };
  } catch (error) {
    console.error('Goal progress update failed:', error);
    throw error;
  }
};
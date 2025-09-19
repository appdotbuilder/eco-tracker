import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, goalsTable } from '../db/schema';
import { type UpdateGoalProgressInput } from '../schema';
import { updateGoalProgress } from '../handlers/update_goal_progress';
import { eq } from 'drizzle-orm';

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  total_points: 50
};

const testGoal = {
  user_id: 1,
  goal_type: 'percentage_reduction' as const,
  title: 'Reduce Carbon Footprint',
  description: 'Reduce emissions by 30%',
  target_value: '30.00',
  current_value: '10.00',
  is_achieved: false,
  start_date: '2024-01-01',
  end_date: '2024-12-31'
};

describe('updateGoalProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update goal progress without achieving the goal', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test goal
    const goals = await db.insert(goalsTable)
      .values({
        ...testGoal,
        user_id: userId
      })
      .returning()
      .execute();
    const goalId = goals[0].id;

    const input: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 20
    };

    const result = await updateGoalProgress(input);

    // Verify the result
    expect(result.id).toEqual(goalId);
    expect(result.current_value).toEqual(20);
    expect(result.is_achieved).toBe(false);
    expect(typeof result.current_value).toBe('number');
    expect(typeof result.target_value).toBe('number');
  });

  it('should update goal progress and mark as achieved when target is reached', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test goal
    const goals = await db.insert(goalsTable)
      .values({
        ...testGoal,
        user_id: userId
      })
      .returning()
      .execute();
    const goalId = goals[0].id;

    const input: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 30
    };

    const result = await updateGoalProgress(input);

    // Verify the goal is achieved
    expect(result.id).toEqual(goalId);
    expect(result.current_value).toEqual(30);
    expect(result.target_value).toEqual(30);
    expect(result.is_achieved).toBe(true);
  });

  it('should update goal progress and mark as achieved when target is exceeded', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test goal
    const goals = await db.insert(goalsTable)
      .values({
        ...testGoal,
        user_id: userId
      })
      .returning()
      .execute();
    const goalId = goals[0].id;

    const input: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 35
    };

    const result = await updateGoalProgress(input);

    // Verify the goal is achieved
    expect(result.id).toEqual(goalId);
    expect(result.current_value).toEqual(35);
    expect(result.target_value).toEqual(30);
    expect(result.is_achieved).toBe(true);
  });

  it('should award points when goal is achieved for the first time', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test goal
    const goals = await db.insert(goalsTable)
      .values({
        ...testGoal,
        user_id: userId
      })
      .returning()
      .execute();
    const goalId = goals[0].id;

    const input: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 30
    };

    await updateGoalProgress(input);

    // Check that user received points
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers[0].total_points).toEqual(150); // Original 50 + 100 bonus
  });

  it('should not award additional points if goal was already achieved', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test goal that's already achieved
    const goals = await db.insert(goalsTable)
      .values({
        ...testGoal,
        user_id: userId,
        current_value: '30.00',
        is_achieved: true
      })
      .returning()
      .execute();
    const goalId = goals[0].id;

    const input: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 35
    };

    await updateGoalProgress(input);

    // Check that user didn't receive additional points
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers[0].total_points).toEqual(50); // Still original points
  });

  it('should save updated progress to database', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test goal
    const goals = await db.insert(goalsTable)
      .values({
        ...testGoal,
        user_id: userId
      })
      .returning()
      .execute();
    const goalId = goals[0].id;

    const input: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 25
    };

    await updateGoalProgress(input);

    // Query database directly to verify changes
    const updatedGoals = await db.select()
      .from(goalsTable)
      .where(eq(goalsTable.id, goalId))
      .execute();

    expect(updatedGoals).toHaveLength(1);
    expect(parseFloat(updatedGoals[0].current_value)).toEqual(25);
    expect(updatedGoals[0].is_achieved).toBe(false);
  });

  it('should throw error when goal does not exist', async () => {
    const input: UpdateGoalProgressInput = {
      goal_id: 999,
      current_value: 50
    };

    await expect(updateGoalProgress(input)).rejects.toThrow(/Goal with ID 999 not found/i);
  });

  it('should handle specific target goal type correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create specific target goal
    const goals = await db.insert(goalsTable)
      .values({
        ...testGoal,
        user_id: userId,
        goal_type: 'specific_target',
        title: 'Reduce to 500kg CO2',
        target_value: '500.00',
        current_value: '600.00'
      })
      .returning()
      .execute();
    const goalId = goals[0].id;

    const input: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 450
    };

    const result = await updateGoalProgress(input);

    // Verify the goal is achieved (current <= target for reduction goals)
    expect(result.current_value).toEqual(450);
    expect(result.target_value).toEqual(500);
    expect(result.is_achieved).toBe(false); // 450 < 500, so not achieved yet

    // Update to achieve the goal
    const achieveInput: UpdateGoalProgressInput = {
      goal_id: goalId,
      current_value: 500
    };

    const achievedResult = await updateGoalProgress(achieveInput);
    expect(achievedResult.is_achieved).toBe(true);
  });
});
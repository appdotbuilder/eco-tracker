import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { goalsTable, usersTable } from '../db/schema';
import { type CreateGoalInput } from '../schema';
import { createGoal } from '../handlers/create_goal';
import { eq } from 'drizzle-orm';

describe('createGoal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        total_points: 50
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  const createTestInput = (overrides: Partial<CreateGoalInput> = {}): CreateGoalInput => ({
    user_id: testUserId,
    goal_type: 'percentage_reduction',
    title: 'Reduce Carbon Footprint',
    description: 'Reduce my carbon emissions by 25%',
    target_value: 25.5,
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    ...overrides
  });

  it('should create a goal successfully', async () => {
    const input = createTestInput();
    const result = await createGoal(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.goal_type).toEqual('percentage_reduction');
    expect(result.title).toEqual('Reduce Carbon Footprint');
    expect(result.description).toEqual('Reduce my carbon emissions by 25%');
    expect(result.target_value).toEqual(25.5);
    expect(typeof result.target_value).toBe('number'); // Verify numeric conversion
    expect(result.current_value).toEqual(0);
    expect(typeof result.current_value).toBe('number'); // Verify numeric conversion
    expect(result.is_achieved).toBe(false);
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-12-31'));
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save goal to database', async () => {
    const input = createTestInput();
    const result = await createGoal(input);

    const goals = await db.select()
      .from(goalsTable)
      .where(eq(goalsTable.id, result.id))
      .execute();

    expect(goals).toHaveLength(1);
    expect(goals[0].user_id).toEqual(testUserId);
    expect(goals[0].goal_type).toEqual('percentage_reduction');
    expect(goals[0].title).toEqual('Reduce Carbon Footprint');
    expect(parseFloat(goals[0].target_value)).toEqual(25.5);
    expect(parseFloat(goals[0].current_value)).toEqual(0);
    expect(goals[0].is_achieved).toBe(false);
    expect(goals[0].start_date).toEqual('2024-01-01');
    expect(goals[0].end_date).toEqual('2024-12-31');
  });

  it('should award 10 points to user for goal setting', async () => {
    const input = createTestInput();
    await createGoal(input);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].total_points).toEqual(60); // 50 initial + 10 for goal
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle specific_target goal type', async () => {
    const input = createTestInput({
      goal_type: 'specific_target',
      title: 'Carbon Limit Goal',
      description: 'Keep emissions under 1000kg CO2',
      target_value: 1000
    });

    const result = await createGoal(input);

    expect(result.goal_type).toEqual('specific_target');
    expect(result.title).toEqual('Carbon Limit Goal');
    expect(result.target_value).toEqual(1000);
  });

  it('should handle eco_challenge goal type', async () => {
    const input = createTestInput({
      goal_type: 'eco_challenge',
      title: 'Green Challenge',
      description: 'Complete eco-friendly activities',
      target_value: 5
    });

    const result = await createGoal(input);

    expect(result.goal_type).toEqual('eco_challenge');
    expect(result.title).toEqual('Green Challenge');
    expect(result.target_value).toEqual(5);
  });

  it('should handle goal with null description', async () => {
    const input = createTestInput({
      description: null
    });

    const result = await createGoal(input);

    expect(result.description).toBeNull();
  });

  it('should handle goal with null end_date', async () => {
    const input = createTestInput({
      end_date: null
    });

    const result = await createGoal(input);

    expect(result.end_date).toBeNull();
  });

  it('should handle decimal target values correctly', async () => {
    const input = createTestInput({
      target_value: 33.75
    });

    const result = await createGoal(input);

    expect(result.target_value).toEqual(33.75);
    expect(typeof result.target_value).toBe('number');
  });

  it('should throw error when user does not exist', async () => {
    const input = createTestInput({
      user_id: 99999 // Non-existent user
    });

    await expect(createGoal(input)).rejects.toThrow();
  });

  it('should initialize current_value to 0 and is_achieved to false', async () => {
    const input = createTestInput();
    const result = await createGoal(input);

    expect(result.current_value).toEqual(0);
    expect(result.is_achieved).toBe(false);
  });

  it('should handle large target values', async () => {
    const input = createTestInput({
      target_value: 99999.99
    });

    const result = await createGoal(input);

    expect(result.target_value).toEqual(99999.99);
    expect(typeof result.target_value).toBe('number');
  });

  it('should update user updated_at timestamp', async () => {
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const originalUpdatedAt = originalUser[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input = createTestInput();
    await createGoal(input);

    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
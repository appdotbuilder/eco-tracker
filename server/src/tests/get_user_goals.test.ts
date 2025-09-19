import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, goalsTable } from '../db/schema';
import { type CreateUserInput, type CreateGoalInput } from '../schema';
import { getUserGoals } from '../handlers/get_user_goals';

// Test users
const testUser1: CreateUserInput = {
  username: 'goaluser1',
  email: 'goaluser1@example.com'
};

const testUser2: CreateUserInput = {
  username: 'goaluser2', 
  email: 'goaluser2@example.com'
};

// Test goal inputs
const goalInput1: CreateGoalInput = {
  user_id: 1,
  goal_type: 'percentage_reduction',
  title: 'Reduce emissions by 20%',
  description: 'Reduce my carbon footprint by 20% this year',
  target_value: 20,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

const goalInput2: CreateGoalInput = {
  user_id: 1,
  goal_type: 'specific_target',
  title: 'Limit to 100kg CO2 monthly',
  description: 'Keep monthly emissions under 100kg CO2',
  target_value: 100,
  start_date: new Date('2024-02-01'),
  end_date: null
};

const goalInput3: CreateGoalInput = {
  user_id: 2,
  goal_type: 'eco_challenge',
  title: 'Complete eco challenges',
  description: 'Complete 5 different eco challenges',
  target_value: 5,
  start_date: new Date('2024-01-15'),
  end_date: new Date('2024-06-15')
};

describe('getUserGoals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no goals', async () => {
    // Create user but no goals
    await db.insert(usersTable)
      .values({
        username: testUser1.username,
        email: testUser1.email
      })
      .execute();

    const result = await getUserGoals(1);

    expect(result).toEqual([]);
  });

  it('should fetch all goals for a specific user', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        { username: testUser1.username, email: testUser1.email },
        { username: testUser2.username, email: testUser2.email }
      ])
      .execute();

    // Create goals for both users
    await db.insert(goalsTable)
      .values([
        {
          user_id: goalInput1.user_id,
          goal_type: goalInput1.goal_type,
          title: goalInput1.title,
          description: goalInput1.description,
          target_value: goalInput1.target_value.toString(),
          start_date: goalInput1.start_date.toISOString().split('T')[0],
          end_date: goalInput1.end_date ? goalInput1.end_date.toISOString().split('T')[0] : null
        },
        {
          user_id: goalInput2.user_id,
          goal_type: goalInput2.goal_type,
          title: goalInput2.title,
          description: goalInput2.description,
          target_value: goalInput2.target_value.toString(),
          start_date: goalInput2.start_date.toISOString().split('T')[0],
          end_date: null
        },
        {
          user_id: goalInput3.user_id,
          goal_type: goalInput3.goal_type,
          title: goalInput3.title,
          description: goalInput3.description,
          target_value: goalInput3.target_value.toString(),
          start_date: goalInput3.start_date.toISOString().split('T')[0],
          end_date: goalInput3.end_date ? goalInput3.end_date.toISOString().split('T')[0] : null
        }
      ])
      .execute();

    const user1Goals = await getUserGoals(1);
    const user2Goals = await getUserGoals(2);

    // User 1 should have 2 goals
    expect(user1Goals).toHaveLength(2);
    expect(user1Goals.every(goal => goal.user_id === 1)).toBe(true);

    // User 2 should have 1 goal
    expect(user2Goals).toHaveLength(1);
    expect(user2Goals[0].user_id).toBe(2);
  });

  it('should order goals by created date (most recent first)', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        username: testUser1.username,
        email: testUser1.email
      })
      .execute();

    // Create goals with different timestamps
    const goal1 = await db.insert(goalsTable)
      .values({
        user_id: 1,
        goal_type: 'percentage_reduction',
        title: 'First Goal',
        target_value: '10',
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const goal2 = await db.insert(goalsTable)
      .values({
        user_id: 1,
        goal_type: 'specific_target',
        title: 'Second Goal',
        target_value: '20',
        start_date: '2024-01-02'
      })
      .returning()
      .execute();

    const result = await getUserGoals(1);

    expect(result).toHaveLength(2);
    // Most recent goal should be first
    expect(result[0].title).toBe('Second Goal');
    expect(result[1].title).toBe('First Goal');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should include both active and completed goals', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        username: testUser1.username,
        email: testUser1.email
      })
      .execute();

    // Create active and completed goals
    await db.insert(goalsTable)
      .values([
        {
          user_id: 1,
          goal_type: 'percentage_reduction',
          title: 'Active Goal',
          target_value: '20',
          current_value: '10',
          is_achieved: false,
          start_date: '2024-01-01'
        },
        {
          user_id: 1,
          goal_type: 'specific_target',
          title: 'Completed Goal',
          target_value: '100',
          current_value: '100',
          is_achieved: true,
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      ])
      .execute();

    const result = await getUserGoals(1);

    expect(result).toHaveLength(2);
    
    const activeGoal = result.find(goal => goal.title === 'Active Goal');
    const completedGoal = result.find(goal => goal.title === 'Completed Goal');

    expect(activeGoal).toBeDefined();
    expect(activeGoal!.is_achieved).toBe(false);
    expect(completedGoal).toBeDefined();
    expect(completedGoal!.is_achieved).toBe(true);
  });

  it('should include progress information with correct numeric types', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        username: testUser1.username,
        email: testUser1.email
      })
      .execute();

    // Create goal with progress
    await db.insert(goalsTable)
      .values({
        user_id: 1,
        goal_type: 'percentage_reduction',
        title: 'Progress Goal',
        target_value: '50.75',
        current_value: '25.25',
        start_date: '2024-01-01'
      })
      .execute();

    const result = await getUserGoals(1);

    expect(result).toHaveLength(1);
    expect(result[0].target_value).toBe(50.75);
    expect(result[0].current_value).toBe(25.25);
    expect(typeof result[0].target_value).toBe('number');
    expect(typeof result[0].current_value).toBe('number');
  });

  it('should handle all goal types correctly', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        username: testUser1.username,
        email: testUser1.email
      })
      .execute();

    // Create goals of different types
    await db.insert(goalsTable)
      .values([
        {
          user_id: 1,
          goal_type: 'percentage_reduction',
          title: 'Percentage Goal',
          target_value: '25',
          start_date: '2024-01-01'
        },
        {
          user_id: 1,
          goal_type: 'specific_target',
          title: 'Target Goal',
          target_value: '150',
          start_date: '2024-01-01'
        },
        {
          user_id: 1,
          goal_type: 'eco_challenge',
          title: 'Challenge Goal',
          target_value: '10',
          start_date: '2024-01-01'
        }
      ])
      .execute();

    const result = await getUserGoals(1);

    expect(result).toHaveLength(3);
    
    const goalTypes = result.map(goal => goal.goal_type).sort();
    expect(goalTypes).toEqual(['eco_challenge', 'percentage_reduction', 'specific_target']);
  });

  it('should return goals with proper schema structure', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        username: testUser1.username,
        email: testUser1.email
      })
      .execute();

    // Create goal with all fields
    await db.insert(goalsTable)
      .values({
        user_id: 1,
        goal_type: 'percentage_reduction',
        title: 'Complete Goal',
        description: 'A comprehensive goal for testing',
        target_value: '30',
        current_value: '15',
        is_achieved: false,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .execute();

    const result = await getUserGoals(1);

    expect(result).toHaveLength(1);
    const goal = result[0];

    // Validate schema structure
    expect(goal.id).toBeDefined();
    expect(typeof goal.id).toBe('number');
    expect(goal.user_id).toBe(1);
    expect(goal.goal_type).toBe('percentage_reduction');
    expect(goal.title).toBe('Complete Goal');
    expect(goal.description).toBe('A comprehensive goal for testing');
    expect(goal.target_value).toBe(30);
    expect(goal.current_value).toBe(15);
    expect(goal.is_achieved).toBe(false);
    expect(goal.start_date).toBeInstanceOf(Date);
    expect(goal.end_date).toBeInstanceOf(Date);
    expect(goal.created_at).toBeInstanceOf(Date);
  });
});
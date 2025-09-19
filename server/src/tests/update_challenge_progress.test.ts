import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, challengesTable, badgesTable } from '../db/schema';
import { type UpdateChallengeProgressInput, type CreateUserInput, type CreateChallengeInput } from '../schema';
import { updateChallengeProgress } from '../handlers/update_challenge_progress';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com'
};

const testChallenge: CreateChallengeInput = {
  user_id: 1, // Will be updated after creating user
  challenge_type: 'meatless_week',
  title: 'Meatless Week Challenge',
  description: 'Try plant-based meals for a week',
  target_days: 7,
  start_date: new Date('2024-01-01')
};

describe('updateChallengeProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update challenge progress without completing', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        total_points: 100
      })
      .returning()
      .execute();
    
    const user = users[0];

    // Create test challenge
    const challenges = await db.insert(challengesTable)
      .values({
        user_id: user.id,
        challenge_type: testChallenge.challenge_type,
        title: testChallenge.title,
        description: testChallenge.description,
        target_days: testChallenge.target_days,
        completed_days: 0,
        is_completed: false,
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const challenge = challenges[0];

    const input: UpdateChallengeProgressInput = {
      challenge_id: challenge.id,
      completed_days: 3
    };

    // Update progress
    const result = await updateChallengeProgress(input);

    // Verify result
    expect(result.id).toBe(challenge.id);
    expect(result.completed_days).toBe(3);
    expect(result.is_completed).toBe(false);
    expect(result.end_date).toBeNull();

    // Verify database was updated
    const updatedChallenges = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.id, challenge.id))
      .execute();

    expect(updatedChallenges).toHaveLength(1);
    expect(updatedChallenges[0].completed_days).toBe(3);
    expect(updatedChallenges[0].is_completed).toBe(false);

    // Verify user points unchanged (not completed)
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].total_points).toBe(100);
  });

  it('should complete challenge and award points and badge', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        total_points: 100
      })
      .returning()
      .execute();
    
    const user = users[0];

    // Create test challenge
    const challenges = await db.insert(challengesTable)
      .values({
        user_id: user.id,
        challenge_type: testChallenge.challenge_type,
        title: testChallenge.title,
        description: testChallenge.description,
        target_days: testChallenge.target_days,
        completed_days: 6,
        is_completed: false,
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const challenge = challenges[0];

    const input: UpdateChallengeProgressInput = {
      challenge_id: challenge.id,
      completed_days: 7
    };

    // Complete challenge
    const result = await updateChallengeProgress(input);

    // Verify result
    expect(result.id).toBe(challenge.id);
    expect(result.completed_days).toBe(7);
    expect(result.is_completed).toBe(true);
    expect(result.end_date).not.toBeNull();

    // Verify database was updated
    const updatedChallenges = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.id, challenge.id))
      .execute();

    expect(updatedChallenges).toHaveLength(1);
    expect(updatedChallenges[0].completed_days).toBe(7);
    expect(updatedChallenges[0].is_completed).toBe(true);
    expect(updatedChallenges[0].end_date).not.toBeNull();

    // Verify user points increased by 50
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].total_points).toBe(150);

    // Verify badge was awarded
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, user.id))
      .execute();

    expect(badges).toHaveLength(1);
    expect(badges[0].badge_type).toBe('diet_champion');
    expect(badges[0].title).toBe('Diet Champion');
    expect(badges[0].description).toBe('Completed a week of plant-based meals');
  });

  it('should complete challenge with more than target days', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        total_points: 200
      })
      .returning()
      .execute();
    
    const user = users[0];

    // Create test challenge
    const challenges = await db.insert(challengesTable)
      .values({
        user_id: user.id,
        challenge_type: 'public_transport_challenge',
        title: 'Public Transport Challenge',
        description: 'Use public transport for a week',
        target_days: 5,
        completed_days: 3,
        is_completed: false,
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const challenge = challenges[0];

    const input: UpdateChallengeProgressInput = {
      challenge_id: challenge.id,
      completed_days: 10
    };

    // Complete challenge with extra days
    const result = await updateChallengeProgress(input);

    // Verify result
    expect(result.completed_days).toBe(10);
    expect(result.is_completed).toBe(true);

    // Verify correct badge type for transport challenge
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, user.id))
      .execute();

    expect(badges).toHaveLength(1);
    expect(badges[0].badge_type).toBe('transport_hero');
    expect(badges[0].title).toBe('Transport Hero');
  });

  it('should not award duplicate badges for same challenge type', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        total_points: 100
      })
      .returning()
      .execute();
    
    const user = users[0];

    // Create existing badge
    await db.insert(badgesTable)
      .values({
        user_id: user.id,
        badge_type: 'diet_champion',
        title: 'Diet Champion',
        description: 'Already earned'
      })
      .execute();

    // Create test challenge
    const challenges = await db.insert(challengesTable)
      .values({
        user_id: user.id,
        challenge_type: testChallenge.challenge_type,
        title: testChallenge.title,
        description: testChallenge.description,
        target_days: testChallenge.target_days,
        completed_days: 6,
        is_completed: false,
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const challenge = challenges[0];

    const input: UpdateChallengeProgressInput = {
      challenge_id: challenge.id,
      completed_days: 7
    };

    // Complete challenge
    await updateChallengeProgress(input);

    // Verify only one badge exists (no duplicate)
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, user.id))
      .execute();

    expect(badges).toHaveLength(1);
    expect(badges[0].description).toBe('Already earned');
  });

  it('should not award points and badges if challenge was already completed', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        total_points: 100
      })
      .returning()
      .execute();
    
    const user = users[0];

    // Create already completed challenge
    const challenges = await db.insert(challengesTable)
      .values({
        user_id: user.id,
        challenge_type: testChallenge.challenge_type,
        title: testChallenge.title,
        description: testChallenge.description,
        target_days: testChallenge.target_days,
        completed_days: 7,
        is_completed: true,
        start_date: '2024-01-01',
        end_date: '2024-01-08'
      })
      .returning()
      .execute();

    const challenge = challenges[0];

    const input: UpdateChallengeProgressInput = {
      challenge_id: challenge.id,
      completed_days: 8
    };

    // Update already completed challenge
    const result = await updateChallengeProgress(input);

    // Verify result updated but still completed
    expect(result.completed_days).toBe(8);
    expect(result.is_completed).toBe(true);

    // Verify user points unchanged (was already completed)
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].total_points).toBe(100);

    // Verify no new badges awarded
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, user.id))
      .execute();

    expect(badges).toHaveLength(0);
  });

  it('should throw error for non-existent challenge', async () => {
    const input: UpdateChallengeProgressInput = {
      challenge_id: 999,
      completed_days: 5
    };

    await expect(updateChallengeProgress(input)).rejects.toThrow(/Challenge with id 999 not found/i);
  });

  it('should handle energy reduction challenge type', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        total_points: 50
      })
      .returning()
      .execute();
    
    const user = users[0];

    // Create energy reduction challenge
    const challenges = await db.insert(challengesTable)
      .values({
        user_id: user.id,
        challenge_type: 'energy_reduction',
        title: 'Energy Reduction Challenge',
        description: 'Reduce energy consumption',
        target_days: 10,
        completed_days: 9,
        is_completed: false,
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const challenge = challenges[0];

    const input: UpdateChallengeProgressInput = {
      challenge_id: challenge.id,
      completed_days: 10
    };

    // Complete challenge
    await updateChallengeProgress(input);

    // Verify default eco_warrior badge for energy challenges
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, user.id))
      .execute();

    expect(badges).toHaveLength(1);
    expect(badges[0].badge_type).toBe('eco_warrior');
    expect(badges[0].title).toBe('Eco Warrior');
  });
});
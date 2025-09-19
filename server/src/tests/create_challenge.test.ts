import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, challengesTable } from '../db/schema';
import { type CreateChallengeInput } from '../schema';
import { createChallenge } from '../handlers/create_challenge';
import { eq } from 'drizzle-orm';

describe('createChallenge', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        total_points: 0
      })
      .returning()
      .execute();
    return result[0];
  };

  // Test input with all required fields
  const testInput: CreateChallengeInput = {
    user_id: 1, // Will be updated in tests
    challenge_type: 'meatless_week',
    title: 'Meatless Week Challenge',
    description: 'Go meatless for a full week',
    target_days: 7,
    start_date: new Date('2024-01-01')
  };

  it('should create a challenge with all required fields', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createChallenge(input);

    // Verify all fields are correctly set
    expect(result.user_id).toEqual(user.id);
    expect(result.challenge_type).toEqual('meatless_week');
    expect(result.title).toEqual('Meatless Week Challenge');
    expect(result.description).toEqual('Go meatless for a full week');
    expect(result.target_days).toEqual(7);
    expect(result.completed_days).toEqual(0); // Should be initialized to 0
    expect(result.is_completed).toEqual(false); // Should be initialized to false
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-01-08')); // start_date + 7 days
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should calculate end_date correctly based on target_days', async () => {
    const user = await createTestUser();
    const input = {
      ...testInput,
      user_id: user.id,
      target_days: 14,
      start_date: new Date('2024-02-01')
    };

    const result = await createChallenge(input);

    // Verify end_date calculation: 2024-02-01 + 14 days = 2024-02-15
    expect(result.end_date).toEqual(new Date('2024-02-15'));
    expect(result.target_days).toEqual(14);
    expect(result.start_date).toEqual(new Date('2024-02-01'));
  });

  it('should save challenge to database', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createChallenge(input);

    // Query the database to verify the challenge was saved
    const challenges = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.id, result.id))
      .execute();

    expect(challenges).toHaveLength(1);
    expect(challenges[0].user_id).toEqual(user.id);
    expect(challenges[0].challenge_type).toEqual('meatless_week');
    expect(challenges[0].title).toEqual('Meatless Week Challenge');
    expect(challenges[0].target_days).toEqual(7);
    expect(challenges[0].completed_days).toEqual(0);
    expect(challenges[0].is_completed).toEqual(false);
    expect(challenges[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different challenge types', async () => {
    const user = await createTestUser();

    const inputs = [
      {
        ...testInput,
        user_id: user.id,
        challenge_type: 'public_transport_challenge' as const,
        title: 'Public Transport Challenge',
        target_days: 30
      },
      {
        ...testInput,
        user_id: user.id,
        challenge_type: 'energy_reduction' as const,
        title: 'Energy Reduction Challenge',
        target_days: 21
      }
    ];

    for (const input of inputs) {
      const result = await createChallenge(input);
      expect(result.challenge_type).toEqual(input.challenge_type);
      expect(result.title).toEqual(input.title);
      expect(result.target_days).toEqual(input.target_days);
    }
  });

  it('should handle nullable description field', async () => {
    const user = await createTestUser();
    const input = {
      ...testInput,
      user_id: user.id,
      description: null
    };

    const result = await createChallenge(input);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Meatless Week Challenge');
  });

  it('should handle edge case dates correctly', async () => {
    const user = await createTestUser();
    
    // Test month boundary crossing
    const input = {
      ...testInput,
      user_id: user.id,
      start_date: new Date('2024-01-28'), // Near end of month
      target_days: 10 // Should cross into February
    };

    const result = await createChallenge(input);

    expect(result.start_date).toEqual(new Date('2024-01-28'));
    expect(result.end_date).toEqual(new Date('2024-02-07')); // 28 + 10 days = Feb 7
  });

  it('should throw error for non-existent user', async () => {
    const input = {
      ...testInput,
      user_id: 99999 // Non-existent user ID
    };

    await expect(createChallenge(input)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should initialize completed_days to 0 and is_completed to false', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createChallenge(input);

    expect(result.completed_days).toEqual(0);
    expect(result.is_completed).toEqual(false);
    
    // Verify in database as well
    const dbChallenge = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.id, result.id))
      .execute();
    
    expect(dbChallenge[0].completed_days).toEqual(0);
    expect(dbChallenge[0].is_completed).toEqual(false);
  });

  it('should handle single day challenge', async () => {
    const user = await createTestUser();
    const input = {
      ...testInput,
      user_id: user.id,
      title: 'One Day Challenge',
      target_days: 1,
      start_date: new Date('2024-03-15')
    };

    const result = await createChallenge(input);

    expect(result.target_days).toEqual(1);
    expect(result.start_date).toEqual(new Date('2024-03-15'));
    expect(result.end_date).toEqual(new Date('2024-03-16')); // Next day
  });
});
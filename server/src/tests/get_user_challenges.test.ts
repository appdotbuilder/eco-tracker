import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, challengesTable } from '../db/schema';
import { getUserChallenges } from '../handlers/get_user_challenges';
import { eq } from 'drizzle-orm';

describe('getUserChallenges', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no challenges', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const challenges = await getUserChallenges(userId);

    expect(challenges).toEqual([]);
  });

  it('should return all challenges for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create another user to ensure we only get challenges for the specific user
    const otherUserResult = await db.insert(usersTable)
      .values({
        username: 'otheruser',
        email: 'other@example.com'
      })
      .returning()
      .execute();

    const otherUserId = otherUserResult[0].id;

    // Create challenges for the test user
    const testChallenges = [
      {
        user_id: userId,
        challenge_type: 'meatless_week' as const,
        title: 'Go Meatless for a Week',
        description: 'Complete a week without meat',
        target_days: 7,
        completed_days: 3,
        is_completed: false,
        start_date: '2024-01-01',
        end_date: '2024-01-07'
      },
      {
        user_id: userId,
        challenge_type: 'public_transport_challenge' as const,
        title: 'Public Transport Month',
        description: 'Use only public transport for 30 days',
        target_days: 30,
        completed_days: 30,
        is_completed: true,
        start_date: '2024-01-15',
        end_date: '2024-02-14'
      }
    ];

    // Create challenge for other user (should not be returned)
    const otherChallenge = {
      user_id: otherUserId,
      challenge_type: 'energy_reduction' as const,
      title: 'Energy Saver Challenge',
      description: 'Reduce energy consumption',
      target_days: 14,
      completed_days: 5,
      is_completed: false,
      start_date: '2024-01-10',
      end_date: null
    };

    // Insert all challenges
    await db.insert(challengesTable)
      .values([...testChallenges, otherChallenge])
      .execute();

    const challenges = await getUserChallenges(userId);

    // Should only return challenges for the specific user
    expect(challenges).toHaveLength(2);
    
    // Verify all returned challenges belong to the correct user
    challenges.forEach(challenge => {
      expect(challenge.user_id).toBe(userId);
    });

    // Verify specific challenge data
    const completedChallenge = challenges.find(c => c.is_completed);
    expect(completedChallenge).toBeDefined();
    expect(completedChallenge!.title).toBe('Public Transport Month');
    expect(completedChallenge!.target_days).toBe(30);
    expect(completedChallenge!.completed_days).toBe(30);

    const activeChallenge = challenges.find(c => !c.is_completed);
    expect(activeChallenge).toBeDefined();
    expect(activeChallenge!.title).toBe('Go Meatless for a Week');
    expect(activeChallenge!.target_days).toBe(7);
    expect(activeChallenge!.completed_days).toBe(3);
  });

  it('should order challenges by created date (most recent first)', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create challenges at different times by inserting one by one
    // First challenge (oldest)
    const firstChallenge = await db.insert(challengesTable)
      .values({
        user_id: userId,
        challenge_type: 'meatless_week' as const,
        title: 'First Challenge',
        description: 'Oldest challenge',
        target_days: 7,
        completed_days: 0,
        is_completed: false,
        start_date: '2024-01-01',
        end_date: null
      })
      .returning()
      .execute();

    // Wait a tiny bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Second challenge (newest)
    const secondChallenge = await db.insert(challengesTable)
      .values({
        user_id: userId,
        challenge_type: 'public_transport_challenge' as const,
        title: 'Second Challenge',
        description: 'Newest challenge',
        target_days: 14,
        completed_days: 5,
        is_completed: false,
        start_date: '2024-01-15',
        end_date: null
      })
      .returning()
      .execute();

    const challenges = await getUserChallenges(userId);

    expect(challenges).toHaveLength(2);
    // Most recent should be first
    expect(challenges[0].title).toBe('Second Challenge');
    expect(challenges[1].title).toBe('First Challenge');
    
    // Verify ordering by created_at
    expect(challenges[0].created_at > challenges[1].created_at).toBe(true);
  });

  it('should include both active and completed challenges', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create mix of active and completed challenges
    const testChallenges = [
      {
        user_id: userId,
        challenge_type: 'meatless_week' as const,
        title: 'Active Challenge 1',
        description: 'Still in progress',
        target_days: 7,
        completed_days: 3,
        is_completed: false,
        start_date: '2024-01-01',
        end_date: null
      },
      {
        user_id: userId,
        challenge_type: 'public_transport_challenge' as const,
        title: 'Completed Challenge 1',
        description: 'Successfully completed',
        target_days: 30,
        completed_days: 30,
        is_completed: true,
        start_date: '2024-01-15',
        end_date: '2024-02-14'
      },
      {
        user_id: userId,
        challenge_type: 'energy_reduction' as const,
        title: 'Active Challenge 2',
        description: 'Another active challenge',
        target_days: 14,
        completed_days: 8,
        is_completed: false,
        start_date: '2024-02-01',
        end_date: null
      }
    ];

    await db.insert(challengesTable)
      .values(testChallenges)
      .execute();

    const challenges = await getUserChallenges(userId);

    expect(challenges).toHaveLength(3);

    // Verify we have both active and completed challenges
    const activeChallenges = challenges.filter(c => !c.is_completed);
    const completedChallenges = challenges.filter(c => c.is_completed);

    expect(activeChallenges).toHaveLength(2);
    expect(completedChallenges).toHaveLength(1);

    // Verify progress information is preserved
    activeChallenges.forEach(challenge => {
      expect(challenge.completed_days).toBeLessThan(challenge.target_days);
      expect(challenge.is_completed).toBe(false);
    });

    completedChallenges.forEach(challenge => {
      expect(challenge.completed_days).toBe(challenge.target_days);
      expect(challenge.is_completed).toBe(true);
    });
  });

  it('should handle challenges with different challenge types', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create challenges with all different types
    const testChallenges = [
      {
        user_id: userId,
        challenge_type: 'meatless_week' as const,
        title: 'Meatless Challenge',
        description: 'No meat for a week',
        target_days: 7,
        completed_days: 4,
        is_completed: false,
        start_date: '2024-01-01',
        end_date: null
      },
      {
        user_id: userId,
        challenge_type: 'public_transport_challenge' as const,
        title: 'Transport Challenge',
        description: 'Use public transport only',
        target_days: 21,
        completed_days: 15,
        is_completed: false,
        start_date: '2024-01-10',
        end_date: null
      },
      {
        user_id: userId,
        challenge_type: 'energy_reduction' as const,
        title: 'Energy Challenge',
        description: 'Reduce energy consumption',
        target_days: 14,
        completed_days: 14,
        is_completed: true,
        start_date: '2024-01-20',
        end_date: '2024-02-03'
      }
    ];

    await db.insert(challengesTable)
      .values(testChallenges)
      .execute();

    const challenges = await getUserChallenges(userId);

    expect(challenges).toHaveLength(3);

    // Verify all challenge types are present
    const challengeTypes = challenges.map(c => c.challenge_type);
    expect(challengeTypes).toContain('meatless_week');
    expect(challengeTypes).toContain('public_transport_challenge');
    expect(challengeTypes).toContain('energy_reduction');

    // Verify each challenge has proper structure
    challenges.forEach(challenge => {
      expect(challenge.id).toBeDefined();
      expect(challenge.user_id).toBe(userId);
      expect(challenge.title).toBeDefined();
      expect(challenge.target_days).toBeGreaterThan(0);
      expect(challenge.completed_days).toBeGreaterThanOrEqual(0);
      expect(typeof challenge.is_completed).toBe('boolean');
      expect(challenge.start_date).toBeInstanceOf(Date);
      expect(challenge.created_at).toBeInstanceOf(Date);
    });
  });

  it('should save challenges to database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test challenge
    await db.insert(challengesTable)
      .values({
        user_id: userId,
        challenge_type: 'meatless_week' as const,
        title: 'Test Challenge',
        description: 'A challenge for testing',
        target_days: 7,
        completed_days: 2,
        is_completed: false,
        start_date: '2024-01-01',
        end_date: null
      })
      .execute();

    const challenges = await getUserChallenges(userId);

    // Verify the challenge was retrieved correctly
    expect(challenges).toHaveLength(1);
    
    const challenge = challenges[0];
    expect(challenge.title).toBe('Test Challenge');
    expect(challenge.description).toBe('A challenge for testing');
    expect(challenge.challenge_type).toBe('meatless_week');
    expect(challenge.target_days).toBe(7);
    expect(challenge.completed_days).toBe(2);
    expect(challenge.is_completed).toBe(false);
    expect(challenge.start_date).toBeInstanceOf(Date);
    expect(challenge.created_at).toBeInstanceOf(Date);

    // Verify the challenge exists in the database
    const dbChallenges = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.user_id, userId))
      .execute();

    expect(dbChallenges).toHaveLength(1);
    expect(dbChallenges[0].title).toBe('Test Challenge');
  });

  it('should handle challenges with null end_date', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create challenge with null end_date
    await db.insert(challengesTable)
      .values({
        user_id: userId,
        challenge_type: 'energy_reduction' as const,
        title: 'Open-ended Challenge',
        description: 'A challenge without end date',
        target_days: 30,
        completed_days: 15,
        is_completed: false,
        start_date: '2024-01-01',
        end_date: null
      })
      .execute();

    const challenges = await getUserChallenges(userId);

    expect(challenges).toHaveLength(1);
    
    const challenge = challenges[0];
    expect(challenge.title).toBe('Open-ended Challenge');
    expect(challenge.end_date).toBeNull();
    expect(challenge.start_date).toBeInstanceOf(Date);
    expect(challenge.created_at).toBeInstanceOf(Date);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, badgesTable } from '../db/schema';
import { awardBadge } from '../handlers/award_badge';
import { eq, and } from 'drizzle-orm';

describe('awardBadge', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user
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

  afterEach(resetDB);

  it('should award a new badge successfully', async () => {
    const result = await awardBadge(
      testUserId,
      'first_step',
      'First Step',
      'You took your first step towards carbon tracking!'
    );

    // Verify badge properties
    expect(result.user_id).toEqual(testUserId);
    expect(result.badge_type).toEqual('first_step');
    expect(result.title).toEqual('First Step');
    expect(result.description).toEqual('You took your first step towards carbon tracking!');
    expect(result.id).toBeDefined();
    expect(result.earned_at).toBeInstanceOf(Date);
  });

  it('should save badge to database', async () => {
    const result = await awardBadge(
      testUserId,
      'carbon_cutter',
      'Carbon Cutter',
      'Reduced carbon emissions significantly'
    );

    // Verify badge was saved to database
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.id, result.id))
      .execute();

    expect(badges).toHaveLength(1);
    expect(badges[0].user_id).toEqual(testUserId);
    expect(badges[0].badge_type).toEqual('carbon_cutter');
    expect(badges[0].title).toEqual('Carbon Cutter');
    expect(badges[0].description).toEqual('Reduced carbon emissions significantly');
    expect(badges[0].earned_at).toBeInstanceOf(Date);
  });

  it('should update user total points when awarding badge', async () => {
    await awardBadge(testUserId, 'eco_warrior', 'Eco Warrior', 'Environmental champion');

    // Check that user's points were increased by 10
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].total_points).toEqual(60); // 50 initial + 10 for badge
  });

  it('should not award duplicate badge of same type to same user', async () => {
    // Award first badge
    const firstBadge = await awardBadge(
      testUserId,
      'transport_hero',
      'Transport Hero',
      'Mastered sustainable transport'
    );

    // Try to award same badge type again
    const secondBadge = await awardBadge(
      testUserId,
      'transport_hero',
      'Transport Hero Again',
      'Another transport achievement'
    );

    // Should return the existing badge, not create a new one
    expect(secondBadge.id).toEqual(firstBadge.id);
    expect(secondBadge.title).toEqual('Transport Hero'); // Original title preserved
    expect(secondBadge.description).toEqual('Mastered sustainable transport'); // Original description preserved

    // Verify only one badge exists in database
    const badges = await db.select()
      .from(badgesTable)
      .where(
        and(
          eq(badgesTable.user_id, testUserId),
          eq(badgesTable.badge_type, 'transport_hero')
        )
      )
      .execute();

    expect(badges).toHaveLength(1);
  });

  it('should allow same badge type for different users', async () => {
    // Create second user
    const secondUserResult = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        total_points: 25
      })
      .returning()
      .execute();
    
    const secondUserId = secondUserResult[0].id;

    // Award same badge type to both users
    const badge1 = await awardBadge(testUserId, 'diet_champion', 'Diet Champion', 'Sustainable eating habits');
    const badge2 = await awardBadge(secondUserId, 'diet_champion', 'Diet Champion', 'Sustainable eating habits');

    // Should be different badge instances
    expect(badge1.id).not.toEqual(badge2.id);
    expect(badge1.user_id).toEqual(testUserId);
    expect(badge2.user_id).toEqual(secondUserId);

    // Verify both badges exist in database
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.badge_type, 'diet_champion'))
      .execute();

    expect(badges).toHaveLength(2);
  });

  it('should handle badge with null description', async () => {
    const result = await awardBadge(testUserId, 'energy_saver', 'Energy Saver');

    expect(result.description).toBeNull();
    
    // Verify in database
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.id, result.id))
      .execute();

    expect(badges[0].description).toBeNull();
  });

  it('should handle all badge types correctly', async () => {
    const badgeTypes = ['first_step', 'carbon_cutter', 'eco_warrior', 'transport_hero', 'diet_champion', 'energy_saver'] as const;
    
    for (const badgeType of badgeTypes) {
      const result = await awardBadge(testUserId, badgeType, `Test ${badgeType}`, `Description for ${badgeType}`);
      expect(result.badge_type).toEqual(badgeType);
    }

    // Verify all badges were created
    const badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, testUserId))
      .execute();

    expect(badges).toHaveLength(badgeTypes.length);
    
    // Verify points were updated for all badges (50 initial + 10 * 6 badges = 110)
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users[0].total_points).toEqual(110);
  });
});
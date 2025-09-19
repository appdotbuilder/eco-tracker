import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, badgesTable } from '../db/schema';
import { getUserBadges } from '../handlers/get_user_badges';

describe('getUserBadges', () => {
  let testUserId1: number;
  let testUserId2: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { username: 'testuser1', email: 'test1@example.com' },
        { username: 'testuser2', email: 'test2@example.com' }
      ])
      .returning()
      .execute();

    testUserId1 = users[0].id;
    testUserId2 = users[1].id;
  });

  afterEach(resetDB);

  it('should return empty array for user with no badges', async () => {
    const badges = await getUserBadges(testUserId1);
    
    expect(badges).toHaveLength(0);
    expect(Array.isArray(badges)).toBe(true);
  });

  it('should return all badges for a user', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Create test badges for user 1
    await db.insert(badgesTable)
      .values([
        {
          user_id: testUserId1,
          badge_type: 'first_step',
          title: 'First Step',
          description: 'Logged your first activity!',
          earned_at: yesterday
        },
        {
          user_id: testUserId1,
          badge_type: 'carbon_cutter',
          title: 'Carbon Cutter',
          description: 'Reduced emissions by 10%',
          earned_at: now
        }
      ])
      .execute();

    const badges = await getUserBadges(testUserId1);
    
    expect(badges).toHaveLength(2);
    expect(badges[0].badge_type).toBe('carbon_cutter');
    expect(badges[0].title).toBe('Carbon Cutter');
    expect(badges[0].user_id).toBe(testUserId1);
    expect(badges[1].badge_type).toBe('first_step');
    expect(badges[1].title).toBe('First Step');
    expect(badges[1].user_id).toBe(testUserId1);
  });

  it('should order badges by earned_at date (most recent first)', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    await db.insert(badgesTable)
      .values([
        {
          user_id: testUserId1,
          badge_type: 'first_step',
          title: 'First Step',
          description: 'Oldest badge',
          earned_at: twoHoursAgo
        },
        {
          user_id: testUserId1,
          badge_type: 'eco_warrior',
          title: 'Eco Warrior',
          description: 'Newest badge',
          earned_at: now
        },
        {
          user_id: testUserId1,
          badge_type: 'carbon_cutter',
          title: 'Carbon Cutter',
          description: 'Middle badge',
          earned_at: oneHourAgo
        }
      ])
      .execute();

    const badges = await getUserBadges(testUserId1);
    
    expect(badges).toHaveLength(3);
    expect(badges[0].badge_type).toBe('eco_warrior'); // Most recent
    expect(badges[1].badge_type).toBe('carbon_cutter'); // Middle
    expect(badges[2].badge_type).toBe('first_step'); // Oldest
    
    // Verify the dates are in descending order
    expect(badges[0].earned_at >= badges[1].earned_at).toBe(true);
    expect(badges[1].earned_at >= badges[2].earned_at).toBe(true);
  });

  it('should only return badges for the specified user', async () => {
    // Create badges for both users
    await db.insert(badgesTable)
      .values([
        {
          user_id: testUserId1,
          badge_type: 'first_step',
          title: 'First Step User 1',
          description: 'Badge for user 1',
          earned_at: new Date()
        },
        {
          user_id: testUserId2,
          badge_type: 'carbon_cutter',
          title: 'Carbon Cutter User 2',
          description: 'Badge for user 2',
          earned_at: new Date()
        }
      ])
      .execute();

    const user1Badges = await getUserBadges(testUserId1);
    const user2Badges = await getUserBadges(testUserId2);
    
    expect(user1Badges).toHaveLength(1);
    expect(user1Badges[0].user_id).toBe(testUserId1);
    expect(user1Badges[0].title).toBe('First Step User 1');
    
    expect(user2Badges).toHaveLength(1);
    expect(user2Badges[0].user_id).toBe(testUserId2);
    expect(user2Badges[0].title).toBe('Carbon Cutter User 2');
  });

  it('should include all badge metadata', async () => {
    await db.insert(badgesTable)
      .values({
        user_id: testUserId1,
        badge_type: 'transport_hero',
        title: 'Transport Hero',
        description: 'Used public transport 10 times',
        earned_at: new Date()
      })
      .execute();

    const badges = await getUserBadges(testUserId1);
    
    expect(badges).toHaveLength(1);
    const badge = badges[0];
    
    expect(badge.id).toBeDefined();
    expect(badge.user_id).toBe(testUserId1);
    expect(badge.badge_type).toBe('transport_hero');
    expect(badge.title).toBe('Transport Hero');
    expect(badge.description).toBe('Used public transport 10 times');
    expect(badge.earned_at).toBeInstanceOf(Date);
  });

  it('should handle badges with null descriptions', async () => {
    await db.insert(badgesTable)
      .values({
        user_id: testUserId1,
        badge_type: 'energy_saver',
        title: 'Energy Saver',
        description: null,
        earned_at: new Date()
      })
      .execute();

    const badges = await getUserBadges(testUserId1);
    
    expect(badges).toHaveLength(1);
    expect(badges[0].description).toBeNull();
    expect(badges[0].title).toBe('Energy Saver');
  });

  it('should return badges for non-existent user as empty array', async () => {
    const badges = await getUserBadges(99999);
    
    expect(badges).toHaveLength(0);
    expect(Array.isArray(badges)).toBe(true);
  });
});
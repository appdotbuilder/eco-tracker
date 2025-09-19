import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transportationActivitiesTable, dietActivitiesTable, energyActivitiesTable } from '../db/schema';
import { type GetUserActivitiesInput } from '../schema';
import { getUserActivities } from '../handlers/get_user_activities';

describe('getUserActivities', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test user and activities
  const setupTestData = async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create transportation activities
    await db.insert(transportationActivitiesTable)
      .values([
        {
          user_id: user.id,
          transport_type: 'car',
          fuel_type: 'gasoline',
          distance_km: '25.5',
          emissions_kg_co2: '5.1000',
          date: '2024-01-01'
        },
        {
          user_id: user.id,
          transport_type: 'bus',
          fuel_type: null,
          distance_km: '10.0',
          emissions_kg_co2: '1.2000',
          date: '2024-01-02'
        }
      ])
      .execute();

    // Create diet activities
    await db.insert(dietActivitiesTable)
      .values([
        {
          user_id: user.id,
          meal_type: 'meat',
          meal_count: 3,
          emissions_kg_co2: '12.5000',
          date: '2024-01-01'
        },
        {
          user_id: user.id,
          meal_type: 'vegetarian',
          meal_count: 2,
          emissions_kg_co2: '3.2000',
          date: '2024-01-03'
        }
      ])
      .execute();

    // Create energy activities
    await db.insert(energyActivitiesTable)
      .values([
        {
          user_id: user.id,
          energy_type: 'electricity',
          consumption: '15.500',
          unit: 'kWh',
          emissions_kg_co2: '7.7500',
          date: '2024-01-01'
        },
        {
          user_id: user.id,
          energy_type: 'natural_gas',
          consumption: '25.000',
          unit: 'therms',
          emissions_kg_co2: '13.2000',
          date: '2024-01-04'
        }
      ])
      .execute();

    return user;
  };

  it('should get all activities for a user', async () => {
    const user = await setupTestData();

    const input: GetUserActivitiesInput = {
      user_id: user.id
    };

    const activities = await getUserActivities(input);

    expect(activities).toHaveLength(6);
    
    // Check that activities are sorted by date (most recent first)
    expect(activities[0].date).toEqual(new Date('2024-01-04'));
    expect(activities[1].date).toEqual(new Date('2024-01-03'));
    
    // Check numeric field conversions
    const transportActivity = activities.find(a => 'transport_type' in a);
    expect(transportActivity).toBeDefined();
    if (transportActivity && 'distance_km' in transportActivity) {
      expect(typeof transportActivity.distance_km).toBe('number');
      expect(typeof transportActivity.emissions_kg_co2).toBe('number');
    }

    const energyActivity = activities.find(a => 'consumption' in a);
    expect(energyActivity).toBeDefined();
    if (energyActivity && 'consumption' in energyActivity) {
      expect(typeof energyActivity.consumption).toBe('number');
      expect(typeof energyActivity.emissions_kg_co2).toBe('number');
    }
  });

  it('should filter activities by activity type', async () => {
    const user = await setupTestData();

    const transportInput: GetUserActivitiesInput = {
      user_id: user.id,
      activity_type: 'transport'
    };

    const transportActivities = await getUserActivities(transportInput);
    expect(transportActivities).toHaveLength(2);
    transportActivities.forEach(activity => {
      expect('transport_type' in activity).toBe(true);
    });

    const dietInput: GetUserActivitiesInput = {
      user_id: user.id,
      activity_type: 'diet'
    };

    const dietActivities = await getUserActivities(dietInput);
    expect(dietActivities).toHaveLength(2);
    dietActivities.forEach(activity => {
      expect('meal_type' in activity).toBe(true);
    });

    const energyInput: GetUserActivitiesInput = {
      user_id: user.id,
      activity_type: 'energy'
    };

    const energyActivities = await getUserActivities(energyInput);
    expect(energyActivities).toHaveLength(2);
    energyActivities.forEach(activity => {
      expect('consumption' in activity).toBe(true);
    });
  });

  it('should filter activities by date range', async () => {
    const user = await setupTestData();

    const input: GetUserActivitiesInput = {
      user_id: user.id,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-02')
    };

    const activities = await getUserActivities(input);
    expect(activities).toHaveLength(4); // 2 transport + 1 diet + 1 energy on Jan 1-2

    activities.forEach(activity => {
      expect(activity.date >= new Date('2024-01-01')).toBe(true);
      expect(activity.date <= new Date('2024-01-02')).toBe(true);
    });
  });

  it('should filter by start date only', async () => {
    const user = await setupTestData();

    const input: GetUserActivitiesInput = {
      user_id: user.id,
      start_date: new Date('2024-01-03')
    };

    const activities = await getUserActivities(input);
    expect(activities).toHaveLength(2); // 1 diet + 1 energy on Jan 3-4

    activities.forEach(activity => {
      expect(activity.date >= new Date('2024-01-03')).toBe(true);
    });
  });

  it('should filter by end date only', async () => {
    const user = await setupTestData();

    const input: GetUserActivitiesInput = {
      user_id: user.id,
      end_date: new Date('2024-01-02')
    };

    const activities = await getUserActivities(input);
    expect(activities).toHaveLength(4); // Activities on Jan 1-2

    activities.forEach(activity => {
      expect(activity.date <= new Date('2024-01-02')).toBe(true);
    });
  });

  it('should combine activity type and date filters', async () => {
    const user = await setupTestData();

    const input: GetUserActivitiesInput = {
      user_id: user.id,
      activity_type: 'transport',
      start_date: new Date('2024-01-02'),
      end_date: new Date('2024-01-02')
    };

    const activities = await getUserActivities(input);
    expect(activities).toHaveLength(1); // Only bus transport on Jan 2
    
    const activity = activities[0];
    expect('transport_type' in activity).toBe(true);
    if ('transport_type' in activity) {
      expect(activity.transport_type).toBe('bus');
    }
    expect(activity.date).toEqual(new Date('2024-01-02'));
  });

  it('should return empty array for user with no activities', async () => {
    // Create user without activities
    const [user] = await db.insert(usersTable)
      .values({
        username: 'emptyuser',
        email: 'empty@example.com'
      })
      .returning()
      .execute();

    const input: GetUserActivitiesInput = {
      user_id: user.id
    };

    const activities = await getUserActivities(input);
    expect(activities).toHaveLength(0);
  });

  it('should return empty array when date range has no activities', async () => {
    const user = await setupTestData();

    const input: GetUserActivitiesInput = {
      user_id: user.id,
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-28')
    };

    const activities = await getUserActivities(input);
    expect(activities).toHaveLength(0);
  });

  it('should throw error for non-existent user', async () => {
    const input: GetUserActivitiesInput = {
      user_id: 99999
    };

    await expect(getUserActivities(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle activities created on same date in correct order', async () => {
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create multiple activities on the same date with slight timing differences
    await db.insert(transportationActivitiesTable)
      .values({
        user_id: user.id,
        transport_type: 'car',
        fuel_type: 'gasoline',
        distance_km: '10.0',
        emissions_kg_co2: '2.0000',
        date: '2024-01-01'
      })
      .execute();

    await db.insert(dietActivitiesTable)
      .values({
        user_id: user.id,
        meal_type: 'meat',
        meal_count: 1,
        emissions_kg_co2: '5.0000',
        date: '2024-01-01'
      })
      .execute();

    const input: GetUserActivitiesInput = {
      user_id: user.id
    };

    const activities = await getUserActivities(input);
    expect(activities).toHaveLength(2);
    
    // Both activities should have the same date
    expect(activities[0].date).toEqual(new Date('2024-01-01'));
    expect(activities[1].date).toEqual(new Date('2024-01-01'));
    
    // Should be ordered by created_at (most recent first)
    expect(activities[0].created_at >= activities[1].created_at).toBe(true);
  });
});
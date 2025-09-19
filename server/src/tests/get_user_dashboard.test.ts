import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  transportationActivitiesTable, 
  dietActivitiesTable, 
  energyActivitiesTable,
  goalsTable,
  challengesTable,
  badgesTable
} from '../db/schema';
import { getUserDashboard } from '../handlers/get_user_dashboard';

// Test data
const testUser = {
  username: 'dashboard_user',
  email: 'dashboard@example.com',
  total_points: 500
};

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];

const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

describe('getUserDashboard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should throw error for non-existent user', async () => {
    await expect(getUserDashboard(999)).rejects.toThrow(/User with id 999 not found/);
  });

  it('should return basic dashboard data for user with no activities', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.user.id).toEqual(userId);
    expect(dashboard.user.username).toEqual('dashboard_user');
    expect(dashboard.user.email).toEqual('dashboard@example.com');
    expect(dashboard.user.total_points).toEqual(500);
    expect(dashboard.total_emissions_kg_co2).toEqual(0);
    expect(dashboard.daily_emissions).toHaveLength(0);
    expect(dashboard.weekly_emissions).toHaveLength(0);
    expect(dashboard.monthly_emissions).toHaveLength(0);
    expect(dashboard.emissions_by_category.transport).toEqual(0);
    expect(dashboard.emissions_by_category.diet).toEqual(0);
    expect(dashboard.emissions_by_category.energy).toEqual(0);
    expect(dashboard.active_goals).toHaveLength(0);
    expect(dashboard.active_challenges).toHaveLength(0);
    expect(dashboard.recent_badges).toHaveLength(0);
  });

  it('should calculate total emissions across all activity types', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add transportation activity
    await db.insert(transportationActivitiesTable)
      .values({
        user_id: userId,
        transport_type: 'car',
        fuel_type: 'gasoline',
        distance_km: '50.00',
        emissions_kg_co2: '12.5000',
        date: today
      })
      .execute();

    // Add diet activity
    await db.insert(dietActivitiesTable)
      .values({
        user_id: userId,
        meal_type: 'meat',
        meal_count: 2,
        emissions_kg_co2: '8.7500',
        date: today
      })
      .execute();

    // Add energy activity
    await db.insert(energyActivitiesTable)
      .values({
        user_id: userId,
        energy_type: 'electricity',
        consumption: '25.500',
        unit: 'kWh',
        emissions_kg_co2: '15.2500',
        date: today
      })
      .execute();

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.total_emissions_kg_co2).toEqual(36.5); // 12.5 + 8.75 + 15.25
    expect(dashboard.emissions_by_category.transport).toEqual(12.5);
    expect(dashboard.emissions_by_category.diet).toEqual(8.75);
    expect(dashboard.emissions_by_category.energy).toEqual(15.25);
  });

  it('should generate daily emissions data correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add activities on different days
    await db.insert(transportationActivitiesTable)
      .values([
        {
          user_id: userId,
          transport_type: 'car',
          fuel_type: 'gasoline',
          distance_km: '30.00',
          emissions_kg_co2: '7.5000',
          date: today
        },
        {
          user_id: userId,
          transport_type: 'bus',
          fuel_type: null,
          distance_km: '15.00',
          emissions_kg_co2: '2.2500',
          date: yesterdayStr
        }
      ])
      .execute();

    await db.insert(dietActivitiesTable)
      .values({
        user_id: userId,
        meal_type: 'vegetarian',
        meal_count: 1,
        emissions_kg_co2: '3.5000',
        date: today
      })
      .execute();

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.daily_emissions).toHaveLength(2);
    
    const todayEmissions = dashboard.daily_emissions.find(d => d.date === today);
    const yesterdayEmissions = dashboard.daily_emissions.find(d => d.date === yesterdayStr);

    expect(todayEmissions?.emissions_kg_co2).toEqual(11); // 7.5 + 3.5
    expect(yesterdayEmissions?.emissions_kg_co2).toEqual(2.25);
  });

  it('should return active goals with correct numeric conversions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create goals - one active, one achieved
    await db.insert(goalsTable)
      .values([
        {
          user_id: userId,
          goal_type: 'percentage_reduction',
          title: 'Reduce emissions by 20%',
          description: 'Monthly reduction goal',
          target_value: '20.00',
          current_value: '15.50',
          is_achieved: false,
          start_date: today
        },
        {
          user_id: userId,
          goal_type: 'specific_target',
          title: 'Stay under 100kg CO2',
          target_value: '100.00',
          current_value: '95.00',
          is_achieved: true,
          start_date: yesterdayStr
        }
      ])
      .execute();

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.active_goals).toHaveLength(1);
    expect(dashboard.active_goals[0].title).toEqual('Reduce emissions by 20%');
    expect(dashboard.active_goals[0].target_value).toEqual(20);
    expect(dashboard.active_goals[0].current_value).toEqual(15.5);
    expect(typeof dashboard.active_goals[0].target_value).toEqual('number');
    expect(typeof dashboard.active_goals[0].current_value).toEqual('number');
  });

  it('should return active challenges correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create challenges - one active, one completed
    await db.insert(challengesTable)
      .values([
        {
          user_id: userId,
          challenge_type: 'meatless_week',
          title: 'Go Meatless for a Week',
          description: 'Avoid meat for 7 days',
          target_days: 7,
          completed_days: 4,
          is_completed: false,
          start_date: oneWeekAgoStr
        },
        {
          user_id: userId,
          challenge_type: 'public_transport_challenge',
          title: 'Use Public Transport',
          target_days: 5,
          completed_days: 5,
          is_completed: true,
          start_date: yesterdayStr
        }
      ])
      .execute();

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.active_challenges).toHaveLength(1);
    expect(dashboard.active_challenges[0].title).toEqual('Go Meatless for a Week');
    expect(dashboard.active_challenges[0].completed_days).toEqual(4);
    expect(dashboard.active_challenges[0].target_days).toEqual(7);
    expect(dashboard.active_challenges[0].is_completed).toEqual(false);
  });

  it('should return recent badges in correct order', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Create badges with different earned times
    await db.insert(badgesTable)
      .values([
        {
          user_id: userId,
          badge_type: 'first_step',
          title: 'First Step',
          description: 'Logged your first activity',
          earned_at: twoDaysAgo
        },
        {
          user_id: userId,
          badge_type: 'carbon_cutter',
          title: 'Carbon Cutter',
          description: 'Reduced weekly emissions',
          earned_at: now
        },
        {
          user_id: userId,
          badge_type: 'eco_warrior',
          title: 'Eco Warrior',
          description: 'Completed 10 activities',
          earned_at: oneHourAgo
        }
      ])
      .execute();

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.recent_badges).toHaveLength(3);
    
    // Should be ordered by earned_at DESC (most recent first)
    expect(dashboard.recent_badges[0].badge_type).toEqual('carbon_cutter');
    expect(dashboard.recent_badges[1].badge_type).toEqual('eco_warrior');
    expect(dashboard.recent_badges[2].badge_type).toEqual('first_step');
  });

  it('should handle multiple activities of same type on same day', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add multiple transportation activities on the same day
    await db.insert(transportationActivitiesTable)
      .values([
        {
          user_id: userId,
          transport_type: 'car',
          fuel_type: 'gasoline',
          distance_km: '25.00',
          emissions_kg_co2: '6.2500',
          date: today
        },
        {
          user_id: userId,
          transport_type: 'bus',
          fuel_type: null,
          distance_km: '10.00',
          emissions_kg_co2: '1.5000',
          date: today
        }
      ])
      .execute();

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.total_emissions_kg_co2).toEqual(7.75);
    expect(dashboard.emissions_by_category.transport).toEqual(7.75);
    expect(dashboard.daily_emissions).toHaveLength(1);
    expect(dashboard.daily_emissions[0].emissions_kg_co2).toEqual(7.75);
  });

  it('should limit recent badges to 10 items', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 12 badges (more than the limit of 10)
    const badges = [];
    const baseTime = new Date();
    const badgeTypes = ['first_step', 'carbon_cutter', 'eco_warrior', 'transport_hero', 'diet_champion', 'energy_saver'] as const;
    
    for (let i = 0; i < 12; i++) {
      const earnedAt = new Date(baseTime.getTime() - i * 60 * 60 * 1000); // Each badge 1 hour apart
      badges.push({
        user_id: userId,
        badge_type: badgeTypes[i % badgeTypes.length],
        title: `Badge ${i + 1}`,
        description: `Description for badge ${i + 1}`,
        earned_at: earnedAt
      });
    }

    await db.insert(badgesTable)
      .values(badges)
      .execute();

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.recent_badges).toHaveLength(10);
    
    // Should return the 10 most recent badges
    expect(dashboard.recent_badges[0].title).toEqual('Badge 1');
    expect(dashboard.recent_badges[9].title).toEqual('Badge 10');
  });
});
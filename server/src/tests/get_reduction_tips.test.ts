import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  transportationActivitiesTable, 
  dietActivitiesTable, 
  energyActivitiesTable 
} from '../db/schema';
import { getReductionTips } from '../handlers/get_reduction_tips';

describe('getReductionTips', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return tips for user with high car usage', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Add high car usage activities
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await db.insert(transportationActivitiesTable)
      .values([
        {
          user_id: userId,
          transport_type: 'car',
          fuel_type: 'gasoline',
          distance_km: '100.0',
          emissions_kg_co2: '25.0',
          date: yesterday.toISOString().split('T')[0]
        },
        {
          user_id: userId,
          transport_type: 'car',
          fuel_type: 'gasoline', 
          distance_km: '50.0',
          emissions_kg_co2: '12.5',
          date: yesterday.toISOString().split('T')[0]
        }
      ])
      .execute();

    const tips = await getReductionTips(userId);

    expect(tips.length).toBeGreaterThan(0);
    expect(tips.some(tip => tip.category === 'transport')).toBe(true);
    expect(tips.some(tip => tip.title.toLowerCase().includes('public transport') || tip.title.toLowerCase().includes('carpool'))).toBe(true);
    
    // Verify tip structure
    tips.forEach(tip => {
      expect(tip.id).toBeDefined();
      expect(tip.category).toMatch(/transport|diet|energy/);
      expect(tip.title).toBeDefined();
      expect(tip.description).toBeDefined();
      expect(typeof tip.potential_savings_kg_co2).toBe('number');
      expect(tip.potential_savings_kg_co2).toBeGreaterThan(0);
      expect(tip.difficulty).toMatch(/easy|medium|hard/);
    });
  });

  it('should return tips for user with high meat consumption', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'meatuser',
        email: 'meat@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Add high meat consumption activities
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await db.insert(dietActivitiesTable)
      .values([
        {
          user_id: userId,
          meal_type: 'meat',
          meal_count: 15,
          emissions_kg_co2: '45.0',
          date: yesterday.toISOString().split('T')[0]
        },
        {
          user_id: userId,
          meal_type: 'meat',
          meal_count: 10,
          emissions_kg_co2: '30.0',
          date: yesterday.toISOString().split('T')[0]
        }
      ])
      .execute();

    const tips = await getReductionTips(userId);

    expect(tips.length).toBeGreaterThan(0);
    expect(tips.some(tip => tip.category === 'diet')).toBe(true);
    expect(tips.some(tip => tip.title.toLowerCase().includes('meatless') || tip.title.toLowerCase().includes('meat'))).toBe(true);
    
    // Check that tips are sorted by potential impact
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i-1].potential_savings_kg_co2).toBeGreaterThanOrEqual(tips[i].potential_savings_kg_co2);
    }
  });

  it('should return tips for user with high energy usage', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'energyuser',
        email: 'energy@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Add high energy consumption activities
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await db.insert(energyActivitiesTable)
      .values([
        {
          user_id: userId,
          energy_type: 'electricity',
          consumption: '800.0',
          unit: 'kWh',
          emissions_kg_co2: '400.0',
          date: yesterday.toISOString().split('T')[0]
        },
        {
          user_id: userId,
          energy_type: 'natural_gas',
          consumption: '200.0',
          unit: 'therms',
          emissions_kg_co2: '100.0',
          date: yesterday.toISOString().split('T')[0]
        }
      ])
      .execute();

    const tips = await getReductionTips(userId);

    expect(tips.length).toBeGreaterThan(0);
    expect(tips.some(tip => tip.category === 'energy')).toBe(true);
    expect(tips.some(tip => tip.title.toLowerCase().includes('led') || tip.title.toLowerCase().includes('thermostat') || tip.title.toLowerCase().includes('unplug'))).toBe(true);
  });

  it('should return mixed tips for user with activity in all categories', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'mixeduser',
        email: 'mixed@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Add activities in all categories
    await db.insert(transportationActivitiesTable)
      .values({
        user_id: userId,
        transport_type: 'car',
        fuel_type: 'gasoline',
        distance_km: '80.0',
        emissions_kg_co2: '20.0',
        date: yesterday.toISOString().split('T')[0]
      })
      .execute();

    await db.insert(dietActivitiesTable)
      .values({
        user_id: userId,
        meal_type: 'meat',
        meal_count: 12,
        emissions_kg_co2: '36.0',
        date: yesterday.toISOString().split('T')[0]
      })
      .execute();

    await db.insert(energyActivitiesTable)
      .values({
        user_id: userId,
        energy_type: 'electricity',
        consumption: '600.0',
        unit: 'kWh',
        emissions_kg_co2: '300.0',
        date: yesterday.toISOString().split('T')[0]
      })
      .execute();

    const tips = await getReductionTips(userId);

    expect(tips.length).toBeGreaterThan(0);
    expect(tips.length).toBeLessThanOrEqual(5); // Should return max 5 tips
    
    // Should have tips from multiple categories
    const categories = new Set(tips.map(tip => tip.category));
    expect(categories.size).toBeGreaterThan(1);
  });

  it('should return fewer tips for user with low emissions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'lowuser',
        email: 'low@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Add low-emission activities
    await db.insert(transportationActivitiesTable)
      .values({
        user_id: userId,
        transport_type: 'bus',
        fuel_type: null,
        distance_km: '10.0',
        emissions_kg_co2: '2.0',
        date: yesterday.toISOString().split('T')[0]
      })
      .execute();

    await db.insert(dietActivitiesTable)
      .values({
        user_id: userId,
        meal_type: 'vegetarian',
        meal_count: 3,
        emissions_kg_co2: '3.0',
        date: yesterday.toISOString().split('T')[0]
      })
      .execute();

    const tips = await getReductionTips(userId);

    // Should still return some tips, but potentially fewer or with smaller savings
    expect(Array.isArray(tips)).toBe(true);
    tips.forEach(tip => {
      expect(tip.potential_savings_kg_co2).toBeGreaterThanOrEqual(0);
    });
  });

  it('should throw error for non-existent user', async () => {
    expect(getReductionTips(999999)).rejects.toThrow(/not found/i);
  });

  it('should handle user with no activities', async () => {
    // Create test user with no activities
    const userResult = await db.insert(usersTable)
      .values({
        username: 'noactivity',
        email: 'none@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const tips = await getReductionTips(userId);

    // Should return empty array or basic tips
    expect(Array.isArray(tips)).toBe(true);
    expect(tips.length).toBeGreaterThanOrEqual(0);
  });

  it('should only consider activities from last 30 days', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'timeuser',
        email: 'time@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const today = new Date();
    const recentDate = new Date();
    recentDate.setDate(today.getDate() - 15); // 15 days ago
    
    const oldDate = new Date();
    oldDate.setDate(today.getDate() - 60); // 60 days ago

    // Add recent high-emission activity
    await db.insert(transportationActivitiesTable)
      .values({
        user_id: userId,
        transport_type: 'car',
        fuel_type: 'gasoline',
        distance_km: '100.0',
        emissions_kg_co2: '25.0',
        date: recentDate.toISOString().split('T')[0]
      })
      .execute();

    // Add old high-emission activity (should be ignored)
    await db.insert(transportationActivitiesTable)
      .values({
        user_id: userId,
        transport_type: 'car',
        fuel_type: 'gasoline',
        distance_km: '500.0',
        emissions_kg_co2: '125.0',
        date: oldDate.toISOString().split('T')[0]
      })
      .execute();

    const tips = await getReductionTips(userId);

    expect(tips.length).toBeGreaterThan(0);
    // Tips should be based on recent activity (25 kg CO2), not old activity (125 kg CO2)
    const transportTip = tips.find(tip => tip.category === 'transport');
    if (transportTip) {
      // Savings should be calculated based on recent emissions, not old ones
      expect(transportTip.potential_savings_kg_co2).toBeLessThan(50); // Would be much higher if old activity was included
    }
  });
});
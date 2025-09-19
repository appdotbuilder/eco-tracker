import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, dietActivitiesTable, emissionFactorsTable } from '../db/schema';
import { type CreateDietActivityInput } from '../schema';
import { createDietActivity } from '../handlers/create_diet_activity';
import { eq } from 'drizzle-orm';

describe('createDietActivity', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        total_points: 100
      })
      .returning()
      .execute();
    
    return userResult[0];
  };

  // Helper function to create emission factors
  const createEmissionFactors = async () => {
    await db.insert(emissionFactorsTable)
      .values([
        {
          activity_type: 'diet',
          sub_type: 'meat_meal',
          factor_kg_co2: '6.61',
          unit: 'meal'
        },
        {
          activity_type: 'diet',
          sub_type: 'vegetarian_meal',
          factor_kg_co2: '1.79',
          unit: 'meal'
        },
        {
          activity_type: 'diet',
          sub_type: 'vegan_meal',
          factor_kg_co2: '0.89',
          unit: 'meal'
        }
      ])
      .execute();
  };

  it('should create a meat diet activity with database emission factors', async () => {
    const user = await createTestUser();
    await createEmissionFactors();

    const testInput: CreateDietActivityInput = {
      user_id: user.id,
      meal_type: 'meat',
      meal_count: 2,
      date: new Date('2024-01-15')
    };

    const result = await createDietActivity(testInput);

    // Verify basic fields
    expect(result.user_id).toEqual(user.id);
    expect(result.meal_type).toEqual('meat');
    expect(result.meal_count).toEqual(2);
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify emissions calculation (2 meals * 6.61 kg CO2)
    expect(result.emissions_kg_co2).toBeCloseTo(13.22, 2);
    expect(typeof result.emissions_kg_co2).toBe('number');
  });

  it('should create a vegetarian diet activity with database emission factors', async () => {
    const user = await createTestUser();
    await createEmissionFactors();

    const testInput: CreateDietActivityInput = {
      user_id: user.id,
      meal_type: 'vegetarian',
      meal_count: 3,
      date: new Date('2024-01-15')
    };

    const result = await createDietActivity(testInput);

    // Verify emissions calculation (3 meals * 1.79 kg CO2)
    expect(result.emissions_kg_co2).toBeCloseTo(5.37, 2);
    expect(result.meal_type).toEqual('vegetarian');
    expect(result.meal_count).toEqual(3);
  });

  it('should create a vegan diet activity with database emission factors', async () => {
    const user = await createTestUser();
    await createEmissionFactors();

    const testInput: CreateDietActivityInput = {
      user_id: user.id,
      meal_type: 'vegan',
      meal_count: 1,
      date: new Date('2024-01-15')
    };

    const result = await createDietActivity(testInput);

    // Verify emissions calculation (1 meal * 0.89 kg CO2)
    expect(result.emissions_kg_co2).toBeCloseTo(0.89, 2);
    expect(result.meal_type).toEqual('vegan');
    expect(result.meal_count).toEqual(1);
  });

  it('should use default emission factors when database factors not found', async () => {
    const user = await createTestUser();
    // Don't create emission factors - should use defaults

    const testInput: CreateDietActivityInput = {
      user_id: user.id,
      meal_type: 'meat',
      meal_count: 1,
      date: new Date('2024-01-15')
    };

    const result = await createDietActivity(testInput);

    // Verify default emissions calculation (1 meal * 6.61 kg CO2 default)
    expect(result.emissions_kg_co2).toBeCloseTo(6.61, 2);
  });

  it('should save diet activity to database', async () => {
    const user = await createTestUser();
    await createEmissionFactors();

    const testInput: CreateDietActivityInput = {
      user_id: user.id,
      meal_type: 'vegetarian',
      meal_count: 2,
      date: new Date('2024-01-15')
    };

    const result = await createDietActivity(testInput);

    // Query the database to verify the record was saved
    const activities = await db.select()
      .from(dietActivitiesTable)
      .where(eq(dietActivitiesTable.id, result.id))
      .execute();

    expect(activities).toHaveLength(1);
    expect(activities[0].user_id).toEqual(user.id);
    expect(activities[0].meal_type).toEqual('vegetarian');
    expect(activities[0].meal_count).toEqual(2);
    expect(parseFloat(activities[0].emissions_kg_co2)).toBeCloseTo(3.58, 2);
    expect(activities[0].created_at).toBeInstanceOf(Date);
  });

  it('should update user points correctly for different meal types', async () => {
    const user = await createTestUser();
    const initialPoints = user.total_points;

    const testInput: CreateDietActivityInput = {
      user_id: user.id,
      meal_type: 'vegan',
      meal_count: 2,
      date: new Date('2024-01-15')
    };

    await createDietActivity(testInput);

    // Verify user points were updated (2 vegan meals * 15 points = 30 points)
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser[0].total_points).toEqual(initialPoints + 30);
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should award different points for different meal types', async () => {
    const user = await createTestUser();
    const initialPoints = user.total_points;

    // Test meat meal (5 points per meal)
    await createDietActivity({
      user_id: user.id,
      meal_type: 'meat',
      meal_count: 1,
      date: new Date('2024-01-15')
    });

    let updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser[0].total_points).toEqual(initialPoints + 5);

    // Test vegetarian meal (10 points per meal)
    await createDietActivity({
      user_id: user.id,
      meal_type: 'vegetarian',
      meal_count: 1,
      date: new Date('2024-01-16')
    });

    updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser[0].total_points).toEqual(initialPoints + 15); // 5 + 10

    // Test vegan meal (15 points per meal)
    await createDietActivity({
      user_id: user.id,
      meal_type: 'vegan',
      meal_count: 1,
      date: new Date('2024-01-17')
    });

    updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser[0].total_points).toEqual(initialPoints + 30); // 5 + 10 + 15
  });

  it('should handle multiple meals correctly', async () => {
    const user = await createTestUser();
    await createEmissionFactors();

    const testInput: CreateDietActivityInput = {
      user_id: user.id,
      meal_type: 'vegetarian',
      meal_count: 5,
      date: new Date('2024-01-15')
    };

    const result = await createDietActivity(testInput);

    // Verify emissions calculation (5 meals * 1.79 kg CO2)
    expect(result.emissions_kg_co2).toBeCloseTo(8.95, 2);
    expect(result.meal_count).toEqual(5);

    // Verify points calculation (5 meals * 10 points)
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser[0].total_points).toEqual(150); // 100 initial + 50 earned
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateDietActivityInput = {
      user_id: 99999, // Non-existent user
      meal_type: 'vegan',
      meal_count: 1,
      date: new Date('2024-01-15')
    };

    await expect(createDietActivity(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
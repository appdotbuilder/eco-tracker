import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { energyActivitiesTable, usersTable, emissionFactorsTable } from '../db/schema';
import { type CreateEnergyActivityInput } from '../schema';
import { createEnergyActivity } from '../handlers/create_energy_activity';
import { eq, and } from 'drizzle-orm';

describe('createEnergyActivity', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        total_points: 100
      })
      .returning()
      .execute();
    
    testUserId = user[0].id;
  });

  it('should create energy activity with default emission factor', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'electricity',
      consumption: 8.5,
      unit: 'kWh',
      date: new Date('2024-01-15')
    };

    const result = await createEnergyActivity(input);

    // Verify returned object
    expect(result.user_id).toBe(testUserId);
    expect(result.energy_type).toBe('electricity');
    expect(result.consumption).toBe(8.5);
    expect(result.unit).toBe('kWh');
    expect(typeof result.consumption).toBe('number');
    expect(typeof result.emissions_kg_co2).toBe('number');
    expect(result.emissions_kg_co2).toBe(3.4); // 8.5 * 0.4 default factor
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save energy activity to database', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'natural_gas',
      consumption: 2.0,
      unit: 'therms',
      date: new Date('2024-01-15')
    };

    const result = await createEnergyActivity(input);

    // Query database to verify record was saved
    const activities = await db.select()
      .from(energyActivitiesTable)
      .where(eq(energyActivitiesTable.id, result.id))
      .execute();

    expect(activities).toHaveLength(1);
    expect(activities[0].user_id).toBe(testUserId);
    expect(activities[0].energy_type).toBe('natural_gas');
    expect(parseFloat(activities[0].consumption)).toBe(2.0);
    expect(activities[0].unit).toBe('therms');
    expect(parseFloat(activities[0].emissions_kg_co2)).toBe(10.6); // 2.0 * 5.3 default factor
    expect(activities[0].date).toBe('2024-01-15'); // Date stored as string in database
    expect(activities[0].created_at).toBeInstanceOf(Date);
  });

  it('should use custom emission factor from database when available', async () => {
    // Insert custom emission factor
    await db.insert(emissionFactorsTable)
      .values({
        activity_type: 'energy',
        sub_type: 'electricity_kWh',
        factor_kg_co2: '0.6', // Convert to string for numeric column
        unit: 'kWh'
      })
      .execute();

    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'electricity',
      consumption: 10.0,
      unit: 'kWh',
      date: new Date('2024-01-15')
    };

    const result = await createEnergyActivity(input);

    expect(result.emissions_kg_co2).toBe(6.0); // 10.0 * 0.6 custom factor
  });

  it('should award points for low energy consumption (electricity)', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'electricity',
      consumption: 7.0, // Below 10 kWh threshold
      unit: 'kWh',
      date: new Date('2024-01-15')
    };

    await createEnergyActivity(input);

    // Check that user points were updated
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].total_points).toBe(106); // 100 + (10 - 7) * 2 = 106 points
  });

  it('should award points for low energy consumption (natural gas)', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'natural_gas',
      consumption: 3.0, // Below 5 therms threshold
      unit: 'therms',
      date: new Date('2024-01-15')
    };

    await createEnergyActivity(input);

    // Check that user points were updated
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].total_points).toBe(104); // 100 + (5 - 3) * 2 = 104 points
  });

  it('should not award points for high energy consumption', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'electricity',
      consumption: 15.0, // Above 10 kWh threshold
      unit: 'kWh',
      date: new Date('2024-01-15')
    };

    await createEnergyActivity(input);

    // Check that user points remained unchanged
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].total_points).toBe(100); // No change
  });

  it('should handle different unit types correctly', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'natural_gas',
      consumption: 50.0,
      unit: 'm³',
      date: new Date('2024-01-15')
    };

    const result = await createEnergyActivity(input);

    expect(result.unit).toBe('m³');
    expect(result.emissions_kg_co2).toBe(100.0); // 50.0 * 2.0 default factor for m³
  });

  it('should use fallback emission factor for unknown energy type/unit combinations', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'electricity',
      consumption: 5.0,
      unit: 'unknown_unit',
      date: new Date('2024-01-15')
    };

    const result = await createEnergyActivity(input);

    expect(result.emissions_kg_co2).toBe(1.5); // 5.0 * 0.3 fallback factor
  });

  it('should handle multiple activities for same user', async () => {
    const input1: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'electricity',
      consumption: 8.0,
      unit: 'kWh',
      date: new Date('2024-01-15')
    };

    const input2: CreateEnergyActivityInput = {
      user_id: testUserId,
      energy_type: 'natural_gas',
      consumption: 2.5,
      unit: 'therms',
      date: new Date('2024-01-16')
    };

    const result1 = await createEnergyActivity(input1);
    const result2 = await createEnergyActivity(input2);

    expect(result1.id).not.toBe(result2.id);
    expect(result1.energy_type).toBe('electricity');
    expect(result2.energy_type).toBe('natural_gas');

    // Verify both records exist in database
    const activities = await db.select()
      .from(energyActivitiesTable)
      .where(eq(energyActivitiesTable.user_id, testUserId))
      .execute();

    expect(activities).toHaveLength(2);
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateEnergyActivityInput = {
      user_id: 99999, // Non-existent user
      energy_type: 'electricity',
      consumption: 10.0,
      unit: 'kWh',
      date: new Date('2024-01-15')
    };

    await expect(createEnergyActivity(input)).rejects.toThrow(/User not found/i);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transportationActivitiesTable, emissionFactorsTable } from '../db/schema';
import { type CreateTransportationActivityInput } from '../schema';
import { createTransportationActivity } from '../handlers/create_transportation_activity';
import { eq } from 'drizzle-orm';

describe('createTransportationActivity', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a car transportation activity with gasoline', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create emission factor for car_gasoline
    await db.insert(emissionFactorsTable)
      .values({
        activity_type: 'transport',
        sub_type: 'car_gasoline',
        factor_kg_co2: '0.2',
        unit: 'km'
      })
      .execute();

    const testInput: CreateTransportationActivityInput = {
      user_id: userId,
      transport_type: 'car',
      fuel_type: 'gasoline',
      distance_km: 100,
      date: new Date('2024-01-15')
    };

    const result = await createTransportationActivity(testInput);

    // Verify basic fields
    expect(result.user_id).toEqual(userId);
    expect(result.transport_type).toEqual('car');
    expect(result.fuel_type).toEqual('gasoline');
    expect(result.distance_km).toEqual(100);
    expect(result.emissions_kg_co2).toEqual(20); // 100 km * 0.2 kg/km
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.distance_km).toBe('number');
    expect(typeof result.emissions_kg_co2).toBe('number');
  });

  it('should create a public transport activity without fuel type', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'transituser',
        email: 'transit@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create emission factor for bus
    await db.insert(emissionFactorsTable)
      .values({
        activity_type: 'transport',
        sub_type: 'bus',
        factor_kg_co2: '0.08',
        unit: 'km'
      })
      .execute();

    const testInput: CreateTransportationActivityInput = {
      user_id: userId,
      transport_type: 'bus',
      fuel_type: null,
      distance_km: 25.5,
      date: new Date('2024-01-20')
    };

    const result = await createTransportationActivity(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.transport_type).toEqual('bus');
    expect(result.fuel_type).toBeNull();
    expect(result.distance_km).toEqual(25.5);
    expect(result.emissions_kg_co2).toEqual(2.04); // 25.5 km * 0.08 kg/km
    expect(result.date).toEqual(new Date('2024-01-20'));
  });

  it('should save activity to database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'dbuser',
        email: 'db@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create emission factor
    await db.insert(emissionFactorsTable)
      .values({
        activity_type: 'transport',
        sub_type: 'train',
        factor_kg_co2: '0.05',
        unit: 'km'
      })
      .execute();

    const testInput: CreateTransportationActivityInput = {
      user_id: userId,
      transport_type: 'train',
      fuel_type: null,
      distance_km: 200,
      date: new Date('2024-02-01')
    };

    const result = await createTransportationActivity(testInput);

    // Verify record was saved to database
    const savedActivities = await db.select()
      .from(transportationActivitiesTable)
      .where(eq(transportationActivitiesTable.id, result.id))
      .execute();

    expect(savedActivities).toHaveLength(1);
    const savedActivity = savedActivities[0];
    expect(savedActivity.user_id).toEqual(userId);
    expect(savedActivity.transport_type).toEqual('train');
    expect(savedActivity.fuel_type).toBeNull();
    expect(parseFloat(savedActivity.distance_km)).toEqual(200);
    expect(parseFloat(savedActivity.emissions_kg_co2)).toEqual(10); // 200 km * 0.05 kg/km
    expect(savedActivity.date).toEqual('2024-02-01'); // Date stored as string in DB
    expect(savedActivity.created_at).toBeInstanceOf(Date);
  });

  it('should handle electric car properly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'ecouser',
        email: 'eco@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create emission factor for electric car
    await db.insert(emissionFactorsTable)
      .values({
        activity_type: 'transport',
        sub_type: 'car_electric',
        factor_kg_co2: '0.02',
        unit: 'km'
      })
      .execute();

    const testInput: CreateTransportationActivityInput = {
      user_id: userId,
      transport_type: 'car',
      fuel_type: 'electric',
      distance_km: 150,
      date: new Date('2024-03-01')
    };

    const result = await createTransportationActivity(testInput);

    expect(result.transport_type).toEqual('car');
    expect(result.fuel_type).toEqual('electric');
    expect(result.distance_km).toEqual(150);
    expect(result.emissions_kg_co2).toEqual(3); // 150 km * 0.02 kg/km
  });

  it('should handle flight activities correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'traveler',
        email: 'traveler@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create emission factor for short flight
    await db.insert(emissionFactorsTable)
      .values({
        activity_type: 'transport',
        sub_type: 'flight_short',
        factor_kg_co2: '0.25',
        unit: 'km'
      })
      .execute();

    const testInput: CreateTransportationActivityInput = {
      user_id: userId,
      transport_type: 'flight_short',
      fuel_type: null,
      distance_km: 800,
      date: new Date('2024-04-01')
    };

    const result = await createTransportationActivity(testInput);

    expect(result.transport_type).toEqual('flight_short');
    expect(result.fuel_type).toBeNull();
    expect(result.distance_km).toEqual(800);
    expect(result.emissions_kg_co2).toEqual(200); // 800 km * 0.25 kg/km
  });

  it('should throw error when emission factor not found', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'erroruser',
        email: 'error@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Don't create emission factor - this should cause an error

    const testInput: CreateTransportationActivityInput = {
      user_id: userId,
      transport_type: 'car',
      fuel_type: 'diesel',
      distance_km: 50,
      date: new Date('2024-01-01')
    };

    await expect(createTransportationActivity(testInput))
      .rejects.toThrow(/emission factor not found/i);
  });

  it('should handle fractional emissions correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'preciseuser',
        email: 'precise@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create emission factor with precise decimal
    await db.insert(emissionFactorsTable)
      .values({
        activity_type: 'transport',
        sub_type: 'subway',
        factor_kg_co2: '0.033',
        unit: 'km'
      })
      .execute();

    const testInput: CreateTransportationActivityInput = {
      user_id: userId,
      transport_type: 'subway',
      fuel_type: null,
      distance_km: 15.7,
      date: new Date('2024-05-01')
    };

    const result = await createTransportationActivity(testInput);

    expect(result.distance_km).toEqual(15.7);
    expect(result.emissions_kg_co2).toBeCloseTo(0.5181, 4); // 15.7 km * 0.033 kg/km
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emissionFactorsTable } from '../db/schema';
import { getEmissionFactors } from '../handlers/get_emission_factors';

describe('getEmissionFactors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no emission factors exist', async () => {
    const result = await getEmissionFactors();

    expect(result).toEqual([]);
  });

  it('should fetch all emission factors from database', async () => {
    // Insert test emission factors
    await db.insert(emissionFactorsTable)
      .values([
        {
          activity_type: 'transport',
          sub_type: 'car_gasoline',
          factor_kg_co2: '0.21',
          unit: 'km'
        },
        {
          activity_type: 'diet',
          sub_type: 'meat_meal',
          factor_kg_co2: '3.3',
          unit: 'meal'
        },
        {
          activity_type: 'energy',
          sub_type: 'electricity',
          factor_kg_co2: '0.4',
          unit: 'kWh'
        }
      ])
      .execute();

    const result = await getEmissionFactors();

    expect(result).toHaveLength(3);
    
    // Verify transport factor
    const transportFactor = result.find(f => f.activity_type === 'transport' && f.sub_type === 'car_gasoline');
    expect(transportFactor).toBeDefined();
    expect(transportFactor!.factor_kg_co2).toBe(0.21);
    expect(typeof transportFactor!.factor_kg_co2).toBe('number');
    expect(transportFactor!.unit).toBe('km');
    expect(transportFactor!.id).toBeDefined();
    expect(transportFactor!.created_at).toBeInstanceOf(Date);

    // Verify diet factor
    const dietFactor = result.find(f => f.activity_type === 'diet' && f.sub_type === 'meat_meal');
    expect(dietFactor).toBeDefined();
    expect(dietFactor!.factor_kg_co2).toBe(3.3);
    expect(typeof dietFactor!.factor_kg_co2).toBe('number');
    expect(dietFactor!.unit).toBe('meal');

    // Verify energy factor
    const energyFactor = result.find(f => f.activity_type === 'energy' && f.sub_type === 'electricity');
    expect(energyFactor).toBeDefined();
    expect(energyFactor!.factor_kg_co2).toBe(0.4);
    expect(typeof energyFactor!.factor_kg_co2).toBe('number');
    expect(energyFactor!.unit).toBe('kWh');
  });

  it('should handle various emission factor types and values', async () => {
    // Insert diverse emission factors
    await db.insert(emissionFactorsTable)
      .values([
        {
          activity_type: 'transport',
          sub_type: 'bus',
          factor_kg_co2: '0.05',
          unit: 'km'
        },
        {
          activity_type: 'transport',
          sub_type: 'flight_long',
          factor_kg_co2: '0.195',
          unit: 'km'
        },
        {
          activity_type: 'diet',
          sub_type: 'vegetarian_meal',
          factor_kg_co2: '1.5',
          unit: 'meal'
        },
        {
          activity_type: 'diet',
          sub_type: 'vegan_meal',
          factor_kg_co2: '0.8',
          unit: 'meal'
        },
        {
          activity_type: 'energy',
          sub_type: 'natural_gas',
          factor_kg_co2: '2.0',
          unit: 'therm'
        }
      ])
      .execute();

    const result = await getEmissionFactors();

    expect(result).toHaveLength(5);
    
    // Check that all factors are properly converted to numbers
    result.forEach(factor => {
      expect(typeof factor.factor_kg_co2).toBe('number');
      expect(factor.factor_kg_co2).toBeGreaterThan(0);
      expect(factor.activity_type).toMatch(/^(transport|diet|energy)$/);
      expect(factor.sub_type).toBeTypeOf('string');
      expect(factor.unit).toBeTypeOf('string');
      expect(factor.id).toBeDefined();
      expect(factor.created_at).toBeInstanceOf(Date);
    });

    // Verify specific values
    const busFactor = result.find(f => f.sub_type === 'bus');
    expect(busFactor!.factor_kg_co2).toBe(0.05);

    const flightFactor = result.find(f => f.sub_type === 'flight_long');
    expect(flightFactor!.factor_kg_co2).toBe(0.195);

    const veganFactor = result.find(f => f.sub_type === 'vegan_meal');
    expect(veganFactor!.factor_kg_co2).toBe(0.8);
  });

  it('should handle high precision emission factors correctly', async () => {
    // Test with high precision values
    await db.insert(emissionFactorsTable)
      .values([
        {
          activity_type: 'transport',
          sub_type: 'electric_car',
          factor_kg_co2: '0.000123', // Very low emission factor for electric
          unit: 'km'
        },
        {
          activity_type: 'energy',
          sub_type: 'renewable_electricity',
          factor_kg_co2: '0.015678',
          unit: 'kWh'
        }
      ])
      .execute();

    const result = await getEmissionFactors();

    expect(result).toHaveLength(2);
    
    const electricCarFactor = result.find(f => f.sub_type === 'electric_car');
    expect(electricCarFactor!.factor_kg_co2).toBe(0.000123);
    
    const renewableFactor = result.find(f => f.sub_type === 'renewable_electricity');
    expect(renewableFactor!.factor_kg_co2).toBe(0.015678);
  });

  it('should preserve order of insertion', async () => {
    // Insert factors in specific order
    await db.insert(emissionFactorsTable)
      .values([
        {
          activity_type: 'transport',
          sub_type: 'car_diesel',
          factor_kg_co2: '0.25',
          unit: 'km'
        },
        {
          activity_type: 'diet',
          sub_type: 'fish_meal',
          factor_kg_co2: '2.1',
          unit: 'meal'
        },
        {
          activity_type: 'energy',
          sub_type: 'coal_electricity',
          factor_kg_co2: '0.82',
          unit: 'kWh'
        }
      ])
      .execute();

    const result = await getEmissionFactors();

    expect(result).toHaveLength(3);
    // Results should maintain database order (typically by id)
    expect(result[0].sub_type).toBe('car_diesel');
    expect(result[1].sub_type).toBe('fish_meal');
    expect(result[2].sub_type).toBe('coal_electricity');
  });
});
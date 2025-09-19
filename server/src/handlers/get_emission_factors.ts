import { db } from '../db';
import { emissionFactorsTable } from '../db/schema';
import { type EmissionFactor } from '../schema';

export const getEmissionFactors = async (): Promise<EmissionFactor[]> => {
  try {
    // Fetch all emission factors from the database
    const results = await db.select()
      .from(emissionFactorsTable)
      .execute();

    // Convert numeric fields from string to number for proper type compatibility
    return results.map(factor => ({
      ...factor,
      factor_kg_co2: parseFloat(factor.factor_kg_co2) // Convert numeric field
    }));
  } catch (error) {
    console.error('Failed to fetch emission factors:', error);
    throw error;
  }
};
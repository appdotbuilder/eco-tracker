import { db } from '../db';
import { energyActivitiesTable, emissionFactorsTable, usersTable } from '../db/schema';
import { type CreateEnergyActivityInput, type EnergyActivity } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const createEnergyActivity = async (input: CreateEnergyActivityInput): Promise<EnergyActivity> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Look up emission factor for the energy type and unit
    const emissionFactorKey = `${input.energy_type}_${input.unit}`;
    const emissionFactor = await db.select()
      .from(emissionFactorsTable)
      .where(
        and(
          eq(emissionFactorsTable.activity_type, 'energy'),
          eq(emissionFactorsTable.sub_type, emissionFactorKey)
        )
      )
      .execute();

    let emissionFactorValue: number;
    if (emissionFactor.length === 0) {
      // Use default emission factors if not found in database
      const defaultFactors: Record<string, number> = {
        'electricity_kWh': 0.4, // kg CO2 per kWh (average grid electricity)
        'natural_gas_therms': 5.3, // kg CO2 per therm
        'natural_gas_m³': 2.0, // kg CO2 per cubic meter
        'natural_gas_kWh': 0.2 // kg CO2 per kWh for gas heating
      };
      
      emissionFactorValue = defaultFactors[emissionFactorKey] || 0.3; // fallback
    } else {
      emissionFactorValue = parseFloat(emissionFactor[0].factor_kg_co2);
    }

    // Calculate emissions
    const emissions_kg_co2 = input.consumption * emissionFactorValue;

    // Insert energy activity record
    const result = await db.insert(energyActivitiesTable)
      .values({
        user_id: input.user_id,
        energy_type: input.energy_type,
        consumption: input.consumption.toString(),
        unit: input.unit,
        emissions_kg_co2: emissions_kg_co2.toString(),
        date: input.date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Calculate average energy consumption for scoring (example: if below 10 kWh daily, award points)
    const averageThreshold = input.energy_type === 'electricity' ? 10 : 5; // kWh or therms
    let pointsAwarded = 0;
    
    if (input.consumption < averageThreshold) {
      pointsAwarded = Math.floor((averageThreshold - input.consumption) * 2); // 2 points per unit saved
      
      // Update user's total points
      await db.update(usersTable)
        .set({
          total_points: sql`${usersTable.total_points} + ${pointsAwarded}`,
          updated_at: sql`NOW()`
        })
        .where(eq(usersTable.id, input.user_id))
        .execute();
    }

    // Convert numeric fields back to numbers and handle date conversion
    const activity = result[0];
    return {
      ...activity,
      consumption: parseFloat(activity.consumption),
      emissions_kg_co2: parseFloat(activity.emissions_kg_co2),
      date: new Date(activity.date) // Convert string date back to Date object
    };
  } catch (error) {
    console.error('Energy activity creation failed:', error);
    throw error;
  }
};
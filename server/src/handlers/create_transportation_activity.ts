import { db } from '../db';
import { transportationActivitiesTable, emissionFactorsTable } from '../db/schema';
import { type CreateTransportationActivityInput, type TransportationActivity } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransportationActivity = async (input: CreateTransportationActivityInput): Promise<TransportationActivity> => {
  try {
    // Build sub_type for emission factor lookup
    let subType = input.transport_type;
    if (input.fuel_type && input.transport_type === 'car') {
      subType = `${input.transport_type}_${input.fuel_type}` as any;
    }

    // Look up emission factor
    const emissionFactors = await db.select()
      .from(emissionFactorsTable)
      .where(eq(emissionFactorsTable.sub_type, subType))
      .execute();

    if (emissionFactors.length === 0) {
      throw new Error(`Emission factor not found for activity type: ${subType}`);
    }

    const emissionFactor = emissionFactors[0];
    
    // Calculate CO2 emissions
    const emissionsKgCo2 = input.distance_km * parseFloat(emissionFactor.factor_kg_co2);

    // Format date as string for database
    const dateString = input.date.toISOString().split('T')[0];

    // Insert transportation activity record
    const result = await db.insert(transportationActivitiesTable)
      .values({
        user_id: input.user_id,
        transport_type: input.transport_type,
        fuel_type: input.fuel_type,
        distance_km: input.distance_km.toString(),
        emissions_kg_co2: emissionsKgCo2.toString(),
        date: dateString
      })
      .returning()
      .execute();

    // Convert numeric fields and date back to proper types before returning
    const activity = result[0];
    return {
      ...activity,
      distance_km: parseFloat(activity.distance_km),
      emissions_kg_co2: parseFloat(activity.emissions_kg_co2),
      date: new Date(activity.date)
    };
  } catch (error) {
    console.error('Transportation activity creation failed:', error);
    throw error;
  }
};
import { db } from '../db';
import { usersTable, transportationActivitiesTable, dietActivitiesTable, energyActivitiesTable } from '../db/schema';
import { type GetUserActivitiesInput, type TransportationActivity, type DietActivity, type EnergyActivity } from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

type ActivityUnion = TransportationActivity | DietActivity | EnergyActivity;

export async function getUserActivities(input: GetUserActivitiesInput): Promise<ActivityUnion[]> {
  try {
    // First verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    const activities: ActivityUnion[] = [];
    
    // Determine which activity types to fetch
    const activityTypes = input.activity_type ? [input.activity_type] : ['transport', 'diet', 'energy'];

    // Helper function to build date conditions
    const buildDateConditions = (dateColumn: any): SQL<unknown>[] => {
      const conditions: SQL<unknown>[] = [];
      
      if (input.start_date) {
        conditions.push(gte(dateColumn, input.start_date));
      }
      
      if (input.end_date) {
        conditions.push(lte(dateColumn, input.end_date));
      }
      
      return conditions;
    };

    // Fetch transportation activities
    if (activityTypes.includes('transport')) {
      const conditions: SQL<unknown>[] = [eq(transportationActivitiesTable.user_id, input.user_id)];
      const dateConditions = buildDateConditions(transportationActivitiesTable.date);
      conditions.push(...dateConditions);

      const transportResults = await db.select()
        .from(transportationActivitiesTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(transportationActivitiesTable.date), desc(transportationActivitiesTable.created_at))
        .execute();
      
      activities.push(...transportResults.map(activity => ({
        ...activity,
        distance_km: parseFloat(activity.distance_km),
        emissions_kg_co2: parseFloat(activity.emissions_kg_co2),
        date: new Date(activity.date),
        created_at: new Date(activity.created_at)
      })));
    }

    // Fetch diet activities
    if (activityTypes.includes('diet')) {
      const conditions: SQL<unknown>[] = [eq(dietActivitiesTable.user_id, input.user_id)];
      const dateConditions = buildDateConditions(dietActivitiesTable.date);
      conditions.push(...dateConditions);

      const dietResults = await db.select()
        .from(dietActivitiesTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(dietActivitiesTable.date), desc(dietActivitiesTable.created_at))
        .execute();
      
      activities.push(...dietResults.map(activity => ({
        ...activity,
        emissions_kg_co2: parseFloat(activity.emissions_kg_co2),
        date: new Date(activity.date),
        created_at: new Date(activity.created_at)
      })));
    }

    // Fetch energy activities
    if (activityTypes.includes('energy')) {
      const conditions: SQL<unknown>[] = [eq(energyActivitiesTable.user_id, input.user_id)];
      const dateConditions = buildDateConditions(energyActivitiesTable.date);
      conditions.push(...dateConditions);

      const energyResults = await db.select()
        .from(energyActivitiesTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(energyActivitiesTable.date), desc(energyActivitiesTable.created_at))
        .execute();
      
      activities.push(...energyResults.map(activity => ({
        ...activity,
        consumption: parseFloat(activity.consumption),
        emissions_kg_co2: parseFloat(activity.emissions_kg_co2),
        date: new Date(activity.date),
        created_at: new Date(activity.created_at)
      })));
    }

    // Sort all activities by date (most recent first), then by created_at
    activities.sort((a, b) => {
      const dateComparison = b.date.getTime() - a.date.getTime();
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return b.created_at.getTime() - a.created_at.getTime();
    });

    return activities;
  } catch (error) {
    console.error('Failed to get user activities:', error);
    throw error;
  }
}
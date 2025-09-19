import { db } from '../db';
import { dietActivitiesTable, emissionFactorsTable, usersTable } from '../db/schema';
import { type CreateDietActivityInput, type DietActivity } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const createDietActivity = async (input: CreateDietActivityInput): Promise<DietActivity> => {
  try {
    // 1. Look up emission factor for the meal type
    const emissionFactorResult = await db.select()
      .from(emissionFactorsTable)
      .where(
        and(
          eq(emissionFactorsTable.activity_type, 'diet'),
          eq(emissionFactorsTable.sub_type, `${input.meal_type}_meal`)
        )
      )
      .limit(1)
      .execute();

    // Default emission factors per meal if not found in database
    const defaultEmissionFactors: Record<string, number> = {
      'meat': 6.61,      // kg CO2 per meat meal
      'vegetarian': 1.79, // kg CO2 per vegetarian meal  
      'vegan': 0.89      // kg CO2 per vegan meal
    };

    const emissionFactor = emissionFactorResult.length > 0
      ? parseFloat(emissionFactorResult[0].factor_kg_co2)
      : defaultEmissionFactors[input.meal_type];

    // 2. Calculate total CO2 emissions
    const totalEmissions = input.meal_count * emissionFactor;

    // 3. Create diet activity record
    const activityResult = await db.insert(dietActivitiesTable)
      .values({
        user_id: input.user_id,
        meal_type: input.meal_type,
        meal_count: input.meal_count,
        emissions_kg_co2: totalEmissions.toString(), // Convert to string for numeric column
        date: input.date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // 4. Update user's total points for eco-friendly choices
    // Award more points for lower-emission meal types
    const pointsPerMeal = input.meal_type === 'vegan' ? 15 : 
                         input.meal_type === 'vegetarian' ? 10 : 5;
    const totalPoints = input.meal_count * pointsPerMeal;

    await db.update(usersTable)
      .set({
        total_points: sql`${usersTable.total_points} + ${totalPoints}`,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .execute();

    // 5. Convert numeric fields and date back to proper types before returning
    const activity = activityResult[0];
    return {
      ...activity,
      emissions_kg_co2: parseFloat(activity.emissions_kg_co2), // Convert string back to number
      date: new Date(activity.date) // Convert date string back to Date object
    };
  } catch (error) {
    console.error('Diet activity creation failed:', error);
    throw error;
  }
};
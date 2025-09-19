import { db } from '../db';
import { 
  transportationActivitiesTable, 
  dietActivitiesTable, 
  energyActivitiesTable,
  usersTable 
} from '../db/schema';
import { eq, sum, desc, sql, gte } from 'drizzle-orm';

export interface ReductionTip {
  id: number;
  category: 'transport' | 'diet' | 'energy';
  title: string;
  description: string;
  potential_savings_kg_co2: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CategoryEmissions {
  transport: number;
  diet: number;
  energy: number;
}

interface TransportPattern {
  car_usage: number;
  flight_usage: number;
  public_transport_usage: number;
}

interface DietPattern {
  meat_meals: number;
  vegetarian_meals: number;
  total_meals: number;
}

interface EnergyPattern {
  electricity_usage: number;
  gas_usage: number;
}

export async function getReductionTips(userId: number): Promise<ReductionTip[]> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Calculate date for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get category emissions for the last 30 days
    const categoryEmissions = await getCategoryEmissions(userId, thirtyDaysAgo);
    
    // Get detailed patterns for each category
    const transportPattern = await getTransportPattern(userId, thirtyDaysAgo);
    const dietPattern = await getDietPattern(userId, thirtyDaysAgo);
    const energyPattern = await getEnergyPattern(userId, thirtyDaysAgo);

    // Generate personalized tips based on patterns
    const tips: ReductionTip[] = [];
    let tipId = 1;

    // Generate transport tips
    const transportTips = generateTransportTips(transportPattern, categoryEmissions.transport);
    transportTips.forEach(tip => {
      tips.push({ ...tip, id: tipId++ });
    });

    // Generate diet tips
    const dietTips = generateDietTips(dietPattern, categoryEmissions.diet);
    dietTips.forEach(tip => {
      tips.push({ ...tip, id: tipId++ });
    });

    // Generate energy tips
    const energyTips = generateEnergyTips(energyPattern, categoryEmissions.energy);
    energyTips.forEach(tip => {
      tips.push({ ...tip, id: tipId++ });
    });

    // Sort by potential impact (highest CO2 savings first)
    tips.sort((a, b) => b.potential_savings_kg_co2 - a.potential_savings_kg_co2);

    // Return top 5 most impactful tips
    return tips.slice(0, 5);

  } catch (error) {
    console.error('Failed to get reduction tips:', error);
    throw error;
  }
}

async function getCategoryEmissions(userId: number, since: Date): Promise<CategoryEmissions> {
  // Get transport emissions
  const transportResult = await db.select({
    total: sum(transportationActivitiesTable.emissions_kg_co2)
  })
    .from(transportationActivitiesTable)
    .where(
      sql`${transportationActivitiesTable.user_id} = ${userId} AND ${transportationActivitiesTable.date} >= ${since.toISOString().split('T')[0]}`
    )
    .execute();

  // Get diet emissions
  const dietResult = await db.select({
    total: sum(dietActivitiesTable.emissions_kg_co2)
  })
    .from(dietActivitiesTable)
    .where(
      sql`${dietActivitiesTable.user_id} = ${userId} AND ${dietActivitiesTable.date} >= ${since.toISOString().split('T')[0]}`
    )
    .execute();

  // Get energy emissions
  const energyResult = await db.select({
    total: sum(energyActivitiesTable.emissions_kg_co2)
  })
    .from(energyActivitiesTable)
    .where(
      sql`${energyActivitiesTable.user_id} = ${userId} AND ${energyActivitiesTable.date} >= ${since.toISOString().split('T')[0]}`
    )
    .execute();

  return {
    transport: parseFloat(transportResult[0]?.total || '0'),
    diet: parseFloat(dietResult[0]?.total || '0'),
    energy: parseFloat(energyResult[0]?.total || '0')
  };
}

async function getTransportPattern(userId: number, since: Date): Promise<TransportPattern> {
  const results = await db.select({
    transport_type: transportationActivitiesTable.transport_type,
    total_emissions: sum(transportationActivitiesTable.emissions_kg_co2),
    total_distance: sum(transportationActivitiesTable.distance_km)
  })
    .from(transportationActivitiesTable)
    .where(
      sql`${transportationActivitiesTable.user_id} = ${userId} AND ${transportationActivitiesTable.date} >= ${since.toISOString().split('T')[0]}`
    )
    .groupBy(transportationActivitiesTable.transport_type)
    .execute();

  let car_usage = 0;
  let flight_usage = 0;
  let public_transport_usage = 0;

  results.forEach(result => {
    const emissions = parseFloat(result.total_emissions || '0');
    if (result.transport_type === 'car') {
      car_usage = emissions;
    } else if (result.transport_type.startsWith('flight_')) {
      flight_usage += emissions;
    } else {
      public_transport_usage += emissions;
    }
  });

  return { car_usage, flight_usage, public_transport_usage };
}

async function getDietPattern(userId: number, since: Date): Promise<DietPattern> {
  const results = await db.select({
    meal_type: dietActivitiesTable.meal_type,
    total_meals: sum(dietActivitiesTable.meal_count)
  })
    .from(dietActivitiesTable)
    .where(
      sql`${dietActivitiesTable.user_id} = ${userId} AND ${dietActivitiesTable.date} >= ${since.toISOString().split('T')[0]}`
    )
    .groupBy(dietActivitiesTable.meal_type)
    .execute();

  let meat_meals = 0;
  let vegetarian_meals = 0;
  let total_meals = 0;

  results.forEach(result => {
    const meals = parseInt(result.total_meals || '0');
    total_meals += meals;
    if (result.meal_type === 'meat') {
      meat_meals = meals;
    } else {
      vegetarian_meals += meals;
    }
  });

  return { meat_meals, vegetarian_meals, total_meals };
}

async function getEnergyPattern(userId: number, since: Date): Promise<EnergyPattern> {
  const results = await db.select({
    energy_type: energyActivitiesTable.energy_type,
    total_consumption: sum(energyActivitiesTable.consumption)
  })
    .from(energyActivitiesTable)
    .where(
      sql`${energyActivitiesTable.user_id} = ${userId} AND ${energyActivitiesTable.date} >= ${since.toISOString().split('T')[0]}`
    )
    .groupBy(energyActivitiesTable.energy_type)
    .execute();

  let electricity_usage = 0;
  let gas_usage = 0;

  results.forEach(result => {
    const consumption = parseFloat(result.total_consumption || '0');
    if (result.energy_type === 'electricity') {
      electricity_usage = consumption;
    } else if (result.energy_type === 'natural_gas') {
      gas_usage = consumption;
    }
  });

  return { electricity_usage, gas_usage };
}

function generateTransportTips(pattern: TransportPattern, totalEmissions: number): Omit<ReductionTip, 'id'>[] {
  const tips: Omit<ReductionTip, 'id'>[] = [];

  if (pattern.car_usage > 50) {
    tips.push({
      category: 'transport',
      title: 'Switch to public transportation',
      description: 'Your car usage is generating significant emissions. Try using public transport, biking, or walking for shorter trips.',
      potential_savings_kg_co2: Math.round(pattern.car_usage * 0.3),
      difficulty: 'easy'
    });

    tips.push({
      category: 'transport',
      title: 'Consider carpooling',
      description: 'Share rides with colleagues or friends to reduce your transportation footprint.',
      potential_savings_kg_co2: Math.round(pattern.car_usage * 0.25),
      difficulty: 'easy'
    });
  }

  if (pattern.flight_usage > 100) {
    tips.push({
      category: 'transport',
      title: 'Reduce air travel',
      description: 'Consider combining trips or choosing destinations closer to home to reduce flight emissions.',
      potential_savings_kg_co2: Math.round(pattern.flight_usage * 0.2),
      difficulty: 'medium'
    });
  }

  if (pattern.car_usage > 20 && pattern.public_transport_usage === 0) {
    tips.push({
      category: 'transport',
      title: 'Try public transport once a week',
      description: 'Start small by using public transportation for one trip per week.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.1),
      difficulty: 'easy'
    });
  }

  return tips;
}

function generateDietTips(pattern: DietPattern, totalEmissions: number): Omit<ReductionTip, 'id'>[] {
  const tips: Omit<ReductionTip, 'id'>[] = [];

  if (pattern.meat_meals > 10) {
    tips.push({
      category: 'diet',
      title: 'Try Meatless Monday',
      description: 'Replace one meat meal per week with a delicious vegetarian or vegan alternative.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.15),
      difficulty: 'easy'
    });
  }

  if (pattern.meat_meals > 20) {
    tips.push({
      category: 'diet',
      title: 'Reduce meat consumption by 25%',
      description: 'Gradually reduce meat meals and explore plant-based protein sources like legumes and tofu.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.25),
      difficulty: 'medium'
    });
  }

  if (pattern.meat_meals > 0 && pattern.vegetarian_meals === 0) {
    tips.push({
      category: 'diet',
      title: 'Try plant-based meals',
      description: 'Experiment with vegetarian recipes to discover new flavors while reducing your carbon footprint.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.1),
      difficulty: 'easy'
    });
  }

  return tips;
}

function generateEnergyTips(pattern: EnergyPattern, totalEmissions: number): Omit<ReductionTip, 'id'>[] {
  const tips: Omit<ReductionTip, 'id'>[] = [];

  if (pattern.electricity_usage > 500) {
    tips.push({
      category: 'energy',
      title: 'Switch to LED lighting',
      description: 'Replace incandescent and CFL bulbs with energy-efficient LED bulbs to reduce electricity consumption.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.1),
      difficulty: 'easy'
    });

    tips.push({
      category: 'energy',
      title: 'Unplug devices when not in use',
      description: 'Many electronics draw power even when turned off. Unplug chargers and appliances to save energy.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.05),
      difficulty: 'easy'
    });
  }

  if (pattern.gas_usage > 100) {
    tips.push({
      category: 'energy',
      title: 'Lower your thermostat',
      description: 'Reduce heating by 2-3 degrees and use layers or blankets to stay warm.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.15),
      difficulty: 'easy'
    });
  }

  if (pattern.electricity_usage > 300) {
    tips.push({
      category: 'energy',
      title: 'Use energy-efficient appliances',
      description: 'When replacing appliances, choose Energy Star certified models to reduce long-term consumption.',
      potential_savings_kg_co2: Math.round(totalEmissions * 0.2),
      difficulty: 'hard'
    });
  }

  return tips;
}
import { db } from '../db';
import { 
  usersTable, 
  transportationActivitiesTable, 
  dietActivitiesTable, 
  energyActivitiesTable,
  goalsTable,
  challengesTable,
  badgesTable
} from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';

export async function getUserDashboard(userId: number): Promise<DashboardData> {
  try {
    // 1. Fetch user information
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    const user = users[0];

    // 2. Calculate total emissions across all activity types
    const [transportEmissionsResult] = await db.select({
      total: sql<string>`COALESCE(SUM(${transportationActivitiesTable.emissions_kg_co2}), 0)`
    })
    .from(transportationActivitiesTable)
    .where(eq(transportationActivitiesTable.user_id, userId))
    .execute();

    const [dietEmissionsResult] = await db.select({
      total: sql<string>`COALESCE(SUM(${dietActivitiesTable.emissions_kg_co2}), 0)`
    })
    .from(dietActivitiesTable)
    .where(eq(dietActivitiesTable.user_id, userId))
    .execute();

    const [energyEmissionsResult] = await db.select({
      total: sql<string>`COALESCE(SUM(${energyActivitiesTable.emissions_kg_co2}), 0)`
    })
    .from(energyActivitiesTable)
    .where(eq(energyActivitiesTable.user_id, userId))
    .execute();

    const transportEmissions = parseFloat(transportEmissionsResult.total);
    const dietEmissions = parseFloat(dietEmissionsResult.total);
    const energyEmissions = parseFloat(energyEmissionsResult.total);
    const totalEmissions = transportEmissions + dietEmissions + energyEmissions;

    // 3. Generate daily emissions trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTransportEmissions = await db.select({
      date: transportationActivitiesTable.date,
      emissions: sql<string>`SUM(${transportationActivitiesTable.emissions_kg_co2})`
    })
    .from(transportationActivitiesTable)
    .where(and(
      eq(transportationActivitiesTable.user_id, userId),
      gte(transportationActivitiesTable.date, thirtyDaysAgo.toISOString().split('T')[0])
    ))
    .groupBy(transportationActivitiesTable.date)
    .execute();

    const dailyDietEmissions = await db.select({
      date: dietActivitiesTable.date,
      emissions: sql<string>`SUM(${dietActivitiesTable.emissions_kg_co2})`
    })
    .from(dietActivitiesTable)
    .where(and(
      eq(dietActivitiesTable.user_id, userId),
      gte(dietActivitiesTable.date, thirtyDaysAgo.toISOString().split('T')[0])
    ))
    .groupBy(dietActivitiesTable.date)
    .execute();

    const dailyEnergyEmissions = await db.select({
      date: energyActivitiesTable.date,
      emissions: sql<string>`SUM(${energyActivitiesTable.emissions_kg_co2})`
    })
    .from(energyActivitiesTable)
    .where(and(
      eq(energyActivitiesTable.user_id, userId),
      gte(energyActivitiesTable.date, thirtyDaysAgo.toISOString().split('T')[0])
    ))
    .groupBy(energyActivitiesTable.date)
    .execute();

    // Combine daily emissions from all sources
    const dailyEmissionsMap = new Map<string, number>();

    [...dailyTransportEmissions, ...dailyDietEmissions, ...dailyEnergyEmissions].forEach(item => {
      const date = item.date;
      const emissions = parseFloat(item.emissions);
      dailyEmissionsMap.set(date, (dailyEmissionsMap.get(date) || 0) + emissions);
    });

    const daily_emissions = Array.from(dailyEmissionsMap.entries())
      .map(([date, emissions_kg_co2]) => ({ date, emissions_kg_co2 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Generate weekly emissions trend (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks

    const weeklyTransportEmissions = await db.select({
      week: sql<string>`DATE_TRUNC('week', ${transportationActivitiesTable.date}::timestamp)::date`,
      emissions: sql<string>`SUM(${transportationActivitiesTable.emissions_kg_co2})`
    })
    .from(transportationActivitiesTable)
    .where(and(
      eq(transportationActivitiesTable.user_id, userId),
      gte(transportationActivitiesTable.date, twelveWeeksAgo.toISOString().split('T')[0])
    ))
    .groupBy(sql`DATE_TRUNC('week', ${transportationActivitiesTable.date}::timestamp)`)
    .execute();

    const weeklyDietEmissions = await db.select({
      week: sql<string>`DATE_TRUNC('week', ${dietActivitiesTable.date}::timestamp)::date`,
      emissions: sql<string>`SUM(${dietActivitiesTable.emissions_kg_co2})`
    })
    .from(dietActivitiesTable)
    .where(and(
      eq(dietActivitiesTable.user_id, userId),
      gte(dietActivitiesTable.date, twelveWeeksAgo.toISOString().split('T')[0])
    ))
    .groupBy(sql`DATE_TRUNC('week', ${dietActivitiesTable.date}::timestamp)`)
    .execute();

    const weeklyEnergyEmissions = await db.select({
      week: sql<string>`DATE_TRUNC('week', ${energyActivitiesTable.date}::timestamp)::date`,
      emissions: sql<string>`SUM(${energyActivitiesTable.emissions_kg_co2})`
    })
    .from(energyActivitiesTable)
    .where(and(
      eq(energyActivitiesTable.user_id, userId),
      gte(energyActivitiesTable.date, twelveWeeksAgo.toISOString().split('T')[0])
    ))
    .groupBy(sql`DATE_TRUNC('week', ${energyActivitiesTable.date}::timestamp)`)
    .execute();

    // Combine weekly emissions
    const weeklyEmissionsMap = new Map<string, number>();

    [...weeklyTransportEmissions, ...weeklyDietEmissions, ...weeklyEnergyEmissions].forEach(item => {
      const week = item.week;
      const emissions = parseFloat(item.emissions);
      weeklyEmissionsMap.set(week, (weeklyEmissionsMap.get(week) || 0) + emissions);
    });

    const weekly_emissions = Array.from(weeklyEmissionsMap.entries())
      .map(([weekDate, emissions_kg_co2]) => {
        const date = new Date(weekDate);
        const year = date.getFullYear();
        const week = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
        return { week: `${year}-W${week.toString().padStart(2, '0')}`, emissions_kg_co2 };
      })
      .sort((a, b) => a.week.localeCompare(b.week));

    // 5. Generate monthly emissions trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTransportEmissions = await db.select({
      month: sql<string>`DATE_TRUNC('month', ${transportationActivitiesTable.date}::timestamp)::date`,
      emissions: sql<string>`SUM(${transportationActivitiesTable.emissions_kg_co2})`
    })
    .from(transportationActivitiesTable)
    .where(and(
      eq(transportationActivitiesTable.user_id, userId),
      gte(transportationActivitiesTable.date, twelveMonthsAgo.toISOString().split('T')[0])
    ))
    .groupBy(sql`DATE_TRUNC('month', ${transportationActivitiesTable.date}::timestamp)`)
    .execute();

    const monthlyDietEmissions = await db.select({
      month: sql<string>`DATE_TRUNC('month', ${dietActivitiesTable.date}::timestamp)::date`,
      emissions: sql<string>`SUM(${dietActivitiesTable.emissions_kg_co2})`
    })
    .from(dietActivitiesTable)
    .where(and(
      eq(dietActivitiesTable.user_id, userId),
      gte(dietActivitiesTable.date, twelveMonthsAgo.toISOString().split('T')[0])
    ))
    .groupBy(sql`DATE_TRUNC('month', ${dietActivitiesTable.date}::timestamp)`)
    .execute();

    const monthlyEnergyEmissions = await db.select({
      month: sql<string>`DATE_TRUNC('month', ${energyActivitiesTable.date}::timestamp)::date`,
      emissions: sql<string>`SUM(${energyActivitiesTable.emissions_kg_co2})`
    })
    .from(energyActivitiesTable)
    .where(and(
      eq(energyActivitiesTable.user_id, userId),
      gte(energyActivitiesTable.date, twelveMonthsAgo.toISOString().split('T')[0])
    ))
    .groupBy(sql`DATE_TRUNC('month', ${energyActivitiesTable.date}::timestamp)`)
    .execute();

    // Combine monthly emissions
    const monthlyEmissionsMap = new Map<string, number>();

    [...monthlyTransportEmissions, ...monthlyDietEmissions, ...monthlyEnergyEmissions].forEach(item => {
      const month = item.month;
      const emissions = parseFloat(item.emissions);
      monthlyEmissionsMap.set(month, (monthlyEmissionsMap.get(month) || 0) + emissions);
    });

    const monthly_emissions = Array.from(monthlyEmissionsMap.entries())
      .map(([monthDate, emissions_kg_co2]) => {
        const date = new Date(monthDate);
        const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        return { month, emissions_kg_co2 };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // 6. Get active goals (not achieved)
    const activeGoals = await db.select()
      .from(goalsTable)
      .where(and(
        eq(goalsTable.user_id, userId),
        eq(goalsTable.is_achieved, false)
      ))
      .execute();

    // Convert numeric fields for goals
    const active_goals = activeGoals.map(goal => ({
      ...goal,
      target_value: parseFloat(goal.target_value),
      current_value: parseFloat(goal.current_value),
      start_date: new Date(goal.start_date),
      end_date: goal.end_date ? new Date(goal.end_date) : null
    }));

    // 7. Get active challenges (not completed)
    const activeChallenges = await db.select()
      .from(challengesTable)
      .where(and(
        eq(challengesTable.user_id, userId),
        eq(challengesTable.is_completed, false)
      ))
      .execute();

    // Convert date fields for challenges
    const active_challenges = activeChallenges.map(challenge => ({
      ...challenge,
      start_date: new Date(challenge.start_date),
      end_date: challenge.end_date ? new Date(challenge.end_date) : null
    }));

    // 8. Get recent badges (last 10)
    const recent_badges = await db.select()
      .from(badgesTable)
      .where(eq(badgesTable.user_id, userId))
      .orderBy(desc(badgesTable.earned_at))
      .limit(10)
      .execute();

    // 9. Return comprehensive dashboard data
    return {
      user,
      total_emissions_kg_co2: totalEmissions,
      daily_emissions,
      weekly_emissions,
      monthly_emissions,
      emissions_by_category: {
        transport: transportEmissions,
        diet: dietEmissions,
        energy: energyEmissions
      },
      active_goals,
      active_challenges,
      recent_badges
    };

  } catch (error) {
    console.error('Dashboard data retrieval failed:', error);
    throw error;
  }
}
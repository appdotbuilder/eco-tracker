import { z } from 'zod';

// Enums for various activity types
export const fuelTypeEnum = z.enum(['gasoline', 'diesel', 'electric', 'hybrid']);
export const transportTypeEnum = z.enum(['car', 'bus', 'train', 'subway', 'flight_short', 'flight_medium', 'flight_long']);
export const mealTypeEnum = z.enum(['meat', 'vegetarian', 'vegan']);
export const energyTypeEnum = z.enum(['electricity', 'natural_gas']);
export const goalTypeEnum = z.enum(['percentage_reduction', 'specific_target', 'eco_challenge']);
export const challengeTypeEnum = z.enum(['meatless_week', 'public_transport_challenge', 'energy_reduction']);
export const badgeTypeEnum = z.enum(['first_step', 'carbon_cutter', 'eco_warrior', 'transport_hero', 'diet_champion', 'energy_saver']);

export type FuelType = z.infer<typeof fuelTypeEnum>;
export type TransportType = z.infer<typeof transportTypeEnum>;
export type MealType = z.infer<typeof mealTypeEnum>;
export type EnergyType = z.infer<typeof energyTypeEnum>;
export type GoalType = z.infer<typeof goalTypeEnum>;
export type ChallengeType = z.infer<typeof challengeTypeEnum>;
export type BadgeType = z.infer<typeof badgeTypeEnum>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  total_points: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Transportation activity schema
export const transportationActivitySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  transport_type: transportTypeEnum,
  fuel_type: fuelTypeEnum.nullable(),
  distance_km: z.number(),
  emissions_kg_co2: z.number(),
  date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type TransportationActivity = z.infer<typeof transportationActivitySchema>;

// Diet activity schema
export const dietActivitySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  meal_type: mealTypeEnum,
  meal_count: z.number().int(),
  emissions_kg_co2: z.number(),
  date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type DietActivity = z.infer<typeof dietActivitySchema>;

// Energy activity schema
export const energyActivitySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  energy_type: energyTypeEnum,
  consumption: z.number(),
  unit: z.string(), // kWh, therms, m³
  emissions_kg_co2: z.number(),
  date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type EnergyActivity = z.infer<typeof energyActivitySchema>;

// Goal schema
export const goalSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  goal_type: goalTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  target_value: z.number(), // percentage or specific CO2 amount
  current_value: z.number(),
  is_achieved: z.boolean(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Goal = z.infer<typeof goalSchema>;

// Challenge schema
export const challengeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  challenge_type: challengeTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  target_days: z.number().int(),
  completed_days: z.number().int(),
  is_completed: z.boolean(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Challenge = z.infer<typeof challengeSchema>;

// Badge schema
export const badgeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  badge_type: badgeTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  earned_at: z.coerce.date()
});

export type Badge = z.infer<typeof badgeSchema>;

// Emission factor schema for calculations
export const emissionFactorSchema = z.object({
  id: z.number(),
  activity_type: z.string(), // 'transport', 'diet', 'energy'
  sub_type: z.string(), // specific activity like 'car_gasoline', 'meat_meal', etc.
  factor_kg_co2: z.number(), // CO2 emission per unit
  unit: z.string(), // km, meal, kWh, etc.
  created_at: z.coerce.date()
});

export type EmissionFactor = z.infer<typeof emissionFactorSchema>;

// Input schemas for creating activities
export const createTransportationActivityInputSchema = z.object({
  user_id: z.number(),
  transport_type: transportTypeEnum,
  fuel_type: fuelTypeEnum.nullable(),
  distance_km: z.number().positive(),
  date: z.coerce.date()
});

export type CreateTransportationActivityInput = z.infer<typeof createTransportationActivityInputSchema>;

export const createDietActivityInputSchema = z.object({
  user_id: z.number(),
  meal_type: mealTypeEnum,
  meal_count: z.number().int().positive(),
  date: z.coerce.date()
});

export type CreateDietActivityInput = z.infer<typeof createDietActivityInputSchema>;

export const createEnergyActivityInputSchema = z.object({
  user_id: z.number(),
  energy_type: energyTypeEnum,
  consumption: z.number().positive(),
  unit: z.string(),
  date: z.coerce.date()
});

export type CreateEnergyActivityInput = z.infer<typeof createEnergyActivityInputSchema>;

export const createGoalInputSchema = z.object({
  user_id: z.number(),
  goal_type: goalTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  target_value: z.number().positive(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable()
});

export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

export const createChallengeInputSchema = z.object({
  user_id: z.number(),
  challenge_type: challengeTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  target_days: z.number().int().positive(),
  start_date: z.coerce.date()
});

export type CreateChallengeInput = z.infer<typeof createChallengeInputSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  user: userSchema,
  total_emissions_kg_co2: z.number(),
  daily_emissions: z.array(z.object({
    date: z.string(),
    emissions_kg_co2: z.number()
  })),
  weekly_emissions: z.array(z.object({
    week: z.string(),
    emissions_kg_co2: z.number()
  })),
  monthly_emissions: z.array(z.object({
    month: z.string(),
    emissions_kg_co2: z.number()
  })),
  emissions_by_category: z.object({
    transport: z.number(),
    diet: z.number(),
    energy: z.number()
  }),
  active_goals: z.array(goalSchema),
  active_challenges: z.array(challengeSchema),
  recent_badges: z.array(badgeSchema)
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Query input schemas
export const getUserActivitiesInputSchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  activity_type: z.enum(['transport', 'diet', 'energy']).optional()
});

export type GetUserActivitiesInput = z.infer<typeof getUserActivitiesInputSchema>;

export const updateGoalProgressInputSchema = z.object({
  goal_id: z.number(),
  current_value: z.number()
});

export type UpdateGoalProgressInput = z.infer<typeof updateGoalProgressInputSchema>;

export const updateChallengeProgressInputSchema = z.object({
  challenge_id: z.number(),
  completed_days: z.number().int()
});

export type UpdateChallengeProgressInput = z.infer<typeof updateChallengeProgressInputSchema>;
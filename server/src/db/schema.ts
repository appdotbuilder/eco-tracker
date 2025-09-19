import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const fuelTypeEnum = pgEnum('fuel_type', ['gasoline', 'diesel', 'electric', 'hybrid']);
export const transportTypeEnum = pgEnum('transport_type', ['car', 'bus', 'train', 'subway', 'flight_short', 'flight_medium', 'flight_long']);
export const mealTypeEnum = pgEnum('meal_type', ['meat', 'vegetarian', 'vegan']);
export const energyTypeEnum = pgEnum('energy_type', ['electricity', 'natural_gas']);
export const goalTypeEnum = pgEnum('goal_type', ['percentage_reduction', 'specific_target', 'eco_challenge']);
export const challengeTypeEnum = pgEnum('challenge_type', ['meatless_week', 'public_transport_challenge', 'energy_reduction']);
export const badgeTypeEnum = pgEnum('badge_type', ['first_step', 'carbon_cutter', 'eco_warrior', 'transport_hero', 'diet_champion', 'energy_saver']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  total_points: integer('total_points').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transportation activities table
export const transportationActivitiesTable = pgTable('transportation_activities', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  transport_type: transportTypeEnum('transport_type').notNull(),
  fuel_type: fuelTypeEnum('fuel_type'), // Nullable for non-car transport
  distance_km: numeric('distance_km', { precision: 10, scale: 2 }).notNull(),
  emissions_kg_co2: numeric('emissions_kg_co2', { precision: 10, scale: 4 }).notNull(),
  date: date('date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Diet activities table
export const dietActivitiesTable = pgTable('diet_activities', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  meal_type: mealTypeEnum('meal_type').notNull(),
  meal_count: integer('meal_count').notNull(),
  emissions_kg_co2: numeric('emissions_kg_co2', { precision: 10, scale: 4 }).notNull(),
  date: date('date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Energy activities table
export const energyActivitiesTable = pgTable('energy_activities', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  energy_type: energyTypeEnum('energy_type').notNull(),
  consumption: numeric('consumption', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(), // kWh, therms, m³
  emissions_kg_co2: numeric('emissions_kg_co2', { precision: 10, scale: 4 }).notNull(),
  date: date('date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Goals table
export const goalsTable = pgTable('goals', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  goal_type: goalTypeEnum('goal_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  target_value: numeric('target_value', { precision: 10, scale: 2 }).notNull(),
  current_value: numeric('current_value', { precision: 10, scale: 2 }).notNull().default('0'),
  is_achieved: boolean('is_achieved').notNull().default(false),
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Challenges table
export const challengesTable = pgTable('challenges', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  challenge_type: challengeTypeEnum('challenge_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  target_days: integer('target_days').notNull(),
  completed_days: integer('completed_days').notNull().default(0),
  is_completed: boolean('is_completed').notNull().default(false),
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Badges table
export const badgesTable = pgTable('badges', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  badge_type: badgeTypeEnum('badge_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  earned_at: timestamp('earned_at').defaultNow().notNull(),
});

// Emission factors table for calculations
export const emissionFactorsTable = pgTable('emission_factors', {
  id: serial('id').primaryKey(),
  activity_type: text('activity_type').notNull(), // 'transport', 'diet', 'energy'
  sub_type: text('sub_type').notNull(), // 'car_gasoline', 'meat_meal', etc.
  factor_kg_co2: numeric('factor_kg_co2', { precision: 10, scale: 6 }).notNull(),
  unit: text('unit').notNull(), // km, meal, kWh, etc.
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transportationActivities: many(transportationActivitiesTable),
  dietActivities: many(dietActivitiesTable),
  energyActivities: many(energyActivitiesTable),
  goals: many(goalsTable),
  challenges: many(challengesTable),
  badges: many(badgesTable),
}));

export const transportationActivitiesRelations = relations(transportationActivitiesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transportationActivitiesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const dietActivitiesRelations = relations(dietActivitiesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [dietActivitiesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const energyActivitiesRelations = relations(energyActivitiesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [energyActivitiesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const goalsRelations = relations(goalsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [goalsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const challengesRelations = relations(challengesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [challengesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const badgesRelations = relations(badgesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [badgesTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type TransportationActivity = typeof transportationActivitiesTable.$inferSelect;
export type NewTransportationActivity = typeof transportationActivitiesTable.$inferInsert;

export type DietActivity = typeof dietActivitiesTable.$inferSelect;
export type NewDietActivity = typeof dietActivitiesTable.$inferInsert;

export type EnergyActivity = typeof energyActivitiesTable.$inferSelect;
export type NewEnergyActivity = typeof energyActivitiesTable.$inferInsert;

export type Goal = typeof goalsTable.$inferSelect;
export type NewGoal = typeof goalsTable.$inferInsert;

export type Challenge = typeof challengesTable.$inferSelect;
export type NewChallenge = typeof challengesTable.$inferInsert;

export type Badge = typeof badgesTable.$inferSelect;
export type NewBadge = typeof badgesTable.$inferInsert;

export type EmissionFactor = typeof emissionFactorsTable.$inferSelect;
export type NewEmissionFactor = typeof emissionFactorsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  transportationActivities: transportationActivitiesTable,
  dietActivities: dietActivitiesTable,
  energyActivities: energyActivitiesTable,
  goals: goalsTable,
  challenges: challengesTable,
  badges: badgesTable,
  emissionFactors: emissionFactorsTable,
};
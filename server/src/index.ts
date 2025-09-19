import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  createUserInputSchema,
  createTransportationActivityInputSchema,
  createDietActivityInputSchema,
  createEnergyActivityInputSchema,
  createGoalInputSchema,
  createChallengeInputSchema,
  getUserActivitiesInputSchema,
  updateGoalProgressInputSchema,
  updateChallengeProgressInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createTransportationActivity } from './handlers/create_transportation_activity';
import { createDietActivity } from './handlers/create_diet_activity';
import { createEnergyActivity } from './handlers/create_energy_activity';
import { createGoal } from './handlers/create_goal';
import { createChallenge } from './handlers/create_challenge';
import { getUserDashboard } from './handlers/get_user_dashboard';
import { getUserActivities } from './handlers/get_user_activities';
import { updateGoalProgress } from './handlers/update_goal_progress';
import { updateChallengeProgress } from './handlers/update_challenge_progress';
import { getEmissionFactors } from './handlers/get_emission_factors';
import { getUserBadges } from './handlers/get_user_badges';
import { awardBadge } from './handlers/award_badge';
import { getUserGoals } from './handlers/get_user_goals';
import { getUserChallenges } from './handlers/get_user_challenges';
import { getReductionTips } from './handlers/get_reduction_tips';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Activity logging
  createTransportationActivity: publicProcedure
    .input(createTransportationActivityInputSchema)
    .mutation(({ input }) => createTransportationActivity(input)),

  createDietActivity: publicProcedure
    .input(createDietActivityInputSchema)
    .mutation(({ input }) => createDietActivity(input)),

  createEnergyActivity: publicProcedure
    .input(createEnergyActivityInputSchema)
    .mutation(({ input }) => createEnergyActivity(input)),

  // Goal and challenge management
  createGoal: publicProcedure
    .input(createGoalInputSchema)
    .mutation(({ input }) => createGoal(input)),

  createChallenge: publicProcedure
    .input(createChallengeInputSchema)
    .mutation(({ input }) => createChallenge(input)),

  updateGoalProgress: publicProcedure
    .input(updateGoalProgressInputSchema)
    .mutation(({ input }) => updateGoalProgress(input)),

  updateChallengeProgress: publicProcedure
    .input(updateChallengeProgressInputSchema)
    .mutation(({ input }) => updateChallengeProgress(input)),

  // Data retrieval
  getUserDashboard: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserDashboard(input.userId)),

  getUserActivities: publicProcedure
    .input(getUserActivitiesInputSchema)
    .query(({ input }) => getUserActivities(input)),

  getUserGoals: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserGoals(input.userId)),

  getUserChallenges: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserChallenges(input.userId)),

  getUserBadges: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserBadges(input.userId)),

  // Utility endpoints
  getEmissionFactors: publicProcedure
    .query(() => getEmissionFactors()),

  getReductionTips: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getReductionTips(input.userId)),

  // Internal utility for awarding badges (could be used by webhooks or admin)
  awardBadge: publicProcedure
    .input(z.object({
      userId: z.number(),
      badgeType: z.enum(['first_step', 'carbon_cutter', 'eco_warrior', 'transport_hero', 'diet_champion', 'energy_saver']),
      title: z.string(),
      description: z.string().optional()
    }))
    .mutation(({ input }) => awardBadge(input.userId, input.badgeType, input.title, input.description)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`🌍 Carbon Footprint Tracker TRPC server listening at port: ${port}`);
  console.log(`📊 Dashboard, activity logging, and gamification endpoints ready!`);
}

start().catch(console.error);
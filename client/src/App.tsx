import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityLogger } from '@/components/ActivityLogger';
import { Dashboard } from '@/components/Dashboard';
import { GoalManager } from '@/components/GoalManager';
import { ChallengeCenter } from '@/components/ChallengeCenter';
import { ReductionTips } from '@/components/ReductionTips';

// Using type-only imports for better TypeScript compliance
import type { DashboardData, Goal, Challenge, Badge as BadgeType, EmissionFactor } from '../../server/src/schema';

function App() {
  // Current user state (in real app, this would come from authentication)
  const [currentUser] = useState({ id: 1, name: 'Eco Warrior' });
  
  // Main application state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const data = await trpc.getUserDashboard.query({ userId: currentUser.id });
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [currentUser.id]);

  // Load goals
  const loadGoals = useCallback(async () => {
    try {
      const userGoals = await trpc.getUserGoals.query({ userId: currentUser.id });
      setGoals(userGoals);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  }, [currentUser.id]);

  // Load challenges
  const loadChallenges = useCallback(async () => {
    try {
      const userChallenges = await trpc.getUserChallenges.query({ userId: currentUser.id });
      setChallenges(userChallenges);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  }, [currentUser.id]);

  // Load badges
  const loadBadges = useCallback(async () => {
    try {
      const userBadges = await trpc.getUserBadges.query({ userId: currentUser.id });
      setBadges(userBadges);
    } catch (error) {
      console.error('Failed to load badges:', error);
    }
  }, [currentUser.id]);

  // Load emission factors
  const loadEmissionFactors = useCallback(async () => {
    try {
      const factors = await trpc.getEmissionFactors.query();
      setEmissionFactors(factors);
    } catch (error) {
      console.error('Failed to load emission factors:', error);
    }
  }, []);

  // Initialize all data on mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadDashboardData(),
          loadGoals(),
          loadChallenges(),
          loadBadges(),
          loadEmissionFactors()
        ]);
      } catch (error) {
        console.error('Failed to initialize data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [loadDashboardData, loadGoals, loadChallenges, loadBadges, loadEmissionFactors]);

  // Handle activity logging success
  const handleActivityLogged = useCallback(async () => {
    // Refresh dashboard data and goals when new activity is logged
    await Promise.all([loadDashboardData(), loadGoals()]);
  }, [loadDashboardData, loadGoals]);

  // Handle goal creation success
  const handleGoalCreated = useCallback(async () => {
    await loadGoals();
  }, [loadGoals]);

  // Handle challenge creation success
  const handleChallengeCreated = useCallback(async () => {
    await loadChallenges();
  }, [loadChallenges]);

  if (isLoading) {
    return (
      <div className="min-h-screen eco-bg-animated flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-6xl mb-4">🌍</div>
          <p className="text-xl font-bold text-gray-800 mb-2">EcoTracker</p>
          <p className="text-lg font-medium text-gray-700">Loading your carbon footprint data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen eco-bg-animated">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🌍</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EcoTracker</h1>
                <p className="text-sm text-gray-600">Personal Carbon Footprint Monitor</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-semibold text-gray-900">{currentUser.name}</p>
              </div>
              
              {dashboardData && (
                <Card className="bg-green-50 border-green-200 eco-pulse">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">⭐</span>
                      <div>
                        <p className="text-sm font-medium text-green-800">Total Points</p>
                        <p className="text-lg font-bold text-green-900">{dashboardData.user.total_points}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {badges.length > 0 && (
                <div className="flex -space-x-1">
                  {badges.slice(0, 3).map((badge: BadgeType) => (
                    <div key={badge.id} className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center text-xs badge-float">
                      🏆
                    </div>
                  ))}
                  {badges.length > 3 && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-600">
                      +{badges.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/90 backdrop-blur-sm shadow-lg border border-white/20">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <span>📊</span>
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="logger" className="flex items-center space-x-2">
              <span>📝</span>
              <span>Log Activity</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center space-x-2">
              <span>🎯</span>
              <span>Goals</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center space-x-2">
              <span>🏆</span>
              <span>Challenges</span>
            </TabsTrigger>
            <TabsTrigger value="tips" className="flex items-center space-x-2">
              <span>💡</span>
              <span>Tips</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {dashboardData ? (
              <Dashboard data={dashboardData} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No dashboard data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logger">
            <ActivityLogger 
              userId={currentUser.id} 
              emissionFactors={emissionFactors}
              onActivityLogged={handleActivityLogged}
            />
          </TabsContent>

          <TabsContent value="goals">
            <GoalManager 
              userId={currentUser.id}
              goals={goals}
              onGoalCreated={handleGoalCreated}
            />
          </TabsContent>

          <TabsContent value="challenges">
            <ChallengeCenter 
              userId={currentUser.id}
              challenges={challenges}
              onChallengeCreated={handleChallengeCreated}
            />
          </TabsContent>

          <TabsContent value="tips">
            <ReductionTips userId={currentUser.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import type { DashboardData, Goal, Challenge } from '../../../server/src/schema';

interface DashboardProps {
  data: DashboardData;
}

export function Dashboard({ data }: DashboardProps) {
  const { total_emissions_kg_co2, daily_emissions, weekly_emissions, emissions_by_category, active_goals, active_challenges, recent_badges } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Emissions</p>
                <p className="text-3xl font-bold text-red-900">{total_emissions_kg_co2.toFixed(1)}</p>
                <p className="text-xs text-red-600">kg CO₂</p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">🔥</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Transport</p>
                <p className="text-3xl font-bold text-blue-900">{emissions_by_category.transport.toFixed(1)}</p>
                <p className="text-xs text-blue-600">kg CO₂</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">🚗</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Diet</p>
                <p className="text-3xl font-bold text-green-900">{emissions_by_category.diet.toFixed(1)}</p>
                <p className="text-xs text-green-600">kg CO₂</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">🍽️</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Energy</p>
                <p className="text-3xl font-bold text-yellow-900">{emissions_by_category.energy.toFixed(1)}</p>
                <p className="text-xs text-yellow-600">kg CO₂</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">⚡</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emissions Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📊</span>
              <span>Emissions Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Transport Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-700">🚗 Transport</span>
                  <span className="text-sm text-gray-600">{emissions_by_category.transport.toFixed(1)} kg CO₂</span>
                </div>
                <Progress 
                  value={(emissions_by_category.transport / total_emissions_kg_co2) * 100} 
                  className="h-3 bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {((emissions_by_category.transport / total_emissions_kg_co2) * 100).toFixed(1)}% of total emissions
                </p>
              </div>

              {/* Diet Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-green-700">🍽️ Diet</span>
                  <span className="text-sm text-gray-600">{emissions_by_category.diet.toFixed(1)} kg CO₂</span>
                </div>
                <Progress 
                  value={(emissions_by_category.diet / total_emissions_kg_co2) * 100} 
                  className="h-3 bg-green-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {((emissions_by_category.diet / total_emissions_kg_co2) * 100).toFixed(1)}% of total emissions
                </p>
              </div>

              {/* Energy Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-yellow-700">⚡ Energy</span>
                  <span className="text-sm text-gray-600">{emissions_by_category.energy.toFixed(1)} kg CO₂</span>
                </div>
                <Progress 
                  value={(emissions_by_category.energy / total_emissions_kg_co2) * 100} 
                  className="h-3 bg-yellow-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {((emissions_by_category.energy / total_emissions_kg_co2) * 100).toFixed(1)}% of total emissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📈</span>
              <span>Recent Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Daily Emissions */}
              {daily_emissions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Emissions (Last 7 Days)</h4>
                  <div className="space-y-2">
                    {daily_emissions.slice(-7).map((day, index) => {
                      const maxEmissions = Math.max(...daily_emissions.slice(-7).map(d => d.emissions_kg_co2));
                      const percentage = (day.emissions_kg_co2 / maxEmissions) * 100;
                      return (
                        <div key={index} className="flex items-center space-x-3">
                          <span className="text-xs text-gray-500 w-20">{new Date(day.date).toLocaleDateString()}</span>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <span className="text-xs text-gray-600 w-12 text-right">{day.emissions_kg_co2.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Weekly Summary */}
              {weekly_emissions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">This Week</h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-lg font-semibold text-gray-900">{weekly_emissions[weekly_emissions.length - 1].emissions_kg_co2.toFixed(1)} kg CO₂</p>
                    <p className="text-xs text-gray-600">Week {weekly_emissions[weekly_emissions.length - 1].week}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🎯</span>
              <span>Active Goals</span>
              <Badge variant="secondary">{active_goals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {active_goals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No active goals yet</p>
                <p className="text-sm text-gray-400 mt-1">Set goals to track your progress!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {active_goals.map((goal: Goal) => {
                  const progressPercentage = (goal.current_value / goal.target_value) * 100;
                  return (
                    <div key={goal.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{goal.title}</h4>
                        <Badge variant={goal.is_achieved ? 'default' : 'secondary'}>
                          {goal.is_achieved ? '✅ Complete' : '🔄 In Progress'}
                        </Badge>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{goal.current_value.toFixed(1)} / {goal.target_value.toFixed(1)}</span>
                        </div>
                        <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                        <p className="text-xs text-gray-500">
                          {progressPercentage.toFixed(1)}% complete
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Challenges & Recent Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🏆</span>
              <span>Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active Challenges */}
            {active_challenges.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Active Challenges</h4>
                <div className="space-y-3">
                  {active_challenges.map((challenge: Challenge) => {
                    const progressPercentage = (challenge.completed_days / challenge.target_days) * 100;
                    return (
                      <div key={challenge.id} className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-orange-900">{challenge.title}</h5>
                          <Badge variant={challenge.is_completed ? 'default' : 'secondary'}>
                            {challenge.completed_days}/{challenge.target_days} days
                          </Badge>
                        </div>
                        <Progress value={progressPercentage} className="h-2 bg-orange-100" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Badges */}
            {recent_badges.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Badges</h4>
                <div className="grid grid-cols-2 gap-2">
                  {recent_badges.map((badge) => (
                    <div key={badge.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">🏆</div>
                      <p className="text-xs font-medium text-yellow-800">{badge.title}</p>
                      <p className="text-xs text-yellow-600 mt-1">{badge.earned_at.toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active_challenges.length === 0 && recent_badges.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No achievements yet</p>
                <p className="text-sm text-gray-400 mt-1">Complete challenges to earn badges!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
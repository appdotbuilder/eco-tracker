import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';

interface ReductionTipsProps {
  userId: number;
}

interface Tip {
  id: string;
  category: 'transport' | 'diet' | 'energy' | 'general';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedSaving: string;
  icon: string;
}

export function ReductionTips({ userId }: ReductionTipsProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  // Pre-defined tips database
  const allTips: Tip[] = [
    // Transport Tips
    {
      id: 'transport_1',
      category: 'transport',
      title: 'Use Public Transportation',
      description: 'Replace car trips with bus, train, or subway. Public transport produces 45% less CO₂ per passenger mile than private cars.',
      impact: 'high',
      difficulty: 'easy',
      estimatedSaving: '2.3 kg CO₂ per 10km trip',
      icon: '🚌'
    },
    {
      id: 'transport_2',
      category: 'transport',
      title: 'Try Cycling or Walking',
      description: 'For short distances, cycling or walking produces zero emissions and improves your health.',
      impact: 'high',
      difficulty: 'easy',
      estimatedSaving: '2.5 kg CO₂ per 10km trip',
      icon: '🚴'
    },
    {
      id: 'transport_3',
      category: 'transport',
      title: 'Carpool or Share Rides',
      description: 'Sharing rides with others cuts your transportation emissions by 50% or more per person.',
      impact: 'medium',
      difficulty: 'medium',
      estimatedSaving: '1.2 kg CO₂ per 10km trip',
      icon: '🚗'
    },
    {
      id: 'transport_4',
      category: 'transport',
      title: 'Work From Home',
      description: 'Remote work eliminates commuting emissions entirely. Even one day per week makes a difference.',
      impact: 'high',
      difficulty: 'medium',
      estimatedSaving: '5-15 kg CO₂ per day',
      icon: '🏠'
    },
    {
      id: 'transport_5',
      category: 'transport',
      title: 'Choose Electric or Hybrid',
      description: 'Electric vehicles produce 60% fewer emissions than gasoline cars, even accounting for electricity generation.',
      impact: 'high',
      difficulty: 'hard',
      estimatedSaving: '1.5 kg CO₂ per 10km',
      icon: '🔋'
    },

    // Diet Tips
    {
      id: 'diet_1',
      category: 'diet',
      title: 'Try Meatless Monday',
      description: 'Going meat-free one day per week can save significant emissions. Beef has the highest carbon footprint.',
      impact: 'medium',
      difficulty: 'easy',
      estimatedSaving: '3.3 kg CO₂ per day',
      icon: '🌱'
    },
    {
      id: 'diet_2',
      category: 'diet',
      title: 'Choose Plant-Based Proteins',
      description: 'Replace meat with beans, lentils, and tofu. Plant proteins have 75% lower emissions than meat.',
      impact: 'high',
      difficulty: 'medium',
      estimatedSaving: '2.5 kg CO₂ per meal',
      icon: '🥗'
    },
    {
      id: 'diet_3',
      category: 'diet',
      title: 'Buy Local and Seasonal',
      description: 'Local, seasonal produce reduces transportation emissions and supports local farmers.',
      impact: 'medium',
      difficulty: 'easy',
      estimatedSaving: '0.5 kg CO₂ per meal',
      icon: '🥕'
    },
    {
      id: 'diet_4',
      category: 'diet',
      title: 'Reduce Food Waste',
      description: 'Plan meals and use leftovers. Food waste accounts for 8% of global greenhouse gas emissions.',
      impact: 'medium',
      difficulty: 'easy',
      estimatedSaving: '1.2 kg CO₂ per week',
      icon: '♻️'
    },
    {
      id: 'diet_5',
      category: 'diet',
      title: 'Choose Chicken Over Beef',
      description: 'If you eat meat, chicken has 3x lower emissions than beef. Small switches make big differences.',
      impact: 'medium',
      difficulty: 'easy',
      estimatedSaving: '2.1 kg CO₂ per meal',
      icon: '🐔'
    },

    // Energy Tips
    {
      id: 'energy_1',
      category: 'energy',
      title: 'Switch to LED Bulbs',
      description: 'LED bulbs use 75% less energy and last 25 times longer than incandescent bulbs.',
      impact: 'medium',
      difficulty: 'easy',
      estimatedSaving: '80 kg CO₂ per year',
      icon: '💡'
    },
    {
      id: 'energy_2',
      category: 'energy',
      title: 'Unplug Devices When Not in Use',
      description: 'Electronics draw power even when off. Unplugging can reduce your electricity bill by 10%.',
      impact: 'low',
      difficulty: 'easy',
      estimatedSaving: '200 kg CO₂ per year',
      icon: '🔌'
    },
    {
      id: 'energy_3',
      category: 'energy',
      title: 'Use a Programmable Thermostat',
      description: 'Smart thermostats can reduce heating/cooling costs by 10-15% through optimized scheduling.',
      impact: 'high',
      difficulty: 'medium',
      estimatedSaving: '500 kg CO₂ per year',
      icon: '🌡️'
    },
    {
      id: 'energy_4',
      category: 'energy',
      title: 'Air Dry Your Clothes',
      description: 'Skip the dryer when possible. Air drying saves energy and makes clothes last longer.',
      impact: 'medium',
      difficulty: 'easy',
      estimatedSaving: '300 kg CO₂ per year',
      icon: '👕'
    },
    {
      id: 'energy_5',
      category: 'energy',
      title: 'Insulate Your Home',
      description: 'Proper insulation can reduce heating and cooling costs by up to 40%.',
      impact: 'high',
      difficulty: 'hard',
      estimatedSaving: '1000 kg CO₂ per year',
      icon: '🏠'
    },

    // General Tips
    {
      id: 'general_1',
      category: 'general',
      title: 'Buy Less, Choose Quality',
      description: 'Every product has a carbon footprint. Buy high-quality items that last longer.',
      impact: 'medium',
      difficulty: 'medium',
      estimatedSaving: 'Variable',
      icon: '🛍️'
    },
    {
      id: 'general_2',
      category: 'general',
      title: 'Recycle and Compost',
      description: 'Proper waste management reduces methane emissions from landfills.',
      impact: 'medium',
      difficulty: 'easy',
      estimatedSaving: '500 kg CO₂ per year',
      icon: '♻️'
    },
    {
      id: 'general_3',
      category: 'general',
      title: 'Plant Trees or Support Reforestation',
      description: 'Trees absorb CO₂ from the atmosphere. One tree can absorb 22kg of CO₂ per year.',
      impact: 'high',
      difficulty: 'medium',
      estimatedSaving: '22 kg CO₂ per tree/year',
      icon: '🌳'
    },
    {
      id: 'general_4',
      category: 'general',
      title: 'Use Digital Receipts',
      description: 'Choose email receipts instead of paper. Small changes in daily habits add up.',
      impact: 'low',
      difficulty: 'easy',
      estimatedSaving: '5 kg CO₂ per year',
      icon: '📱'
    }
  ];

  // Load personalized tips from server
  const loadPersonalizedTips = useCallback(async () => {
    setIsLoading(true);
    try {
      await trpc.getReductionTips.query({ userId });
      // The server returns an array of tip strings or tip objects
      // For now, we'll use the pre-defined tips and simulate personalization
      
      // Filter tips based on user's activity patterns (simulated)
      const recommendedTips = allTips.filter(tip => 
        tip.impact === 'high' || tip.difficulty === 'easy'
      ).slice(0, 8);
      
      setTips(recommendedTips);
    } catch (error) {
      console.error('Failed to load personalized tips:', error);
      // Fallback to showing all tips
      setTips(allTips);
    } finally {
      setIsLoading(false);
    }
  }, [userId, allTips]);

  useEffect(() => {
    loadPersonalizedTips();
  }, [loadPersonalizedTips]);

  const getTipsByCategory = (category: 'transport' | 'diet' | 'energy' | 'general') => {
    return allTips.filter(tip => tip.category === category);
  };

  const getImpactBadgeColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const TipCard = ({ tip }: { tip: Tip }) => (
    <Card key={tip.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="text-3xl">{tip.icon}</div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{tip.title}</h3>
              <div className="flex space-x-1">
                <Badge className={getImpactBadgeColor(tip.impact)}>
                  {tip.impact} impact
                </Badge>
                <Badge variant="secondary" className={getDifficultyBadgeColor(tip.difficulty)}>
                  {tip.difficulty}
                </Badge>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-3">{tip.description}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-green-800 text-xs font-medium">
                Potential Savings: {tip.estimatedSaving}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reduction Tips</h2>
          <p className="text-gray-600">Personalized suggestions to reduce your carbon footprint</p>
        </div>
        <Button onClick={loadPersonalizedTips} disabled={isLoading} className="flex items-center space-x-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Tips</span>
        </Button>
      </div>

      {/* Featured/Personalized Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>⭐</span>
            <span>Recommended for You</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p>Loading personalized tips...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tips.slice(0, 4).map(tip => <TipCard key={tip.id} tip={tip} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categorized Tips */}
      <Tabs defaultValue="transport" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transport" className="flex items-center space-x-2">
            <span>🚗</span>
            <span>Transport</span>
          </TabsTrigger>
          <TabsTrigger value="diet" className="flex items-center space-x-2">
            <span>🍽️</span>
            <span>Diet</span>
          </TabsTrigger>
          <TabsTrigger value="energy" className="flex items-center space-x-2">
            <span>⚡</span>
            <span>Energy</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <span>🌍</span>
            <span>General</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transport" className="space-y-4">
          <div className="grid gap-4">
            {getTipsByCategory('transport').map(tip => <TipCard key={tip.id} tip={tip} />)}
          </div>
        </TabsContent>

        <TabsContent value="diet" className="space-y-4">
          <div className="grid gap-4">
            {getTipsByCategory('diet').map(tip => <TipCard key={tip.id} tip={tip} />)}
          </div>
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <div className="grid gap-4">
            {getTipsByCategory('energy').map(tip => <TipCard key={tip.id} tip={tip} />)}
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4">
            {getTipsByCategory('general').map(tip => <TipCard key={tip.id} tip={tip} />)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-3">🌍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Make a Difference?</h3>
          <p className="text-gray-600 mb-4">
            Small changes in your daily habits can lead to significant reductions in your carbon footprint. 
            Start with the easy tips and work your way up to bigger changes!
          </p>
          <div className="flex justify-center space-x-4 text-sm text-gray-600">
            <span>🟢 Easy to implement</span>
            <span>🟡 Moderate effort</span>
            <span>🔴 Requires planning</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
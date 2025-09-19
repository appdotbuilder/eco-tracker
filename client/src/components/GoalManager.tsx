import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';

import { trpc } from '@/utils/trpc';
import type { Goal, CreateGoalInput, GoalType } from '../../../server/src/schema';

interface GoalManagerProps {
  userId: number;
  goals: Goal[];
  onGoalCreated: () => Promise<void>;
}

export function GoalManager({ userId, goals, onGoalCreated }: GoalManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<CreateGoalInput>({
    user_id: userId,
    goal_type: 'percentage_reduction',
    title: '',
    description: null,
    target_value: 0,
    start_date: new Date(),
    end_date: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');

    try {
      await trpc.createGoal.mutate(formData);
      setSuccessMessage('🎯 Goal created successfully!');
      
      // Reset form
      setFormData({
        user_id: userId,
        goal_type: 'percentage_reduction',
        title: '',
        description: null,
        target_value: 0,
        start_date: new Date(),
        end_date: null
      });
      
      setShowCreateForm(false);
      await onGoalCreated();
    } catch (error) {
      console.error('Failed to create goal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGoalTypeLabel = (type: GoalType): string => {
    switch (type) {
      case 'percentage_reduction':
        return 'Percentage Reduction';
      case 'specific_target':
        return 'Specific Target';
      case 'eco_challenge':
        return 'Eco Challenge';
      default:
        return type;
    }
  };

  const getGoalTypeIcon = (type: GoalType): string => {
    switch (type) {
      case 'percentage_reduction':
        return '📉';
      case 'specific_target':
        return '🎯';
      case 'eco_challenge':
        return '🌱';
      default:
        return '📊';
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Goals</h2>
          <p className="text-gray-600">Track your carbon footprint reduction targets</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add New Goal</span>
        </Button>
      </div>

      {/* Create Goal Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-type">Goal Type</Label>
                  <Select 
                    value={formData.goal_type} 
                    onValueChange={(value: GoalType) => 
                      setFormData(prev => ({ ...prev, goal_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage_reduction">📉 Percentage Reduction</SelectItem>
                      <SelectItem value="specific_target">🎯 Specific CO₂ Target</SelectItem>
                      <SelectItem value="eco_challenge">🌱 Eco Challenge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-value">
                    Target Value 
                    {formData.goal_type === 'percentage_reduction' && ' (%)'}
                    {formData.goal_type === 'specific_target' && ' (kg CO₂)'}
                    {formData.goal_type === 'eco_challenge' && ' (points)'}
                  </Label>
                  <Input
                    id="target-value"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.target_value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="Enter target value"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Reduce emissions by 20%"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData(prev => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Add more details about your goal..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date.toLocaleDateString()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date: Date | undefined) => 
                          setFormData(prev => ({ ...prev, start_date: date || new Date() }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? formData.end_date.toLocaleDateString() : 'No end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.end_date || undefined}
                        onSelect={(date: Date | undefined) => 
                          setFormData(prev => ({ ...prev, end_date: date || null }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {formData.end_date && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, end_date: null }))}
                    >
                      Clear end date
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Goal'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      <div className="grid gap-4">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals yet</h3>
              <p className="text-gray-600 mb-4">Set your first goal to start tracking your carbon footprint reduction!</p>
              <Button onClick={() => setShowCreateForm(true)}>
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal: Goal) => {
            const progressPercentage = (goal.current_value / goal.target_value) * 100;
            const isOverdue = goal.end_date && new Date() > goal.end_date && !goal.is_achieved;
            
            return (
              <Card key={goal.id} className={`${goal.is_achieved ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getGoalTypeIcon(goal.goal_type)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {getGoalTypeLabel(goal.goal_type)}
                        </Badge>
                      </div>
                    </div>
                    
                    <Badge variant={goal.is_achieved ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                      {goal.is_achieved ? '✅ Achieved' : isOverdue ? '⏰ Overdue' : '🔄 In Progress'}
                    </Badge>
                  </div>

                  {goal.description && (
                    <p className="text-gray-600 mb-4">{goal.description}</p>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {goal.current_value.toFixed(1)} / {goal.target_value.toFixed(1)}
                        {goal.goal_type === 'percentage_reduction' && '%'}
                        {goal.goal_type === 'specific_target' && ' kg CO₂'}
                        {goal.goal_type === 'eco_challenge' && ' points'}
                      </span>
                    </div>
                    
                    <Progress 
                      value={Math.min(progressPercentage, 100)} 
                      className={`h-3 ${goal.is_achieved ? 'bg-green-100' : isOverdue ? 'bg-red-100' : ''}`}
                    />
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{progressPercentage.toFixed(1)}% complete</span>
                      <span>
                        Started: {goal.start_date.toLocaleDateString()}
                        {goal.end_date && ` • Ends: ${goal.end_date.toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>

                  {goal.is_achieved && (
                    <div className="mt-4 bg-green-100 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800 text-sm font-medium">
                        🎉 Congratulations! You achieved this goal!
                      </p>
                    </div>
                  )}

                  {isOverdue && (
                    <div className="mt-4 bg-red-100 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 text-sm">
                        This goal has passed its end date. Consider creating a new goal to continue your progress!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
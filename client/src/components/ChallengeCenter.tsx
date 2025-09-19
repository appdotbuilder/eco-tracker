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
import { CalendarIcon, Plus, Trophy, Clock } from 'lucide-react';

import { trpc } from '@/utils/trpc';
import type { Challenge, CreateChallengeInput, ChallengeType } from '../../../server/src/schema';

interface ChallengeCenterProps {
  userId: number;
  challenges: Challenge[];
  onChallengeCreated: () => Promise<void>;
}

export function ChallengeCenter({ userId, challenges, onChallengeCreated }: ChallengeCenterProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<CreateChallengeInput>({
    user_id: userId,
    challenge_type: 'meatless_week',
    title: '',
    description: null,
    target_days: 7,
    start_date: new Date()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');

    try {
      await trpc.createChallenge.mutate(formData);
      setSuccessMessage('🏆 Challenge created successfully! Good luck!');
      
      // Reset form
      setFormData({
        user_id: userId,
        challenge_type: 'meatless_week',
        title: '',
        description: null,
        target_days: 7,
        start_date: new Date()
      });
      
      setShowCreateForm(false);
      await onChallengeCreated();
    } catch (error) {
      console.error('Failed to create challenge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChallengeTypeLabel = (type: ChallengeType): string => {
    switch (type) {
      case 'meatless_week':
        return 'Meatless Week';
      case 'public_transport_challenge':
        return 'Public Transport Challenge';
      case 'energy_reduction':
        return 'Energy Reduction';
      default:
        return type;
    }
  };

  const getChallengeTypeIcon = (type: ChallengeType): string => {
    switch (type) {
      case 'meatless_week':
        return '🌱';
      case 'public_transport_challenge':
        return '🚌';
      case 'energy_reduction':
        return '⚡';
      default:
        return '🏆';
    }
  };

  const getChallengeDescription = (type: ChallengeType): string => {
    switch (type) {
      case 'meatless_week':
        return 'Go meat-free for a week to reduce your dietary carbon footprint';
      case 'public_transport_challenge':
        return 'Use only public transport, walking, or cycling for all trips';
      case 'energy_reduction':
        return 'Reduce your energy consumption by making conscious choices';
      default:
        return 'Complete this eco-friendly challenge';
    }
  };

  const getDefaultTargetDays = (type: ChallengeType): number => {
    switch (type) {
      case 'meatless_week':
        return 7;
      case 'public_transport_challenge':
        return 14;
      case 'energy_reduction':
        return 30;
      default:
        return 7;
    }
  };

  const handleChallengeTypeChange = (type: ChallengeType) => {
    setFormData(prev => ({
      ...prev,
      challenge_type: type,
      target_days: getDefaultTargetDays(type),
      title: getChallengeTypeLabel(type),
      description: getChallengeDescription(type)
    }));
  };

  const updateChallengeProgress = async (challengeId: number, completedDays: number) => {
    try {
      await trpc.updateChallengeProgress.mutate({
        challenge_id: challengeId,
        completed_days: completedDays
      });
      await onChallengeCreated(); // Refresh challenges
    } catch (error) {
      console.error('Failed to update challenge progress:', error);
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
          <h2 className="text-2xl font-bold text-gray-900">Challenge Center</h2>
          <p className="text-gray-600">Take on eco-friendly challenges to reduce your impact</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Start Challenge</span>
        </Button>
      </div>

      {/* Create Challenge Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Start New Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="challenge-type">Challenge Type</Label>
                <Select 
                  value={formData.challenge_type} 
                  onValueChange={handleChallengeTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meatless_week">🌱 Meatless Week</SelectItem>
                    <SelectItem value="public_transport_challenge">🚌 Public Transport Challenge</SelectItem>
                    <SelectItem value="energy_reduction">⚡ Energy Reduction</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">{getChallengeDescription(formData.challenge_type)}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Challenge Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Enter challenge title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-days">Target Days</Label>
                  <Input
                    id="target-days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.target_days}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, target_days: parseInt(e.target.value) || 1 }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData(prev => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Add more details about your challenge..."
                  rows={3}
                />
              </div>

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

              <div className="flex space-x-3">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Starting...' : 'Start Challenge'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Challenges List */}
      <div className="grid gap-4">
        {challenges.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No challenges yet</h3>
              <p className="text-gray-600 mb-4">Start your first eco-challenge to make a positive impact!</p>
              <Button onClick={() => setShowCreateForm(true)}>
                Start Your First Challenge
              </Button>
            </CardContent>
          </Card>
        ) : (
          challenges.map((challenge: Challenge) => {
            const progressPercentage = (challenge.completed_days / challenge.target_days) * 100;
            const isActive = !challenge.is_completed && new Date() >= challenge.start_date;
            const daysRemaining = challenge.end_date ? Math.ceil((challenge.end_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
            
            return (
              <Card key={challenge.id} className={`${challenge.is_completed ? 'bg-green-50 border-green-200' : isActive ? 'bg-blue-50 border-blue-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{getChallengeTypeIcon(challenge.challenge_type)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{challenge.title}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {getChallengeTypeLabel(challenge.challenge_type)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {challenge.is_completed && (
                        <Badge variant="default" className="bg-green-500">
                          <Trophy className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {isActive && !challenge.is_completed && (
                        <Badge variant="default" className="bg-blue-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {!isActive && !challenge.is_completed && new Date() < challenge.start_date && (
                        <Badge variant="secondary">
                          Upcoming
                        </Badge>
                      )}
                    </div>
                  </div>

                  {challenge.description && (
                    <p className="text-gray-600 mb-4">{challenge.description}</p>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {challenge.completed_days} / {challenge.target_days} days
                      </span>
                    </div>
                    
                    <Progress 
                      value={Math.min(progressPercentage, 100)} 
                      className={`h-3 ${challenge.is_completed ? 'bg-green-100' : isActive ? 'bg-blue-100' : ''}`}
                    />
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{progressPercentage.toFixed(1)}% complete</span>
                      <span>
                        Started: {challenge.start_date.toLocaleDateString()}
                        {daysRemaining !== null && daysRemaining > 0 && ` • ${daysRemaining} days left`}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons for Active Challenges */}
                  {isActive && !challenge.is_completed && (
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        size="sm"
                        onClick={() => updateChallengeProgress(challenge.id, challenge.completed_days + 1)}
                        disabled={challenge.completed_days >= challenge.target_days}
                      >
                        Mark Day Complete
                      </Button>
                      {challenge.completed_days > 0 && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => updateChallengeProgress(challenge.id, Math.max(0, challenge.completed_days - 1))}
                        >
                          Undo Last Day
                        </Button>
                      )}
                    </div>
                  )}

                  {challenge.is_completed && (
                    <div className="mt-4 bg-green-100 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800 text-sm font-medium">
                        🎉 Challenge completed! Great job making a positive environmental impact!
                      </p>
                    </div>
                  )}

                  {!isActive && !challenge.is_completed && new Date() < challenge.start_date && (
                    <div className="mt-4 bg-blue-100 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        This challenge will start on {challenge.start_date.toLocaleDateString()}. Get ready!
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
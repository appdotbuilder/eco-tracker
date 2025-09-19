import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  EmissionFactor, 
  CreateTransportationActivityInput, 
  CreateDietActivityInput, 
  CreateEnergyActivityInput,
  TransportType,
  FuelType,
  MealType,
  EnergyType
} from '../../../server/src/schema';

interface ActivityLoggerProps {
  userId: number;
  emissionFactors: EmissionFactor[];
  onActivityLogged: () => Promise<void>;
}

export function ActivityLogger({ userId, emissionFactors, onActivityLogged }: ActivityLoggerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('transport');

  // Transportation form state
  const [transportData, setTransportData] = useState<CreateTransportationActivityInput>({
    user_id: userId,
    transport_type: 'car',
    fuel_type: 'gasoline',
    distance_km: 0,
    date: new Date()
  });

  // Diet form state
  const [dietData, setDietData] = useState<CreateDietActivityInput>({
    user_id: userId,
    meal_type: 'meat',
    meal_count: 1,
    date: new Date()
  });

  // Energy form state
  const [energyData, setEnergyData] = useState<CreateEnergyActivityInput>({
    user_id: userId,
    energy_type: 'electricity',
    consumption: 0,
    unit: 'kWh',
    date: new Date()
  });

  // Calculate estimated emissions
  const getEstimatedEmissions = (activityType: string, subType: string, value: number): number => {
    const factor = emissionFactors.find(f => 
      f.activity_type === activityType && f.sub_type === subType
    );
    return factor ? value * factor.factor_kg_co2 : 0;
  };

  const handleTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    
    try {
      await trpc.createTransportationActivity.mutate(transportData);
      setSuccessMessage(`🚗 Transportation activity logged! Estimated emissions: ${getEstimatedEmissions('transport', `${transportData.transport_type}_${transportData.fuel_type}`, transportData.distance_km).toFixed(2)} kg CO₂`);
      
      // Reset form
      setTransportData(prev => ({
        ...prev,
        distance_km: 0,
        date: new Date()
      }));
      
      await onActivityLogged();
    } catch (error) {
      console.error('Failed to log transportation activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDietSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    
    try {
      await trpc.createDietActivity.mutate(dietData);
      setSuccessMessage(`🍽️ Diet activity logged! Estimated emissions: ${getEstimatedEmissions('diet', `${dietData.meal_type}_meal`, dietData.meal_count).toFixed(2)} kg CO₂`);
      
      // Reset form
      setDietData(prev => ({
        ...prev,
        meal_count: 1,
        date: new Date()
      }));
      
      await onActivityLogged();
    } catch (error) {
      console.error('Failed to log diet activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnergySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    
    try {
      await trpc.createEnergyActivity.mutate(energyData);
      setSuccessMessage(`⚡ Energy activity logged! Estimated emissions: ${getEstimatedEmissions('energy', energyData.energy_type, energyData.consumption).toFixed(2)} kg CO₂`);
      
      // Reset form
      setEnergyData(prev => ({
        ...prev,
        consumption: 0,
        date: new Date()
      }));
      
      await onActivityLogged();
    } catch (error) {
      console.error('Failed to log energy activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📝</span>
            <span>Log Your Activities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
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
            </TabsList>

            {/* Transportation Tab */}
            <TabsContent value="transport" className="mt-6">
              <form onSubmit={handleTransportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transport-type">Transportation Type</Label>
                    <Select 
                      value={transportData.transport_type} 
                      onValueChange={(value: TransportType) => 
                        setTransportData(prev => ({ ...prev, transport_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="car">🚗 Car</SelectItem>
                        <SelectItem value="bus">🚌 Bus</SelectItem>
                        <SelectItem value="train">🚆 Train</SelectItem>
                        <SelectItem value="subway">🚇 Subway</SelectItem>
                        <SelectItem value="flight_short">✈️ Flight (Short)</SelectItem>
                        <SelectItem value="flight_medium">✈️ Flight (Medium)</SelectItem>
                        <SelectItem value="flight_long">✈️ Flight (Long)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(transportData.transport_type === 'car') && (
                    <div className="space-y-2">
                      <Label htmlFor="fuel-type">Fuel Type</Label>
                      <Select 
                        value={transportData.fuel_type || 'gasoline'} 
                        onValueChange={(value: FuelType) => 
                          setTransportData(prev => ({ ...prev, fuel_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gasoline">⛽ Gasoline</SelectItem>
                          <SelectItem value="diesel">🛢️ Diesel</SelectItem>
                          <SelectItem value="electric">🔋 Electric</SelectItem>
                          <SelectItem value="hybrid">🔋⛽ Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distance (km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      value={transportData.distance_km}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTransportData(prev => ({ ...prev, distance_km: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder="Enter distance in kilometers"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {transportData.date.toLocaleDateString()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={transportData.date}
                          onSelect={(date: Date | undefined) => 
                            setTransportData(prev => ({ ...prev, date: date || new Date() }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {transportData.distance_km > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Estimated CO₂ emissions: <span className="font-semibold">
                        {getEstimatedEmissions('transport', `${transportData.transport_type}_${transportData.fuel_type}`, transportData.distance_km).toFixed(2)} kg
                      </span>
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Logging...' : 'Log Transportation Activity'}
                </Button>
              </form>
            </TabsContent>

            {/* Diet Tab */}
            <TabsContent value="diet" className="mt-6">
              <form onSubmit={handleDietSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meal-type">Meal Type</Label>
                    <Select 
                      value={dietData.meal_type} 
                      onValueChange={(value: MealType) => 
                        setDietData(prev => ({ ...prev, meal_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meat">🥩 Meat Meal</SelectItem>
                        <SelectItem value="vegetarian">🥗 Vegetarian Meal</SelectItem>
                        <SelectItem value="vegan">🌱 Vegan Meal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meal-count">Number of Meals</Label>
                    <Input
                      id="meal-count"
                      type="number"
                      min="1"
                      value={dietData.meal_count}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDietData(prev => ({ ...prev, meal_count: parseInt(e.target.value) || 1 }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dietData.date.toLocaleDateString()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dietData.date}
                        onSelect={(date: Date | undefined) => 
                          setDietData(prev => ({ ...prev, date: date || new Date() }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {dietData.meal_count > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      Estimated CO₂ emissions: <span className="font-semibold">
                        {getEstimatedEmissions('diet', `${dietData.meal_type}_meal`, dietData.meal_count).toFixed(2)} kg
                      </span>
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Logging...' : 'Log Diet Activity'}
                </Button>
              </form>
            </TabsContent>

            {/* Energy Tab */}
            <TabsContent value="energy" className="mt-6">
              <form onSubmit={handleEnergySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="energy-type">Energy Type</Label>
                    <Select 
                      value={energyData.energy_type} 
                      onValueChange={(value: EnergyType) => 
                        setEnergyData(prev => ({ 
                          ...prev, 
                          energy_type: value,
                          unit: value === 'electricity' ? 'kWh' : 'therms'
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electricity">⚡ Electricity</SelectItem>
                        <SelectItem value="natural_gas">🔥 Natural Gas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumption">Consumption ({energyData.unit})</Label>
                    <Input
                      id="consumption"
                      type="number"
                      step="0.1"
                      min="0"
                      value={energyData.consumption}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEnergyData(prev => ({ ...prev, consumption: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder={`Enter consumption in ${energyData.unit}`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {energyData.date.toLocaleDateString()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={energyData.date}
                        onSelect={(date: Date | undefined) => 
                          setEnergyData(prev => ({ ...prev, date: date || new Date() }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {energyData.consumption > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Estimated CO₂ emissions: <span className="font-semibold">
                        {getEstimatedEmissions('energy', energyData.energy_type, energyData.consumption).toFixed(2)} kg
                      </span>
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Logging...' : 'Log Energy Activity'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
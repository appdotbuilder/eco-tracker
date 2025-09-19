import { type EmissionFactor } from '../schema';

export async function getEmissionFactors(): Promise<EmissionFactor[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is:
    // 1. Fetch all emission factors from the database
    // 2. These are used for calculating CO2 emissions for different activities
    // 3. Return factors organized by activity type and sub-type
    // 4. This data is used by other handlers to calculate emissions
    return Promise.resolve([
        {
            id: 1,
            activity_type: 'transport',
            sub_type: 'car_gasoline',
            factor_kg_co2: 0.21, // kg CO2 per km
            unit: 'km',
            created_at: new Date()
        },
        {
            id: 2,
            activity_type: 'diet',
            sub_type: 'meat_meal',
            factor_kg_co2: 3.3, // kg CO2 per meal
            unit: 'meal',
            created_at: new Date()
        },
        {
            id: 3,
            activity_type: 'energy',
            sub_type: 'electricity',
            factor_kg_co2: 0.4, // kg CO2 per kWh
            unit: 'kWh',
            created_at: new Date()
        }
    ] as EmissionFactor[]);
}
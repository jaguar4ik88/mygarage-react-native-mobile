// External API services for VIN decoding and car data
import { API_BASE_URL, API_KEY } from '../constants';

export interface VinDecodeResult {
  make: string;
  model: string;
  year: number;
  engine: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  driveType: string;
  cylinders: number;
  displacement: string;
}

export interface CarQueryResult {
  make: string;
  model: string;
  year: number;
  engine: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  driveType: string;
  cylinders: number;
  displacement: string;
}

class ExternalApiService {
  private readonly NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';
  private readonly CAR_QUERY_BASE_URL = 'https://www.carqueryapi.com/api/0.3';
  // Backend cached endpoints (use absolute base URL)
  private readonly BACKEND_BASE = `${API_BASE_URL}/car-data`;

  // Get headers for backend requests
  private getBackendHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    return headers;
  }

  // VIN Decoding using NHTSA vPIC API
  async decodeVin(vin: string): Promise<VinDecodeResult | null> {
    try {
      // Use DecodeVinValues to get a single object with normalized keys
      const response = await fetch(
        `${this.NHTSA_BASE_URL}/DecodeVinValues/${encodeURIComponent(vin)}?format=json`
      );
      
      if (!response.ok) {
        throw new Error('Failed to decode VIN');
      }

      const data = await response.json();

      if (data.Results && data.Results.length > 0) {
        const result = data.Results[0] || {};

        const make = result.Make || '';
        const model = result.Model || '';
        const year = parseInt(result.ModelYear) || 0;
        const engineModel = result.EngineModel || result.EngineConfiguration || '';
        const cylindersRaw = parseInt(result.EngineCylinders) || 0;
        const displacementL = result.DisplacementL ? `${result.DisplacementL}L` : '';
        const displacementCC = result.DisplacementCC ? `${result.DisplacementCC}cc` : '';
        const displacement = displacementL || displacementCC || '';

        const bodyType = result.BodyClass || '';
        const fuelType = result.FuelTypePrimary || '';
        const transmission = result.TransmissionStyle || result.TransmissionSpeeds || '';
        const driveType = result.DriveType || '';

        // If we didn't get at least the basic triplet, consider as not found
        if (!make && !model && !year) {
          return null;
        }

        return {
          make,
          model,
          year,
          engine: engineModel,
          bodyType,
          fuelType,
          transmission,
          driveType,
          cylinders: cylindersRaw,
          displacement,
        };
      }
      
      return null;
    } catch (error) {
      console.error('VIN decode error:', error);
      return null;
    }
  }

  // Get car makes
  async getCarMakers(): Promise<string[]> {
    try {
      const response = await fetch(`${this.BACKEND_BASE}/makers`, {
        headers: this.getBackendHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch car makes');
      }

      const data = await response.json();
      const list: string[] = data.data || [];
      // Deduplicate and sort
      return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('Get car makes error:', error);
      return [];
    }
  }

  // Get car models for a specific make and year
  async getCarModels(maker: string, year?: number): Promise<string[]> {
    try {
      const q = year ? `&year=${year}` : '';
      const url = `${this.BACKEND_BASE}/models?maker=${encodeURIComponent(maker)}${q}`;
      console.log('Fetching car models:', url);
      let response = await fetch(url, {
        headers: this.getBackendHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch car models');
      }

      let data = await response.json();
      let list: string[] = data.data || [];
      list = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
      if (!Array.isArray(list) || list.length === 0) {
        // Force backend refresh and retry once
        const refreshUrl = `${this.BACKEND_BASE}/models?maker=${encodeURIComponent(maker)}${q}&refresh=true`;
        console.log('Retry fetching car models with refresh:', refreshUrl);
        response = await fetch(refreshUrl, {
          headers: this.getBackendHeaders(),
        });
        if (response.ok) {
          data = await response.json();
          list = Array.from(new Set((data.data || []) as string[])).sort((a, b) => a.localeCompare(b));
        }
      }
      return list;
    } catch (error) {
      console.error('Get car models error:', error);
      return [];
    }
  }

  // Get car trims for a specific make, model, and year
  async getCarTrims(maker: string, model: string, year?: number): Promise<any[]> {
    try {
      const q = year ? `&year=${year}` : '';
      const response = await fetch(`${this.BACKEND_BASE}/trims?maker=${encodeURIComponent(maker)}&model=${encodeURIComponent(model)}${q}`, {
        headers: this.getBackendHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch car trims');
      }

      const data = await response.json();
      const list: any[] = data.data || [];
      // Deduplicate by engine label
      const unique: any[] = [];
      const seen = new Set<string>();
      for (const row of list) {
        const label = (row?.engine || '').toString();
        if (label && !seen.has(label)) {
          seen.add(label);
          unique.push(row);
        }
      }
      return unique;
    } catch (error) {
      console.error('Get car trims error:', error);
      return [];
    }
  }

  // Get years for a specific make
  async getCarYears(make: string): Promise<number[]> {
    try {
      const response = await fetch(
        `${this.CAR_QUERY_BASE_URL}/?cmd=getYears&make=${encodeURIComponent(make)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch car years');
      }

      const data = await response.json();
      return data.Years?.map((year: any) => parseInt(year.year)) || [];
    } catch (error) {
      console.error('Get car years error:', error);
      return [];
    }
  }

  // Generate personalized manual content based on vehicle data
  generateManualContent(vehicle: VinDecodeResult | CarQueryResult): any {
    const { make, model, year, engine, fuelType, transmission } = vehicle;
    
    return {
      weekly_checks: {
        title: 'Weekly Checks',
        content: [
          'Check engine oil level',
          'Check coolant level',
          'Check tire pressure',
          'Check all lights and indicators',
          'Check brake fluid level',
          'Check battery condition',
        ],
      },
      maintenance_schedule: {
        title: 'Maintenance Schedule',
        content: [
          `Oil change: every 10,000 km or 12 months`,
          `Air filter replacement: every 20,000 km`,
          `Fuel filter replacement: every 30,000 km`,
          `Cabin filter replacement: every 15,000 km`,
          `Brake pad inspection: every 15,000 km`,
          `Spark plug replacement: every 40,000 km`,
        ],
      },
      fluids: {
        title: 'Fluids',
        content: [
          `Engine oil: ${this.getOilSpecification(engine, year)}`,
          `Coolant: ${this.getCoolantSpecification(make, year)}`,
          `Brake fluid: DOT 4`,
          `Power steering fluid: ${this.getPowerSteeringSpecification(make, year)}`,
          `Transmission fluid: ${this.getTransmissionSpecification(transmission)}`,
        ],
      },
      tire_pressure: {
        title: 'Tire Pressure',
        content: [
          'Front tires: 2.2-2.4 bar',
          'Rear tires: 2.0-2.2 bar',
          'Spare wheel: 2.5 bar',
          'Check pressure on cold tires',
          'Adjust pressure based on load',
        ],
      },
      lights: {
        title: 'Lighting',
        content: [
          'Check low beam operation',
          'Check high beam operation',
          'Check parking lights',
          'Check brake lights',
          'Check turn signals',
          'Check reverse lights',
        ],
      },
      emergency: {
        title: 'Emergency Situations',
        content: [
          'Emergency kit: first aid, fire extinguisher, warning triangle',
          'Emergency services: 112',
          'Insurance company phone',
          'Tow truck number',
          'Wheel change instructions',
          'Emergency brake check',
        ],
      },
    };
  }

  private getOilSpecification(engine: string, year: number): string {
    // Simplified oil specification based on engine and year
    if (year >= 2020) {
      return '5W-30 synthetic';
    } else if (year >= 2010) {
      return '5W-30 or 10W-40';
    } else {
      return '10W-40 mineral';
    }
  }

  private getCoolantSpecification(make: string, year: number): string {
    // Simplified coolant specification
    if (make.toLowerCase().includes('bmw') || make.toLowerCase().includes('mercedes')) {
      return 'G12+ or G13';
    } else {
      return 'G12 or G12+';
    }
  }

  private getPowerSteeringSpecification(make: string, year: number): string {
    // Simplified power steering fluid specification
    return 'ATF Dexron III or equivalent';
  }

  private getTransmissionSpecification(transmission: string): string {
    // Simplified transmission fluid specification
    if (transmission.toLowerCase().includes('cvt')) {
      return 'CVT fluid';
    } else if (transmission.toLowerCase().includes('dsg')) {
      return 'DSG fluid';
    } else {
      return 'ATF Dexron III';
    }
  }
}

export default new ExternalApiService();

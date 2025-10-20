export interface User {
  id: number;
  name: string;
  email: string;
  currency?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  user_id: number;
  vin?: string;
  year: number;
  make: string;
  model: string;
  engine_type: string;
  mileage: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  user_id: number;
  vehicle_id: number;
  type: 'oil' | 'filters' | 'tires' | 'brakes' | 'coolant' | 'inspection' | 'timing_belt' | 'transmission' | 'battery' | 'engine' | 'electrical' | 'suspension' | 'other';
  title: string;
  description: string;
  last_service_date?: string;
  next_service_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceStation {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  website?: string;
  rating: number;
  distance: number;
  latitude: number;
  longitude: number;
  types: string[];
}

export interface ServiceHistory {
  id: number;
  vehicle_id: number;
  expense_type_id?: number;
  // Some payloads may include slug/name; keep optional for compatibility
  type?: string;
  description: string;
  cost: number;
  service_date: string;
  // Backward compatibility aliases
  amount?: number;
  date?: string;
  station_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ManualSection {
  id: string;
  title: string;
  content: string;
  icon: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_more: boolean;
  };
}

export type RootStackParamList = {
  Welcome: undefined;
  Auth: { mode?: 'login' | 'register' };
  ForgotPassword: undefined;
  AddCar: undefined;
  VehicleDetail: { vehicle: Vehicle };
  Home: undefined;
  HomeTab: undefined;
  Advice: undefined;
  Reminders: undefined;
  STO: undefined;
  History: undefined;
  Reports: undefined;
  Actions: undefined;
  Recommendations: undefined;
  Profile: undefined;
};

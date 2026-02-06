// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';


// define types for API Responses
interface ApiResponse<T = unknown> {
  [key: string]: unknown;
  data?: T;
}

interface SignupData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  is_trainer: boolean;
  profile_data?: {
    age: number;
    experience_level: string;
    training_location: string;
    fitness_focus: string;
  };
  trainer_data?: {
    bio: string;
    years_of_experience: number;
    specialty_strength: boolean;
    specialty_cardio: boolean;
    specialty_flexibility: boolean;
    specialty_sports: boolean;
    specialty_rehabilitation: boolean;
    certifications: string;
  };
}

interface LoginCredentials {
  login: string;
  password: string;
}

export interface UserProfileData {
  id?: number;
  age: number | null;
  experience_level: string;
  training_location: string;
  fitness_focus: string;
}

export interface TrainerProfileData {
  id?: number;
  bio: string;
  years_of_experience: number;
  specialty_strength: boolean;
  specialty_cardio: boolean;
  specialty_flexibility: boolean;
  specialty_sports: boolean;
  specialty_rehabilitation: boolean;
  certifications: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_trainer: boolean;
  profile?: UserProfileData;
  trainer_profile?: TrainerProfileData;
}

interface LoginResponse {
  ok: boolean;
  user: User;
}

interface CurrentUserResponse {
  authenticated: boolean;
  user: User | null;
}

export interface ProfileData {
  age: number | null;
  experience_level: string;
  training_location: string;
  fitness_focus: string;
}

export interface WorkoutPlanData {
  id: number;
  name: string;
  description: string;
  focus: string;
  difficulty: string;
  weekly_frequency: number;
  session_length: number;
  is_subscription: boolean;
  is_published: boolean;
  trainer?: number;
  trainer_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper with error handling
async function fetchAPI<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for session cookies
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Build errors object: backend may send { errors: {...} } or DRF-style { field: ["msg"] }
      let errors: Record<string, string> | undefined;
      if (data.errors && typeof data.errors === 'object') {
        errors = data.errors as Record<string, string>;
      } else if (response.status === 400 && typeof data === 'object' && data !== null && !Array.isArray(data)) {
        errors = {};
        for (const [key, val] of Object.entries(data)) {
          if (key !== 'detail' && Array.isArray(val) && val.length > 0) {
            errors[key] = String(val[0]);
          } else if (key !== 'detail' && typeof val === 'string') {
            errors[key] = val;
          }
        }
        if (Object.keys(errors).length === 0) errors = undefined;
      }
      if (response.status === 401) {
        throw new ApiError('Please sign in again.', 401, errors);
      } else if (response.status === 403) {
        throw new ApiError(data.detail || 'You don’t have permission to do this.', 403, errors);
      } else if (response.status === 400) {
        throw new ApiError(data.detail || 'Validation Error', 400, errors);
      } else if (response.status === 500) {
        throw new ApiError('Server Error', 500);
      } else {
        throw new ApiError(
          data.detail || data.message || 'An error occurred',
          response.status
        );
      }
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or other issue
    throw new ApiError('Network error. Please check your connection.', 0);
  }
}

// Authentication API functions
export const authAPI = {
  // Register new user
  signup: async (userData: SignupData): Promise<User> => {
    return fetchAPI<User>('/api/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    return fetchAPI<LoginResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Logout user
  logout: async (): Promise<{ ok: boolean }> => {
    return fetchAPI<{ ok: boolean }>('/api/auth/logout/', {
      method: 'POST',
    });
  },

  // Get current user info
  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    return fetchAPI<CurrentUserResponse>('/api/auth/me/', {
      method: 'GET',
    });
  },
};

// Profile API (user fitness profile: age, experience, location, focus)
export const profileAPI = {
  getProfile: async (): Promise<ProfileData> => {
    return fetchAPI<ProfileData>('/api/profile/me/', { method: 'GET' });
  },
  updateProfile: async (profileData: ProfileData): Promise<ProfileData> => {
    return fetchAPI<ProfileData>('/api/profile/me/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// Trainer profile API (bio, specialties, certifications)
export const trainerAPI = {
  getProfile: async (): Promise<TrainerProfileData> => {
    return fetchAPI<TrainerProfileData>('/api/trainer/me/', { method: 'GET' });
  },
  updateProfile: async (data: Partial<TrainerProfileData>): Promise<TrainerProfileData> => {
    return fetchAPI<TrainerProfileData>('/api/trainer/me/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Workout programs API (published list, trainer CRUD, publish)
export const programAPI = {
  listPublished: async (): Promise<WorkoutPlanData[]> => {
    return fetchAPI<WorkoutPlanData[]>('/api/programs/', { method: 'GET' });
  },
  listMine: async (): Promise<WorkoutPlanData[]> => {
    return fetchAPI<WorkoutPlanData[]>('/api/programs/mine/', { method: 'GET' });
  },
  create: async (data: Omit<WorkoutPlanData, 'id' | 'trainer' | 'trainer_name' | 'is_published'> & { is_published?: boolean }): Promise<WorkoutPlanData> => {
    return fetchAPI<WorkoutPlanData>('/api/programs/create/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  get: async (id: number): Promise<WorkoutPlanData> => {
    return fetchAPI<WorkoutPlanData>(`/api/programs/${id}/`, { method: 'GET' });
  },
  update: async (id: number, data: Partial<WorkoutPlanData>): Promise<WorkoutPlanData> => {
    return fetchAPI<WorkoutPlanData>(`/api/programs/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return fetchAPI<void>(`/api/programs/${id}/`, { method: 'DELETE' });
  },
  publish: async (id: number, is_published: boolean): Promise<WorkoutPlanData> => {
    return fetchAPI<WorkoutPlanData>(`/api/programs/${id}/publish/`, {
      method: 'POST',
      body: JSON.stringify({ is_published }),
    });
  },
};

// Workout Plans API (recommendations, select plan - for future use)
export const workoutAPI = {
  getRecommendations: async (): Promise<unknown[]> => {
    return fetchAPI<unknown[]>('/api/recommendations/', { method: 'GET' });
  },
  getTrainerPrograms: async (): Promise<WorkoutPlanData[]> => {
    return programAPI.listPublished();
  },
  selectPlan: async (planId: number): Promise<{ ok: boolean }> => {
    return fetchAPI<{ ok: boolean }>(`/api/plans/${planId}/select/`, {
      method: 'POST',
    });
  },
};

// Generic API helper
export const api = {
  get: <T = unknown>(endpoint: string): Promise<T> => 
    fetchAPI<T>(endpoint, { method: 'GET' }),
  
  post: <T = unknown>(endpoint: string, data?: unknown): Promise<T> =>
    fetchAPI<T>(endpoint, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  put: <T = unknown>(endpoint: string, data?: unknown): Promise<T> =>
    fetchAPI<T>(endpoint, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  delete: <T = unknown>(endpoint: string): Promise<T> => 
    fetchAPI<T>(endpoint, { method: 'DELETE' }),
};

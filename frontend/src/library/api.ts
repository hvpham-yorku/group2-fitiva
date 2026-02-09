const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// CSRF token helper (might not need this)
async function getCSRFToken() {
  await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    credentials: 'include',
  });
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(
    new RegExp('(^| )' + name + '=([^;]+)')
  );

  return match ? match[2] : null;
}
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

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_trainer: boolean;
}

interface LoginResponse {
  ok: boolean;
  user: User;
}

interface CurrentUserResponse {
  authenticated: boolean;
  user: User | null;
}

interface ProfileData {
  age?: number;
  experience_level?: string;
  training_location?: string;
  fitness_focus?: string;
}

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

async function fetchAPI<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const csrftoken = getCookie('csrftoken');

const config: RequestInit = {
  ...options,
  headers: {
    'Content-Type': 'application/json',
    ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
    ...options.headers,
  },
  credentials: 'include',
};

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle different error types
      if (response.status === 401) {
        throw new ApiError('Unauthorized', 401);
      } else if (response.status === 400 && data.errors) {
        throw new ApiError('Validation Error', 400, data.errors);
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
    throw new ApiError('Network error. Please check your connection.', 0);
  }
}

// Authentication API funcs
export const authAPI = {

  // User signup
  signup: async (userData: SignupData): Promise<User> => {
    return fetchAPI<User>('/api/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // User login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    return fetchAPI<LoginResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // User logout
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

// Profile API functions
export const profileAPI = {

  // Get user profile
  getProfile: async (): Promise<ProfileData> => {
    return fetchAPI<ProfileData>('/api/profile/me/', {
      method: 'GET',
    });
  },

  // Update user profile
  updateProfile: async (profileData: ProfileData): Promise<ProfileData> => {
    return fetchAPI<ProfileData>('/api/profile/me/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// Workout Plans API functions
export const workoutAPI = {
    
  // Get recommendations
  getRecommendations: async (): Promise<unknown[]> => {
    return fetchAPI<unknown[]>('/api/recommendations/', {
      method: 'GET',
    });
  },

  // Get trainer programs
  getTrainerPrograms: async (filters?: string): Promise<unknown[]> => {
    const query = filters ? `?${filters}` : '';
    return fetchAPI<unknown[]>(`/api/trainer-programs/${query}`, {
      method: 'GET',
    });
  },

  // Select a workout plan
  selectPlan: async (planId: number): Promise<{ ok: boolean }> => {
    return fetchAPI<{ ok: boolean }>(`/api/plans/${planId}/select/`, {
      method: 'POST',
    });
  },
};

// Public Profile API - to access others' profiles but can't edit
export const publicProfileAPI = {
    getPublicProfile: async (userId: number): Promise<{
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        email?: string;
        is_trainer: boolean;
        is_owner: boolean;
    user_profile: {
        age?: number | null;
        experience_level: string;
        training_location: string;
        fitness_focus: string;
        } | null;
    trainer_profile: {
        id: number;
        bio: string;
        years_of_experience: number;
        specialty_strength: boolean;
        specialty_cardio: boolean;
        specialty_flexibility: boolean;
        specialty_sports: boolean;
        specialty_rehabilitation: boolean;
        certifications: string;
        created_at: string;
        updated_at: string;
    } | null;
}> => {
    return fetchAPI(`/api/users/${userId}/profile/`, {
        method: 'GET',
    });
},

  // Get trainer's workout programs
  getTrainerPrograms: async (userId: number): Promise<{
    programs: Array<{
      id: number;
      name: string;
      description: string;
      focus: string;
      difficulty: string;
      weekly_frequency: number;
      session_length: number;
      is_subscription: boolean;
      created_at: string;
      updated_at: string;
    }>;
    total_count: number;
  }> => {
    return fetchAPI(`/api/users/${userId}/programs/`, {
      method: 'GET',
    });
  },
};

// Trainer API for own profiles only
export const trainerAPI = {
  updateTrainerProfile: async (data: {
    bio?: string;
    years_of_experience?: number;
    specialty_strength?: boolean;
    specialty_cardio?: boolean;
    specialty_flexibility?: boolean;
    specialty_sports?: boolean;
    specialty_rehabilitation?: boolean;
    certifications?: string;
  }): Promise<{
    id: number;
    bio: string;
    years_of_experience: number;
    specialty_strength: boolean;
    specialty_cardio: boolean;
    specialty_flexibility: boolean;
    specialty_sports: boolean;
    specialty_rehabilitation: boolean;
    certifications: string;
    created_at: string;
    updated_at: string;
  }> => {
    return fetchAPI('/api/trainer/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
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


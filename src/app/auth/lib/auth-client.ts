// API client functions for authentication
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    createdAt: string;
  };
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    createdAt: string;
  };
  session?: {
    sessionId: string;
    expiresAt: string;
  };
  error?: string;
}

/**
 * Login user with username and password
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        user: { id: '', username: '', createdAt: '' },
        error: data.error || 'Login failed',
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      user: { id: '', username: '', createdAt: '' },
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Register a new user
 */
export async function signup(username: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        user: { id: '', username: '', createdAt: '' },
        error: data.error || 'Registration failed',
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      user: { id: '', username: '', createdAt: '' },
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Validate current session
 */
export async function validateSession(): Promise<SessionResponse> {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Invalid session',
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/auth';
import { setSession, getSession, deleteSession } from '@/lib/redis';
import { setSupabaseAuth, clearSupabaseAuth } from '@/lib/supabase-auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate session ID
  const generateSessionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get session ID from localStorage
  const getStoredSessionId = (): string | null => {
    return localStorage.getItem('sessionId');
  };

  // Store session ID in localStorage
  const storeSessionId = (sessionId: string): void => {
    localStorage.setItem('sessionId', sessionId);
  };

  // Remove session ID from localStorage
  const removeStoredSessionId = (): void => {
    localStorage.removeItem('sessionId');
  };

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionId = getStoredSessionId();
        if (sessionId) {
          const userId = await getSession(sessionId);
          if (userId) {
            // Get user data from Supabase
            const { getUserById } = await import('@/lib/auth');
            const response = await getUserById(userId);
            if (response.success && response.user) {
              setUser(response.user);
              // Skip Supabase auth session for restored user since we're using custom auth
              // await setSupabaseAuth(response.user);
            } else {
              // Invalid session, clean up
              await deleteSession(sessionId);
              removeStoredSessionId();
            }
          } else {
            // Session expired, clean up
            removeStoredSessionId();
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        removeStoredSessionId();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (userData: User): Promise<void> => {
    try {
      // Generate new session
      const sessionId = generateSessionId();
      
      // Store session in Redis (24 hours expiration)
      const sessionStored = await setSession(sessionId, userData.id, 86400);
      
      if (sessionStored) {
        // Store session ID locally
        storeSessionId(sessionId);

        // Skip Supabase auth session for now since we're using custom auth
        // const supabaseAuthSet = await setSupabaseAuth(userData);
        // if (!supabaseAuthSet) {
        //   console.warn('Failed to set Supabase auth session, but continuing with login');
        // }

        // Update user state
        setUser(userData);
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const sessionId = getStoredSessionId();
      if (sessionId) {
        // Delete session from Redis
        await deleteSession(sessionId);
        
        // Remove session ID from localStorage
        removeStoredSessionId();
      }

      // Skip clearing Supabase auth session since we're not using it
      // await clearSupabaseAuth();

      // Clear user state
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if Redis cleanup fails
      setUser(null);
      removeStoredSessionId();
    }
  };

  const updateUser = (updates: Partial<User>): void => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

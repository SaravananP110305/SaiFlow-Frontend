import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface AuthContextType {
  user: any | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<any>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSessionUser = async () => {
    try {
      // First attempt to restore access token from refresh endpoint
      const token = await authService.refreshToken();
      if (token) {
        setAccessTokenState(token);
        const userData = await authService.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.log('No active session found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionUser();
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
      setAccessTokenState(data.accessToken);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setAccessTokenState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetchUser = async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refetch user:', error);
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user || !user.role) return false;
    
    // Administrator role bypasses all permissions
    if (user.role.name === 'Administrator') return true;

    const permissions = user.role.permissions || {};
    const moduleActions = permissions[module] || [];
    return moduleActions.includes(action);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        refetchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

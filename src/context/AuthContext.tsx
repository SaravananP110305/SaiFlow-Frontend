import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { setAccessToken, setUnauthorizedHandler } from '../services/api';

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
  const [permissions, setPermissions] = useState<any>({});
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthState = () => {
    setUser(null);
    setPermissions({});
    setAccessTokenState(null);
    setAccessToken(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(clearAuthState);

    const restoreSession = async () => {
      try {
        const token = await authService.refreshToken();
        if (!token) {
          clearAuthState();
          return;
        }

        setAccessTokenState(token);
        const userData = await authService.getMe();
        setUser(userData);
        const privileges = await authService.getPrivileges();
        setPermissions(privileges?.permissions || {});
      } catch (error) {
        clearAuthState();
        console.log('No active session found.');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const token = await authService.login(credentials);
      setAccessTokenState(token);
      const userData = await authService.getMe();
      setUser(userData);
      const privileges = await authService.getPrivileges();
      setPermissions(privileges?.permissions || {});
      return token;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    let logoutError: unknown = null;
    try {
      await authService.logout();
    } catch (error) {
      logoutError = error;
    } finally {
      clearAuthState();
      setIsLoading(false);
    }

    if (logoutError) {
      throw logoutError;
    }
  };

  const refetchUser = async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
      const privileges = await authService.getPrivileges();
      setPermissions(privileges?.permissions || {});
    } catch (error) {
      console.error('Failed to refetch user:', error);
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;

    // Administrator role bypasses all permissions
    if (user.role?.name === 'Administrator') return true;

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

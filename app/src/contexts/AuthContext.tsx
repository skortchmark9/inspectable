import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType } from '@/types';
import { authManager } from '@/services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);
      
      // Check for token and validate with server
      const token = await authManager.getToken();
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      
      // Validate token with server
      const isValid = await authManager.validateToken();
      setIsAuthenticated(isValid);
      
      if (!isValid) {
        await authManager.signOut();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Use the actual authManager signIn method
      const token = await authManager.signIn(email, password);
      if (token) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authManager.signOut();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isCheckingAuth,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
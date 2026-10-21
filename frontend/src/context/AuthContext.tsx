import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { authService, LoginCredentials, RegisterData } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { user } = await authService.login(credentials);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const { user } = await authService.register(data);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const switchRoleDemo = (targetRole: UserRole) => {
    if (targetRole === 'candidato') {
      const demoUser: User = {
        id: 'usr-cand-01',
        email: 'valeria.mendoza@correo.com',
        name: 'Valeria Mendoza',
        role: 'candidato',
        phone: '+1 (809) 555-0198',
        avatar: 'VM',
        createdAt: '2026-10-01T10:00:00Z',
      };
      localStorage.setItem('nexo_current_user', JSON.stringify(demoUser));
      setUser(demoUser);
    } else if (targetRole === 'rrhh') {
      const demoUser: User = {
        id: 'usr-hr-01',
        email: 'carlos.rrhh@nexo.com',
        name: 'Lic. Carlos Arismendi',
        role: 'rrhh',
        phone: '+1 (809) 555-0244',
        avatar: 'CA',
        createdAt: '2026-09-15T08:30:00Z',
      };
      localStorage.setItem('nexo_current_user', JSON.stringify(demoUser));
      setUser(demoUser);
    } else {
      const demoUser: User = {
        id: 'usr-adm-01',
        email: 'sofia.admin@nexo.com',
        name: 'Ing. Sofía Velásquez',
        role: 'administrador',
        phone: '+1 (809) 555-0371',
        avatar: 'SV',
        createdAt: '2026-08-10T09:00:00Z',
      };
      localStorage.setItem('nexo_current_user', JSON.stringify(demoUser));
      setUser(demoUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : 'candidato',
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchRoleDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

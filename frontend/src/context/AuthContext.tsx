import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { authService, LoginCredentials, RegisterCandidateData } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterCandidateData) => Promise<void>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => void;
  updateUserPhoto: (photoUrl: string | null) => void;
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

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const { user: loggedInUser } = await authService.login(credentials);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterCandidateData) => {
    setIsLoading(true);
    try {
      const { user: registeredUser } = await authService.register(data);
      setUser(registeredUser);
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
        empresaId: 'emp-01',
        empresaNombre: 'Nexo Tecnología S.A.',
        phone: '+1 (809) 555-0244',
        avatar: 'CA',
        createdAt: '2026-09-15T08:30:00Z',
      };
      localStorage.setItem('nexo_current_user', JSON.stringify(demoUser));
      setUser(demoUser);
    } else if (targetRole === 'admin') {
      const demoUser: User = {
        id: 'usr-adm-01',
        email: 'sofia.admin@nexo.com',
        name: 'Ing. Sofía Velásquez',
        role: 'admin',
        empresaId: 'emp-01',
        empresaNombre: 'Nexo Tecnología S.A.',
        phone: '+1 (809) 555-0371',
        avatar: 'SV',
        createdAt: '2026-08-10T09:00:00Z',
      };
      localStorage.setItem('nexo_current_user', JSON.stringify(demoUser));
      setUser(demoUser);
    } else {
      const demoUser: User = {
        id: 'usr-super-01',
        email: 'superadmin@plataformaml.com',
        name: 'Dr. Alejandro Morales',
        role: 'superadmin',
        phone: '+1 (809) 555-0999',
        avatar: 'AM',
        createdAt: '2026-07-01T08:00:00Z',
      };
      localStorage.setItem('nexo_current_user', JSON.stringify(demoUser));
      setUser(demoUser);
    }
  };

  const updateUserPhoto = (photoUrl: string | null) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        photoUrl: photoUrl || undefined,
      };
      setUser(updatedUser);
      localStorage.setItem('nexo_current_user', JSON.stringify(updatedUser));
      // Guardar también con clave específica por usuario y por correo para sincronizar entre portales
      const cleanEmail = (user.email || '').trim().toLowerCase();
      if (photoUrl) {
        localStorage.setItem(`nexo_user_photo_${user.id}`, photoUrl);
        if (cleanEmail) {
          localStorage.setItem(`nexo_photo_by_email_${cleanEmail}`, photoUrl);
        }
      } else {
        localStorage.removeItem(`nexo_user_photo_${user.id}`);
        if (cleanEmail) {
          localStorage.removeItem(`nexo_photo_by_email_${cleanEmail}`);
        }
      }
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
        updateUserPhoto,
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

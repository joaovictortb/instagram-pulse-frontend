import React, { createContext, useContext } from 'react';

interface User {
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const defaultUser: User = {
  displayName: 'Usuário',
  photoURL: 'https://picsum.photos/seed/user/100',
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  loading: false,
  signIn: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthContext.Provider
      value={{
        user: defaultUser,
        loading: false,
        signIn: async () => {},
        logout: async () => {},
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

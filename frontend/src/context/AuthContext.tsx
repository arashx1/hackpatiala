/**
 * AuthContext.tsx — localStorage-only auth stub
 *
 * No external auth service needed. User profile stored in localStorage.
 * This keeps the hackathon demo self-contained with zero setup.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

interface SimpleUser {
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: SimpleUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null; user: SimpleUser | null }>;
  signOut: () => Promise<void>;
}

const AUTH_KEY = 'moneymind_user';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const signIn = async (email: string, _password: string) => {
    // Demo: any email/password succeeds
    const u: SimpleUser = { email, fullName: email.split('@')[0] };
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
    return { error: null };
  };

  const signUp = async (email: string, _password: string, fullName?: string) => {
    const u: SimpleUser = { email, fullName: fullName || email.split('@')[0] };
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
    return { error: null, user: u };
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;

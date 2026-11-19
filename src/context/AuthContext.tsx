import React, { createContext, useContext } from 'react';

export type AuthMode = 'local' | 'cloud';

export interface LocalUserIdentity {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  emailVerified?: boolean;
}

interface AuthContextValue {
  user: LocalUserIdentity | null;
  authReady: boolean;
  authMode: AuthMode;
  isLocalMode: boolean;
  authError: string | null;
  authNotice: string | null;
  clearAuthMessages: () => void;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
  logout: () => Promise<void>;
  enterLocalWorkspace: () => void;
  exitLocalWorkspace: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Local-First AuthProvider: opens directly into the local IndexedDB workspace
 * with zero external authentication or network dependency on the critical path.
 * Existing Firebase integration files remain isolated under src/firebase/ for future reconnection.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const noopAsync = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user: null,
        authReady: true,
        authMode: 'local',
        isLocalMode: true,
        authError: null,
        authNotice: null,
        clearAuthMessages: () => {},
        signInWithGoogle: noopAsync,
        signUpWithEmail: noopAsync,
        signInWithEmail: noopAsync,
        resetPassword: noopAsync,
        resendVerification: noopAsync,
        reloadUser: async () => false,
        logout: noopAsync,
        enterLocalWorkspace: () => {},
        exitLocalWorkspace: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

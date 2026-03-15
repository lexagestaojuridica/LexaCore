"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";

/**
 * AuthUser — Shape interna do usuário no contexto da aplicação.
 * Desacoplada de qualquer tipo externo (Clerk/Supabase).
 */
export interface AuthUser {
  id: string;
  email: string | undefined;
  fullName: string | null;
  imageUrl: string;
  user_metadata: {
    full_name: string | null;
    avatar_url: string;
    [key: string]: unknown;
  };
}

interface AuthContextType {
  session: { user: AuthUser } | null;
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, userId, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();

  const signOut = async () => {
    await clerkSignOut();
  };

  const user: AuthUser | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    fullName: clerkUser.fullName,
    imageUrl: clerkUser.imageUrl,
    user_metadata: {
      ...clerkUser.publicMetadata,
      full_name: clerkUser.fullName,
      avatar_url: clerkUser.imageUrl,
    }
  } : null;

  return (
    <AuthContext.Provider value={{ session: userId ? { user: user! } : null, user, loading: !isLoaded || !isUserLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

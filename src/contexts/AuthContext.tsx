"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";

interface AuthContextType {
  session: any | null;
  user: any | null;
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

  const user = clerkUser ? {
    ...clerkUser,
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    user_metadata: {
      ...clerkUser.publicMetadata,
      full_name: clerkUser.fullName,
      avatar_url: clerkUser.imageUrl,
    }
  } : null;

  return (
    <AuthContext.Provider value={{ session: userId ? { user } : null, user, loading: !isLoaded || !isUserLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

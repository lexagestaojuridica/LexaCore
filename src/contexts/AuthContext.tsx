"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/react";
import { supabase } from "@/integrations/supabase/client";

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
  const { isLoaded, userId, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncSupabaseAuth = async () => {
      if (isLoaded) {
        if (userId) {
          // Get Supabase-compatible JWT from Clerk
          // Note: Requires a JWT template named 'supabase' in Clerk Dashboard
          try {
            const token = await getToken({ template: "supabase" });
            if (token) {
              const { error } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: "", // Clerk handles refresh
              });
              if (error) console.error("[AuthContext] Error setting Supabase session:", error.message);
            }
          } catch (err) {
            console.error("[AuthContext] Failed to get Clerk token:", err);
          }
        } else {
          // Clear Supabase session if no Clerk user
          await supabase.auth.signOut();
        }
        setLoading(false);
      }
    };

    syncSupabaseAuth();
  }, [isLoaded, userId, getToken]);

  const signOut = async () => {
    await clerkSignOut();
    await supabase.auth.signOut();
  };

  // Map Clerk user to match the expected structure if necessary
  // For now, we pass the clerkUser directly for basic compatibility
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
    <AuthContext.Provider value={{ session: userId ? { user } : null, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

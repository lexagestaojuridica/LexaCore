// Lovable auth integration stub
// The @lovable.dev/cloud-auth-js package is not available in this project (using Clerk).

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: "google" | "apple", _opts?: SignInOptions) => {
      console.warn("Lovable OAuth is not configured. This project uses Clerk for auth.");
      return { error: "Not configured" };
    },
  },
};

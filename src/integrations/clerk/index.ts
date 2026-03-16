/**
 * Clerk Integration
 *
 * Centralized Clerk configuration and helpers for LEXA.
 * Uses @clerk/nextjs for authentication, RBAC and organization management.
 *
 * Usage:
 *   import { CLERK_ROLES, hasRole } from '@/integrations/clerk';
 */

// ─── Role constants ────────────────────────────────────────────────────────

export const CLERK_ROLES = {
  ADMIN: "org:admin",
  MEMBER: "org:member",
  VIEWER: "org:viewer",
} as const;

export type ClerkRole = (typeof CLERK_ROLES)[keyof typeof CLERK_ROLES];

// ─── Permission helpers ────────────────────────────────────────────────────

/**
 * Check if the user has a specific role within the active organization.
 * Use this in server components/actions where auth() is available.
 */
export function hasRole(userRole: string | null | undefined, required: ClerkRole): boolean {
  return userRole === required;
}

/**
 * Check if the user has at least the specified permission level.
 * Admin > Member > Viewer
 */
export function hasMinimumRole(
  userRole: string | null | undefined,
  minimum: ClerkRole
): boolean {
  const hierarchy: Record<ClerkRole, number> = {
    [CLERK_ROLES.ADMIN]: 3,
    [CLERK_ROLES.MEMBER]: 2,
    [CLERK_ROLES.VIEWER]: 1,
  };

  const userLevel = hierarchy[userRole as ClerkRole] ?? 0;
  const requiredLevel = hierarchy[minimum] ?? 0;

  return userLevel >= requiredLevel;
}

// ─── Public route patterns ─────────────────────────────────────────────────

/**
 * Routes that do not require authentication.
 * Used by the Clerk middleware in middleware.ts.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/auth(.*)",
  "/portal(.*)",
  "/public(.*)",
  "/api/webhooks(.*)",
] as const;

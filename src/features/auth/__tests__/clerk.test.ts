import { describe, it, expect } from "vitest";
import { CLERK_ROLES, hasRole, hasMinimumRole, PUBLIC_ROUTES } from "@/integrations/clerk";

describe("Clerk Integration", () => {
  describe("CLERK_ROLES", () => {
    it("should define admin, member and viewer roles", () => {
      expect(CLERK_ROLES.ADMIN).toBe("org:admin");
      expect(CLERK_ROLES.MEMBER).toBe("org:member");
      expect(CLERK_ROLES.VIEWER).toBe("org:viewer");
    });
  });

  describe("hasRole", () => {
    it("returns true when user has the required role", () => {
      expect(hasRole("org:admin", CLERK_ROLES.ADMIN)).toBe(true);
      expect(hasRole("org:member", CLERK_ROLES.MEMBER)).toBe(true);
      expect(hasRole("org:viewer", CLERK_ROLES.VIEWER)).toBe(true);
    });

    it("returns false when user does not have the required role", () => {
      expect(hasRole("org:member", CLERK_ROLES.ADMIN)).toBe(false);
      expect(hasRole("org:viewer", CLERK_ROLES.MEMBER)).toBe(false);
    });

    it("returns false for null or undefined role", () => {
      expect(hasRole(null, CLERK_ROLES.ADMIN)).toBe(false);
      expect(hasRole(undefined, CLERK_ROLES.MEMBER)).toBe(false);
    });
  });

  describe("hasMinimumRole", () => {
    it("admin has access to admin, member and viewer roles", () => {
      expect(hasMinimumRole("org:admin", CLERK_ROLES.ADMIN)).toBe(true);
      expect(hasMinimumRole("org:admin", CLERK_ROLES.MEMBER)).toBe(true);
      expect(hasMinimumRole("org:admin", CLERK_ROLES.VIEWER)).toBe(true);
    });

    it("member has access to member and viewer but not admin", () => {
      expect(hasMinimumRole("org:member", CLERK_ROLES.ADMIN)).toBe(false);
      expect(hasMinimumRole("org:member", CLERK_ROLES.MEMBER)).toBe(true);
      expect(hasMinimumRole("org:member", CLERK_ROLES.VIEWER)).toBe(true);
    });

    it("viewer only has access to viewer", () => {
      expect(hasMinimumRole("org:viewer", CLERK_ROLES.ADMIN)).toBe(false);
      expect(hasMinimumRole("org:viewer", CLERK_ROLES.MEMBER)).toBe(false);
      expect(hasMinimumRole("org:viewer", CLERK_ROLES.VIEWER)).toBe(true);
    });

    it("returns false for null or undefined role", () => {
      expect(hasMinimumRole(null, CLERK_ROLES.VIEWER)).toBe(false);
      expect(hasMinimumRole(undefined, CLERK_ROLES.ADMIN)).toBe(false);
    });
  });

  describe("PUBLIC_ROUTES", () => {
    it("should include auth, portal and root routes", () => {
      expect(PUBLIC_ROUTES).toContain("/");
      expect(PUBLIC_ROUTES).toContain("/auth(.*)");
      expect(PUBLIC_ROUTES).toContain("/portal(.*)");
    });

    it("should include webhook routes", () => {
      expect(PUBLIC_ROUTES).toContain("/api/webhooks(.*)");
    });
  });
});

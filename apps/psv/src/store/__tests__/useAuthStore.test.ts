import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useAuthStore } from "../useAuthStore";
import type { User } from "@/data/types";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock modules
vi.mock("@/lib/api", () => ({
  api: {
    login: vi.fn(),
    logout: vi.fn(),
  },
  USE_LOCAL_STORAGE: true,
}));
vi.mock("@/lib/hashPassword", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock("@/data/mockData", () => ({
  users: [
    {
      id: "1",
      name: "Admin",
      role: "admin",
      status: "active",
      email: "admin@example.com",
    },
  ],
  credentials: [{ userId: "1", username: "admin", password: "hash" }],
}));

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    // Reset store
    useAuthStore.setState({
      currentUser: null,
      isAuthenticated: false,
      sessionExpiresAt: null,
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      currentUser: null,
      isAuthenticated: false,
      sessionExpiresAt: null,
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const { verifyPassword } = await import("@/lib/hashPassword");
      vi.mocked(verifyPassword).mockResolvedValue(true);
      const result = await useAuthStore.getState().login("admin", "password");
      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().currentUser).toBeDefined();
    });

    it("should fail login with invalid username", async () => {
      const result = await useAuthStore.getState().login("invalid", "password");
      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("should fail login with invalid password", async () => {
      const { verifyPassword } = await import("@/lib/hashPassword");
      vi.mocked(verifyPassword).mockResolvedValue(false);
      const result = await useAuthStore.getState().login("admin", "wrong");
      expect(result).toBe(false);
    });
  });

  describe("logout", () => {
    it("should logout and clear state", () => {
      useAuthStore.setState({
        currentUser: { role: "admin" } as User,
        isAuthenticated: true,
        sessionExpiresAt: Date.now() + 1000,
      });
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().currentUser).toBe(null);
    });
  });

  describe("permissions", () => {
    it("should return correct permissions for admin", () => {
      useAuthStore.setState({ currentUser: { role: "admin" } as User });
      expect(useAuthStore.getState().canEdit()).toBe(true);
      expect(useAuthStore.getState().canApprove()).toBe(true);
      expect(useAuthStore.getState().canManageUsers()).toBe(true);
    });

    it("should return correct permissions for engineer", () => {
      useAuthStore.setState({ currentUser: { role: "engineer" } as User });
      expect(useAuthStore.getState().canEdit()).toBe(true);
      expect(useAuthStore.getState().canApprove()).toBe(false);
    });

    it("should return false for no user", () => {
      useAuthStore.setState({ currentUser: null });
      expect(useAuthStore.getState().canEdit()).toBe(false);
    });
  });

  describe("session management", () => {
    it("should detect expired session", () => {
      useAuthStore.setState({
        isAuthenticated: true,
        sessionExpiresAt: Date.now() - 1000,
      });
      expect(useAuthStore.getState().isSessionExpired()).toBe(true);
    });

    it("should detect valid session", () => {
      useAuthStore.setState({
        isAuthenticated: true,
        sessionExpiresAt: Date.now() + 1000,
      });
      expect(useAuthStore.getState().isSessionExpired()).toBe(false);
    });
  });
});

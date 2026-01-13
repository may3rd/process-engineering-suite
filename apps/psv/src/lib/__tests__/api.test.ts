import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { ApiClient } from "../api";

// Mock fetch globally
global.fetch = vi.fn();

describe("ApiClient", () => {
  let apiClient: ApiClient;
  let mockFetch: MockedFunction<typeof fetch>;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Reset mocks
    mockFetch = global.fetch as MockedFunction<typeof fetch>;
    mockFetch.mockReset();

    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    apiClient = new ApiClient();
  });

  describe("Network errors", () => {
    it("should throw error with custom message when fetch fails", async () => {
      const networkError = new Error("Network request failed");
      mockFetch.mockRejectedValue(networkError);

      await expect(apiClient["request"]("/test")).rejects.toThrow(
        "Failed to fetch http://localhost:8000/test. Check NEXT_PUBLIC_API_URL and that the API is reachable. (Network request failed)",
      );
    });

    it("should throw error with hint when fetch fails with unknown error", async () => {
      mockFetch.mockRejectedValue("Unknown error");

      await expect(apiClient["request"]("/test")).rejects.toThrow(
        "Failed to fetch http://localhost:8000/test. Check NEXT_PUBLIC_API_URL and that the API is reachable.",
      );
    });
  });

  describe("HTTP error responses", () => {
    it("should throw error with response body for 404 response", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue(null),
        text: vi.fn().mockResolvedValue("Not Found"),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient["request"]("/test")).rejects.toThrow("Not Found");
    });

    it("should throw error with response body for 500 response", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue(null),
        text: vi.fn().mockResolvedValue("Internal Server Error"),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient["request"]("/test")).rejects.toThrow(
        "Internal Server Error",
      );
    });

    it("should use JSON error detail when available", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ detail: "Invalid input" }),
        text: vi.fn().mockResolvedValue(""),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient["request"]("/test")).rejects.toThrow(
        "Invalid input",
      );
    });

    it("should throw HTTP status when JSON parsing fails", async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        text: vi.fn().mockResolvedValue("Forbidden"),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient["request"]("/test")).rejects.toThrow("HTTP 403");
    });

    it("should throw HTTP status when JSON has no detail", async () => {
      const mockResponse = {
        ok: false,
        status: 422,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ error: "Validation failed" }),
        text: vi.fn().mockResolvedValue(""),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient["request"]("/test")).rejects.toThrow("HTTP 422");
    });

    it("should use text error body for non-JSON content", async () => {
      const mockResponse = {
        ok: false,
        status: 422,
        headers: new Headers({ "content-type": "text/plain" }),
        json: vi.fn().mockResolvedValue(null),
        text: vi.fn().mockResolvedValue("Validation error"),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient["request"]("/test")).rejects.toThrow(
        "Validation error",
      );
    });
  });

  describe("JSON parsing errors", () => {
    it("should throw error when response.json() fails", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient["request"]("/test")).rejects.toThrow(
        "Invalid JSON",
      );
    });
  });

  describe("Token handling", () => {
    it("should not set Authorization header when no token", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ data: "test" }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient["request"]("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(mockFetch.mock.calls[0][1]?.headers).not.toHaveProperty(
        "Authorization",
      );
    });

    it("should set Authorization header when token is set", async () => {
      apiClient.setToken("test-token");

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ data: "test" }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient["request"]("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should load token from localStorage on initialization", () => {
      mockLocalStorage["accessToken"] = "stored-token";

      const newClient = new ApiClient();

      expect(newClient["token"]).toBe("stored-token");
    });

    it("should save token to localStorage when set", () => {
      apiClient.setToken("new-token");

      expect(mockLocalStorage["accessToken"]).toBe("new-token");
    });

    it("should remove token from localStorage when set to null", () => {
      mockLocalStorage["accessToken"] = "existing-token";
      apiClient.setToken(null);

      expect(mockLocalStorage["accessToken"]).toBeUndefined();
    });
  });

  describe("Successful requests", () => {
    it("should return parsed JSON for successful responses", async () => {
      const mockData = { id: 1, name: "test" };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue(mockData),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiClient["request"]("/test");

      expect(result).toEqual(mockData);
    });
  });
});

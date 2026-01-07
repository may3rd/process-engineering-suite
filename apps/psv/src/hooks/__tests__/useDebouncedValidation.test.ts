import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValidation } from "../useDebouncedValidation";

describe("useDebouncedValidation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should return null when validation passes immediately", () => {
    const validate = vi.fn((value: string) => null);
    const { result } = renderHook(() =>
      useDebouncedValidation("valid", validate, 100),
    );

    expect(result.current).toBeNull();
    expect(validate).toHaveBeenCalledWith("valid");
  });

  it("should return error immediately for synchronous validation failure", () => {
    const validate = vi.fn((value: string) => "Invalid input");
    const { result } = renderHook(() =>
      useDebouncedValidation("invalid", validate, 100),
    );

    expect(result.current).toBe("Invalid input");
    expect(validate).toHaveBeenCalledWith("invalid");
  });

  it("should debounce validation for initially valid inputs", () => {
    const validate = vi.fn((value: string) => null);
    const { result } = renderHook(() =>
      useDebouncedValidation("test", validate, 200),
    );

    expect(result.current).toBeNull();
    expect(validate).toHaveBeenCalledTimes(1);

    // Advance timers - debounced validation also runs even if immediate passed
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(validate).toHaveBeenCalledTimes(2); // Called once immediately, once after debounce
  });

  it("should clear previous timeout when value changes", () => {
    const validate = vi.fn((value: string) => null);
    const { rerender } = renderHook(
      ({ value }) => useDebouncedValidation(value, validate, 200),
      { initialProps: { value: "first" } },
    );

    expect(validate).toHaveBeenCalledTimes(1);

    // Change value quickly
    rerender({ value: "second" });
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it("should handle different value types", () => {
    const validateNumber = vi.fn((value: number) =>
      value < 0 ? "Must be positive" : null,
    );
    const { result } = renderHook(() =>
      useDebouncedValidation(5, validateNumber, 100),
    );

    expect(result.current).toBeNull();

    const { result: result2 } = renderHook(() =>
      useDebouncedValidation(-1, validateNumber, 100),
    );

    expect(result2.current).toBe("Must be positive");
  });
});

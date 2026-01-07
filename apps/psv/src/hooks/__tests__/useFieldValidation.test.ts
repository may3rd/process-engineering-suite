import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFieldValidation } from "../useFieldValidation";

describe("useFieldValidation", () => {
  it("should initialize with null value and untouched state", () => {
    const validate = vi.fn((value: string | number | null) => null);
    const { result } = renderHook(() => useFieldValidation(validate));

    expect(result.current.value).toBeNull();
    expect(result.current.touched).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isValid).toBe(true);
  });

  it("should not validate until field is touched", () => {
    const validate = vi.fn((value: string | number | null) => "Error");
    const { result } = renderHook(() => useFieldValidation(validate));

    // Set value without touching
    act(() => {
      result.current.setValue("test");
    });

    expect(result.current.value).toBe("test");
    expect(result.current.touched).toBe(false);
    expect(result.current.error).toBeNull(); // No validation yet
    expect(result.current.isValid).toBe(true);
    expect(validate).not.toHaveBeenCalled();
  });

  it("should validate after field is touched via onChange", () => {
    const validate = vi.fn((value: string | number | null) => "Invalid input");
    const { result } = renderHook(() => useFieldValidation(validate));

    act(() => {
      result.current.onChange("invalid");
    });

    expect(result.current.value).toBe("invalid");
    expect(result.current.touched).toBe(true);
    expect(result.current.error).toBe("Invalid input");
    expect(result.current.isValid).toBe(false);
    expect(validate).toHaveBeenCalledWith("invalid");
  });

  it("should return valid state when validation passes", () => {
    const validate = vi.fn((value: string | number | null) => null);
    const { result } = renderHook(() => useFieldValidation(validate));

    act(() => {
      result.current.onChange("valid");
    });

    expect(result.current.value).toBe("valid");
    expect(result.current.touched).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isValid).toBe(true);
    expect(validate).toHaveBeenCalledWith("valid");
  });

  it("should re-validate when value changes after being touched", () => {
    const validate = vi.fn((value: string | number | null) =>
      value === "invalid" ? "Error" : null,
    );
    const { result } = renderHook(() => useFieldValidation(validate));

    // First change
    act(() => {
      result.current.onChange("valid");
    });
    expect(result.current.error).toBeNull();
    expect(validate).toHaveBeenCalledTimes(1);

    // Second change
    act(() => {
      result.current.onChange("invalid");
    });
    expect(result.current.error).toBe("Error");
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it("should handle different value types", () => {
    const validate = vi.fn((value: string | number | null) => {
      if (typeof value === "number" && value < 0) return "Must be positive";
      return null;
    });
    const { result } = renderHook(() => useFieldValidation(validate));

    // Test string
    act(() => {
      result.current.onChange("test");
    });
    expect(result.current.error).toBeNull();

    // Test number
    act(() => {
      result.current.onChange(5);
    });
    expect(result.current.error).toBeNull();

    // Test invalid number
    act(() => {
      result.current.onChange(-1);
    });
    expect(result.current.error).toBe("Must be positive");
  });

  it("should handle null values", () => {
    const validate = vi.fn((value: string | number | null) =>
      value === null ? "Required" : null,
    );
    const { result } = renderHook(() => useFieldValidation(validate));

    act(() => {
      result.current.onChange(null);
    });

    expect(result.current.value).toBeNull();
    expect(result.current.error).toBe("Required");
    expect(result.current.isValid).toBe(false);
  });
});

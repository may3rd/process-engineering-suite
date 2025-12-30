import { useState, useEffect, useRef } from "react";

export function useDebouncedValidation<T>(
  value: T,
  validate: (value: T) => string | null,
  delay: number = 300,
) {
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const immediateError = validate(value);

    if (immediateError) {
      setError(immediateError);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      const debouncedError = validate(value);
      setError(debouncedError);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, validate, delay]);

  return error;
}

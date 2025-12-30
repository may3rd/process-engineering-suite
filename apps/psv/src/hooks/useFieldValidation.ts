import { useState, useCallback } from "react";

export function useFieldValidation(
  validate: (value: string | number | null) => string | null,
) {
  const [touched, setTouched] = useState(false);
  const [value, setValue] = useState<string | number | null>(null);

  const handleChange = useCallback((newValue: string | number | null) => {
    setValue(newValue);
    setTouched(true);
  }, []);

  const error = touched ? validate(value) : null;

  return {
    value,
    setValue,
    onChange: handleChange,
    error,
    touched,
    isValid: !error,
  };
}

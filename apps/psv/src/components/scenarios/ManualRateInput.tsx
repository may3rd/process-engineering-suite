import React, { useMemo } from "react";
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Stack,
  Alert,
} from "@mui/material";
import { UnitSelector } from "../shared/UnitSelector";
import {
  getPressureValidationError,
  getTemperatureValidationError,
  getPositiveNumberError,
} from "@/lib/physicsValidation";

interface ManualRateInputProps {
  input: {
    relievingRate: string;
    rateUnit: string;
    relievingTemp: string;
    tempUnit: string;
    relievingPressure: string;
    pressureUnit: string;
    basis: string;
  };
  onChange: (input: any) => void;
}

export function ManualRateInput({ input, onChange }: ManualRateInputProps) {
  const updateInput = (updates: Partial<typeof input>) => {
    onChange({ ...input, ...updates });
  };

  const rateErrorMessage = useMemo(
    () => getPositiveNumberError(input.relievingRate, "Relief rate"),
    [input.relievingRate],
  );

  const pressureErrorMessage = useMemo(
    () =>
      getPressureValidationError(
        input.relievingPressure,
        input.pressureUnit,
        "Relieving pressure",
      ),
    [input.relievingPressure, input.pressureUnit],
  );

  const temperatureErrorMessage = useMemo(
    () =>
      getTemperatureValidationError(
        input.relievingTemp,
        input.tempUnit,
        "Relieving temperature",
      ),
    [input.relievingTemp, input.tempUnit],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        ✏️ Manual Relief Rate Input
      </Typography>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Specify the relief rate directly if calculated externally or documented
        from previous studies. Include basis of calculation for reference.
      </Alert>

      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Relief Conditions
          </Typography>

          <Stack spacing={3}>
            <Box>
              <UnitSelector
                label="Relieving Rate"
                value={
                  input.relievingRate ? parseFloat(input.relievingRate) : null
                }
                unit={input.rateUnit}
                availableUnits={["kg/h", "lb/h", "kg/s", "ton/day"]}
                onChange={(val, unit) =>
                  updateInput({
                    relievingRate: val?.toString() ?? "",
                    rateUnit: unit,
                  })
                }
                error={!!rateErrorMessage}
                helperText={rateErrorMessage || ""}
                fullWidth
              />
            </Box>

            <Box>
              <UnitSelector
                label="Relieving Temperature"
                value={
                  input.relievingTemp ? parseFloat(input.relievingTemp) : null
                }
                unit={input.tempUnit}
                availableUnits={["C", "F", "K"]}
                onChange={(val, unit) =>
                  updateInput({
                    relievingTemp: val?.toString() ?? "",
                    tempUnit: unit,
                  })
                }
                error={!!temperatureErrorMessage}
                helperText={temperatureErrorMessage || ""}
                fullWidth
              />
            </Box>

            <Box>
              <UnitSelector
                label="Relieving Pressure"
                value={
                  input.relievingPressure
                    ? parseFloat(input.relievingPressure)
                    : null
                }
                unit={input.pressureUnit}
                availableUnits={["barg", "psig", "kPag", "bar", "psia"]}
                onChange={(val, unit) =>
                  updateInput({
                    relievingPressure: val?.toString() ?? "",
                    pressureUnit: unit,
                  })
                }
                error={!!pressureErrorMessage}
                helperText={
                  pressureErrorMessage || "Set pressure + accumulation"
                }
                fullWidth
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Basis of Calculation
          </Typography>

          <TextField
            fullWidth
            required
            multiline
            rows={6}
            label="Calculation Basis / Reference"
            value={input.basis}
            onChange={(e) => updateInput({ basis: e.target.value })}
            placeholder="Describe how this relief rate was determined (e.g., API-521 with F=0.3, wetted area 150m², previous vendor calculation, etc.)"
            error={input.basis.length < 20}
            helperText={
              input.basis.length < 20
                ? `Provide detailed basis (${input.basis.length}/20 min chars)`
                : "Include calculation method, assumptions, and references"
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
}

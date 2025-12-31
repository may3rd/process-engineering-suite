"use client";

import { FormControl, MenuItem, Select, Typography, Box } from "@mui/material";

interface ItemsPerPageSelectorProps {
    value: number;
    onChange: (value: number) => void;
}

const OPTIONS = [10, 15, 25, 50];

export function ItemsPerPageSelector({ value, onChange }: ItemsPerPageSelectorProps) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                Items per page:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 70 }}>
                <Select
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    sx={{
                        fontSize: "0.875rem",
                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "divider",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "primary.main",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "primary.main",
                        },
                    }}
                >
                    {OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}

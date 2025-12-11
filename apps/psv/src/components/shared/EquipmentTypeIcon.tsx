"use client";

import {
    LocalFireDepartment,
    Propane,
    WaterDrop,
    Settings,
    Water,
    Compress,
    Category,
} from "@mui/icons-material";
import { SvgIconProps } from "@mui/material";
import { EquipmentType } from "@/data/types";

interface EquipmentTypeIconProps extends SvgIconProps {
    type: EquipmentType;
}

export function EquipmentTypeIcon({ type, ...props }: EquipmentTypeIconProps) {
    const icons: Record<EquipmentType, typeof Settings> = {
        vessel: Propane,
        tank: Water,
        heat_exchanger: LocalFireDepartment,
        column: WaterDrop,
        reactor: LocalFireDepartment,
        pump: Settings,
        compressor: Compress,
        piping: Category,
        other: Category,
    };

    const Icon = icons[type] || Category;

    return <Icon {...props} />;
}

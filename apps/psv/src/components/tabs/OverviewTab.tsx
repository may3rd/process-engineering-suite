"use client";

import React from 'react';
import { Box } from "@mui/material";
import { usePsvStore } from "@/store/usePsvStore";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { BasicInfoCard } from "../BasicInfoCard";
import { OperatingConditionsCard } from "../OperatingConditionsCard";
import { EquipmentCard } from "../EquipmentCard";
import { TagsCard } from "../TagsCard";

export function OverviewTab() {
    const { selectedPsv } = usePsvStore();
    const { units } = useProjectUnitSystem(); // kept for potential future use if logic moves here

    if (!selectedPsv) return null;

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
                gap: 3,
                maxWidth: '100%',
                width: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Left Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <BasicInfoCard key={`basic-${selectedPsv.id}-${selectedPsv.version || 0}`} psv={selectedPsv} />
                <EquipmentCard key={`equip-${selectedPsv.id}-${selectedPsv.version || 0}`} psv={selectedPsv} />
            </Box>

            {/* Right Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <OperatingConditionsCard key={`ops-${selectedPsv.id}-${selectedPsv.version || 0}`} psv={selectedPsv} />
                <TagsCard key={`tags-${selectedPsv.id}-${selectedPsv.version || 0}`} psv={selectedPsv} />
            </Box>
        </Box>
    );
}

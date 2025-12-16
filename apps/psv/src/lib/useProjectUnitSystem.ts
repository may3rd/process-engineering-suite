import { useMemo } from "react";
import { usePsvStore } from "@/store/usePsvStore";
import { UnitSystem } from "@/data/types";
import { getProjectUnits } from "@/lib/projectUnits";

export function useProjectUnitSystem() {
    const selectedProject = usePsvStore((s) => s.selectedProject);
    const unitSystem: UnitSystem = selectedProject?.unitSystem || "metric";
    const units = useMemo(() => getProjectUnits(unitSystem), [unitSystem]);
    return { unitSystem, units };
}


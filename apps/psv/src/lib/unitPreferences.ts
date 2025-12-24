import { UnitPreferences, UnitSystem } from "@/data/types";

export function getDefaultUnitPreferences(unitSystem: UnitSystem): UnitPreferences {
    switch (unitSystem) {
        case "imperial":
            return {
                pressure: "psig",
                temperature: "F",
                flow: "lb/h",
                length: "ft",
                area: "in²",
                density: "lb/ft³",
                viscosity: "cP",
                backpressure: "psig",
            };
        case "metric_kgcm2":
            return {
                pressure: "kg/cm2g",
                temperature: "C",
                flow: "kg/h",
                length: "m",
                area: "mm²",
                density: "kg/m³",
                viscosity: "cP",
                backpressure: "kg/cm2g",
            };
        case "fieldSI":
            return {
                pressure: "kPag",
                temperature: "C",
                flow: "kg/h",
                length: "m",
                area: "mm²",
                density: "kg/m³",
                viscosity: "cP",
                backpressure: "kPag",
            };
        case "metric":
        default:
            return {
                pressure: "barg",
                temperature: "C",
                flow: "kg/h",
                length: "m",
                area: "mm²",
                density: "kg/m³",
                viscosity: "cP",
                backpressure: "barg",
            };
    }
}

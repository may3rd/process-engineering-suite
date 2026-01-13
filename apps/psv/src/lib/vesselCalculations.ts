import { API_BASE_URL } from '@/lib/api';

export type VesselOrientation = 'vertical' | 'horizontal' | 'spherical';
export type VesselHeadType = 'torispherical' | 'flat' | 'elliptical' | 'hemispherical' | 'conical';

export interface VesselCalculationInput {
    vesselType: 'vertical-torispherical' | 'vertical-flat' | 'vertical-elliptical' |
    'vertical-hemispherical' | 'vertical-conical' | 'horizontal-torispherical' |
    'horizontal-flat' | 'horizontal-elliptical' | 'horizontal-hemispherical' |
    'horizontal-conical' | 'spherical' | 'vertical-ellipsoidal' | 'horizontal-ellipsoidal';
    diameter: number;
    length: number;
    liquidLevel: number;
    headDistance?: number;
}

export interface VesselCalculationResult {
    wettedArea: number;
    liquidVolume: number;
    totalVolume: number;
    totalHeight: number;
    percentFull: number;
}

interface FireExposureResponse {
    wettedArea: number;
}

const normalizeVesselType = (vesselType: string): string =>
    vesselType.replace('ellipsoidal', 'elliptical');

const post = async <T>(path: string, payload: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export const calculateWettedArea = async (
    input: VesselCalculationInput
): Promise<VesselCalculationResult> => {
    const payload = {
        ...input,
        vesselType: normalizeVesselType(input.vesselType),
    };

    return post<VesselCalculationResult>('/vessels/wetted-area', payload);
};

export const calculateFireExposureArea = async (
    input: VesselCalculationInput,
    isProtected: boolean = false,
    maxHeightAboveGrade: number = 7.6,
    heightAboveGrade: number = 0
): Promise<number> => {
    const payload = {
        ...input,
        vesselType: normalizeVesselType(input.vesselType),
        isProtected,
        maxHeightAboveGrade,
        heightAboveGrade,
    };

    const response = await post<FireExposureResponse>('/vessels/fire-exposure', payload);
    return response.wettedArea;
};

export const quickWettedArea = async (
    diameter: number,
    length: number,
    liquidLevel: number
): Promise<number> => {
    const result = await calculateWettedArea({
        vesselType: 'vertical-torispherical',
        diameter,
        length,
        liquidLevel,
    });

    return result.wettedArea;
};

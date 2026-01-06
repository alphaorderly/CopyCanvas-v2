import { ExportOptions } from '../types/canvas';

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

export const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

export const buildFileName = (
    base: string,
    format: ExportOptions['format']
) => {
    const safeBase = base.trim() || 'canvas';
    return `${safeBase}.${format === 'jpg' ? 'jpeg' : format}`;
};

/**
 * Calculate stroke width based on pressure input with natural easing curve
 * @param baseWidth - Base stroke width
 * @param pressure - Pressure value from PointerEvent (0.0 to 1.0)
 * @param minScale - Minimum scale factor (default: 0.3 for 30% minimum)
 * @param maxScale - Maximum scale factor (default: 1.0 for 100% maximum)
 * @returns Calculated stroke width with quadratic easing
 */
export const calculatePressureWidth = (
    baseWidth: number,
    pressure: number,
    minScale: number = 0.3,
    maxScale: number = 1.0
): number => {
    // Clamp pressure between 0 and 1
    const clampedPressure = Math.max(0, Math.min(1, pressure));

    // Apply quadratic easing for more natural feel
    // This makes middle pressures more prominent
    const easedPressure = clampedPressure * clampedPressure;

    // Calculate final scale
    const scale = minScale + easedPressure * (maxScale - minScale);

    return baseWidth * scale;
};

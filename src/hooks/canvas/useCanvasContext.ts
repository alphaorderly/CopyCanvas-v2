import { useCallback, useEffect, useRef } from 'react';

type UseCanvasContextOptions = {
    width: number;
    height: number;
    strokeColor: string;
    strokeWidth: number;
    isEraser: boolean;
};

type UseCanvasContextReturn = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
    applyContextSettings: () => void;
};

/**
 * Manage canvas reference, context initialization, and styling configuration
 */
export const useCanvasContext = (
    options: UseCanvasContextOptions
): UseCanvasContextReturn => {
    const { width, height, strokeColor, strokeWidth, isEraser } = options;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    const applyContextSettings = useCallback(() => {
        if (!ctxRef.current) return;
        ctxRef.current.lineCap = 'round';
        ctxRef.current.lineJoin = 'round';
        ctxRef.current.lineWidth = strokeWidth;
        ctxRef.current.strokeStyle = isEraser ? '#000000' : strokeColor;
        ctxRef.current.globalCompositeOperation = isEraser
            ? 'destination-out'
            : 'source-over';
    }, [strokeWidth, strokeColor, isEraser]);

    // Initialize canvas and context - only on mount or when dimensions change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctxRef.current = ctx;
        applyContextSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    // Update context settings when drawing properties change
    useEffect(() => {
        applyContextSettings();
    }, [applyContextSettings]);

    return {
        canvasRef,
        ctxRef,
        applyContextSettings,
    };
};

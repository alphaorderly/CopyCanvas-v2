import { useCallback, useEffect } from 'react';
import { loadImage } from '../../utils/canvas';

type UseCanvasResizeOptions = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
    width: number;
    height: number;
    applyContextSettings: () => void;
};

type UseCanvasResizeReturn = {
    resizeAndMaintain: (nextWidth: number, nextHeight: number) => Promise<void>;
};

/**
 * Manage canvas resizing while preserving content
 */
export const useCanvasResize = (
    options: UseCanvasResizeOptions
): UseCanvasResizeReturn => {
    const { canvasRef, ctxRef, width, height, applyContextSettings } = options;

    const resizeAndMaintain = useCallback(
        async (nextWidth: number, nextHeight: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const snapshot = canvas.toDataURL('image/png');
            canvas.width = nextWidth;
            canvas.height = nextHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctxRef.current = ctx;
            applyContextSettings();

            if (snapshot) {
                const img = await loadImage(snapshot);
                ctx.drawImage(img, 0, 0, nextWidth, nextHeight);
            }
        },
        [canvasRef, ctxRef, applyContextSettings]
    );

    // Auto-resize when width/height props change
    useEffect(() => {
        resizeAndMaintain(width, height);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    return {
        resizeAndMaintain,
    };
};

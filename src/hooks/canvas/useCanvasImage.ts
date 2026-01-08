import { loadImage } from '../../utils/canvas';

type UseCanvasImageOptions = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
};

type UseCanvasImageReturn = {
    getDataUrl: () => string | null;
    loadFromDataUrl: (dataUrl: string | null) => Promise<void>;
    clear: () => Promise<void>;
};

/**
 * Manage canvas image operations (load, clear, export as data URL)
 */
export const useCanvasImage = (
    options: UseCanvasImageOptions
): UseCanvasImageReturn => {
    const { canvasRef, ctxRef } = options;

    const getDataUrl = (): string | null => {
        return canvasRef.current?.toDataURL('image/png') ?? null;
    };

    const loadFromDataUrl = async (dataUrl: string | null) => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!dataUrl) return;

        const img = await loadImage(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    const clear = async () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return {
        getDataUrl,
        loadFromDataUrl,
        clear,
    };
};

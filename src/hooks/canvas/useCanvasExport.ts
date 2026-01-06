import { ExportOptions } from '../../types/canvas';
import { buildFileName, downloadBlob } from '../../utils/canvas';

type UseCanvasExportOptions = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

type UseCanvasExportReturn = {
    exportImage: (options: ExportOptions) => Promise<void>;
    copyToClipboard: () => Promise<void>;
};

/**
 * Manage canvas export operations (download, clipboard)
 */
export const useCanvasExport = (
    options: UseCanvasExportOptions
): UseCanvasExportReturn => {
    const { canvasRef } = options;

    const exportImage = async (exportOptions: ExportOptions) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = Math.max(
            1,
            Math.round(exportOptions.scale * canvas.width)
        );
        exportCanvas.height = Math.max(
            1,
            Math.round(exportOptions.scale * canvas.height)
        );

        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        if (!exportOptions.transparent) {
            ctx.fillStyle = exportOptions.backgroundColor;
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }

        ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

        const type =
            exportOptions.format === 'jpg'
                ? 'image/jpeg'
                : `image/${exportOptions.format}`;
        const blob = await new Promise<Blob | null>((resolve) =>
            exportCanvas.toBlob(resolve, type)
        );

        if (!blob) return;
        downloadBlob(
            blob,
            buildFileName(exportOptions.filename, exportOptions.format)
        );
    };

    const copyToClipboard = async () => {
        const canvas = canvasRef.current;
        if (
            !canvas ||
            !navigator.clipboard ||
            typeof ClipboardItem === 'undefined'
        )
            return;

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
        );

        if (!blob) return;
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
        ]);
    };

    return {
        exportImage,
        copyToClipboard,
    };
};

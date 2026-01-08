import { useCallback, useRef } from 'react';
import {
    DrawObject,
    Point,
    ToolType,
    PressureSensitivityOptions,
} from '../../types/canvas';

type UseCanvasShapesOptions = {
    activeTool: ToolType;
    strokeColor: string;
    strokeWidth: number;
    getCanvasPoint: (clientX: number, clientY: number) => Point | null;
    startObject: (
        type: DrawObject['type'],
        point: Point,
        color: string,
        width: number,
        erase?: boolean,
        pressureOptions?: PressureSensitivityOptions
    ) => void;
    updateObject: (point: Point) => void;
    commitObject: () => void;
    getCurrentObject: () => DrawObject | null;
    onPointerStateChange?: (drawing: boolean) => void;
    overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
};

export const useCanvasShapes = ({
    activeTool,
    strokeColor,
    strokeWidth,
    getCanvasPoint,
    startObject,
    updateObject,
    commitObject,
    getCurrentObject,
    onPointerStateChange,
    overlayCanvasRef,
    ctxRef,
}: UseCanvasShapesOptions) => {
    const drawingRef = useRef(false);
    const shapeStartRef = useRef<Point | null>(null);

    const isShape =
        activeTool === 'line' ||
        activeTool === 'rectangle' ||
        activeTool === 'circle';

    const handlePointerDownShape = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!isShape) return;

            const point = getCanvasPoint(event.clientX, event.clientY);
            if (!point || !ctxRef.current) return;

            drawingRef.current = true;
            shapeStartRef.current = point;
            event.currentTarget.setPointerCapture(event.pointerId);

            startObject(
                activeTool as DrawObject['type'],
                point,
                strokeColor,
                strokeWidth
            );

            onPointerStateChange?.(true);
        },
        [
            isShape,
            getCanvasPoint,
            ctxRef,
            activeTool,
            startObject,
            strokeColor,
            strokeWidth,
            onPointerStateChange,
        ]
    );

    const handlePointerMoveShape = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawingRef.current || !isShape || !shapeStartRef.current)
                return;

            const point = getCanvasPoint(event.clientX, event.clientY);
            if (!point) return;

            updateObject(point);

            // Draw preview on overlay canvas
            const overlayCanvas = overlayCanvasRef.current;
            if (!overlayCanvas) return;

            const overlayCtx = overlayCanvas.getContext('2d');
            if (!overlayCtx) return;

            // Clear overlay
            overlayCtx.clearRect(
                0,
                0,
                overlayCanvas.width,
                overlayCanvas.height
            );

            // Draw current object preview
            const currentObj = getCurrentObject();
            if (!currentObj) return;

            overlayCtx.strokeStyle = strokeColor;
            overlayCtx.fillStyle = strokeColor;
            overlayCtx.lineWidth = strokeWidth;
            overlayCtx.lineCap = 'round';
            overlayCtx.lineJoin = 'round';

            const start = shapeStartRef.current;

            if (activeTool === 'line') {
                overlayCtx.beginPath();
                overlayCtx.moveTo(start.x, start.y);
                overlayCtx.lineTo(point.x, point.y);
                overlayCtx.stroke();
            } else if (activeTool === 'rectangle') {
                const x = Math.min(start.x, point.x);
                const y = Math.min(start.y, point.y);
                const w = Math.abs(point.x - start.x);
                const h = Math.abs(point.y - start.y);
                overlayCtx.beginPath();
                overlayCtx.rect(x, y, w, h);
                overlayCtx.stroke();
            } else if (activeTool === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(point.x - start.x, 2) +
                        Math.pow(point.y - start.y, 2)
                );
                overlayCtx.beginPath();
                overlayCtx.arc(start.x, start.y, radius, 0, Math.PI * 2);
                overlayCtx.stroke();
            }
        },
        [
            drawingRef,
            isShape,
            shapeStartRef,
            getCanvasPoint,
            updateObject,
            overlayCanvasRef,
            getCurrentObject,
            strokeColor,
            strokeWidth,
            activeTool,
        ]
    );

    const handlePointerUpShape = useCallback(() => {
        if (!drawingRef.current || !isShape) return;

        drawingRef.current = false;
        shapeStartRef.current = null;

        // Commit the object to the objects array
        commitObject();

        // Clear overlay
        const overlayCanvas = overlayCanvasRef.current;
        if (overlayCanvas) {
            const overlayCtx = overlayCanvas.getContext('2d');
            overlayCtx?.clearRect(
                0,
                0,
                overlayCanvas.width,
                overlayCanvas.height
            );
        }

        onPointerStateChange?.(false);
    }, [
        drawingRef,
        isShape,
        commitObject,
        overlayCanvasRef,
        onPointerStateChange,
    ]);

    return {
        handlePointerDownShape,
        handlePointerMoveShape,
        handlePointerUpShape,
    };
};

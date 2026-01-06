import { forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import {
    CanvasHandle,
    DrawObject,
    PressureSensitivityOptions,
    ToolType,
    Point,
} from '../types/canvas';
import { useCanvasContext } from '../hooks/canvas/useCanvasContext';
import { useCanvasDrawing } from '../hooks/canvas/useCanvasDrawing';
import { useCanvasImage } from '../hooks/canvas/useCanvasImage';
import { useCanvasExport } from '../hooks/canvas/useCanvasExport';
import { useCanvasResize } from '../hooks/canvas/useCanvasResize';
import { useCanvasCursor } from '../hooks/canvas/useCanvasCursor';
import { useCanvasObjects } from '../hooks/canvas/useCanvasObjects';

type Props = {
    width: number;
    height: number;
    strokeColor: string;
    strokeWidth: number;
    activeTool: ToolType;
    backgroundColor: string;
    transparent: boolean;
    onCommit?: (dataUrl: string) => void;
    onPointerStateChange?: (drawing: boolean) => void;
    pressureSensitivity?: PressureSensitivityOptions;
};

const CanvasBoard = forwardRef<CanvasHandle, Props>((props, ref) => {
    const {
        width,
        height,
        strokeColor,
        strokeWidth,
        activeTool,
        backgroundColor,
        transparent,
        onCommit,
        onPointerStateChange,
        pressureSensitivity = { enabled: true, minScale: 0.3, maxScale: 1.0 },
    } = props;

    const isEraser = activeTool.startsWith('eraser');
    const isShape =
        activeTool === 'line' ||
        activeTool === 'rectangle' ||
        activeTool === 'circle';
    const drawingRef = useRef(false);
    const shapeStartRef = useRef<Point | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    // Initialize canvas context and styling
    const { canvasRef, ctxRef, applyContextSettings } = useCanvasContext({
        width,
        height,
        strokeColor,
        strokeWidth,
        isEraser,
    });

    // Object management for object-based erasing
    const {
        startObject,
        updateObject,
        commitObject,
        removeObjectById,
        findObjectAt,
        renderObjects,
        clearObjects,
        getCurrentObject,
    } = useCanvasObjects();

    const getCanvasPoint = useCallback(
        (clientX: number, clientY: number): Point | null => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY,
            };
        },
        [canvasRef]
    );

    const commitSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        onCommit?.(dataUrl);
    }, [canvasRef, onCommit]);

    // Custom pointer handlers for shapes and object erasing
    const handlePointerDownCustom = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const point = getCanvasPoint(event.clientX, event.clientY);
            if (!point || !ctxRef.current) return;

            drawingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);

            if (activeTool === 'eraser-object') {
                const objectToRemove = findObjectAt(point);
                if (objectToRemove) {
                    removeObjectById(objectToRemove.id);
                    // Redraw canvas
                    const ctx = ctxRef.current;
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    renderObjects(ctx, false);
                    commitSnapshot();
                }
                drawingRef.current = false;
            } else if (isShape) {
                shapeStartRef.current = point;
                startObject(
                    activeTool as DrawObject['type'],
                    point,
                    strokeColor,
                    strokeWidth
                );
            }

            onPointerStateChange?.(true);
        },
        [
            activeTool,
            getCanvasPoint,
            ctxRef,
            findObjectAt,
            removeObjectById,
            renderObjects,
            commitSnapshot,
            onPointerStateChange,
            isShape,
            startObject,
            strokeColor,
            strokeWidth,
        ]
    );

    const handlePointerMoveCustom = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawingRef.current || !isShape || !shapeStartRef.current)
                return;

            const point = getCanvasPoint(event.clientX, event.clientY);
            if (!point) return;

            updateObject(point);

            // Draw preview on overlay canvas
            const overlayCanvas = overlayCanvasRef.current;
            const mainCanvas = canvasRef.current;
            if (!overlayCanvas || !mainCanvas) return;

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
            isShape,
            getCanvasPoint,
            updateObject,
            getCurrentObject,
            activeTool,
            strokeColor,
            strokeWidth,
            canvasRef,
        ]
    );

    const handlePointerUpCustom = useCallback(() => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        shapeStartRef.current = null;

        if (isShape) {
            // Get the current object before committing
            const currentObj = getCurrentObject();

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

            // Draw the completed shape directly on the main canvas (without clearing it)
            const ctx = ctxRef.current;
            if (ctx && currentObj && currentObj.points.length >= 2) {
                ctx.strokeStyle = currentObj.color;
                ctx.fillStyle = currentObj.color;
                ctx.lineWidth = currentObj.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const [p1, p2] = currentObj.points;

                if (currentObj.type === 'line') {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                } else if (currentObj.type === 'rectangle') {
                    const x = Math.min(p1.x, p2.x);
                    const y = Math.min(p1.y, p2.y);
                    const w = Math.abs(p2.x - p1.x);
                    const h = Math.abs(p2.y - p1.y);
                    ctx.beginPath();
                    ctx.rect(x, y, w, h);
                    if (currentObj.fill) {
                        ctx.fill();
                    }
                    ctx.stroke();
                } else if (currentObj.type === 'circle') {
                    const radius = Math.sqrt(
                        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
                    );
                    ctx.beginPath();
                    ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
                    if (currentObj.fill) {
                        ctx.fill();
                    }
                    ctx.stroke();
                }

                commitSnapshot();
            }
        }

        onPointerStateChange?.(false);
    }, [
        isShape,
        getCurrentObject,
        commitObject,
        commitSnapshot,
        onPointerStateChange,
        ctxRef,
    ]);

    // Handle drawing operations with pressure sensitivity (for brush and normal eraser)
    const { handlePointerDown, handlePointerMove, handlePointerUp } =
        useCanvasDrawing({
            canvasRef,
            ctxRef,
            strokeWidth,
            isEraser,
            onCommit,
            onPointerStateChange,
            pressureSensitivity,
        });

    // Determine which handlers to use
    const pointerDownHandler =
        activeTool === 'eraser-object' || isShape
            ? handlePointerDownCustom
            : handlePointerDown;
    const pointerMoveHandler = isShape
        ? handlePointerMoveCustom
        : handlePointerMove;
    const pointerUpHandler =
        activeTool === 'eraser-object' || isShape
            ? handlePointerUpCustom
            : handlePointerUp;

    // Handle image loading and clearing
    const { getDataUrl, loadFromDataUrl, clear } = useCanvasImage({
        canvasRef,
        ctxRef,
        onCommit,
    });

    // Handle export operations
    const { exportImage, copyToClipboard } = useCanvasExport({
        canvasRef,
    });

    // Handle canvas resizing
    const { resizeAndMaintain } = useCanvasResize({
        canvasRef,
        ctxRef,
        width,
        height,
        applyContextSettings,
    });

    // Handle cursor preview
    const {
        cursorState,
        handleCursorMove,
        handleCursorEnter,
        handleCursorLeave,
    } = useCanvasCursor({
        canvasRef,
        strokeWidth,
        pressureSensitivity,
    });

    // Expose imperative handle methods
    useImperativeHandle(ref, () => ({
        getDataUrl,
        loadFromDataUrl: async (dataUrl: string | null) => {
            clearObjects();
            await loadFromDataUrl(dataUrl);
        },
        exportImage,
        copyToClipboard,
        resizeAndMaintain,
        clear: async () => {
            clearObjects();
            await clear();
        },
    }));

    return (
        <div className="relative h-full w-full">
            <canvas
                ref={canvasRef}
                className="h-full w-full cursor-none touch-none rounded-xl shadow-sm"
                style={{
                    backgroundColor: transparent
                        ? 'transparent'
                        : backgroundColor,
                }}
                onPointerDown={pointerDownHandler}
                onPointerMove={(e) => {
                    pointerMoveHandler(e);
                    handleCursorMove(e);
                }}
                onPointerUp={pointerUpHandler}
                onPointerEnter={handleCursorEnter}
                onPointerLeave={handleCursorLeave}
            />
            {/* Overlay canvas for shape preview */}
            <canvas
                ref={overlayCanvasRef}
                width={width}
                height={height}
                className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-xl"
                style={{ opacity: 0.8 }}
            />
            {cursorState.visible && (
                <div
                    className="pointer-events-none absolute rounded-full transition-opacity"
                    style={{
                        left: cursorState.x,
                        top: cursorState.y,
                        width: cursorState.radius * 2,
                        height: cursorState.radius * 2,
                        transform: 'translate(-50%, -50%)',
                        border: isEraser
                            ? '2px dashed rgba(239, 68, 68, 0.8)'
                            : activeTool === 'brush'
                              ? '2px solid rgba(37, 99, 235, 0.8)'
                              : '2px solid rgba(16, 185, 129, 0.8)',
                        opacity: 0.7,
                    }}
                />
            )}
        </div>
    );
});

CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard;

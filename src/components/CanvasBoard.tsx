import {
    forwardRef,
    useImperativeHandle,
    useCallback,
    useRef,
    useEffect,
} from 'react';
import {
    CanvasHandle,
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
import { useCanvasShapes } from '../hooks/canvas/useCanvasShapes';

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
    const drawingRef = useRef(false);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    // Initialize canvas context and styling
    const { canvasRef, ctxRef, applyContextSettings } = useCanvasContext({
        width,
        height,
        strokeColor,
        strokeWidth,
        isEraser,
    });

    // Object management
    const {
        objects,
        startObject,
        updateObject,
        commitObject,
        removeObjectById,
        findObjectAt,
        renderObjects,
        clearObjects,
        getCurrentObject,
        serializeObjects,
        deserializeObjects,
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

    const onCommitRef = useRef(onCommit);

    useEffect(() => {
        onCommitRef.current = onCommit;
    }, [onCommit]);

    const commitSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        onCommitRef.current?.(dataUrl);
    }, [canvasRef]);

    // Redraw canvas when objects change
    useEffect(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        renderObjects(ctx, false);

        // Only commit snapshot when not actively drawing (e.g. at the end of a stroke)
        // or when objects are changed programmatically (undo/redo).
        if (!drawingRef.current) {
            commitSnapshot();
        }
    }, [objects, renderObjects, commitSnapshot, ctxRef]);

    // Shape handling
    const {
        handlePointerDownShape,
        handlePointerMoveShape,
        handlePointerUpShape,
    } = useCanvasShapes({
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
    });

    // Object Eraser Handler
    const eraseObjectAtPoint = useCallback(
        (point: Point) => {
            const objectToRemove = findObjectAt(point);
            if (objectToRemove) {
                removeObjectById(objectToRemove.id);
            }
        },
        [findObjectAt, removeObjectById]
    );

    const handlePointerDownEraserObject = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const point = getCanvasPoint(event.clientX, event.clientY);
            if (!point) return;

            drawingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            eraseObjectAtPoint(point);
        },
        [getCanvasPoint, eraseObjectAtPoint]
    );

    const handlePointerMoveEraserObject = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawingRef.current) return;

            const point = getCanvasPoint(event.clientX, event.clientY);
            if (!point) return;

            eraseObjectAtPoint(point);
        },
        [getCanvasPoint, eraseObjectAtPoint]
    );

    // Drawing handlers (Freehand & Normal Eraser)
    const { handlePointerDown, handlePointerMove, handlePointerUp } =
        useCanvasDrawing({
            canvasRef,
            ctxRef,
            strokeWidth,
            isEraser,
            onPointerStateChange,
            pressureSensitivity,
            strokeColor,
            onStartStroke: startObject,
            onUpdateStroke: updateObject,
            onCommitStroke: commitObject,
        });

    // Unified Event Routing
    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (activeTool === 'eraser-object') {
            handlePointerDownEraserObject(e);
        } else if (['line', 'rectangle', 'circle'].includes(activeTool)) {
            handlePointerDownShape(e);
        } else {
            handlePointerDown(e);
        }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (activeTool === 'eraser-object') {
            handlePointerMoveEraserObject(e);
        } else if (['line', 'rectangle', 'circle'].includes(activeTool)) {
            handlePointerMoveShape(e);
        } else {
            handlePointerMove(e);
        }
        // Cursor handling is separate
    };

    const onPointerUp = () => {
        drawingRef.current = false;

        if (['line', 'rectangle', 'circle'].includes(activeTool)) {
            handlePointerUpShape();
        } else if (activeTool === 'eraser-object') {
            commitSnapshot();
        } else {
            handlePointerUp(); // This handles commitment for brush/eraser-normal
        }
    };

    // Handle image loading and clearing
    const {
        getDataUrl,
        loadFromDataUrl: loadPixels,
        clear: clearPixels,
    } = useCanvasImage({
        canvasRef,
        ctxRef,
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
        getDataUrl: () => {
            return {
                dataUrl: getDataUrl(),
                objects: serializeObjects(),
            };
        },
        loadFromDataUrl: async (
            dataUrl: string | null,
            objectsJson?: string
        ) => {
            if (objectsJson) {
                // If we have vector data, prefer it for source of truth
                deserializeObjects(objectsJson);
                // Note: deserializeObjects sets state, which triggers useEffect -> renderObjects
                // We do NOT load pixels if we have objects, to prevent "ghost objects"
            } else if (dataUrl) {
                // Fallback: Only pixels available (legacy data)
                clearObjects();
                await loadPixels(dataUrl);
            } else {
                clearObjects();
                await clearPixels();
            }
        },
        exportImage,
        copyToClipboard,
        resizeAndMaintain,
        clear: async () => {
            clearObjects();
            await clearPixels();
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
                onPointerDown={onPointerDown}
                onPointerMove={(e) => {
                    onPointerMove(e);
                    handleCursorMove(e);
                }}
                onPointerUp={onPointerUp}
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

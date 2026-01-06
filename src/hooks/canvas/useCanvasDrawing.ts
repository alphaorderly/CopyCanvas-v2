import { useCallback, useEffect, useRef } from 'react';
import { calculatePressureWidth } from '../../utils/canvas';
import { PressureSensitivityOptions } from '../../types/canvas';

type UseCanvasDrawingOptions = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
    strokeWidth: number;
    isEraser: boolean;
    onCommit?: (dataUrl: string) => void;
    onPointerStateChange?: (drawing: boolean) => void;
    pressureSensitivity?: PressureSensitivityOptions;
};

type UseCanvasDrawingReturn = {
    handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    handlePointerUp: () => void;
};

/**
 * Manage drawing operations with pressure sensitivity support
 */
export const useCanvasDrawing = (
    options: UseCanvasDrawingOptions
): UseCanvasDrawingReturn => {
    const {
        canvasRef,
        ctxRef,
        strokeWidth,
        isEraser,
        onCommit,
        onPointerStateChange,
        pressureSensitivity = { enabled: true, minScale: 0.3, maxScale: 1.0 },
    } = options;

    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const prevPointRef = useRef<{ x: number; y: number } | null>(null);

    const getCanvasPoint = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const commitSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        onCommit?.(dataUrl);
    }, [canvasRef, onCommit]);

    const handlePointerDown = (
        event: React.PointerEvent<HTMLCanvasElement>
    ) => {
        const point = getCanvasPoint(event.clientX, event.clientY);
        if (!point || !ctxRef.current) return;

        drawingRef.current = true;
        lastPointRef.current = point;
        prevPointRef.current = null;

        // Draw a single dot for the initial point
        const ctx = ctxRef.current;
        ctx.beginPath();
        ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();

        onPointerStateChange?.(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (
        event: React.PointerEvent<HTMLCanvasElement>
    ) => {
        if (!drawingRef.current || !ctxRef.current) return;

        const ctx = ctxRef.current;

        // Get coalesced events for higher frequency sampling
        const events =
            'getCoalescedEvents' in event.nativeEvent
                ? event.nativeEvent.getCoalescedEvents()
                : [event.nativeEvent];

        for (const evt of events) {
            const pointerEvt = evt as PointerEvent;
            const point = getCanvasPoint(
                pointerEvt.clientX,
                pointerEvt.clientY
            );
            if (!point || !lastPointRef.current) continue;

            // Apply pressure sensitivity for pen/stylus input (but not for eraser)
            if (
                !isEraser &&
                pressureSensitivity.enabled &&
                pointerEvt.pointerType === 'pen' &&
                pointerEvt.pressure > 0
            ) {
                const pressureWidth = calculatePressureWidth(
                    strokeWidth,
                    pointerEvt.pressure,
                    pressureSensitivity.minScale,
                    pressureSensitivity.maxScale
                );
                ctx.lineWidth = pressureWidth;
            } else {
                // Use base stroke width for mouse/touch or eraser
                ctx.lineWidth = strokeWidth;
            }

            // Draw smooth curves using quadratic bezier
            if (prevPointRef.current) {
                // Calculate control point as the midpoint between previous and last point
                const controlX =
                    (prevPointRef.current.x + lastPointRef.current.x) / 2;
                const controlY =
                    (prevPointRef.current.y + lastPointRef.current.y) / 2;

                ctx.beginPath();
                ctx.moveTo(controlX, controlY);
                ctx.quadraticCurveTo(
                    lastPointRef.current.x,
                    lastPointRef.current.y,
                    (lastPointRef.current.x + point.x) / 2,
                    (lastPointRef.current.y + point.y) / 2
                );
                ctx.stroke();
            } else {
                // First move after pointer down - draw a line
                ctx.beginPath();
                ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }

            prevPointRef.current = lastPointRef.current;
            lastPointRef.current = point;
        }
    };

    const handlePointerUp = useCallback(() => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        lastPointRef.current = null;
        prevPointRef.current = null;
        onPointerStateChange?.(false);
        commitSnapshot();
    }, [onPointerStateChange, commitSnapshot]);

    // Global pointer up/cancel listeners
    useEffect(() => {
        const handleGlobalPointerUp = () => handlePointerUp();
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
        return () => {
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
        };
    }, [handlePointerUp]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    };
};

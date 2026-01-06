import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { calculatePressureWidth } from '../../utils/canvas';
import { PressureSensitivityOptions } from '../../types/canvas';

type UseCanvasCursorOptions = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    strokeWidth: number;
    pressureSensitivity?: PressureSensitivityOptions;
};

type CursorState = {
    x: number;
    y: number;
    radius: number;
    visible: boolean;
};

type UseCanvasCursorReturn = {
    cursorState: CursorState;
    handleCursorMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    handleCursorEnter: () => void;
    handleCursorLeave: () => void;
};

/**
 * Manage cursor preview with pressure sensitivity and performance optimization
 */
export const useCanvasCursor = (
    options: UseCanvasCursorOptions
): UseCanvasCursorReturn => {
    const {
        canvasRef,
        strokeWidth,
        pressureSensitivity = { enabled: true, minScale: 0.3, maxScale: 1.0 },
    } = options;

    const initialRadius = strokeWidth / 2;
    const [cursorState, setCursorState] = useState<CursorState>({
        x: 0,
        y: 0,
        radius: initialRadius,
        visible: false,
    });

    const rafRef = useRef<number>(0);
    const pendingUpdateRef = useRef<{
        clientX: number;
        clientY: number;
        pressure: number;
        pointerType: string;
    } | null>(null);

    // Update radius synchronously when strokeWidth changes
    useLayoutEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCursorState((prev) => ({
            ...prev,
            radius: strokeWidth / 2,
        }));
    }, [strokeWidth]);

    const updateCursorPosition = useCallback(() => {
        if (!pendingUpdateRef.current || !canvasRef.current) {
            rafRef.current = 0;
            return;
        }

        const { clientX, clientY, pressure, pointerType } =
            pendingUpdateRef.current;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Calculate radius based on pressure for pen input
        let radius = strokeWidth / 2;
        if (
            pressureSensitivity.enabled &&
            pointerType === 'pen' &&
            pressure > 0
        ) {
            const pressureWidth = calculatePressureWidth(
                strokeWidth,
                pressure,
                pressureSensitivity.minScale,
                pressureSensitivity.maxScale
            );
            radius = pressureWidth / 2;
        }

        setCursorState((prev) => ({
            ...prev,
            x,
            y,
            radius,
        }));

        pendingUpdateRef.current = null;
        rafRef.current = 0;
    }, [canvasRef, strokeWidth, pressureSensitivity]);

    const handleCursorMove = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            pendingUpdateRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
                pressure: event.pressure,
                pointerType: event.pointerType,
            };

            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(updateCursorPosition);
            }
        },
        [updateCursorPosition]
    );

    const handleCursorEnter = useCallback(() => {
        setCursorState((prev) => ({ ...prev, visible: true }));
    }, []);

    const handleCursorLeave = useCallback(() => {
        setCursorState((prev) => ({ ...prev, visible: false }));
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        }
        pendingUpdateRef.current = null;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return {
        cursorState,
        handleCursorMove,
        handleCursorEnter,
        handleCursorLeave,
    };
};

import { useCallback, useRef, useState } from 'react';
import type {
    DrawObject,
    Point,
    PressureSensitivityOptions,
} from '../../types/canvas';
import { calculatePressureWidth } from '../../utils/canvas';

export const useCanvasObjects = () => {
    const [objects, setObjects] = useState<DrawObject[]>([]);
    const currentObjectRef = useRef<DrawObject | null>(null);

    const startObject = useCallback(
        (
            type: DrawObject['type'],
            point: Point,
            color: string,
            width: number,
            erase: boolean = false,
            pressureOptions?: PressureSensitivityOptions
        ) => {
            const newObject: DrawObject = {
                id: crypto.randomUUID(),
                type,
                points: [point],
                color,
                width,
                fill: false,
                erase,
                pressureOptions,
            };
            currentObjectRef.current = newObject;
        },
        []
    );

    const updateObject = useCallback((point: Point) => {
        if (!currentObjectRef.current) return;

        if (currentObjectRef.current.type === 'stroke') {
            currentObjectRef.current.points.push(point);
        } else {
            // For shapes, only keep start and current point
            currentObjectRef.current.points = [
                currentObjectRef.current.points[0],
                point,
            ];
        }
    }, []);

    const commitObject = useCallback(() => {
        const objectToCommit = currentObjectRef.current;
        if (!objectToCommit) return;

        setObjects((prev) => {
            const newObjects = [...prev, objectToCommit];
            return newObjects;
        });
        currentObjectRef.current = null;
    }, []);

    const cancelObject = useCallback(() => {
        currentObjectRef.current = null;
    }, []);

    const removeObjectById = useCallback((id: string) => {
        setObjects((prev) => prev.filter((obj) => obj.id !== id));
    }, []);

    const findObjectAt = useCallback(
        (point: Point): DrawObject | null => {
            // Search in reverse order (top to bottom)
            for (let i = objects.length - 1; i >= 0; i--) {
                const obj = objects[i];

                if (obj.type === 'stroke') {
                    // Check if point is near any stroke segment
                    for (let j = 0; j < obj.points.length - 1; j++) {
                        const p1 = obj.points[j];
                        const p2 = obj.points[j + 1];
                        if (isPointNearLine(point, p1, p2, obj.width / 2 + 5)) {
                            return obj;
                        }
                    }
                } else if (obj.type === 'line' && obj.points.length === 2) {
                    const [p1, p2] = obj.points;
                    if (isPointNearLine(point, p1, p2, obj.width / 2 + 5)) {
                        return obj;
                    }
                } else if (
                    obj.type === 'rectangle' &&
                    obj.points.length === 2
                ) {
                    const [p1, p2] = obj.points;
                    const x = Math.min(p1.x, p2.x);
                    const y = Math.min(p1.y, p2.y);
                    const w = Math.abs(p2.x - p1.x);
                    const h = Math.abs(p2.y - p1.y);

                    if (
                        point.x >= x &&
                        point.x <= x + w &&
                        point.y >= y &&
                        point.y <= y + h
                    ) {
                        return obj;
                    }
                } else if (obj.type === 'circle' && obj.points.length === 2) {
                    const [center, edge] = obj.points;
                    const radius = Math.sqrt(
                        Math.pow(edge.x - center.x, 2) +
                            Math.pow(edge.y - center.y, 2)
                    );
                    const distance = Math.sqrt(
                        Math.pow(point.x - center.x, 2) +
                            Math.pow(point.y - center.y, 2)
                    );

                    if (distance <= radius) {
                        return obj;
                    }
                }
            }

            return null;
        },
        [objects]
    );

    const renderObjects = useCallback(
        (ctx: CanvasRenderingContext2D, includePreview: boolean = false) => {
            ctx.save();
            const objectsToRender =
                includePreview && currentObjectRef.current
                    ? [...objects, currentObjectRef.current]
                    : objects;

            objectsToRender.forEach((obj) => {
                if (!obj) return;
                ctx.globalCompositeOperation = obj.erase
                    ? 'destination-out'
                    : 'source-over';
                ctx.strokeStyle = obj.erase ? '#000000' : obj.color;
                ctx.fillStyle = obj.erase ? '#000000' : obj.color;
                ctx.lineWidth = obj.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (obj.type === 'stroke') {
                    if (obj.points.length < 2) return;

                    const options = obj.pressureOptions;
                    const isPressureEnabled = options?.enabled;

                    // If it's a simple dot
                    if (obj.points.length === 1) {
                        const p = obj.points[0];
                        const pressure = p.pressure ?? 0.5;
                        const w = isPressureEnabled
                            ? calculatePressureWidth(
                                  obj.width,
                                  pressure,
                                  options.minScale,
                                  options.maxScale
                              )
                            : obj.width;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
                        ctx.fill();
                        return;
                    }

                    // For continuous stroke
                    let prevX = obj.points[0].x;
                    let prevY = obj.points[0].y;

                    for (let i = 1; i < obj.points.length - 1; i++) {
                        const curr = obj.points[i];
                        const next = obj.points[i + 1];
                        const xc = (curr.x + next.x) / 2;
                        const yc = (curr.y + next.y) / 2;

                        const pressure = curr.pressure ?? 0.5;
                        ctx.lineWidth = isPressureEnabled
                            ? calculatePressureWidth(
                                  obj.width,
                                  pressure,
                                  options.minScale,
                                  options.maxScale
                              )
                            : obj.width;

                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        ctx.quadraticCurveTo(curr.x, curr.y, xc, yc);
                        ctx.stroke();

                        prevX = xc;
                        prevY = yc;
                    }

                    const last = obj.points[obj.points.length - 1];
                    const lastPressure = last.pressure ?? 0.5;
                    ctx.lineWidth = isPressureEnabled
                        ? calculatePressureWidth(
                              obj.width,
                              lastPressure,
                              options.minScale,
                              options.maxScale
                          )
                        : obj.width;

                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(last.x, last.y);
                    ctx.stroke();
                } else if (obj.type === 'line' && obj.points.length >= 2) {
                    const [p1, p2] = obj.points;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                } else if (obj.type === 'rectangle' && obj.points.length >= 2) {
                    const [p1, p2] = obj.points;
                    const x = Math.min(p1.x, p2.x);
                    const y = Math.min(p1.y, p2.y);
                    const w = Math.abs(p2.x - p1.x);
                    const h = Math.abs(p2.y - p1.y);

                    ctx.beginPath();
                    ctx.rect(x, y, w, h);
                    if (obj.fill) {
                        ctx.fill();
                    }
                    ctx.stroke();
                } else if (obj.type === 'circle' && obj.points.length >= 2) {
                    const [center, edge] = obj.points;
                    const radius = Math.sqrt(
                        Math.pow(edge.x - center.x, 2) +
                            Math.pow(edge.y - center.y, 2)
                    );

                    ctx.beginPath();
                    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
                    if (obj.fill) {
                        ctx.fill();
                    }
                    ctx.stroke();
                }
            });
            ctx.restore();
        },
        [objects]
    );

    const clearObjects = useCallback(() => {
        setObjects([]);
        currentObjectRef.current = null;
    }, []);

    const getCurrentObject = useCallback(() => currentObjectRef.current, []);

    const serializeObjects = useCallback((): string => {
        return JSON.stringify(objects);
    }, [objects]);

    const deserializeObjects = useCallback((json: string) => {
        try {
            const parsed = JSON.parse(json) as DrawObject[];
            setObjects(parsed);
        } catch {
            setObjects([]);
        }
    }, []);

    const setObjectsDirectly = useCallback((newObjects: DrawObject[]) => {
        setObjects(newObjects);
    }, []);

    return {
        objects,
        startObject,
        updateObject,
        commitObject,
        cancelObject,
        removeObjectById,
        findObjectAt,
        renderObjects,
        clearObjects,
        getCurrentObject,
        serializeObjects,
        deserializeObjects,
        setObjectsDirectly,
    };
};

// Helper function to check if a point is near a line segment
function isPointNearLine(
    point: Point,
    lineStart: Point,
    lineEnd: Point,
    threshold: number
): boolean {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= threshold;
}

export type ToolType =
    | 'brush'
    | 'eraser-normal'
    | 'eraser-object'
    | 'line'
    | 'rectangle'
    | 'circle';

export type EraserMode = 'normal' | 'object';

export type Point = {
    x: number;
    y: number;
    pressure?: number;
};

export type DrawObject = {
    id: string;
    type: 'stroke' | 'line' | 'rectangle' | 'circle';
    points: Point[];
    color: string;
    width: number;
    fill?: boolean;
    erase?: boolean;
};

export type Page = {
    id: string;
    name: string;
    dataUrl: string | null;
};

export type ExportOptions = {
    format: 'png' | 'jpg' | 'webp';
    scale: number;
    backgroundColor: string;
    transparent: boolean;
    filename: string;
};

export type CanvasHandle = {
    getDataUrl: () => { dataUrl: string | null; objects: string };
    loadFromDataUrl: (
        dataUrl: string | null,
        objects?: string
    ) => Promise<void>;
    exportImage: (options: ExportOptions) => Promise<void>;
    copyToClipboard: () => Promise<void>;
    resizeAndMaintain: (width: number, height: number) => Promise<void>;
    clear: () => Promise<void>;
};

export type PressureSensitivityOptions = {
    /** Enable pressure sensitivity for pen/stylus input */
    enabled?: boolean;
    /** Minimum width scale (0.0 to 1.0, default: 0.3) */
    minScale?: number;
    /** Maximum width scale (0.0 to 1.0, default: 1.0) */
    maxScale?: number;
};

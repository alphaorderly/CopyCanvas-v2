import { ExportOptions, ToolType } from '../../types/canvas';

/**
 * Settings stored in localStorage
 */
export interface StorageSettings {
    theme: 'light' | 'dark';
    language: 'en' | 'ko';
    canvasWidth: number;
    canvasHeight: number;
    strokeColor: string;
    strokeWidth: number;
    activeTool: ToolType;
    backgroundColor: string;
    transparent: boolean;
    gridEnabled: boolean;
    gridSize: number;
    clipboardEnabled: boolean;
    pressureSensitivityEnabled: boolean;
    filename: string;
    format: ExportOptions['format'];
    scale: number;
    lastActivePageId: string;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: StorageSettings = {
    theme: 'dark',
    language: 'en',
    canvasWidth: 1200,
    canvasHeight: 720,
    strokeColor: '#111827',
    strokeWidth: 8,
    activeTool: 'brush',
    backgroundColor: '#ffffff',
    transparent: false,
    gridEnabled: false,
    gridSize: 32,
    clipboardEnabled: true,
    pressureSensitivityEnabled: true,
    filename: 'canvas',
    format: 'png',
    scale: 1,
    lastActivePageId: 'page-1',
};

/**
 * Page data stored in IndexedDB
 */
export interface PageData {
    id: string;
    name: string;
    dataUrl: string | null;
    objects?: string; // JSON stringified DrawObject[]
    createdAt: number;
    updatedAt: number;
}

/**
 * History entry for undo/redo stored in IndexedDB
 */
export interface HistoryEntry {
    id: string;
    pageId: string;
    dataUrl: string;
    timestamp: number;
    index: number;
}

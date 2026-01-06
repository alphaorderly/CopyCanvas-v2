import { ExportOptions, Page, ToolType } from '../types/canvas';
import { useTranslation } from 'react-i18next';
import {
    Sun,
    Moon,
    Pencil,
    Eraser,
    Plus,
    Copy,
    Trash2,
    Undo,
    Redo,
    Trash,
    Download,
    Image,
    Minus,
    Square,
    Circle,
} from 'lucide-react';

const swatches = [
    '#0f172a',
    '#111827',
    '#1d4ed8',
    '#2563eb',
    '#06b6d4',
    '#10b981',
    '#eab308',
    '#f97316',
    '#ef4444',
    '#ec4899',
];

type ControlPanelProps = {
    canvasWidth: number;
    canvasHeight: number;
    onCanvasSizeChange: (width: number, height: number) => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    strokeColor: string;
    onStrokeColorChange: (color: string) => void;
    strokeWidth: number;
    onStrokeWidthChange: (width: number) => void;
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    backgroundColor: string;
    onBackgroundColorChange: (color: string) => void;
    transparent: boolean;
    onTransparentToggle: (next: boolean) => void;
    gridEnabled: boolean;
    gridSize: number;
    onGridToggle: (next: boolean) => void;
    onGridSizeChange: (size: number) => void;
    pages: Page[];
    activePageId: string;
    onSelectPage: (pageId: string) => void;
    onAddPage: () => void;
    onDuplicatePage: () => void;
    onDeletePage: () => void;
    clipboardEnabled: boolean;
    onClipboardToggle: (next: boolean) => void;
    pressureSensitivityEnabled: boolean;
    onPressureSensitivityToggle: (next: boolean) => void;
    filename: string;
    format: ExportOptions['format'];
    scale: number;
    onFilenameChange: (value: string) => void;
    onFormatChange: (format: ExportOptions['format']) => void;
    onScaleChange: (value: number) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onExport: () => void;
    onCopy: () => void;
    onClear: () => void;
};

const ControlPanel = ({
    canvasWidth,
    canvasHeight,
    onCanvasSizeChange,
    theme,
    onToggleTheme,
    strokeColor,
    onStrokeColorChange,
    strokeWidth,
    onStrokeWidthChange,
    activeTool,
    onToolChange,
    backgroundColor,
    onBackgroundColorChange,
    transparent,
    onTransparentToggle,
    gridEnabled,
    gridSize,
    onGridToggle,
    onGridSizeChange,
    pages,
    activePageId,
    onSelectPage,
    onAddPage,
    onDuplicatePage,
    onDeletePage,
    clipboardEnabled,
    onClipboardToggle,
    pressureSensitivityEnabled,
    onPressureSensitivityToggle,
    filename,
    format,
    scale,
    onFilenameChange,
    onFormatChange,
    onScaleChange,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onExport,
    onCopy,
    onClear,
}: ControlPanelProps) => {
    const { t, i18n } = useTranslation();

    const handleLanguageToggle = () => {
        const nextLang = i18n.language === 'en' ? 'ko' : 'en';
        i18n.changeLanguage(nextLang);
    };

    return (
        <div className="card-shadow flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col leading-tight">
                    <span className="text-[11px] font-semibold tracking-[0.15em] text-[var(--text-muted)] uppercase">
                        {t('control')}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {t('canvasAndExport')}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleLanguageToggle}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
                        aria-label="Toggle language"
                        title={
                            i18n.language === 'en'
                                ? 'Switch to Korean'
                                : 'Switch to English'
                        }
                    >
                        {i18n.language === 'en' ? 'EN' : 'KO'}
                    </button>
                    <button
                        onClick={onToggleTheme}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[var(--text-primary)] hover:border-[var(--accent)]"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? (
                            <Sun size={16} />
                        ) : (
                            <Moon size={16} />
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <label className="flex items-center justify-between gap-2 text-xs font-medium text-[var(--text-muted)]">
                    {t('width')}
                    <input
                        type="number"
                        value={canvasWidth}
                        onChange={(e) =>
                            onCanvasSizeChange(
                                Number(e.target.value) || 0,
                                canvasHeight
                            )
                        }
                        className="w-20 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        min={100}
                        max={3000}
                    />
                </label>
                <label className="flex items-center justify-between gap-2 text-xs font-medium text-[var(--text-muted)]">
                    {t('height')}
                    <input
                        type="number"
                        value={canvasHeight}
                        onChange={(e) =>
                            onCanvasSizeChange(
                                canvasWidth,
                                Number(e.target.value) || 0
                            )
                        }
                        className="w-20 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        min={100}
                        max={3000}
                    />
                </label>
                <div className="col-span-2 flex items-center gap-1.5">
                    <button
                        onClick={onAddPage}
                        className="rounded border border-[var(--border)] px-2 py-1.5 text-[var(--text-primary)] hover:border-[var(--accent)]"
                        title={t('addPage')}
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        onClick={onDuplicatePage}
                        className="rounded border border-[var(--border)] px-2 py-1.5 text-[var(--text-primary)] hover:border-[var(--accent)]"
                        title={t('duplicatePage')}
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={onDeletePage}
                        className="rounded border border-[var(--border)] px-2 py-1.5 text-[var(--text-primary)] hover:border-rose-500"
                        title={t('deletePage')}
                    >
                        <Trash2 size={14} />
                    </button>
                    <select
                        value={activePageId}
                        onChange={(e) => onSelectPage(e.target.value)}
                        className="flex-1 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    >
                        {pages.map((page) => (
                            <option key={page.id} value={page.id}>
                                {page.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {t('tool')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onToolChange('brush')}
                            className={`flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                                activeTool === 'brush'
                                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                                    : 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                            }`}
                        >
                            <Pencil size={14} />
                            {t('brush')}
                        </button>
                        <button
                            onClick={() =>
                                onToolChange(
                                    activeTool.startsWith('eraser')
                                        ? activeTool === 'eraser-normal'
                                            ? 'eraser-object'
                                            : 'eraser-normal'
                                        : 'eraser-normal'
                                )
                            }
                            className={`flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                                activeTool.startsWith('eraser')
                                    ? 'border-rose-500 bg-rose-500 text-white'
                                    : 'border-[var(--border)] text-[var(--text-primary)] hover:border-rose-500'
                            }`}
                        >
                            <Eraser size={14} />
                            {t('eraser')}
                        </button>
                        <button
                            onClick={() => onToolChange('line')}
                            className={`flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                                activeTool === 'line'
                                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                                    : 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                            }`}
                        >
                            <Minus size={14} />
                            {t('line')}
                        </button>
                        <button
                            onClick={() => onToolChange('rectangle')}
                            className={`flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                                activeTool === 'rectangle'
                                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                                    : 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                            }`}
                        >
                            <Square size={14} />
                            {t('rectangle')}
                        </button>
                        <button
                            onClick={() => onToolChange('circle')}
                            className={`flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                                activeTool === 'circle'
                                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                                    : 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                            }`}
                        >
                            <Circle size={14} />
                            {t('circle')}
                        </button>
                    </div>
                    {activeTool.startsWith('eraser') && (
                        <div className="flex flex-col gap-1.5 rounded border border-[var(--border)] bg-[var(--panel)] p-2">
                            <div className="text-xs font-medium text-[var(--text-muted)]">
                                {t('eraser')} 모드
                            </div>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() =>
                                        onToolChange('eraser-normal')
                                    }
                                    className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors ${
                                        activeTool === 'eraser-normal'
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                                    }`}
                                >
                                    {t('eraserNormal')}
                                </button>
                                <button
                                    onClick={() =>
                                        onToolChange('eraser-object')
                                    }
                                    className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors ${
                                        activeTool === 'eraser-object'
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                                    }`}
                                >
                                    {t('eraserObject')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {t('stroke')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {swatches.map((color) => (
                            <button
                                key={color}
                                aria-label={`Use color ${color}`}
                                onClick={() => {
                                    onStrokeColorChange(color);
                                    if (activeTool.startsWith('eraser')) {
                                        onToolChange('brush');
                                    }
                                }}
                                className={`h-7 w-7 rounded-full border ${strokeColor === color ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/50' : 'border-[var(--border)]'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                        <label className="flex h-7 w-14 items-center justify-center rounded border border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)]">
                            <input
                                type="color"
                                value={strokeColor}
                                onChange={(e) => {
                                    onStrokeColorChange(e.target.value);
                                    if (activeTool.startsWith('eraser')) {
                                        onToolChange('brush');
                                    }
                                }}
                                className="h-6 w-12 cursor-pointer border-none bg-transparent"
                                aria-label="Pick custom color"
                            />
                        </label>
                    </div>
                    <label className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                        {t('width')}
                        <input
                            type="range"
                            min={1}
                            max={64}
                            value={strokeWidth}
                            onChange={(e) =>
                                onStrokeWidthChange(Number(e.target.value))
                            }
                            className="flex-1 accent-[var(--accent)]"
                        />
                        <span className="w-10 text-right text-xs text-[var(--text-primary)]">
                            {strokeWidth}px
                        </span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                        <input
                            type="checkbox"
                            checked={pressureSensitivityEnabled}
                            onChange={(e) =>
                                onPressureSensitivityToggle(e.target.checked)
                            }
                            className="h-4 w-4 accent-[var(--accent)]"
                        />
                        {t('pressureSensitivity')}
                    </label>
                </div>

                <div className="flex flex-col gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
                        {t('background')}
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                            <input
                                type="checkbox"
                                checked={transparent}
                                onChange={(e) =>
                                    onTransparentToggle(e.target.checked)
                                }
                                className="h-4 w-4 accent-[var(--accent)]"
                            />
                            {t('transparent')}
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) =>
                                onBackgroundColorChange(e.target.value)
                            }
                            className="h-8 w-14 cursor-pointer rounded border border-[var(--border)] bg-[var(--panel)]"
                            aria-label="Background color"
                            disabled={transparent}
                        />
                        <div className="flex flex-1 items-center justify-between gap-1.5 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-xs text-[var(--text-muted)]">
                            <label className="flex items-center gap-1 font-medium">
                                <input
                                    type="checkbox"
                                    checked={gridEnabled}
                                    onChange={(e) =>
                                        onGridToggle(e.target.checked)
                                    }
                                    className="h-4 w-4 accent-[var(--accent)]"
                                />
                                {t('grid')}
                            </label>
                            <input
                                type="number"
                                min={8}
                                max={128}
                                value={gridSize}
                                onChange={(e) =>
                                    onGridSizeChange(
                                        Number(e.target.value) || gridSize
                                    )
                                }
                                className="w-12 rounded border border-[var(--border)] bg-[var(--panel)] px-1.5 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
                        {t('history')}
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                            <input
                                type="checkbox"
                                checked={clipboardEnabled}
                                onChange={(e) =>
                                    onClipboardToggle(e.target.checked)
                                }
                                className="h-4 w-4 accent-[var(--accent)]"
                            />
                            {t('autoCopy')}
                        </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold ${
                                canUndo
                                    ? 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                                    : 'border-[var(--border)] text-[var(--text-muted)] opacity-60'
                            }`}
                        >
                            <Undo size={14} />
                            {t('undo')}
                        </button>
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold ${
                                canRedo
                                    ? 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                                    : 'border-[var(--border)] text-[var(--text-muted)] opacity-60'
                            }`}
                        >
                            <Redo size={14} />
                            {t('redo')}
                        </button>
                        <button
                            onClick={onClear}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-rose-500"
                        >
                            <Trash size={14} />
                            {t('clear')}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {t('export')}
                    </div>
                    <div className="flex flex-col gap-2 text-xs font-medium text-[var(--text-muted)]">
                        <label className="flex items-center gap-2">
                            {t('name')}
                            <input
                                value={filename}
                                onChange={(e) =>
                                    onFilenameChange(e.target.value)
                                }
                                className="flex-1 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                            />
                        </label>
                        <div className="flex gap-2">
                            <label className="flex flex-1 items-center gap-2">
                                {t('format')}
                                <select
                                    value={format}
                                    onChange={(e) =>
                                        onFormatChange(
                                            e.target
                                                .value as ExportOptions['format']
                                        )
                                    }
                                    className="flex-1 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                                >
                                    <option value="png">PNG</option>
                                    <option value="jpg">JPG</option>
                                    <option value="webp">WEBP</option>
                                </select>
                            </label>
                            <label className="flex flex-1 items-center gap-2">
                                {t('scale')}
                                <input
                                    type="number"
                                    min={0.25}
                                    max={4}
                                    step={0.25}
                                    value={scale}
                                    onChange={(e) =>
                                        onScaleChange(
                                            Number(e.target.value) || 1
                                        )
                                    }
                                    className="w-16 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                                />
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onExport}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
                        >
                            <Download size={14} />
                            {t('download')}
                        </button>
                        <button
                            onClick={onCopy}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
                        >
                            <Image size={14} />
                            {t('copy')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ControlPanel;

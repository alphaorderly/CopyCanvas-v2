import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CanvasBoard from './components/CanvasBoard';
import ControlPanel from './components/ControlPanel';
import { CanvasHandle, ExportOptions, Page, ToolType } from './types/canvas';

const STORAGE_THEME = 'copycanvas-theme';
const STORAGE_LAST = 'copycanvas:last';

const makePageId = () =>
    crypto.randomUUID ? crypto.randomUUID() : `page-${Date.now()}`;

const App = () => {
    const { t } = useTranslation();
    const canvasRef = useRef<CanvasHandle | null>(null);
    const suppressCopyRef = useRef(false);

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem(STORAGE_THEME) as
            | 'light'
            | 'dark'
            | null;
        return saved ?? 'dark';
    });

    const [pages, setPages] = useState<Page[]>(() => [
        { id: 'page-1', name: `${t('page')} 1`, dataUrl: null },
    ]);
    const [activePageId, setActivePageId] = useState('page-1');
    const [history, setHistory] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);

    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 720 });
    const [strokeColor, setStrokeColor] = useState('#111827');
    const [strokeWidth, setStrokeWidth] = useState(8);
    const [activeTool, setActiveTool] = useState<ToolType>('brush');
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [transparent, setTransparent] = useState(false);
    const [gridEnabled, setGridEnabled] = useState(false);
    const [gridSize, setGridSize] = useState(32);
    const [clipboardEnabled, setClipboardEnabled] = useState(true);
    const [pressureSensitivityEnabled, setPressureSensitivityEnabled] =
        useState(true);
    const [filename, setFilename] = useState('canvas');
    const [exportFormat, setExportFormat] =
        useState<ExportOptions['format']>('png');
    const [exportScale, setExportScale] = useState(1);

    const activePage = useMemo(
        () => pages.find((page) => page.id === activePageId) ?? pages[0],
        [pages, activePageId]
    );
    const canUndo = history.length > 1;
    const canRedo = redoStack.length > 0;

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(STORAGE_THEME, theme);
    }, [theme]);

    const pushSnapshot = useCallback(
        (dataUrl: string, { copy }: { copy: boolean }) => {
            setHistory((prev) => {
                const next = [...prev, dataUrl];
                return next.length > 50 ? next.slice(next.length - 50) : next;
            });
            setRedoStack([]);
            setPages((prev) =>
                prev.map((page) =>
                    page.id === activePageId ? { ...page, dataUrl } : page
                )
            );
            localStorage.setItem(STORAGE_LAST, dataUrl);
            if (copy && clipboardEnabled) {
                canvasRef.current?.copyToClipboard();
            }
        },
        [activePageId, clipboardEnabled]
    );

    const handleCommit = useCallback(
        (dataUrl: string) => {
            pushSnapshot(dataUrl, { copy: !suppressCopyRef.current });
            suppressCopyRef.current = false;
        },
        [pushSnapshot]
    );

    useEffect(() => {
        const seed = async () => {
            if (!canvasRef.current) return;
            const saved = localStorage.getItem(STORAGE_LAST);
            if (saved) {
                await canvasRef.current.loadFromDataUrl(saved);
                pushSnapshot(saved, { copy: false });
                setPages([
                    { id: 'page-1', name: `${t('page')} 1`, dataUrl: saved },
                ]);
            } else {
                const snapshot = canvasRef.current.getDataUrl();
                if (snapshot) pushSnapshot(snapshot, { copy: false });
            }
        };
        const frame = requestAnimationFrame(seed);
        return () => cancelAnimationFrame(frame);
    }, [pushSnapshot, t]);

    const handleUndo = useCallback(async () => {
        if (!canvasRef.current || history.length <= 1) return;
        const nextRedo = history[history.length - 1];
        const nextHistory = history.slice(0, -1);
        const target = nextHistory[nextHistory.length - 1] ?? null;
        setHistory(nextHistory);
        setRedoStack((prev) => [nextRedo, ...prev].slice(0, 50));
        await canvasRef.current.loadFromDataUrl(target);
        setPages((prev) =>
            prev.map((page) =>
                page.id === activePageId ? { ...page, dataUrl: target } : page
            )
        );
    }, [history, activePageId]);

    const handleRedo = useCallback(async () => {
        if (!canvasRef.current || redoStack.length === 0) return;
        const [next, ...rest] = redoStack;
        await canvasRef.current.loadFromDataUrl(next);
        setHistory((prev) => [...prev, next].slice(-50));
        setRedoStack(rest);
        setPages((prev) =>
            prev.map((page) =>
                page.id === activePageId ? { ...page, dataUrl: next } : page
            )
        );
    }, [redoStack, activePageId]);

    const handleExport = useCallback(() => {
        canvasRef.current?.exportImage({
            format: exportFormat,
            scale: exportScale,
            backgroundColor,
            transparent,
            filename,
        });
    }, [exportFormat, exportScale, backgroundColor, transparent, filename]);

    const handleCopyImage = useCallback(() => {
        canvasRef.current?.copyToClipboard();
    }, []);

    const handleCanvasSizeChange = useCallback(
        async (width: number, height: number) => {
            const nextWidth = Math.min(3000, Math.max(100, Math.round(width)));
            const nextHeight = Math.min(
                3000,
                Math.max(100, Math.round(height))
            );
            setCanvasSize({ width: nextWidth, height: nextHeight });
            if (canvasRef.current) {
                suppressCopyRef.current = true;
                await canvasRef.current.resizeAndMaintain(
                    nextWidth,
                    nextHeight
                );
                const snapshot = canvasRef.current.getDataUrl();
                if (snapshot) pushSnapshot(snapshot, { copy: false });
            }
        },
        [pushSnapshot]
    );

    const handleSelectPage = useCallback(
        async (pageId: string) => {
            if (pageId === activePageId || !canvasRef.current) {
                setActivePageId(pageId);
                return;
            }
            const currentSnapshot = canvasRef.current.getDataUrl();
            if (currentSnapshot) {
                setPages((prev) =>
                    prev.map((page) =>
                        page.id === activePageId
                            ? { ...page, dataUrl: currentSnapshot }
                            : page
                    )
                );
            }
            setActivePageId(pageId);
            suppressCopyRef.current = true;
            const nextPage = pages.find((page) => page.id === pageId);
            await canvasRef.current.loadFromDataUrl(nextPage?.dataUrl ?? null);
            const snapshot = canvasRef.current.getDataUrl();
            if (snapshot) {
                setHistory([snapshot]);
                setRedoStack([]);
            }
        },
        [activePageId, pages]
    );

    const handleAddPage = useCallback(async () => {
        if (!canvasRef.current) return;
        const snapshot = canvasRef.current.getDataUrl();
        if (snapshot) {
            setPages((prev) =>
                prev.map((page) =>
                    page.id === activePageId
                        ? { ...page, dataUrl: snapshot }
                        : page
                )
            );
        }
        const newPage: Page = {
            id: makePageId(),
            name: `${t('page')} ${pages.length + 1}`,
            dataUrl: null,
        };
        setPages((prev) => [...prev, newPage]);
        setActivePageId(newPage.id);
        suppressCopyRef.current = true;
        await canvasRef.current.loadFromDataUrl(null);
        const fresh = canvasRef.current.getDataUrl();
        if (fresh) {
            setHistory([fresh]);
            setRedoStack([]);
        }
    }, [activePageId, pages.length, t]);

    const handleDuplicatePage = useCallback(async () => {
        if (!canvasRef.current || !activePage) return;
        const snapshot = canvasRef.current.getDataUrl();
        const source = snapshot ?? activePage.dataUrl ?? null;
        const duplicate: Page = {
            id: makePageId(),
            name: `${activePage.name} ${t('pageCopy')}`,
            dataUrl: source,
        };
        setPages((prev) => [...prev, duplicate]);
        setActivePageId(duplicate.id);
        suppressCopyRef.current = true;
        await canvasRef.current.loadFromDataUrl(source);
        const fresh = canvasRef.current.getDataUrl();
        if (fresh) {
            setHistory([fresh]);
            setRedoStack([]);
        }
    }, [activePage, t]);

    const handleDeletePage = useCallback(async () => {
        if (pages.length === 1) return;
        const remaining = pages.filter((page) => page.id !== activePageId);
        const nextActive = remaining[0];
        setPages(remaining);
        setActivePageId(nextActive.id);
        if (canvasRef.current) {
            suppressCopyRef.current = true;
            await canvasRef.current.loadFromDataUrl(nextActive.dataUrl ?? null);
            const snapshot = canvasRef.current.getDataUrl();
            if (snapshot) {
                setHistory([snapshot]);
                setRedoStack([]);
            }
        }
    }, [pages, activePageId]);

    const handleClear = useCallback(() => {
        suppressCopyRef.current = true;
        canvasRef.current?.clear();
    }, []);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            const isCmd = event.metaKey || event.ctrlKey;
            if (!isCmd) return;
            if (event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }
            if (event.key.toLowerCase() === 'y') {
                event.preventDefault();
                handleRedo();
            }
            if (event.key.toLowerCase() === 's') {
                event.preventDefault();
                handleExport();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleUndo, handleRedo, handleExport]);

    const gridStyle = gridEnabled
        ? {
              backgroundSize: `${gridSize}px ${gridSize}px`,
              backgroundImage:
                  'linear-gradient(to right, rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.35) 1px, transparent 1px)',
          }
        : undefined;

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)]">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
                <div className="flex gap-5">
                    <div className="w-[400px] flex-shrink-0">
                        <ControlPanel
                            canvasWidth={canvasSize.width}
                            canvasHeight={canvasSize.height}
                            onCanvasSizeChange={handleCanvasSizeChange}
                            theme={theme}
                            onToggleTheme={() =>
                                setTheme((prev) =>
                                    prev === 'dark' ? 'light' : 'dark'
                                )
                            }
                            strokeColor={strokeColor}
                            onStrokeColorChange={(color) => {
                                setStrokeColor(color);
                                if (activeTool.startsWith('eraser')) {
                                    setActiveTool('brush');
                                }
                            }}
                            strokeWidth={strokeWidth}
                            onStrokeWidthChange={setStrokeWidth}
                            activeTool={activeTool}
                            onToolChange={setActiveTool}
                            backgroundColor={backgroundColor}
                            onBackgroundColorChange={setBackgroundColor}
                            transparent={transparent}
                            onTransparentToggle={setTransparent}
                            gridEnabled={gridEnabled}
                            gridSize={gridSize}
                            onGridToggle={setGridEnabled}
                            onGridSizeChange={setGridSize}
                            pages={pages}
                            activePageId={activePageId}
                            onSelectPage={handleSelectPage}
                            onAddPage={handleAddPage}
                            onDuplicatePage={handleDuplicatePage}
                            onDeletePage={handleDeletePage}
                            clipboardEnabled={clipboardEnabled}
                            onClipboardToggle={setClipboardEnabled}
                            pressureSensitivityEnabled={
                                pressureSensitivityEnabled
                            }
                            onPressureSensitivityToggle={
                                setPressureSensitivityEnabled
                            }
                            filename={filename}
                            format={exportFormat}
                            scale={exportScale}
                            onFilenameChange={setFilename}
                            onFormatChange={setExportFormat}
                            onScaleChange={setExportScale}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onExport={handleExport}
                            onCopy={handleCopyImage}
                            onClear={handleClear}
                        />
                    </div>

                    <div className="flex-1">
                        <div className="card-shadow relative flex min-h-[500px] flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold tracking-[0.2em] text-[var(--text-muted)] uppercase">
                                        {t('activePage')}
                                    </p>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                        {activePage?.name ?? t('canvas')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                    <span>
                                        {t('pen')} {strokeWidth}px
                                    </span>
                                    <span>
                                        {t('grid')}{' '}
                                        {gridEnabled
                                            ? `${gridSize}px`
                                            : t('gridOff')}
                                    </span>
                                    <span>
                                        {transparent
                                            ? t('transparent')
                                            : t('background')}
                                    </span>
                                </div>
                            </div>

                            <div
                                className={`relative flex grow items-center justify-center overflow-hidden rounded-xl border ${transparent ? 'checkerboard border-[var(--border)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}
                            >
                                <div
                                    className="relative"
                                    style={{
                                        width: `${canvasSize.width}px`,
                                        height: `${canvasSize.height}px`,
                                    }}
                                >
                                    <CanvasBoard
                                        ref={canvasRef}
                                        width={canvasSize.width}
                                        height={canvasSize.height}
                                        strokeColor={strokeColor}
                                        strokeWidth={strokeWidth}
                                        activeTool={activeTool}
                                        backgroundColor={backgroundColor}
                                        transparent={transparent}
                                        onCommit={handleCommit}
                                        pressureSensitivity={{
                                            enabled: pressureSensitivityEnabled,
                                            minScale: 0.3,
                                            maxScale: 1.0,
                                        }}
                                    />
                                    {gridEnabled ? (
                                        <div
                                            className="grid-overlay"
                                            style={gridStyle}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;

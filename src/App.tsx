import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CanvasBoard from './components/CanvasBoard';
import ControlPanel from './components/ControlPanel';
import { CanvasHandle, ExportOptions, Page, ToolType } from './types/canvas';
import {
    LocalStorageManager,
    IndexedDBManager,
    StorageSettings,
} from './utils/storage';

const makePageId = () =>
    crypto.randomUUID ? crypto.randomUUID() : `page-${Date.now()}`;

const App = () => {
    const { t, i18n } = useTranslation();
    const canvasRef = useRef<CanvasHandle | null>(null);
    const suppressCopyRef = useRef(false);
    const isInitializedRef = useRef(false);

    // Load settings from localStorage on mount
    const initialSettings = useMemo(() => {
        // Migrate legacy settings if they exist
        LocalStorageManager.migrateLegacySettings();
        return LocalStorageManager.loadSettings();
    }, []);

    // Extract individual settings for easier use
    const [theme, setTheme] = useState<'light' | 'dark'>(initialSettings.theme);
    const [canvasSize, setCanvasSize] = useState({
        width: initialSettings.canvasWidth,
        height: initialSettings.canvasHeight,
    });
    const [strokeColor, setStrokeColor] = useState(initialSettings.strokeColor);
    const [strokeWidth, setStrokeWidth] = useState(initialSettings.strokeWidth);
    const [activeTool, setActiveTool] = useState<ToolType>(
        initialSettings.activeTool
    );
    const [backgroundColor, setBackgroundColor] = useState(
        initialSettings.backgroundColor
    );
    const [transparent, setTransparent] = useState(initialSettings.transparent);
    const [gridEnabled, setGridEnabled] = useState(initialSettings.gridEnabled);
    const [gridSize, setGridSize] = useState(initialSettings.gridSize);
    const [clipboardEnabled, setClipboardEnabled] = useState(
        initialSettings.clipboardEnabled
    );
    const [pressureSensitivityEnabled, setPressureSensitivityEnabled] =
        useState(initialSettings.pressureSensitivityEnabled);
    const [filename, setFilename] = useState(initialSettings.filename);
    const [exportFormat, setExportFormat] = useState<ExportOptions['format']>(
        initialSettings.format
    );
    const [exportScale, setExportScale] = useState(initialSettings.scale);

    // Pages and history state
    const [pages, setPages] = useState<Page[]>([]);
    const [activePageId, setActivePageId] = useState(
        initialSettings.lastActivePageId
    );
    const [history, setHistory] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);

    const activePage = useMemo(
        () => pages.find((page) => page.id === activePageId) ?? pages[0],
        [pages, activePageId]
    );
    const canUndo = history.length > 1;
    const canRedo = redoStack.length > 0;

    // Sync theme with DOM and localStorage
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        LocalStorageManager.setSetting('theme', theme);
    }, [theme]);

    // Sync language with i18n
    useEffect(() => {
        const currentLang = initialSettings.language;
        if (i18n.language !== currentLang) {
            i18n.changeLanguage(currentLang);
        }
    }, [initialSettings.language, i18n]);

    // Auto-save settings to localStorage whenever they change
    useEffect(() => {
        if (!isInitializedRef.current) return; // Skip initial render

        const updatedSettings: StorageSettings = {
            theme,
            language: i18n.language as 'en' | 'ko',
            canvasWidth: canvasSize.width,
            canvasHeight: canvasSize.height,
            strokeColor,
            strokeWidth,
            activeTool,
            backgroundColor,
            transparent,
            gridEnabled,
            gridSize,
            clipboardEnabled,
            pressureSensitivityEnabled,
            filename,
            format: exportFormat,
            scale: exportScale,
            lastActivePageId: activePageId,
        };

        LocalStorageManager.saveSettings(updatedSettings);
    }, [
        theme,
        i18n.language,
        canvasSize,
        strokeColor,
        strokeWidth,
        activeTool,
        backgroundColor,
        transparent,
        gridEnabled,
        gridSize,
        clipboardEnabled,
        pressureSensitivityEnabled,
        filename,
        exportFormat,
        exportScale,
        activePageId,
    ]);

    // Initialize pages from IndexedDB
    useEffect(() => {
        const initPages = async () => {
            try {
                // Check for legacy localStorage data and migrate
                const legacyData = localStorage.getItem('copycanvas:last');
                if (legacyData) {
                    await IndexedDBManager.migrateLegacyData(legacyData);
                }

                // Load pages from IndexedDB
                const storedPages = await IndexedDBManager.getAllPages();

                if (storedPages.length > 0) {
                    // Convert PageData to Page format
                    const loadedPages: Page[] = storedPages.map((pageData) => ({
                        id: pageData.id,
                        name: pageData.name,
                        dataUrl: pageData.dataUrl,
                    }));

                    setPages(loadedPages);

                    // Set active page (use stored preference or first page)
                    const validPageId = loadedPages.find(
                        (p) => p.id === initialSettings.lastActivePageId
                    )
                        ? initialSettings.lastActivePageId
                        : loadedPages[0].id;
                    setActivePageId(validPageId);

                    // Load canvas for active page
                    if (canvasRef.current) {
                        const activePage = loadedPages.find(
                            (p) => p.id === validPageId
                        );
                        await canvasRef.current.loadFromDataUrl(
                            activePage?.dataUrl ?? null
                        );

                        // Load history from IndexedDB
                        const historyEntries =
                            await IndexedDBManager.getHistory(validPageId);
                        if (historyEntries.length > 0) {
                            const historyUrls = historyEntries.map(
                                (entry) => entry.dataUrl
                            );
                            setHistory(historyUrls);
                        } else {
                            // Initialize history with current snapshot
                            const snapshot = canvasRef.current.getDataUrl();
                            if (snapshot) {
                                setHistory([snapshot]);
                                await IndexedDBManager.saveHistory(
                                    validPageId,
                                    snapshot,
                                    0
                                );
                            }
                        }
                    }
                } else {
                    // No stored pages, create default page
                    const defaultPage: Page = {
                        id: 'page-1',
                        name: `${t('page')} 1`,
                        dataUrl: null,
                    };
                    setPages([defaultPage]);
                    setActivePageId('page-1');

                    // Save default page to IndexedDB
                    await IndexedDBManager.savePage({
                        id: defaultPage.id,
                        name: defaultPage.name,
                        dataUrl: null,
                    });

                    // Initialize canvas
                    if (canvasRef.current) {
                        const snapshot = canvasRef.current.getDataUrl();
                        if (snapshot) {
                            setHistory([snapshot]);
                            await IndexedDBManager.savePage({
                                id: defaultPage.id,
                                name: defaultPage.name,
                                dataUrl: snapshot,
                            });
                            await IndexedDBManager.saveHistory(
                                defaultPage.id,
                                snapshot,
                                0
                            );
                        }
                    }
                }

                isInitializedRef.current = true;
            } catch (error) {
                console.error(
                    'Failed to initialize pages from IndexedDB:',
                    error
                );

                // Fallback to default page on error
                const defaultPage: Page = {
                    id: 'page-1',
                    name: `${t('page')} 1`,
                    dataUrl: null,
                };
                setPages([defaultPage]);
                setActivePageId('page-1');
                isInitializedRef.current = true;
            }
        };

        initPages();
    }, [t, initialSettings.lastActivePageId]);

    const pushSnapshot = useCallback(
        async (dataUrl: string, { copy }: { copy: boolean }) => {
            let newHistoryIndex = 0;
            setHistory((prev) => {
                const next = [...prev, dataUrl];
                const trimmed =
                    next.length > 50 ? next.slice(next.length - 50) : next;
                newHistoryIndex = trimmed.length - 1;
                return trimmed;
            });
            setRedoStack([]);
            setPages((prev) =>
                prev.map((page) =>
                    page.id === activePageId ? { ...page, dataUrl } : page
                )
            );

            // Save to IndexedDB
            try {
                const currentPage = pages.find((p) => p.id === activePageId);
                if (currentPage) {
                    await IndexedDBManager.savePage({
                        id: currentPage.id,
                        name: currentPage.name,
                        dataUrl,
                    });
                    // Save history entry
                    await IndexedDBManager.saveHistory(
                        activePageId,
                        dataUrl,
                        newHistoryIndex
                    );
                }
            } catch (error) {
                console.error('Failed to save page to IndexedDB:', error);
            }

            if (copy && clipboardEnabled) {
                canvasRef.current?.copyToClipboard();
            }
        },
        [activePageId, clipboardEnabled, pages]
    );

    const handleCommit = useCallback(
        (dataUrl: string) => {
            pushSnapshot(dataUrl, { copy: !suppressCopyRef.current });
            suppressCopyRef.current = false;
        },
        [pushSnapshot]
    );

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

        // Save updated page to IndexedDB
        try {
            const currentPage = pages.find((p) => p.id === activePageId);
            if (currentPage) {
                await IndexedDBManager.savePage({
                    id: currentPage.id,
                    name: currentPage.name,
                    dataUrl: target,
                });
            }
        } catch (error) {
            console.error('Failed to save undo state to IndexedDB:', error);
        }
    }, [history, activePageId, pages]);

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

        // Save updated page to IndexedDB
        try {
            const currentPage = pages.find((p) => p.id === activePageId);
            if (currentPage) {
                await IndexedDBManager.savePage({
                    id: currentPage.id,
                    name: currentPage.name,
                    dataUrl: next,
                });
            }
        } catch (error) {
            console.error('Failed to save redo state to IndexedDB:', error);
        }
    }, [redoStack, activePageId, pages]);

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

                // Save current page to IndexedDB
                try {
                    const currentPage = pages.find(
                        (p) => p.id === activePageId
                    );
                    if (currentPage) {
                        await IndexedDBManager.savePage({
                            id: currentPage.id,
                            name: currentPage.name,
                            dataUrl: currentSnapshot,
                        });
                    }
                } catch (error) {
                    console.error(
                        'Failed to save current page to IndexedDB:',
                        error
                    );
                }
            }
            setActivePageId(pageId);
            suppressCopyRef.current = true;
            const nextPage = pages.find((page) => page.id === pageId);
            await canvasRef.current.loadFromDataUrl(nextPage?.dataUrl ?? null);

            // Load history for the new page
            try {
                const historyEntries =
                    await IndexedDBManager.getHistory(pageId);
                if (historyEntries.length > 0) {
                    const historyUrls = historyEntries.map(
                        (entry) => entry.dataUrl
                    );
                    setHistory(historyUrls);
                } else {
                    const snapshot = canvasRef.current.getDataUrl();
                    if (snapshot) {
                        setHistory([snapshot]);
                        await IndexedDBManager.saveHistory(pageId, snapshot, 0);
                    }
                }
            } catch (error) {
                console.error('Failed to load history from IndexedDB:', error);
                const snapshot = canvasRef.current.getDataUrl();
                if (snapshot) {
                    setHistory([snapshot]);
                }
            }
            setRedoStack([]);
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

            // Save current page to IndexedDB
            try {
                const currentPage = pages.find((p) => p.id === activePageId);
                if (currentPage) {
                    await IndexedDBManager.savePage({
                        id: currentPage.id,
                        name: currentPage.name,
                        dataUrl: snapshot,
                    });
                }
            } catch (error) {
                console.error(
                    'Failed to save current page to IndexedDB:',
                    error
                );
            }
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

            // Save new page to IndexedDB
            try {
                await IndexedDBManager.savePage({
                    id: newPage.id,
                    name: newPage.name,
                    dataUrl: fresh,
                });
                await IndexedDBManager.saveHistory(newPage.id, fresh, 0);
            } catch (error) {
                console.error('Failed to save new page to IndexedDB:', error);
            }
        }
    }, [activePageId, pages, t]);

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

            // Save duplicated page to IndexedDB
            try {
                await IndexedDBManager.savePage({
                    id: duplicate.id,
                    name: duplicate.name,
                    dataUrl: fresh,
                });
                await IndexedDBManager.saveHistory(duplicate.id, fresh, 0);
            } catch (error) {
                console.error(
                    'Failed to save duplicated page to IndexedDB:',
                    error
                );
            }
        }
    }, [activePage, t]);

    const handleDeletePage = useCallback(async () => {
        if (pages.length === 1) return;
        const remaining = pages.filter((page) => page.id !== activePageId);
        const nextActive = remaining[0];
        setPages(remaining);
        setActivePageId(nextActive.id);

        // Delete page from IndexedDB
        try {
            await IndexedDBManager.deletePage(activePageId);
        } catch (error) {
            console.error('Failed to delete page from IndexedDB:', error);
        }

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

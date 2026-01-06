import { PageData, HistoryEntry } from './types';

const DB_NAME = 'CopyCanvasDB';
const DB_VERSION = 1;
const PAGES_STORE = 'pages';
const HISTORY_STORE = 'history';
const MAX_HISTORY_PER_PAGE = 50;

/**
 * IndexedDB manager for canvas pages and history
 */
export class IndexedDBManager {
    private static dbPromise: Promise<IDBDatabase> | null = null;

    /**
     * Initialize and open the IndexedDB database
     */
    private static getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) {
            return this.dbPromise;
        }

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create pages store
                if (!db.objectStoreNames.contains(PAGES_STORE)) {
                    const pagesStore = db.createObjectStore(PAGES_STORE, {
                        keyPath: 'id',
                    });
                    pagesStore.createIndex('createdAt', 'createdAt', {
                        unique: false,
                    });
                    pagesStore.createIndex('updatedAt', 'updatedAt', {
                        unique: false,
                    });
                }

                // Create history store
                if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                    const historyStore = db.createObjectStore(HISTORY_STORE, {
                        keyPath: 'id',
                    });
                    historyStore.createIndex('pageId', 'pageId', {
                        unique: false,
                    });
                    historyStore.createIndex('timestamp', 'timestamp', {
                        unique: false,
                    });
                    historyStore.createIndex(
                        'pageId_index',
                        ['pageId', 'index'],
                        {
                            unique: false,
                        }
                    );
                }
            };
        });

        return this.dbPromise;
    }

    // ============ PAGES OPERATIONS ============

    /**
     * Save a page to IndexedDB
     */
    static async savePage(
        page: Omit<PageData, 'createdAt' | 'updatedAt'>
    ): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(PAGES_STORE, 'readwrite');
            const store = tx.objectStore(PAGES_STORE);

            // Check if page exists
            const existing = await new Promise<PageData | undefined>(
                (resolve, reject) => {
                    const getRequest = store.get(page.id);
                    getRequest.onsuccess = () => resolve(getRequest.result);
                    getRequest.onerror = () => reject(getRequest.error);
                }
            );

            const now = Date.now();
            const pageData: PageData = {
                ...page,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
            };

            await new Promise<void>((resolve, reject) => {
                const putRequest = store.put(pageData);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            });

            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error('Failed to save page:', error);
            throw error;
        }
    }

    /**
     * Get a page by ID
     */
    static async getPage(pageId: string): Promise<PageData | null> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(PAGES_STORE, 'readonly');
            const store = tx.objectStore(PAGES_STORE);

            return new Promise((resolve, reject) => {
                const request = store.get(pageId);
                request.onsuccess = () => resolve(request.result ?? null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get page:', error);
            return null;
        }
    }

    /**
     * Get all pages
     */
    static async getAllPages(): Promise<PageData[]> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(PAGES_STORE, 'readonly');
            const store = tx.objectStore(PAGES_STORE);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const pages = request.result as PageData[];
                    // Sort by creation date
                    pages.sort((a, b) => a.createdAt - b.createdAt);
                    resolve(pages);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get all pages:', error);
            return [];
        }
    }

    /**
     * Delete a page
     */
    static async deletePage(pageId: string): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(
                [PAGES_STORE, HISTORY_STORE],
                'readwrite'
            );
            const pagesStore = tx.objectStore(PAGES_STORE);
            const historyStore = tx.objectStore(HISTORY_STORE);

            // Delete page
            await new Promise<void>((resolve, reject) => {
                const request = pagesStore.delete(pageId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            // Delete all history for this page
            const historyIndex = historyStore.index('pageId');
            const historyRequest = historyIndex.openCursor(
                IDBKeyRange.only(pageId)
            );

            await new Promise<void>((resolve, reject) => {
                historyRequest.onsuccess = (event) => {
                    const cursor = (
                        event.target as IDBRequest<IDBCursorWithValue>
                    ).result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                historyRequest.onerror = () => reject(historyRequest.error);
            });

            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error('Failed to delete page:', error);
            throw error;
        }
    }

    /**
     * Clear all pages
     */
    static async clearAllPages(): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(
                [PAGES_STORE, HISTORY_STORE],
                'readwrite'
            );

            await Promise.all([
                new Promise<void>((resolve, reject) => {
                    const request = tx.objectStore(PAGES_STORE).clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                }),
                new Promise<void>((resolve, reject) => {
                    const request = tx.objectStore(HISTORY_STORE).clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                }),
            ]);

            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error('Failed to clear all pages:', error);
            throw error;
        }
    }

    // ============ HISTORY OPERATIONS ============

    /**
     * Save history entry for a page
     */
    static async saveHistory(
        pageId: string,
        dataUrl: string,
        index: number
    ): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(HISTORY_STORE, 'readwrite');
            const store = tx.objectStore(HISTORY_STORE);

            const entry: HistoryEntry = {
                id: `${pageId}-${index}-${Date.now()}`,
                pageId,
                dataUrl,
                timestamp: Date.now(),
                index,
            };

            await new Promise<void>((resolve, reject) => {
                const request = store.put(entry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });

            // Clean up old history entries
            await this.cleanupHistory(pageId);
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    /**
     * Get history for a specific page
     */
    static async getHistory(pageId: string): Promise<HistoryEntry[]> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(HISTORY_STORE, 'readonly');
            const store = tx.objectStore(HISTORY_STORE);
            const index = store.index('pageId');

            return new Promise((resolve, reject) => {
                const request = index.getAll(IDBKeyRange.only(pageId));
                request.onsuccess = () => {
                    const entries = request.result as HistoryEntry[];
                    // Sort by index
                    entries.sort((a, b) => a.index - b.index);
                    resolve(entries);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get history:', error);
            return [];
        }
    }

    /**
     * Clear history for a specific page
     */
    static async clearHistory(pageId: string): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction(HISTORY_STORE, 'readwrite');
            const store = tx.objectStore(HISTORY_STORE);
            const index = store.index('pageId');

            const request = index.openCursor(IDBKeyRange.only(pageId));

            await new Promise<void>((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = (
                        event.target as IDBRequest<IDBCursorWithValue>
                    ).result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                request.onerror = () => reject(request.error);
            });

            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    }

    /**
     * Clean up old history entries, keeping only the latest MAX_HISTORY_PER_PAGE
     */
    private static async cleanupHistory(pageId: string): Promise<void> {
        try {
            const entries = await this.getHistory(pageId);

            if (entries.length > MAX_HISTORY_PER_PAGE) {
                const toDelete = entries.slice(
                    0,
                    entries.length - MAX_HISTORY_PER_PAGE
                );

                const db = await this.getDB();
                const tx = db.transaction(HISTORY_STORE, 'readwrite');
                const store = tx.objectStore(HISTORY_STORE);

                for (const entry of toDelete) {
                    await new Promise<void>((resolve, reject) => {
                        const request = store.delete(entry.id);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }

                await new Promise<void>((resolve, reject) => {
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            }
        } catch (error) {
            console.error('Failed to cleanup history:', error);
        }
    }

    // ============ MIGRATION ============

    /**
     * Migrate legacy localStorage canvas data to IndexedDB
     */
    static async migrateLegacyData(dataUrl: string | null): Promise<void> {
        if (!dataUrl) return;

        try {
            await this.savePage({
                id: 'page-1',
                name: 'Page 1',
                dataUrl,
            });

            // Save as first history entry
            await this.saveHistory('page-1', dataUrl, 0);

            // Clean up old localStorage key
            localStorage.removeItem('copycanvas:last');

            console.log(
                'Successfully migrated legacy canvas data to IndexedDB'
            );
        } catch (error) {
            console.error('Failed to migrate legacy data:', error);
        }
    }
}

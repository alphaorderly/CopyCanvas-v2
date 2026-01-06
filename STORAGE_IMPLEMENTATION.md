# Storage Implementation

## Overview

This implementation adds persistent storage for both ControlPanel settings and canvas images:

- **localStorage**: Stores user preferences and settings (lightweight, synchronous)
- **IndexedDB**: Stores canvas images and pages (large data, asynchronous)

## Architecture

### Files Created

```
src/utils/storage/
├── index.ts           # Main exports
├── types.ts           # TypeScript interfaces and default values
├── localStorage.ts    # LocalStorageManager class
└── indexedDB.ts       # IndexedDBManager class
```

## Features Implemented

### 1. Settings Persistence (localStorage)

All ControlPanel settings are automatically saved to localStorage:

- ✅ Canvas size (width, height)
- ✅ Theme (light/dark)
- ✅ Language (en/ko)
- ✅ Stroke color and width
- ✅ Active tool (brush, eraser, shapes)
- ✅ Background color and transparency
- ✅ Grid settings (enabled, size)
- ✅ Clipboard and pressure sensitivity toggles
- ✅ Export settings (filename, format, scale)
- ✅ Last active page ID

**Usage:**

```typescript
import { LocalStorageManager } from './utils/storage';

// Load all settings
const settings = LocalStorageManager.loadSettings();

// Update specific setting
LocalStorageManager.setSetting('theme', 'dark');

// Update multiple settings
LocalStorageManager.updateSettings({
    strokeColor: '#ff0000',
    strokeWidth: 10,
});
```

### 2. Canvas Images Persistence (IndexedDB)

Canvas images and pages are stored in IndexedDB for efficient large data handling:

- ✅ Multi-page support with automatic saving
- ✅ Page data (id, name, dataUrl, timestamps)
- ✅ History/undo-redo support (up to 50 entries per page)
- ✅ Automatic cleanup of old history entries
- ✅ Page deletion with cascade (removes associated history)

**Database Schema:**

```
CopyCanvasDB (v1)
├── pages (object store)
│   ├── id (primary key)
│   ├── name
│   ├── dataUrl
│   ├── createdAt (indexed)
│   └── updatedAt (indexed)
└── history (object store)
    ├── id (primary key)
    ├── pageId (indexed)
    ├── dataUrl
    ├── timestamp (indexed)
    └── index
```

**Usage:**

```typescript
import { IndexedDBManager } from './utils/storage';

// Save a page
await IndexedDBManager.savePage({
    id: 'page-1',
    name: 'My Canvas',
    dataUrl: canvas.toDataURL(),
});

// Load all pages
const pages = await IndexedDBManager.getAllPages();

// Delete a page (cascades to history)
await IndexedDBManager.deletePage('page-1');
```

### 3. Data Migration

Automatically migrates legacy localStorage data:

- ✅ Migrates `copycanvas-theme` to new settings structure
- ✅ Migrates `copycanvas:last` canvas data to IndexedDB
- ✅ Cleans up old localStorage keys after migration
- ✅ Preserves i18n language setting

### 4. Error Handling

- ✅ Graceful fallback on storage quota exceeded
- ✅ Console warnings for debugging
- ✅ Fallback to defaults on corrupted data
- ✅ Try-catch blocks around all storage operations

## App.tsx Integration

### Changes Made

1. **Settings Auto-Save**: Settings are automatically saved to localStorage whenever they change via `useEffect` hook

2. **IndexedDB Initialization**: Pages are loaded from IndexedDB on mount, with fallback to creating a default page

3. **Canvas Commits**: All canvas operations (`onCommit`, undo, redo, page switches) now save to IndexedDB instead of localStorage

4. **Page Operations**: Add, duplicate, delete, and switch pages now persist to IndexedDB

5. **Migration on Mount**: Legacy localStorage data is automatically migrated to IndexedDB on first load

## Storage Limits

- **localStorage**: ~5-10MB per origin (stores settings only, very small)
- **IndexedDB**: ~50MB-1GB+ per origin (browser dependent)
    - Each canvas page (~1-5MB as PNG base64)
    - 50 history entries per page
    - Supports 10+ pages comfortably

## Benefits

1. **Performance**: Settings load instantly from localStorage; large canvas images load asynchronously from IndexedDB
2. **Reliability**: No more localStorage quota issues with large canvases
3. **Multi-page**: Full support for multiple canvas pages with persistent storage
4. **Type-safe**: Full TypeScript support with proper interfaces
5. **Migration**: Seamless upgrade for existing users

## Testing

To test the storage:

1. Open the app and draw on the canvas
2. Change settings (theme, colors, tools)
3. Create multiple pages
4. Refresh the page → All settings and canvases should persist
5. Open DevTools → Application → Storage to inspect:
    - localStorage: `copycanvas-settings`
    - IndexedDB: `CopyCanvasDB` → `pages` and `history` stores

## Future Enhancements

Possible improvements:

- [ ] Compress canvas images before storing (use pako.js for gzip)
- [ ] Convert base64 to Blob for more efficient IndexedDB storage
- [ ] Add export/import functionality for backup
- [ ] Add storage usage indicator in UI
- [ ] Implement cloud sync (optional)
- [ ] Add settings reset button

import { StorageSettings, DEFAULT_SETTINGS } from './types';

const STORAGE_PREFIX = 'copycanvas';
const SETTINGS_KEY = `${STORAGE_PREFIX}-settings`;

/**
 * Type-safe localStorage manager for application settings
 */
export class LocalStorageManager {
    /**
     * Load all settings from localStorage
     */
    static loadSettings(): StorageSettings {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (!stored) {
                return { ...DEFAULT_SETTINGS };
            }

            const parsed = JSON.parse(stored) as Partial<StorageSettings>;

            // Merge with defaults to handle new settings added over time
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
            };
        } catch (error) {
            console.error('Failed to load settings from localStorage:', error);
            return { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Save all settings to localStorage
     */
    static saveSettings(settings: StorageSettings): void {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);

            // Check for quota exceeded error
            if (
                error instanceof DOMException &&
                error.name === 'QuotaExceededError'
            ) {
                console.warn('localStorage quota exceeded');
            }
        }
    }

    /**
     * Update specific settings fields
     */
    static updateSettings(updates: Partial<StorageSettings>): void {
        const current = this.loadSettings();
        const updated = { ...current, ...updates };
        this.saveSettings(updated);
    }

    /**
     * Get a specific setting value
     */
    static getSetting<K extends keyof StorageSettings>(
        key: K
    ): StorageSettings[K] {
        const settings = this.loadSettings();
        return settings[key];
    }

    /**
     * Set a specific setting value
     */
    static setSetting<K extends keyof StorageSettings>(
        key: K,
        value: StorageSettings[K]
    ): void {
        this.updateSettings({ [key]: value } as Partial<StorageSettings>);
    }

    /**
     * Clear all settings (reset to defaults)
     */
    static clearSettings(): void {
        try {
            localStorage.removeItem(SETTINGS_KEY);
        } catch (error) {
            console.error('Failed to clear settings:', error);
        }
    }

    /**
     * Check if settings exist in localStorage
     */
    static hasSettings(): boolean {
        return localStorage.getItem(SETTINGS_KEY) !== null;
    }

    /**
     * Migrate legacy localStorage keys to new settings structure
     */
    static migrateLegacySettings(): void {
        try {
            const theme = localStorage.getItem('copycanvas-theme') as
                | 'light'
                | 'dark'
                | null;
            const language = localStorage.getItem('i18nextLng') as
                | 'en'
                | 'ko'
                | null;

            if (theme || language) {
                const updates: Partial<StorageSettings> = {};

                if (theme) {
                    updates.theme = theme;
                    localStorage.removeItem('copycanvas-theme'); // Clean up old key
                }

                if (language && (language === 'en' || language === 'ko')) {
                    updates.language = language;
                }

                this.updateSettings(updates);
            }
        } catch (error) {
            console.error('Failed to migrate legacy settings:', error);
        }
    }
}

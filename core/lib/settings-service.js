/**
 * Centralized settings management service with in-memory caching
 */
import { join } from "node:path"
import { existsSync } from "node:fs"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"

export class SettingsService {
    constructor(dataDir) {
        this.dataDir = dataDir
        this.settingsPath = join(dataDir, "settings.json")
        this.settings = null
        this.isInitialized = false
        this.saveQueue = Promise.resolve() // For sequential saving
        this.lastSaveTime = 0
        this.dirtyFlag = false
        this.saveDebounceMs = 300 // Debounce time for save operations
    }

    /**
     * Initialize the settings service
     */
    async initialize() {
        if (this.isInitialized) return this.settings

        try {
            // Ensure data directory exists
            await this.ensureDirectory(this.dataDir)

            // Load settings into memory
            await this.loadSettings()

            // Set up auto-save for dirty settings
            this.setupAutoSave()

            this.isInitialized = true
            return this.settings
        } catch (error) {
            console.error("Failed to initialize settings service:", error)
            throw error
        }
    }

    /**
     * Ensure a directory exists, creating it if necessary
     */
    async ensureDirectory(dirPath) {
        try {
            if (!existsSync(dirPath)) {
                await mkdir(dirPath, { recursive: true })
            }
            return true
        } catch (error) {
            console.error(`Error ensuring directory ${dirPath}:`, error)
            return false
        }
    }

    /**
     * Load settings from file into memory cache
     */
    async loadSettings() {
        try {
            const defaultSettings = {
                siteTitle: "My Aether Site",
                siteDescription: "A site built with Aether",
                postsPerPage: 10,
                activeTheme: "default",
                footerCode: "Content in Motion. Powered by Aether.",
            }

            if (existsSync(this.settingsPath)) {
                try {
                    const data = await readFile(this.settingsPath, "utf8")
                    if (!data || data.trim() === "") {
                        // Empty file, use defaults
                        this.settings = { ...defaultSettings }
                    } else {
                        this.settings = JSON.parse(data)
                    }
                } catch (parseError) {
                    console.warn("Error parsing settings.json, using defaults:", parseError)
                    this.settings = { ...defaultSettings }
                }
            } else {
                // File doesn't exist, use defaults
                this.settings = { ...defaultSettings }
                // Create the file with defaults
                await this.saveSettingsToFile()
            }

            return this.settings
        } catch (error) {
            console.error("Error loading settings:", error)
            // Fallback to basic defaults if something goes wrong
            this.settings = {
                siteTitle: "My Aether Site",
                siteDescription: "An error occurred loading settings",
                activeTheme: "default",
                footerCode: "Content in Motion. Powered by Aether.",
            }
            return this.settings
        }
    }

    /**
     * Set up auto-save for dirty settings
     */
    setupAutoSave() {
        // Use a simple interval to check for dirty settings
        setInterval(async () => {
            if (this.dirtyFlag && Date.now() - this.lastSaveTime > this.saveDebounceMs) {
                await this.saveSettingsToFile()
                this.dirtyFlag = false
            }
        }, this.saveDebounceMs)
    }

    /**
     * Save settings to file
     */
    async saveSettingsToFile() {
        // Queue this save operation after any pending saves
        this.saveQueue = this.saveQueue.then(async () => {
            try {
                // Create the directory if it doesn't exist
                const dir = dirname(this.settingsPath)
                await this.ensureDirectory(dir)

                // Record the save time
                this.lastSaveTime = Date.now()

                // Write the file with pretty formatting
                await writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2), "utf8")

                return true
            } catch (error) {
                console.error("Error saving settings:", error)
                return false
            }
        })

        return this.saveQueue
    }

    /**
     * Get the current settings
     * @param {boolean} forceReload Force reload from disk
     */
    async getSettings(forceReload = false) {
        if (!this.isInitialized) {
            await this.initialize()
        } else if (forceReload) {
            await this.loadSettings()
        }

        // Return a copy to prevent accidental mutations
        return { ...this.settings }
    }

    /**
     * Update settings
     * @param {object} newSettings New settings to merge
     */
    async updateSettings(newSettings) {
        if (!this.isInitialized) {
            await this.initialize()
        }

        // Merge new settings with existing ones
        this.settings = { ...this.settings, ...newSettings }

        // Mark as dirty and schedule save
        this.dirtyFlag = true

        // If it's been a while since last save, save immediately
        if (Date.now() - this.lastSaveTime > this.saveDebounceMs) {
            await this.saveSettingsToFile()
            this.dirtyFlag = false
        }

        // Return a copy of updated settings
        return { ...this.settings }
    }

    /**
     * Get a specific setting by key
     * @param {string} key Setting key
     * @param {any} defaultValue Default value if key not found
     */
    async getSetting(key, defaultValue = null) {
        if (!this.isInitialized) {
            await this.initialize()
        }

        return this.settings[key] !== undefined ? this.settings[key] : defaultValue
    }

    /**
     * Set a specific setting by key
     * @param {string} key Setting key
     * @param {any} value New value
     */
    async setSetting(key, value) {
        if (!this.isInitialized) {
            await this.initialize()
        }

        // Only update and mark dirty if the value actually changed
        if (this.settings[key] !== value) {
            this.settings[key] = value
            this.dirtyFlag = true

            // If it's been a while since last save, save immediately
            if (Date.now() - this.lastSaveTime > this.saveDebounceMs) {
                await this.saveSettingsToFile()
                this.dirtyFlag = false
            }
        }

        return value
    }
}

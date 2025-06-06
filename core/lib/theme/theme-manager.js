/**
 * Core Theme Manager that orchestrates all theme-related modules
 */
import { ThemeDiscovery } from "./modules/theme-discovery.js"
import { ThemeTemplateResolver } from "./modules/theme-template-resolver.js"
import { ThemeInstaller } from "./modules/theme-installer.js"

/**
 * Main Theme Manager class that coordinates all theme-related functionality
 */
export class ThemeManager {
    /**
     * @param {string} themesDir - Directory containing themes
     * @param {Object} settingsService - Settings service
     * @param {Object} menuManager - Global menu manager
     */
    constructor(themesDir, settingsService, menuManager) {
        this.themesDir = themesDir
        this.themes = new Map()
        this.activeTheme = null
        this.settingsService = settingsService
        this.menuManager = menuManager // Global menu manager

        // Initialize theme-related modules
        this.discovery = new ThemeDiscovery(themesDir)
        this.templateResolver = new ThemeTemplateResolver(themesDir)
        this.installer = new ThemeInstaller(themesDir)
    }

    /**
     * Initialize the theme manager
     */
    async initialize() {
        try {
            // Discover available themes
            await this.refreshThemes()

            // Load active theme from settings
            const settings = await this.settingsService.getSettings()
            const activeThemeName = settings.activeTheme || "default"

            if (this.themes.has(activeThemeName)) {
                this.activeTheme = this.themes.get(activeThemeName)
            } else {
                // Fall back to default theme if active theme not found
                this.activeTheme = this.discovery.findDefaultTheme(this.themes)

                // Update settings with the fallback theme
                if (this.activeTheme) {
                    await this.settingsService.setSetting("activeTheme", this.activeTheme.name)
                }
            }

            if (!this.activeTheme) {
                throw new Error("No themes available")
            }

            return true
        } catch (error) {
            console.error("Theme initialization error:", error)
            throw error
        }
    }

    /**
     * Refresh themes by rediscovering them
     */
    async refreshThemes() {
        this.themes = await this.discovery.discoverThemes()
        return this.themes
    }

    /**
     * Get all available themes
     * @returns {Array} Array of theme objects
     */
    getAvailableThemes() {
        return Array.from(this.themes.values())
    }

    /**
     * Get the currently active theme
     * @returns {Object} Active theme object
     */
    getActiveTheme() {
        return this.activeTheme
    }

    /**
     * Switch to a different theme
     * @param {string} themeName - Name of the theme to switch to
     */
    async switchTheme(themeName) {
        if (!this.themes.has(themeName)) {
            throw new Error(`Theme "${themeName}" not found`)
        }

        const newTheme = this.themes.get(themeName)
        this.activeTheme = newTheme

        // Update settings
        await this.settingsService.setSetting("activeTheme", themeName)

        return newTheme
    }

    /**
     * Get a specific template from the active theme in the default "templates" directory
     * @param {string} templateName - Name of the template (e.g., "index.html")
     * @returns {string} Full path to the template
     */
    getTemplatePath(templateName) {
        return this.templateResolver.getTemplatePath(this.activeTheme, templateName)
    }

    /**
     * Get a specific template from the active theme in a custom directory
     * @param {string} templateDir - Custom directory of the template (e.g., "custom")
     * @param {string} templateName - Name of the template (e.g., "contact.html")
     * @returns {string} Full path to the template
     */
    getCustomTemplatePath(templateDir, templateName) {
        return this.templateResolver.getCustomTemplatePath(this.activeTheme, templateDir, templateName)
    }

    /**
     * Get a stream for a theme asset
     * @param {string} assetPath - Path to the asset relative to the theme's assets directory
     * @returns {ReadStream} Stream for the asset
     */
    getAssetStream(assetPath) {
        return this.templateResolver.getAssetStream(this.activeTheme, assetPath)
    }

    /**
     * Load settings from the settings service
     * @returns {Promise<Object>} Settings object
     */
    async loadSettings() {
        return await this.settingsService.getSettings()
    }

    /**
     * Save settings via the settings service
     * @param {Object} settings - Settings object to save
     * @returns {Promise<boolean>} Success or failure
     */
    async saveSettings(settings) {
        return await this.settingsService.updateSettings(settings)
    }

    /**
     * Delete a theme
     * @param {string} themeName - Name of the theme to delete
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteTheme(themeName) {
        const result = await this.installer.deleteTheme(themeName, this.activeTheme, this.themes)

        // If successful, remove from themes map
        if (result) {
            this.themes.delete(themeName)
        }

        return result
    }

    /**
     * Install a theme from a zip file
     * @param {string} zipFilePath - Path to the uploaded zip file
     * @returns {Promise<Object>} The installed theme
     */
    async installTheme(zipFilePath) {
        // Use a helper function to provide the discoverThemes method to the installer
        const discoverThemesFn = async () => {
            return await this.discovery.discoverThemes()
        }

        const newTheme = await this.installer.installTheme(zipFilePath, discoverThemesFn)

        // Rediscover all themes to include the new one
        // Immediately refresh themes after installation
        await this.refreshThemes()

        return newTheme
    }

    /**
     * Install theme from marketplace and immediately make it available
     */
    async installThemeFromMarketplace(themeName, marketplaceDownloadFn) {
        try {
            // Download theme
            const themeBuffer = await marketplaceDownloadFn(themeName)

            // Save as temporary file
            const tempFilePath = await this.installer.saveTempFile(themeBuffer, `${themeName}.zip`)

            // Install theme
            const installedTheme = await this.installTheme(tempFilePath)

            // Ensure the theme is available immediately
            await this.refreshThemes()

            // Double-check the theme is in our collection
            if (!this.themes.has(installedTheme.name)) {
                throw new Error("Theme installed but not found in themes collection")
            }

            return installedTheme
        } catch (error) {
            console.error("Marketplace installation error:", error)
            throw error
        }
    }

    /**
     * Save a temporary file for theme upload
     * @param {Buffer} fileData - The file data
     * @param {string} filename - The original filename
     * @returns {Promise<string>} Path to the saved temporary file
     */
    async saveTempFile(fileData, filename) {
        return this.installer.saveTempFile(fileData, filename)
    }

    /**
     * Refresh the active theme based on current settings
     * @returns {Promise<boolean>} Success or failure
     */
    async refreshActiveTheme() {
        try {
            // Load settings to get the current activeTheme
            const settings = await this.settingsService.getSettings()
            const activeThemeName = settings.activeTheme || "default"

            // Update the activeTheme property if the theme exists
            if (this.themes.has(activeThemeName)) {
                this.activeTheme = this.themes.get(activeThemeName)
                return true
            } else {
                console.warn(`Theme refresh failed: '${activeThemeName}' not found in available themes`)
                return false
            }
        } catch (error) {
            console.error("Error refreshing active theme:", error)
            return false
        }
    }

    // Menu Management Methods - delegate to the global menu manager

    /**
     * Get the menu structure
     * @returns {Promise<Array>} Menu structure
     */
    async getThemeMenu() {
        return this.menuManager.getMenuItems()
    }

    /**
     * Save the menu structure
     * @param {Array} menuItems - The menu items to save
     * @returns {Promise<boolean>} Success or failure
     */
    async saveThemeMenu(menuItems) {
        return this.menuManager.saveMenu(menuItems)
    }

    /**
     * Build a hierarchical menu structure from flat menu items
     * @param {Array} menuItems - Flat array of menu items with parent references
     * @returns {Array} Hierarchical menu structure
     */
    buildMenuHierarchy(menuItems) {
        return this.menuManager.buildMenuHierarchy(menuItems)
    }

    /**
     * Flatten a hierarchical menu structure for storage
     * @param {Array} hierarchicalItems - Hierarchical menu structure
     * @returns {Array} Flat array of menu items with parent references
     */
    flattenMenuHierarchy(hierarchicalItems) {
        return this.menuManager.flattenMenuHierarchy(hierarchicalItems)
    }

    /**
     * Create a new menu item
     * @param {Object} menuItem - The menu item to create
     * @returns {Promise<boolean>} Success or failure
     */
    async createMenuItem(menuItem) {
        return this.menuManager.createMenuItem(menuItem)
    }

    /**
     * Update a menu item
     * @param {string} id - ID of the menu item to update
     * @param {Object} updates - Properties to update
     * @returns {Promise<boolean>} Success or failure
     */
    async updateMenuItem(id, updates) {
        return this.menuManager.updateMenuItem(id, updates)
    }

    /**
     * Delete a menu item
     * @param {string} id - ID of the menu item to delete
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteMenuItem(id) {
        return this.menuManager.deleteMenuItem(id)
    }

    /**
     * Reorder menu items
     * @param {Array<string>} orderedIds - Array of menu item IDs in the new order
     * @returns {Promise<boolean>} Success or failure
     */
    async reorderMenuItems(orderedIds) {
        return this.menuManager.reorderMenuItems(orderedIds)
    }

    /**
     * Generate HTML for a theme menu
     * @returns {Promise<string>} HTML for the menu
     */
    async generateMenuHtml() {
        return this.menuManager.generateMenuHtml()
    }

    /**
     * Add the menu to the template data
     * @param {Object} templateData - The template data object
     * @returns {Promise<Object>} The updated template data
     */
    async addMenuToTemplateData(templateData) {
        return this.menuManager.addMenuToTemplateData(templateData)
    }
}

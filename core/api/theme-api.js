import { ThemeMarketplaceCDN } from "../lib/theme/modules/theme-marketplace-cdn.js"

// Initialize CDN marketplace instance
const marketplace = new ThemeMarketplaceCDN({
    cdnUrl: process.env.THEME_MARKETPLACE_CDN || "https://lebcit.github.io/aether-themes",
})

/**
 * Sets up API routes for theme management
 * @param {Object} app - LiteNode app instance
 * @param {Object} options - Configuration options object containing:
 *   @param {Object} themeManager - Used for all theme operations (required)
 *   @param {Object} fileStorage - Used for theme upload functionality
 *   @param {Object} authenticate - Used to secure API endpoints
 *   @param {Object} contentManager - Included for consistency with other API setups but not currently used
 *   @param {Object} settingsService - Included for consistency with other API setups but not currently used
 *                                     (theme settings are managed through themeManager)
 *   @param {Object} menuManager - Global menu manager for menu-related operations
 */
export function setupThemeApi(app, systems) {
    const { themeManager, fileStorage, contentManager, settingsService, authenticate, menuManager } = systems

    // Get all available themes
    app.get("/api/themes", authenticate, async (req, res) => {
        try {
            const themes = themeManager.getAvailableThemes()
            res.json({ success: true, data: themes })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get active theme
    app.get("/api/themes/active", authenticate, async (req, res) => {
        try {
            const theme = themeManager.getActiveTheme()
            res.json({ success: true, data: theme })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get specific theme by name
    app.get("/api/themes/:themeName", authenticate, async (req, res) => {
        try {
            const { themeName } = req.params

            // Get all themes
            const availableThemes = themeManager.getAvailableThemes()

            // Find the requested theme
            const theme = availableThemes.find((theme) => theme.name === themeName)

            if (!theme) {
                return res.status(404).json({ success: false, error: "Theme not found" })
            }

            res.json({ success: true, data: theme })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Switch to a different theme
    app.post("/api/themes/switch/:themeName", authenticate, async (req, res) => {
        try {
            const themeName = req.body

            // Check if theme exists
            const availableThemes = themeManager.getAvailableThemes()
            const themeExists = availableThemes.some((theme) => theme.name === themeName)

            if (!themeExists) {
                return res.status(404).json({ success: false, error: "Theme not found" })
            }

            // Switch the theme
            const newTheme = await themeManager.switchTheme(themeName)

            // No need to force reload settings in content manager, as both now use the same settingsService

            res.json({ success: true, data: newTheme })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Delete a theme
    app.delete("/api/themes/:themeName", authenticate, async (req, res) => {
        try {
            const { themeName } = req.params

            // Get active theme
            const activeTheme = themeManager.getActiveTheme()

            // Don't allow deleting the active theme
            if (activeTheme.name === themeName) {
                return res.status(400).json({
                    success: false,
                    error: "Cannot delete the active theme. Please switch to another theme first.",
                })
            }

            // Check if theme exists
            const availableThemes = themeManager.getAvailableThemes()
            const themeToDelete = availableThemes.find((theme) => theme.name === themeName)

            if (!themeToDelete) {
                return res.status(404).json({ success: false, error: "Theme not found" })
            }

            // Delete the theme
            await themeManager.deleteTheme(themeName)

            res.json({ success: true, message: `Theme "${themeName}" has been deleted successfully` })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Upload a new theme
    app.post("/api/themes/upload", authenticate, async (req, res) => {
        try {
            // Check if there are files in the request body
            if (!req.body || !req.body.theme || !req.body.theme.length) {
                return res.status(400).json({ success: false, error: "No theme package uploaded" })
            }

            // Get the file from the request body
            const fileData = req.body.theme[0]

            if (!fileData || !fileData.body) {
                return res.status(400).json({ success: false, error: "Invalid file data" })
            }

            // Check if it's a zip file
            if (fileData.contentType !== "application/zip" && !fileData.filename.endsWith(".zip")) {
                return res.status(400).json({ success: false, error: "Only ZIP files are allowed" })
            }

            // Save the file temporarily
            const tempFilePath = await themeManager.saveTempFile(fileData.body, fileData.filename)

            // Install the theme
            const installedTheme = await themeManager.installTheme(tempFilePath)

            // Return success response
            res.status(201).json({
                success: true,
                data: installedTheme,
                message: `Theme "${installedTheme.info.title}" has been installed successfully`,
            })
        } catch (error) {
            console.error("Theme upload error:", error)

            // Enhanced error handling to extract validation details
            let errorMessage = "Failed to upload theme"

            // Check if this is a theme.json validation error
            if (error.message.includes("Invalid theme.json:")) {
                // Extract the validation errors and split them into an array
                const validationErrorsText = error.message.replace("Invalid theme.json:", "").trim()
                const validationErrors = validationErrorsText.split(", ")

                // Send both a generic message and the array of detailed validation errors
                res.status(400).json({
                    success: false,
                    error: "Theme validation failed",
                    validationErrors: validationErrors, // Array of individual errors
                    message: `Theme validation failed: ${validationErrorsText}`,
                })
            } else {
                // Handle other types of errors
                res.status(500).json({
                    success: false,
                    error: errorMessage,
                    message: error.message || "Failed to upload theme",
                })
            }
        }
    })

    // ========== CDN MARKETPLACE ENDPOINTS ==========

    // Get all themes from CDN marketplace
    app.get("/api/themes/marketplace", authenticate, async (req, res) => {
        try {
            // Get query parameters using LiteNode's method
            const queryParams = req.queryParams || new URLSearchParams(req.url.split("?")[1] || "")
            const search = queryParams.get("search") || ""
            const category = queryParams.get("category") || ""
            const sort = queryParams.get("sort") || "date"

            // Get all themes from CDN
            let themes = await marketplace.getAvailableThemes()

            // Apply search filter
            if (search) {
                themes = marketplace.searchThemes(search, themes)
            }

            // Apply category filter
            if (category) {
                themes = marketplace.filterByCategory(category, themes)
            }

            // Apply sorting
            if (sort) {
                themes = marketplace.sortThemes(sort, themes)
            }

            res.json({
                success: true,
                data: themes,
                total: themes.length,
                source: "cdn",
            })
        } catch (error) {
            console.error("CDN Marketplace fetch error:", error)
            res.status(500).json({
                success: false,
                error: "Failed to fetch marketplace themes",
                details: error.message,
            })
        }
    })

    // Get single theme details from CDN marketplace
    app.get("/api/themes/marketplace/:themeName", authenticate, async (req, res) => {
        try {
            const { themeName } = req.params
            const themeDetails = await marketplace.getThemeDetails(themeName)

            if (!themeDetails) {
                return res.status(404).json({
                    success: false,
                    error: "Theme not found in marketplace",
                })
            }

            res.json({ success: true, data: themeDetails })
        } catch (error) {
            res.status(500).json({
                success: false,
                error: "Failed to fetch theme details",
                details: error.message,
            })
        }
    })

    // Install theme from CDN marketplace
    app.post("/api/themes/marketplace/install", authenticate, async (req, res) => {
        try {
            const { themeName } = req.body

            if (!themeName) {
                return res.status(400).json({
                    success: false,
                    error: "Theme name required",
                })
            }

            // Check if theme exists in marketplace
            const themeDetails = await marketplace.getThemeDetails(themeName)
            if (!themeDetails) {
                return res.status(404).json({
                    success: false,
                    error: "Theme not found in marketplace",
                })
            }

            // Check if theme is already installed
            const installedThemes = themeManager.getAvailableThemes()
            const alreadyInstalled = installedThemes.find(
                (theme) => theme.name === themeName || theme.info.title === themeDetails.title
            )

            if (alreadyInstalled) {
                return res.status(409).json({
                    success: false,
                    error: "Theme is already installed",
                })
            }

            // Download theme from CDN marketplace
            const themeBuffer = await marketplace.downloadTheme(themeName)

            // Save as temporary file
            const tempFilePath = await themeManager.installer.saveTempFile(themeBuffer, `${themeName}.zip`)

            // Install using existing ZIP installation method
            const discoverThemesFn = async () => {
                return await themeManager.discovery.discoverThemes()
            }

            const installedTheme = await themeManager.installer.installTheme(tempFilePath, discoverThemesFn)

            // IMPORTANT: Refresh the themes in ThemeManager after installation
            await themeManager.initialize()

            // Directly update the themes map
            // This ensures the new theme is immediately available
            const updatedThemes = await themeManager.discovery.discoverThemes()
            themeManager.themes = updatedThemes

            // Verify the theme is now available
            const refreshedThemes = themeManager.getAvailableThemes()
            const isNowAvailable = refreshedThemes.find((theme) => theme.name === installedTheme.name)

            res.status(201).json({
                success: true,
                data: installedTheme,
                message: `Theme "${installedTheme.info.title}" installed successfully from marketplace`,
                themeCount: refreshedThemes.length,
                isAvailable: !!isNowAvailable,
            })
        } catch (error) {
            console.error("CDN Marketplace installation error:", error)
            res.status(500).json({
                success: false,
                error: "Failed to install theme from marketplace",
                details: error.message,
            })
        }
    })

    // Refresh themes without restarting
    app.get("/api/themes/refresh", authenticate, async (req, res) => {
        try {
            // Rediscover all themes
            await themeManager.discovery.discoverThemes()

            // Reinitialize theme manager
            await themeManager.initialize()

            // Get updated theme list
            const themes = themeManager.getAvailableThemes()

            res.json({
                success: true,
                data: themes,
                message: "Themes refreshed successfully",
                count: themes.length,
            })
        } catch (error) {
            console.error("Theme refresh error:", error)
            res.status(500).json({
                success: false,
                error: "Failed to refresh themes",
                details: error.message,
            })
        }
    })

    // Get theme categories/tags from CDN marketplace
    app.get("/api/themes/marketplace/categories", authenticate, async (req, res) => {
        try {
            const categories = await marketplace.getCategories()

            res.json({
                success: true,
                data: categories,
            })
        } catch (error) {
            res.status(500).json({
                success: false,
                error: "Failed to fetch theme categories",
                details: error.message,
            })
        }
    })

    // Get marketplace metadata (CDN-specific)
    app.get("/api/themes/marketplace/metadata", authenticate, async (req, res) => {
        try {
            const metadata = await marketplace.getMarketplaceMetadata()

            res.json({
                success: true,
                data: metadata,
            })
        } catch (error) {
            res.status(500).json({
                success: false,
                error: "Failed to fetch marketplace metadata",
                details: error.message,
            })
        }
    })

    // Check for updates on installed themes (CDN version)
    // Enhanced check-updates endpoint with better error handling
    app.get("/api/themes/marketplace/check-updates", authenticate, async (req, res) => {
        try {
            const installedThemes = themeManager.getAvailableThemes()

            if (!installedThemes || installedThemes.length === 0) {
                return res.json({
                    success: true,
                    data: [],
                    hasUpdates: false,
                    message: "No themes installed",
                })
            }

            let marketplaceThemes
            try {
                marketplaceThemes = await marketplace.getAvailableThemes()
            } catch (marketplaceError) {
                // Handle marketplace API failures gracefully
                console.warn("Marketplace API error:", marketplaceError)
                return res.json({
                    success: true,
                    data: [],
                    hasUpdates: false,
                    error: "Unable to check marketplace for updates. Please try again later.",
                })
            }

            const updates = []

            for (const installed of installedThemes) {
                try {
                    // Skip if theme info is missing
                    if (!installed.info || !installed.info.version) {
                        console.warn(`Skipping ${installed.name}: missing version info`)
                        continue
                    }

                    // Try to find matching theme in marketplace
                    const marketplaceTheme = marketplaceThemes.find(
                        (theme) =>
                            theme.marketplaceName === installed.name ||
                            theme.title === installed.info.title ||
                            // Fallback: check if titles match (case-insensitive)
                            theme.title.toLowerCase() === installed.info.title.toLowerCase()
                    )

                    if (marketplaceTheme) {
                        // Validate versions before comparing
                        const installedVersion = installed.info.version
                        const latestVersion = marketplaceTheme.version

                        if (!installedVersion || !latestVersion) {
                            console.warn(`Invalid version info for ${installed.name}`)
                            continue
                        }

                        // Compare versions safely
                        try {
                            if (marketplace.compareVersions(latestVersion, installedVersion) > 0) {
                                updates.push({
                                    name: installed.name,
                                    title: installed.info.title,
                                    currentVersion: installedVersion,
                                    latestVersion: latestVersion,
                                    marketplaceName: marketplaceTheme.marketplaceName,
                                    changelog: marketplaceTheme.changelog || null,
                                    updateUrl: marketplaceTheme.sourceRepo,
                                    description: installed.info.description,
                                })
                            }
                        } catch (versionError) {
                            console.warn(`Version comparison failed for ${installed.name}:`, versionError)
                            continue
                        }
                    }
                } catch (themeError) {
                    console.error(`Error checking updates for ${installed.name}:`, themeError)
                    // Continue with other themes
                    continue
                }
            }

            res.json({
                success: true,
                data: updates,
                hasUpdates: updates.length > 0,
                totalInstalled: installedThemes.length,
                checkedAt: new Date().toISOString(),
            })
        } catch (error) {
            console.error("Error checking for theme updates:", error)
            res.status(500).json({
                success: false,
                error: "Failed to check for theme updates",
                details: error.message,
                data: [],
                hasUpdates: false,
            })
        }
    })

    // Update a theme from CDN marketplace
    // Enhanced update endpoint with better error handling
    app.post("/api/themes/marketplace/update", authenticate, async (req, res) => {
        try {
            const { themeName } = req.body

            if (!themeName) {
                return res.status(400).json({
                    success: false,
                    error: "Theme name required",
                })
            }

            // Find installed theme with better error handling
            const installedThemes = themeManager.getAvailableThemes()
            const installedTheme = installedThemes.find((theme) => theme.name === themeName)

            if (!installedTheme) {
                return res.status(404).json({
                    success: false,
                    error: `Theme "${themeName}" not found`,
                })
            }

            // Check if it's the active theme
            const activeTheme = themeManager.getActiveTheme()
            if (activeTheme.name === themeName) {
                return res.status(400).json({
                    success: false,
                    error: "Cannot update the active theme. Please switch to another theme first.",
                })
            }

            // Get marketplace version with error handling
            let marketplaceThemes
            try {
                marketplaceThemes = await marketplace.getAvailableThemes()
            } catch (marketplaceError) {
                return res.status(503).json({
                    success: false,
                    error: "Unable to connect to marketplace. Please try again later.",
                    details: marketplaceError.message,
                })
            }

            const marketplaceTheme = marketplaceThemes.find(
                (theme) =>
                    theme.marketplaceName === themeName ||
                    theme.title === installedTheme.info.title ||
                    theme.title.toLowerCase() === installedTheme.info.title.toLowerCase()
            )

            if (!marketplaceTheme) {
                return res.status(404).json({
                    success: false,
                    error: "Theme not found in marketplace",
                })
            }

            // Validate that there's actually an update available
            if (!installedTheme.info.version || !marketplaceTheme.version) {
                return res.status(400).json({
                    success: false,
                    error: "Version information missing",
                })
            }

            if (marketplace.compareVersions(marketplaceTheme.version, installedTheme.info.version) <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "No update available. Current version is already up to date.",
                    currentVersion: installedTheme.info.version,
                    latestVersion: marketplaceTheme.version,
                })
            }

            // Download and install the update with comprehensive error handling
            let themeBuffer
            try {
                themeBuffer = await marketplace.downloadTheme(marketplaceTheme.marketplaceName)
            } catch (downloadError) {
                return res.status(503).json({
                    success: false,
                    error: "Failed to download theme update",
                    details: downloadError.message,
                })
            }

            let tempFilePath
            try {
                tempFilePath = await themeManager.installer.saveTempFile(themeBuffer, `${themeName}-update.zip`)
            } catch (saveError) {
                return res.status(500).json({
                    success: false,
                    error: "Failed to save theme update file",
                    details: saveError.message,
                })
            }

            // Backup current theme settings if they exist
            let themeSettings = null
            try {
                // This would need to be implemented in your theme manager
                // themeSettings = await themeManager.getThemeSettings(themeName)
            } catch (settingsError) {
                console.warn("Could not backup theme settings:", settingsError)
            }

            // Delete old theme with error handling
            try {
                await themeManager.deleteTheme(themeName)
            } catch (deleteError) {
                // Clean up temp file
                await themeManager.installer.safeDelete(tempFilePath)

                return res.status(500).json({
                    success: false,
                    error: "Failed to remove old theme version",
                    details: deleteError.message,
                })
            }

            // Install new version
            let updatedTheme
            try {
                const discoverThemesFn = async () => {
                    return await themeManager.discovery.discoverThemes()
                }

                updatedTheme = await themeManager.installer.installTheme(tempFilePath, discoverThemesFn)
            } catch (installError) {
                // This is a critical error - the old theme is gone but new one failed
                // We should log this and possibly try to restore from a backup
                console.error("Critical error: Theme update failed, old theme was removed:", installError)

                return res.status(500).json({
                    success: false,
                    error: "Failed to install theme update. Old theme was removed.",
                    details: installError.message,
                    critical: true,
                })
            }

            // Restore settings if they were backed up
            if (themeSettings) {
                try {
                    // This would need to be implemented
                    // await themeManager.restoreThemeSettings(updatedTheme.name, themeSettings)
                } catch (restoreError) {
                    console.warn("Could not restore theme settings:", restoreError)
                    // Don't fail the update for this
                }
            }

            // Update the theme manager's internal state
            await themeManager.refreshThemes()

            res.json({
                success: true,
                data: updatedTheme,
                message: `Theme "${updatedTheme.info.title}" updated successfully from v${installedTheme.info.version} to v${updatedTheme.info.version}`,
                changelog: marketplaceTheme.changelog || null,
            })
        } catch (error) {
            console.error("Theme update error:", error)
            res.status(500).json({
                success: false,
                error: "Failed to update theme",
                details: error.message,
            })
        }
    })

    // Changelog endpoint
    app.get("/api/themes/marketplace/changelog/:themeName/:version?", authenticate, async (req, res) => {
        try {
            const { themeName, version } = req.params

            if (!themeName) {
                return res.status(400).json({
                    success: false,
                    error: "Theme name required",
                })
            }

            // Get theme details from marketplace
            let marketplaceTheme
            try {
                marketplaceTheme = await marketplace.getThemeDetails(themeName)
            } catch (error) {
                console.error("Marketplace error:", error)
                return res.status(503).json({
                    success: false,
                    error: "Unable to connect to marketplace",
                    details: error.message,
                })
            }

            if (!marketplaceTheme) {
                return res.status(404).json({
                    success: false,
                    error: "Theme not found in marketplace",
                })
            }

            // Check if theme has changelog data
            if (!marketplaceTheme.changelog || typeof marketplaceTheme.changelog !== "object") {
                return res.json({
                    success: true,
                    data: {
                        version: version || marketplaceTheme.version,
                        changes: [],
                        message: "No changelog available for this version",
                    },
                })
            }

            // If version is specified, get that specific version's changelog
            if (version) {
                const versionChanges = marketplaceTheme.changelog[version]

                if (!versionChanges) {
                    return res.status(404).json({
                        success: false,
                        error: `No changelog found for version ${version}`,
                    })
                }

                return res.json({
                    success: true,
                    data: {
                        version: version,
                        changes: Array.isArray(versionChanges) ? versionChanges : [versionChanges],
                        releaseDate: marketplaceTheme.releases?.[version]?.date || null,
                    },
                })
            }

            // If no version specified, return changelog for the latest version
            const latestVersion = marketplaceTheme.version
            const latestChanges = marketplaceTheme.changelog[latestVersion]

            // Also get changes since the currently installed version if possible
            let fullChangelog = []
            let installedVersion = null

            try {
                const installedThemes = themeManager.getAvailableThemes()
                const installed = installedThemes.find(
                    (t) => t.name === themeName || t.info.title === marketplaceTheme.title
                )

                if (installed && installed.info.version) {
                    installedVersion = installed.info.version

                    // Collect all changes since installed version
                    const allVersions = Object.keys(marketplaceTheme.changelog).sort(marketplace.compareVersions)

                    for (const ver of allVersions) {
                        if (marketplace.compareVersions(ver, installedVersion) > 0) {
                            const changes = marketplaceTheme.changelog[ver]

                            fullChangelog.push({
                                version: ver,
                                changes: Array.isArray(changes) ? changes : [changes],
                                releaseDate: marketplaceTheme.releases?.[ver]?.date || null,
                            })
                        }
                    }
                }
            } catch (error) {
                console.warn("Could not determine installed version:", error)
            }

            res.json({
                success: true,
                data: {
                    latestVersion: latestVersion,
                    installedVersion: installedVersion,
                    latestChanges: Array.isArray(latestChanges) ? latestChanges : [latestChanges],
                    fullChangelog: fullChangelog,
                    hasChanges: fullChangelog.length > 0,
                },
            })
        } catch (error) {
            console.error("Changelog fetch error:", error)
            res.status(500).json({
                success: false,
                error: "Failed to fetch changelog",
                details: error.message,
            })
        }
    })

    // MENU API ROUTES - Now using the global menu manager

    // Get global menu
    app.get("/api/menu", authenticate, async (req, res) => {
        try {
            const menu = await menuManager.loadMenu()
            res.json({ success: true, data: menu })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Update global menu
    app.put("/api/menu", authenticate, async (req, res) => {
        try {
            const menuItems = req.body

            if (!Array.isArray(menuItems)) {
                return res.status(400).json({
                    success: false,
                    error: "Menu items must be an array",
                })
            }

            // Enhance the menu items before saving
            const enhancedMenuItems = menuManager.enhanceMenuItems(menuItems)

            // Save the enhanced menu
            const success = await menuManager.saveMenu(enhancedMenuItems)

            if (success) {
                res.json({ success: true, message: "Menu updated successfully" })
            } else {
                res.status(500).json({
                    success: false,
                    error: "Failed to update menu",
                })
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Create menu item
    app.post("/api/menu", authenticate, async (req, res) => {
        try {
            const menuItem = req.body

            // Validate required fields
            if (!menuItem.id || !menuItem.title || !menuItem.url) {
                return res.status(400).json({
                    success: false,
                    error: "Menu item must include id, title, and url",
                })
            }

            // Create the menu item
            const success = await menuManager.createMenuItem(menuItem)

            if (success) {
                res.status(201).json({
                    success: true,
                    message: "Menu item created successfully",
                })
            } else {
                res.status(500).json({
                    success: false,
                    error: "Failed to create menu item",
                })
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Update menu item
    app.put("/api/menu/:itemId", authenticate, async (req, res) => {
        try {
            const { itemId } = req.params
            const updates = req.body

            // Update the menu item
            const success = await menuManager.updateMenuItem(itemId, updates)

            if (success) {
                res.json({ success: true, message: "Menu item updated successfully" })
            } else {
                res.status(500).json({
                    success: false,
                    error: "Failed to update menu item",
                })
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Delete menu item
    app.delete("/api/menu/:itemId", authenticate, async (req, res) => {
        try {
            const { itemId } = req.params

            // Delete the menu item
            const success = await menuManager.deleteMenuItem(itemId)

            if (success) {
                res.json({ success: true, message: "Menu item deleted successfully" })
            } else {
                res.status(500).json({
                    success: false,
                    error: "Failed to delete menu item",
                })
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Reorder menu items
    app.put("/api/menu/reorder", authenticate, async (req, res) => {
        try {
            const { orderedIds } = req.body

            if (!Array.isArray(orderedIds)) {
                return res.status(400).json({
                    success: false,
                    error: "orderedIds must be an array of menu item IDs",
                })
            }

            // Reorder the menu
            const success = await menuManager.reorderMenuItems(orderedIds)

            if (success) {
                res.json({ success: true, message: "Menu reordered successfully" })
            } else {
                res.status(500).json({
                    success: false,
                    error: "Failed to reorder menu",
                })
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })
}

/**
 * Theme discovery and validation module
 */
import { join, normalize, sep } from "node:path"
import { readdir, readFile } from "node:fs/promises"

export class ThemeDiscovery {
    /**
     * @param {string} themesDir - Directory containing themes
     */
    constructor(themesDir) {
        this.themesDir = themesDir
    }

    /**
     * Normalize path for consistent API responses (converts OS-specific separators to forward slashes)
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path with forward slashes
     */
    normalizePath(path) {
        return normalize(path).split(sep).join("/")
    }

    /**
     * Discover available themes in the themes directory
     * @returns {Promise<Map<string, Object>>} Map of theme name to theme info
     */
    async discoverThemes() {
        const themes = new Map()

        try {
            const themeDirectories = await readdir(this.themesDir, { withFileTypes: true })

            for (const dirent of themeDirectories) {
                if (dirent.isDirectory()) {
                    // Skip "_temp" and "_temp_extract" directories
                    if (dirent.name.startsWith("_temp")) continue

                    try {
                        const themePath = join(this.themesDir, dirent.name)
                        const themeJsonPath = join(themePath, "theme.json")

                        // Read theme.json
                        const themeData = await readFile(themeJsonPath, "utf8")
                        const themeInfo = JSON.parse(themeData)

                        themes.set(dirent.name, {
                            name: dirent.name,
                            path: this.normalizePath(themePath), // Normalize the path
                            info: themeInfo,
                        })
                    } catch (err) {
                        console.warn(`Error loading theme "${dirent.name}":`, err.message)
                    }
                }
            }

            return themes
        } catch (error) {
            console.error("Error discovering themes:", error.message)
            return new Map()
        }
    }

    /**
     * Check if a theme exists
     * @param {Map<string, Object>} themes - Map of themes
     * @param {string} themeName - Name of theme to check
     * @returns {boolean} Whether the theme exists
     */
    themeExists(themes, themeName) {
        return themes.has(themeName)
    }

    /**
     * Find the default theme
     * @param {Map<string, Object>} themes - Map of themes
     * @returns {Object|null} Default theme or null if not found
     */
    findDefaultTheme(themes) {
        // Try to find the "default" theme first
        if (themes.has("default")) {
            return themes.get("default")
        }

        // If not found, use the first theme
        if (themes.size > 0) {
            return Array.from(themes.values())[0]
        }

        return null
    }
}

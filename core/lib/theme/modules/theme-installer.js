/**
 * Theme installation and file operations
 */
import { join } from "node:path"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import AdmZip from "adm-zip"
import { validateThemeJSON } from "../utils/validate-theme-json.js"
import { copyDirectory, safeDelete } from "../utils/file-utils.js"

export class ThemeInstaller {
    /**
     * @param {string} themesDir - Directory containing themes
     */
    constructor(themesDir) {
        this.themesDir = themesDir
        this.tempDir = join(themesDir, "_temp")
        this.extractDir = join(themesDir, "_temp_extract")
    }

    /**
     * Install a theme from a zip file
     * @param {string} zipFilePath - Path to the uploaded zip file
     * @param {Function} discoverThemes - Function to rediscover themes after installation
     * @returns {Promise<Object>} The installed theme
     */
    async installTheme(zipFilePath, discoverThemes) {
        try {
            // Create a new AdmZip instance
            const zip = new AdmZip(zipFilePath)

            // Clean up any previous extraction attempts
            await safeDelete(this.extractDir)

            // Create the extraction directory
            await mkdir(this.extractDir, { recursive: true })

            // Extract the zip file
            zip.extractAllTo(this.extractDir, true)

            // Look for theme.json to validate it's a proper theme
            let themeJsonPath
            let themeSourceDir = this.extractDir
            let themeInfo

            // First, check the root of the extraction directory
            if (existsSync(join(this.extractDir, "theme.json"))) {
                themeJsonPath = join(this.extractDir, "theme.json")
            } else {
                // Check for first-level subdirectories
                const entries = await readdir(this.extractDir, { withFileTypes: true })
                let found = false

                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const potentialThemeJsonPath = join(this.extractDir, entry.name, "theme.json")

                        if (existsSync(potentialThemeJsonPath)) {
                            themeJsonPath = potentialThemeJsonPath
                            themeSourceDir = join(this.extractDir, entry.name)
                            found = true
                            break
                        }
                    }
                }

                if (!found) {
                    throw new Error("Invalid theme package: theme.json not found")
                }
            }

            // Validate the theme.json file before proceeding
            const validationResult = validateThemeJSON(themeJsonPath)

            if (!validationResult.valid) {
                // Cleanup extraction directory
                await safeDelete(this.extractDir)

                // Throw comprehensive validation error
                throw new Error(`Invalid theme.json: ${validationResult.errors.join(", ")}`)
            }

            // Note: We no longer check or create menu.json since menus are now global

            // Check if the required template files exist
            const requiredTemplates = ["layout.html"]
            const templateDir = join(themeSourceDir, "templates")

            if (!existsSync(templateDir)) {
                // Cleanup extraction directory
                await safeDelete(this.extractDir)
                throw new Error("Invalid theme package: templates directory not found")
            }

            const missingTemplates = requiredTemplates.filter((template) => !existsSync(join(templateDir, template)))

            if (missingTemplates.length > 0) {
                // Cleanup extraction directory
                await safeDelete(this.extractDir)
                throw new Error(`Invalid theme: missing required templates: ${missingTemplates.join(", ")}`)
            }

            // Ensure CSS files exist
            const assetsDir = join(themeSourceDir, "assets")
            const cssDir = join(assetsDir, "css")

            if (!existsSync(cssDir) || !existsSync(join(cssDir, "style.css"))) {
                // Cleanup extraction directory
                await safeDelete(this.extractDir)
                throw new Error("Invalid theme: missing assets/css/style.css")
            }

            // Read theme.json
            const data = await readFile(themeJsonPath, "utf8")
            themeInfo = JSON.parse(data)

            // Generate a safe theme directory name based on theme title
            let themeDirName = themeInfo.title
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "")

            // Get existing themes to check for uniqueness
            const themes = await discoverThemes()

            // Ensure uniqueness
            let counter = 1
            let finalDirName = themeDirName
            while (themes.has(finalDirName)) {
                finalDirName = `${themeDirName}_${counter}`
                counter++
            }

            // Create the theme directory
            const finalThemePath = join(this.themesDir, finalDirName)

            // Clean up if this directory already exists
            await safeDelete(finalThemePath)
            await mkdir(finalThemePath, { recursive: true })

            // Copy theme files to the final location
            await copyDirectory(themeSourceDir, finalThemePath)

            // Clean up
            await safeDelete(this.extractDir)
            await safeDelete(zipFilePath)

            // Return the newly added theme info
            return {
                name: finalDirName,
                path: finalThemePath,
                info: themeInfo,
            }
        } catch (error) {
            console.error("Error installing theme:", error)
            throw error
        }
    }

    /**
     * Delete a theme
     * @param {string} themeName - Name of the theme to delete
     * @param {Object} activeTheme - The currently active theme
     * @param {Map<string, Object>} themes - Map of available themes
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteTheme(themeName, activeTheme, themes) {
        if (!themes.has(themeName)) {
            throw new Error(`Theme "${themeName}" not found`)
        }

        // Check if it's the active theme
        if (activeTheme && activeTheme.name === themeName) {
            throw new Error("Cannot delete the active theme")
        }

        // Get the theme directory path
        const theme = themes.get(themeName)
        const themePath = theme.path

        try {
            // Delete the theme directory
            await safeDelete(themePath)
            return true
        } catch (error) {
            console.error(`Error deleting theme "${themeName}":`, error)
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
        // Clean up and recreate temp directory
        await safeDelete(this.tempDir)
        await mkdir(this.tempDir, { recursive: true })

        // Generate a unique filename
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2)
        const tempFilePath = join(this.tempDir, `${uniqueId}_${filename}`)

        // Write the file
        await writeFile(tempFilePath, fileData)

        return tempFilePath
    }
}

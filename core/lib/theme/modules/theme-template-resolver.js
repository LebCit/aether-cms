/**
 * Theme template path resolution
 */
import { join } from "node:path"
import { getFileStream } from "../utils/file-utils.js"

export class ThemeTemplateResolver {
    /**
     * @param {string} themesDir - Directory containing themes
     */
    constructor(themesDir) {
        this.themesDir = themesDir
    }

    /**
     * Build the full path to a specific template.
     * @param {Object} activeTheme - The active theme object
     * @param {string} templateDir - Directory of the template (e.g., "templates" or "partials")
     * @param {string} templateName - Name of the template (e.g., "index.html")
     * @returns {string} Full path to the template
     * @throws {Error} If there is no active theme or the template name is missing
     */
    buildTemplatePath(activeTheme, templateDir, templateName) {
        // Ensure there is an active theme
        if (!activeTheme) {
            throw new Error("No active theme")
        }

        // Ensure the template name is provided
        if (!templateName) {
            throw new Error("Template name is required")
        }

        // Build and return the full path
        return join(this.themesDir, activeTheme.name, templateDir, templateName)
    }

    /**
     * Get a specific template from the active theme in the default "templates" directory
     * @param {Object} activeTheme - The active theme object
     * @param {string} templateName - Name of the template (e.g., "index.html")
     * @returns {string} Full path to the template
     */
    getTemplatePath(activeTheme, templateName) {
        return this.buildTemplatePath(activeTheme, "templates", templateName)
    }

    /**
     * Get a specific template from the active theme in a custom directory
     * @param {Object} activeTheme - The active theme object
     * @param {string} templateDir - Custom directory of the template (e.g., "custom")
     * @param {string} templateName - Name of the template (e.g., "contact.html")
     * @returns {string} Full path to the template
     */
    getCustomTemplatePath(activeTheme, templateDir, templateName) {
        return this.buildTemplatePath(activeTheme, templateDir, templateName)
    }

    /**
     * Get a stream for a theme asset
     * @param {Object} activeTheme - The active theme object
     * @param {string} assetPath - Path to the asset relative to the theme's assets directory
     * @returns {ReadStream} Stream for the asset
     */
    getAssetStream(activeTheme, assetPath) {
        if (!activeTheme) {
            throw new Error("No active theme")
        }

        const fullPath = join(this.themesDir, activeTheme.name, "assets", assetPath)
        return getFileStream(fullPath)
    }
}

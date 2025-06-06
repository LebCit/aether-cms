#!/usr/bin/env node

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || "production"

// Import required modules
import { LiteNode } from "litenode"
import { setupApp, getCoreSystem } from "../../core/app.js"
import { StaticSiteGenerator } from "../../core/utils/static-generator.js"

// Create app instance
const app = new LiteNode("./", "./")

// Load environment variables
app.loadEnv()

// Set up the app
await setupApp(app, {
    rootDir: "./",
    contentDir: "content",
    uploadsDir: "content/uploads",
    themesDir: "content/themes",
    dataDir: "content/data",
})

// Get core systems
const themeManager = getCoreSystem("themes")
const contentManager = getCoreSystem("content")
const hookSystem = getCoreSystem("hooks")
const fileStorage = getCoreSystem("files")
const authManager = getCoreSystem("auth")
const settingsService = getCoreSystem("settings")

// Create systems object
const systems = {
    themeManager,
    contentManager,
    hookSystem,
    fileStorage,
    authManager,
    settingsService,
}

// Get settings
const settings = await settingsService.getSettings()

// Parse command line arguments with settings as defaults
const args = process.argv.slice(2)
const options = parseCommandLineArgs(args, settings)

// Run static site generator
console.log(`\n🚀 Starting static site generation ${options.outputDir ? `to ${options.outputDir}` : ""}`)
console.log(`Base URL: ${options.baseUrl}`)
console.log(`Clean URLs: ${options.cleanUrls ? "enabled" : "disabled"}`)

try {
    const generator = new StaticSiteGenerator(app, systems, options)
    await generator.generate()
    console.log("✅ Static site generation completed successfully!")
    process.exit(0)
} catch (error) {
    console.error("❌ Static site generation failed:", error)
    process.exit(1)
}

/**
 * Parse command line arguments with settings-based defaults
 * @param {string[]} args - Command line arguments
 * @param {Object} settings - Site settings from database
 * @returns {Object} Options object
 */
function parseCommandLineArgs(args, settings) {
    // Use settings as defaults when available
    const options = {
        outputDir: settings.staticOutputDir || "_site",
        baseUrl: settings.siteUrl || "/", // Use siteUrl from settings as primary default
        cleanUrls: settings.staticCleanUrls !== "off", // "on" or true = enabled
    }

    // Command-line arguments override settings
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg === "--output" || arg === "-o") {
            options.outputDir = args[++i]
        } else if (arg === "--base-url" || arg === "-b") {
            options.baseUrl = args[++i]
        } else if (arg === "--no-clean-urls") {
            options.cleanUrls = false
        } else if (arg === "--help" || arg === "-h") {
            showHelp()
            process.exit(0)
        }
    }

    // Ensure baseUrl has no trailing slash for consistency
    if (options.baseUrl.endsWith("/") && options.baseUrl !== "/") {
        options.baseUrl = options.baseUrl.slice(0, -1)
    }

    return options
}

/**
 * Show help message
 */
function showHelp() {
    console.log(`
Static Site Generator for Aether CMS
Usage: node generate-static.js [options]

Options:
  --output, -o <dir>    Output directory (default from settings or "_site")
  --base-url, -b <url>  Base URL for the site (default from site URL in settings, or "/")
  --no-clean-urls       Use .html extensions instead of directory/index.html pattern
  --help, -h            Show this help message

Note: Command-line options override values from site settings.
    `)
}

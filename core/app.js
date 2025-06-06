// Import route setups
import { setupFrontendRoutes } from "./routes/index.js"
import { setupAdminRoutes } from "./admin/routes.js"

// Import API routes
import { setupContentApi } from "./api/content-api.js"
import { setupMediaApi } from "./api/media-api.js"
import { setupThemeApi } from "./api/theme-api.js"
import { setupUserApi } from "./api/user-api.js"
import { setupStaticApi } from "./api/static-api.js"

// Import core libraries
import { ThemeManager } from "./lib/theme/theme-manager.js"
import { ContentManager } from "./lib/content/content-manager.js"
import { HookSystem } from "./lib/hooks.js"
import { FileStorage } from "./lib/store/file-storage.js"
import { AuthManager } from "./lib/auth/auth-manager.js"
import { SettingsService } from "./lib/settings-service.js"
import { GlobalMenuManager } from "./lib/global-menu-manager.js"

// Import utilities
import { handle404, handle500 } from "./utils/route-utils.js"
import { setupContentOptimizationHooks } from "./utils/hook-utils.js"

// Global instances
let themeManager
let contentManager
let hookSystem
let fileStorage
let authManager
let settingsService
let menuManager

export async function setupApp(app, config) {
    // Enable cookie parser
    app.enableCookieParser()

    // Create signed cookies utility
    const signedCookies = app.createSignedCookies("your-strong-secret-key-here")

    // Initialize core systems in proper sequence
    hookSystem = new HookSystem()
    fileStorage = new FileStorage(config.uploadsDir)
    authManager = new AuthManager(config.dataDir)

    // Initialize settings service first
    settingsService = new SettingsService(config.dataDir)
    await settingsService.initialize()

    // Initialize the global menu manager
    menuManager = new GlobalMenuManager(config.dataDir)
    await menuManager.initialize()

    // Then initialize content manager with the settings service
    contentManager = new ContentManager(config.dataDir, app, settingsService)
    await contentManager.initialize()

    // Finally initialize theme manager with settings service and menu manager
    themeManager = new ThemeManager(config.themesDir, settingsService, menuManager)
    await themeManager.initialize()

    // Add security headers to all responses
    app.use(async (req, res) => {
        // Security headers
        res.setHeader("X-Frame-Options", "DENY") // Prevent click-jacking
        res.setHeader("X-Content-Type-Options", "nosniff") // Prevent MIME type sniffing
        res.setHeader("X-XSS-Protection", "1; mode=block") // XSS protection
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains") // Strict HTTPS
    })

    // Create the edit permissions middleware directly from auth manager
    const editPermissionsMiddleware = authManager.createEditPermissionsMiddleware(signedCookies)

    // Apply edit permissions middleware globally
    app.use(editPermissionsMiddleware)

    // Set up API optimization hooks for content endpoints
    // This enables query params like:
    //  - frontmatterOnly=true (removes content and other properties, returns only metadata)
    //  - properties=id,title,slug (filters to only requested properties)
    // Example: /api/posts?frontmatterOnly=true&properties=id,title,slug
    setupContentOptimizationHooks(hookSystem)

    // Set up authentication middleware
    const authenticate = async (req, res) => {
        // Using LiteNode's cookie parser
        const token = req.headers.authorization?.split(" ")[1] || (await signedCookies.getCookie(req, "authToken"))

        if (!token || !(await authManager.verifyToken(token))) {
            if (req.url.startsWith("/api")) {
                res.status(401).json({ error: "Unauthorized" })
                return false
            } else {
                res.redirect("/aether/login")
                return false
            }
        }

        req.user = await authManager.getUserFromToken(token)
        return true
    }

    // Create a systems object to pass to route setup functions
    const systems = {
        themeManager,
        contentManager,
        hookSystem,
        fileStorage,
        authManager,
        settingsService,
        menuManager,
        authenticate,
        signedCookies,
    }

    // Set up frontend routes (home, content, taxonomy, custom)
    setupFrontendRoutes(app, systems)

    // Set up admin routes
    setupAdminRoutes(app, systems)

    // Set up API routes
    setupContentApi(app, systems)
    setupThemeApi(app, systems)
    setupMediaApi(app, systems)
    setupUserApi(app, systems)
    setupStaticApi(app, systems)

    // Set global not found handler
    app.notFound(async (req, res) => {
        if (req.url.startsWith("/api")) {
            res.status(404).json({ error: "Endpoint not found" })
        } else if (!req.url.startsWith("/aether")) {
            // Use theme 404 handler for frontend routes
            await handle404(res, req, themeManager, settingsService)
        }
    })

    // Set custom error handler
    app.onError(async (error, req, res) => {
        console.error("Application error:", error)
        if (req.url.startsWith("/api")) {
            res.status(500).json({ error: "Internal server error" })
        } else if (req.url.startsWith("/aether")) {
            res.status(500).html("<h1>500 - Server Error</h1><p>Admin interface error</p>")
        } else {
            // Use theme 500 handler for frontend routes
            await handle500(res, req, themeManager, settingsService)
        }
    })
}

// Export utility to get core systems (for plugins in the future)
export function getCoreSystem(name) {
    switch (name) {
        case "hooks":
            return hookSystem
        case "themes":
            return themeManager
        case "content":
            return contentManager
        case "files":
            return fileStorage
        case "auth":
            return authManager
        case "settings":
            return settingsService
        case "menu":
            return menuManager
        default:
            return null
    }
}

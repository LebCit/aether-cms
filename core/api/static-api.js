import { createStaticSiteCommand } from "../utils/static-generator.js"

/**
 * Sets up API routes for static site generation
 * @param {Object} app - LiteNode app instance
 * @param {Object} systems - Core systems
 */
export function setupStaticApi(app, systems) {
    const { authenticate, settingsService } = systems

    // Create the static site generator command
    const generateStaticSite = createStaticSiteCommand(app, systems)

    // Generate static site endpoint
    app.post("/api/static/generate", authenticate, async (req, res) => {
        try {
            // Only allow admins to generate static sites
            if (req.user.role !== "admin") {
                return res.status(403).json({
                    success: false,
                    error: "Only administrators can generate static sites",
                })
            }

            // Get options from request body
            const options = req.body || {}

            // Get site settings (for default values and logging purposes)
            const settings = await settingsService.getSettings()

            // Explicitly apply siteUrl if not overridden
            if (!options.baseUrl || options.baseUrl === "/") {
                options.baseUrl = settings.siteUrl || "/"
            }

            // Start generation in background
            const genPromise = generateStaticSite(options)

            // Immediately return success response
            res.json({
                success: true,
                message: "Static site generation started",
                options,
            })

            // Continue generation in background
            await genPromise
        } catch (error) {
            console.error("Static site generation error:", error)
            res.status(500).json({
                success: false,
                error: "Failed to generate static site",
                message: error.message,
            })
        }
    })

    // Get static site generation status
    app.get("/api/static/status", authenticate, async (req, res) => {
        try {
            // Only allow admins to check status
            if (req.user.role !== "admin") {
                return res.status(403).json({
                    success: false,
                    error: "Only administrators can check static site generation status",
                })
            }

            // Get settings for reporting
            const settings = await settingsService.getSettings()

            // For now we'll just return a simple status with settings info
            // Future enhancement, track the status in a database or memory
            res.json({
                success: true,
                status: "ready",
                lastGenerated: new Date().toISOString(),
                settings: {
                    staticOutputDir: settings.staticOutputDir || "_site",
                    siteUrl: settings.siteUrl || "/",
                    staticCleanUrls: settings.staticCleanUrls !== "off",
                },
            })
        } catch (error) {
            console.error("Error retrieving static site status:", error)
            res.status(500).json({
                success: false,
                error: "Failed to retrieve static site generation status",
            })
        }
    })
}

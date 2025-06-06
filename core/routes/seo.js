import { generateRssXml, generateSitemapXml, generateSitemapHtml, generateRobotsTxt } from "../utils/seo-utils.js"

export function setupSeoRoutes(app, systems) {
    const { themeManager, contentManager, settingsService } = systems

    // Redirects /rss to /rss.xml (but only if RSS exists)
    app.get("/rss", async (req, res) => {
        try {
            // Check if we have posts to determine if RSS should exist
            const posts = await contentManager.getPosts({
                status: "published",
                limit: 1, // Just check if any exist
            })

            if (!posts || posts.length === 0) {
                // No posts means no RSS feed - return 404
                return res.status(404).send("RSS feed not available - no published posts found")
            }

            res.redirect("/rss.xml")
        } catch (error) {
            console.error("Error checking for RSS feed:", error)
            res.status(500).send("Error checking RSS feed availability")
        }
    })

    app.get("/rss.xml", async (req, res) => {
        try {
            // Get published posts
            const posts = await contentManager.getPosts({
                status: "published",
                limit: 50, // Reasonable limit for RSS feed items
            })

            // If no posts, return 404 instead of empty RSS
            if (!posts || posts.length === 0) {
                return res.status(404).send("RSS feed not available - no published posts found")
            }

            // Get site settings
            const siteSettings = await settingsService.getSettings()

            // Determine the base URL (protocol for development)
            const protocol = req.socket.encrypted ? "https" : "http"
            const baseUrl = siteSettings.siteUrl || `${protocol}://${req.headers.host}`

            // Generate the RSS XML content
            const xmlContent = await generateRssXml({
                posts,
                siteSettings,
                baseUrl,
                contentManager,
                themeManager,
            })

            // The generateRssXml function now returns null if no posts
            if (!xmlContent) {
                return res.status(404).send("RSS feed not available - no published posts found")
            }

            // Set appropriate content type and send response
            res.xml(xmlContent)
        } catch (error) {
            console.error("Error generating RSS feed:", error)
            res.status(500).txt("Error generating RSS feed")
        }
    })

    app.get("/sitemap.xml", async (req, res) => {
        try {
            // Get site settings
            const siteSettings = await settingsService.getSettings()

            // Determine the base URL (protocol for development)
            const protocol = req.socket.encrypted ? "https" : "http"
            const baseUrl = siteSettings.siteUrl || `${protocol}://${req.headers.host}`

            // Get all published posts and pages
            const posts = await contentManager.getPosts({ status: "published" })
            const pages = await contentManager.getPages({ status: "published" })

            // Generate the sitemap XML (this will handle empty content appropriately)
            const xmlContent = await generateSitemapXml({
                posts,
                pages,
                siteSettings,
                baseUrl,
                contentManager,
                themeManager,
            })

            res.xml(xmlContent)
        } catch (error) {
            console.error("Error generating sitemap:", error)
            res.status(500).send("Error generating sitemap")
        }
    })

    // Provides a human-readable version at /sitemap
    app.get("/sitemap", async (req, res) => {
        try {
            res.redirect("/sitemap.html")
        } catch (error) {
            console.error("Error redirecting to sitemap:", error)
            res.status(500).send("Error redirecting to sitemap")
        }
    })

    app.get("/sitemap.html", async (req, res) => {
        try {
            // Get site settings
            const siteSettings = await settingsService.getSettings()

            // Determine the base URL (protocol for development)
            const protocol = req.socket.encrypted ? "https" : "http"
            const baseUrl = siteSettings.siteUrl || `${protocol}://${req.headers.host}`

            // Get all published posts and pages
            const posts = await contentManager.getPosts({ status: "published" })
            const pages = await contentManager.getPages({ status: "published" })

            // Generate the HTML sitemap (this will handle empty content and missing sections)
            const htmlContent = await generateSitemapHtml({
                posts,
                pages,
                siteSettings,
                baseUrl,
                contentManager,
                themeManager,
            })

            // Send HTML response
            res.html(htmlContent)
        } catch (error) {
            console.error("Error generating HTML sitemap:", error)
            res.status(500).send("Error generating HTML sitemap")
        }
    })

    // Serve robots.txt (always available, but content adapts to site structure)
    app.get("/robots.txt", async (req, res) => {
        try {
            // Get site settings
            const siteSettings = await settingsService.getSettings()

            // Determine the base URL (protocol for development)
            const protocol = req.socket.encrypted ? "https" : "http"
            let baseUrl = siteSettings.siteUrl || `${protocol}://${req.headers.host}`

            // Ensure baseUrl has no trailing slash
            baseUrl = baseUrl.replace(/\/$/, "")

            // Check if we have posts to determine what sitemaps to include
            const posts = await contentManager.getPosts({
                status: "published",
                limit: 1, // Just check if any exist
            })

            // Generate robots.txt with conditional sitemap references
            let robotsTxt = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`

            // Only include RSS sitemap reference if posts exist
            if (posts && posts.length > 0) {
                robotsTxt += `\nSitemap: ${baseUrl}/rss.xml`
            }

            robotsTxt += "\n"

            res.txt(robotsTxt)
        } catch (error) {
            console.error("Error generating robots.txt:", error)
            res.status(500).send("Error generating robots.txt")
        }
    })
}

import { prepareTemplateData, processTemplateData } from "../utils/route-utils.js"
import { resolveTemplatePath, checkCustomTemplate } from "../utils/template-utils.js"

export function setupHomeRoutes(app, systems) {
    const { themeManager, contentManager, hookSystem } = systems

    // Handle the homepage route
    app.get("/", async (req, res) => {
        try {
            // Get site settings
            const siteSettings = await contentManager.getSiteSettings()

            // Get published posts for the homepage
            const postsPerPage = siteSettings.postsPerPage || 10
            const allPosts = await contentManager.getPosts({
                status: "published",
                limit: postsPerPage,
                summaryView: true, // Default previewLength: a maximum of 300 characters.
            })

            const posts = contentManager.renameKey(allPosts, "frontmatter", "metadata")

            // Prepare template data
            const templateData = await prepareTemplateData(req, themeManager, siteSettings, {
                posts,
                homeRoute: true,
                year: new Date().getFullYear(),
            })

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, templateData, "layout.html")

            // Resolve the template path with enhanced parameters
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "home",
                slug: "homepage", // Use "homepage" as the slug for home page
                isCustomPage: true,
            })

            // Check if the resolved template path is in a theme custom folder and extracts its slug
            const { isCustomTemplate, templateSlug } = checkCustomTemplate(templatePath)

            if (isCustomTemplate) {
                // Try to find the custom page to get its metadata
                const contentPage = await contentManager.getContentByProperty("page", "slug", templateSlug)

                if (contentPage && contentPage.frontmatter) {
                    // Attach its frontmatter to processedData as metadata
                    processedData.metadata = contentPage.frontmatter

                    // Attach contentPage's content to processedData for optional use
                    processedData.content = contentPage.content
                }
            }

            res.render(templatePath, processedData)
        } catch (err) {
            console.error("Homepage render error:", err)
            res.status(500).html("<h1>500 - Server Error</h1><p>Error rendering homepage</p>")
        }
    })
}

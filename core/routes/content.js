import { marked } from "marked"
import { prepareTemplateData, processTemplateData, handle404 } from "../utils/route-utils.js"
import { resolveTemplatePath } from "../utils/template-utils.js"

export function setupContentRoutes(app, systems) {
    const { themeManager, contentManager, hookSystem, settingsService } = systems

    // Handle post routes: /post/:slug
    app.get("/post/:slug", async (req, res) => {
        const { slug } = req.params

        try {
            // Get post by slug
            const content = await contentManager.getContentByProperty("post", "slug", slug, {
                addNavigation: true,
                resolveRelatedPosts: true,
            })

            if (!content || content.frontmatter.status !== "published") {
                return handle404(res, req, themeManager, settingsService)
            }

            // Get site settings
            const siteSettings = await contentManager.getSiteSettings()

            // Create template data for the content item
            let templateData = await prepareTemplateData(req, themeManager, siteSettings, {
                content: marked.parse(content.content),
                metadata: content.frontmatter,
                fileType: "post",
                contentRoute: true,
                contentId: content.frontmatter.id,
                // Add navigation for posts
                prevPost: content.prevPost || null,
                nextPost: content.nextPost || null,
                year: new Date().getFullYear(),
            })

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, templateData, "post.html")

            // Resolve the template path - much cleaner!
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "post",
            })

            // Render using theme template
            res.render(templatePath, processedData)
        } catch (err) {
            console.error(`Post render error for ${slug}:`, err)
            res.status(500).html("<h1>500 - Server Error</h1><p>Error rendering post</p>")
        }
    })

    // Handle page routes: /page/:slug
    app.get("/page/:slug", async (req, res) => {
        const { slug } = req.params

        try {
            // Get page by slug
            const content = await contentManager.getContentByProperty("page", "slug", slug, {
                addNavigation: false,
            })

            if (!content || content.frontmatter.status !== "published") {
                return handle404(res, req, themeManager, settingsService)
            }

            // Check if this is a custom page type
            const isCustomPage = content.frontmatter.pageType === "custom"

            // If this is a custom page type, redirect to the direct URL
            if (isCustomPage) {
                // Redirect to the direct URL to maintain clear distinction
                return res.redirect(`/${slug}`, 301)
            }

            // Get site settings
            const siteSettings = await contentManager.getSiteSettings()

            // Create template data for the content item
            let templateData = await prepareTemplateData(req, themeManager, siteSettings, {
                content: marked.parse(content.content),
                metadata: content.frontmatter,
                fileType: "page",
                contentRoute: true,
                contentId: content.frontmatter.id,
                isCustomPage: isCustomPage,
                year: new Date().getFullYear(),
            })

            // Process data through hooks
            const processedData = processTemplateData(
                hookSystem,
                templateData,
                isCustomPage ? `${slug}.html` : "page.html"
            )

            // Resolve the template path - much cleaner!
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "page",
                slug,
                isCustomPage,
            })

            // Render using the determined template
            res.render(templatePath, processedData)
        } catch (err) {
            console.error(`Page render error for ${slug}:`, err)
            res.status(500).html("<h1>500 - Server Error</h1><p>Error rendering page</p>")
        }
    })
}

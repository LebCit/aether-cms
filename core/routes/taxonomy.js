import { enhancedFormatPagination } from "../utils/pagination-utils.js"
import { prepareTemplateData, processTemplateData, handle404 } from "../utils/route-utils.js"
import { resolveTemplatePath, applyTemplateMetadata } from "../utils/template-utils.js"

export function setupTaxonomyRoutes(app, systems) {
    const { themeManager, contentManager, hookSystem, settingsService } = systems

    // Handle category routes: /category/:slug
    app.get("/category/:slug", async (req, res) => {
        const { slug } = req.params

        try {
            // Get posts for this category with summaryView enabled
            const allTaxonomyPosts = await contentManager.getPostsByCategory(slug, {
                summaryView: true,
                previewLength: 200, // Slightly shorter preview for taxonomy pages
            })

            if (!allTaxonomyPosts || allTaxonomyPosts.length === 0) {
                return handle404(res, req, themeManager, settingsService)
            }

            // Get site settings
            const siteSettings = await contentManager.getSiteSettings()

            // Handle pagination
            const page = parseInt(req.queryParams?.get("page") || "1")
            const perPage = parseInt(req.queryParams?.get("pageSize") || siteSettings.postsPerPage || "10")
            const pagination = await app.paginateMarkdownFiles(allTaxonomyPosts, page, perPage)

            // Convert frontmatter to metadata for all posts
            const paginatedPosts = contentManager.renameKey(pagination.data, "frontmatter", "metadata")

            // Build base template data
            let templateData = await prepareTemplateData(req, themeManager, siteSettings, {
                posts: paginatedPosts,
                fileType: "category",
                taxonomyType: "category",
                taxonomyTerm: slug,
                pagination: enhancedFormatPagination(pagination, {
                    isGenerateStatic: false,
                    contentType: "category",
                    slug: slug,
                    cleanUrls: false,
                }),
                taxonomyRoute: true,
                categoryName: slug,
                year: new Date().getFullYear(),
            })

            // Resolve the template path
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "category",
                slug: slug, // Pass the slug to enable slug-specific templates
                isTaxonomy: true,
            })

            // Apply template metadata using our new utility function
            const enhancedTemplateData = await applyTemplateMetadata({
                templatePath,
                contentManager,
                templateData,
                taxonomyType: "category",
                taxonomyTerm: slug,
                itemCount: allTaxonomyPosts.length,
                page,
            })

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, enhancedTemplateData, "category.html")

            res.render(templatePath, processedData)
        } catch (err) {
            console.error(`Category render error for ${slug}:`, err)
            res.status(500).html("<h1>500 - Server Error</h1><p>Error rendering category</p>")
        }
    })

    // Handle tag routes: /tag/:slug
    app.get("/tag/:slug", async (req, res) => {
        const { slug } = req.params

        try {
            // Get posts for this tag with summaryView enabled
            const allTaxonomyPosts = await contentManager.getPostsByTag(slug, {
                summaryView: true,
                previewLength: 200, // Slightly shorter preview for taxonomy pages
            })

            if (!allTaxonomyPosts || allTaxonomyPosts.length === 0) {
                return handle404(res, req, themeManager, settingsService)
            }

            // Get site settings
            const siteSettings = await contentManager.getSiteSettings()

            // Handle pagination
            const page = parseInt(req.queryParams?.get("page") || "1")
            const perPage = parseInt(req.queryParams?.get("pageSize") || siteSettings.postsPerPage || "10")
            const pagination = await app.paginateMarkdownFiles(allTaxonomyPosts, page, perPage)

            // Convert frontmatter to metadata for all posts
            const paginatedPosts = contentManager.renameKey(pagination.data, "frontmatter", "metadata")

            // Build base template data
            let templateData = await prepareTemplateData(req, themeManager, siteSettings, {
                posts: paginatedPosts,
                fileType: "tag",
                taxonomyType: "tag",
                taxonomyTerm: slug,
                pagination: enhancedFormatPagination(pagination, {
                    isGenerateStatic: false,
                    contentType: "tag",
                    slug: slug,
                    cleanUrls: false,
                }),
                taxonomyRoute: true,
                tagName: slug,
                year: new Date().getFullYear(),
            })

            // Resolve the template path with enhanced parameters
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "tag",
                slug: slug, // Pass the slug to enable slug-specific templates
                isTaxonomy: true,
            })

            /// Apply template metadata using our new utility function
            const enhancedTemplateData = await applyTemplateMetadata({
                templatePath,
                contentManager,
                templateData,
                taxonomyType: "tag",
                taxonomyTerm: slug,
                itemCount: allTaxonomyPosts.length,
                page,
            })

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, enhancedTemplateData, "tag.html")

            res.render(templatePath, processedData)
        } catch (err) {
            console.error(`Tag render error for ${slug}:`, err)
            res.status(500).html("<h1>500 - Server Error</h1><p>Error rendering tag</p>")
        }
    })
}

import { join, dirname } from "node:path"
import { mkdir, copyFile, readdir, writeFile, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { generatePaginationUrls, buildSiblingCustomPagesNavigation } from "./pagination-utils.js"
import { prepareTemplateData, processTemplateData } from "./route-utils.js"
import { resolveTemplatePath, checkCustomTemplate, applyTemplateMetadata } from "./template-utils.js"
import { generateRssXml, generateSitemapHtml, generateSitemapXml, generateRobotsTxt } from "./seo-utils.js"
import { marked } from "marked"

/**
 * Generates a static site from the dynamic CMS content
 */
export class StaticSiteGenerator {
    /**
     * @param {Object} app - LiteNode app instance
     * @param {Object} systems - Core systems object
     * @param {Object} options - Configuration options
     */
    constructor(app, systems, options = {}) {
        this.app = app
        this.systems = systems
        this.options = {
            outputDir: "_site",
            baseUrl: "/",
            cleanUrls: true, // Use directory/index.html pattern instead of .html files
            ...options,
        }
    }

    /**
     * Ensures a directory exists
     * @param {string} dirPath - Directory path
     */
    async ensureDir(dirPath) {
        if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true })
        }
    }

    /**
     * Generate the entire static site
     */
    async generate() {
        console.log(`\n🔨 Starting static site generation to ${this.options.outputDir}`)
        console.time("Static site generation completed in")

        // Create output directory
        await this.ensureDir(this.options.outputDir)

        // Extract systems for easier access
        const { contentManager, themeManager, hookSystem, settingsService } = this.systems

        // Get site settings
        const siteSettings = await contentManager.getSiteSettings()

        // Generate the homepage
        await this.generateHomepage()

        // Generate posts
        await this.generatePosts()

        // Generate pages
        await this.generatePages()

        // Generate taxonomies (categories and tags)
        await this.generateTaxonomies()

        // Generate custom pages
        await this.generateCustomPages()

        // Generate SEO files (RSS feed and sitemap)
        await this.generateSeoFiles()

        // Generate 404 page
        await this.generate404()

        // Copy theme assets (CSS, JS, images)
        await this.copyThemeAssets()

        // Copy uploads
        await this.copyUploads()

        console.timeEnd("Static site generation completed in")
        console.log(`✅ Static site generated successfully at ${this.options.outputDir}\n`)
    }

    /**
     * Generate the homepage
     */
    async generateHomepage() {
        console.log("Generating homepage...")
        const { contentManager, themeManager, hookSystem, settingsService } = this.systems

        // Get site settings
        const siteSettings = await contentManager.getSiteSettings()

        // Get published posts for the homepage
        const postsPerPage = siteSettings.postsPerPage || 10
        const allPosts = await contentManager.getPosts({
            status: "published",
            limit: postsPerPage,
            summaryView: true,
        })

        const posts = contentManager.renameKey(allPosts, "frontmatter", "metadata")

        // Use resolveTemplatePath to get the appropriate template - this will check for homepage.html in custom dir
        const templatePath = await resolveTemplatePath({
            themeManager,
            contentType: "home",
            slug: "homepage",
            isCustomPage: true,
        })

        // Check if the template is a custom homepage template
        const { isCustomTemplate, templateSlug } = checkCustomTemplate(templatePath)

        // Prepare template data with a mock request object
        const mockReq = {
            isEditable: false,
            currentUser: null,
            queryParams: new Map(),
        }

        // Base template data
        const templateData = {
            posts,
            homeRoute: true,
            year: new Date().getFullYear(),
        }

        // If using custom homepage template, try to get its metadata
        if (isCustomTemplate && templateSlug === "homepage") {
            // Get the custom homepage content to include its metadata
            const homepageContent = await contentManager.getContentByProperty("page", "slug", "homepage")

            if (homepageContent && homepageContent.frontmatter) {
                // Add the homepage content's metadata and content
                templateData.metadata = homepageContent.frontmatter
                templateData.content = marked.parse(homepageContent.content)
            }
        }

        // Complete template data preparation
        const fullTemplateData = await prepareTemplateData(mockReq, themeManager, siteSettings, templateData)

        // Process data through hooks
        const processedData = processTemplateData(hookSystem, fullTemplateData, "layout.html")

        // Determine output path
        const outputPath = join(this.options.outputDir, this.options.cleanUrls ? "index.html" : "index.html")

        // Ensure output directory exists
        await this.ensureDir(dirname(outputPath))

        // Render the template to a file
        await this.app.renderToFile(templatePath, processedData, outputPath)

        // If pagination is needed, generate additional pages
        if (allPosts.length > postsPerPage) {
            const totalPages = Math.ceil(allPosts.length / postsPerPage)

            for (let page = 2; page <= totalPages; page++) {
                // Get paginated posts
                const paginatedPosts = await contentManager.getPosts({
                    status: "published",
                    limit: postsPerPage,
                    offset: (page - 1) * postsPerPage,
                    summaryView: true,
                })

                const posts = contentManager.renameKey(paginatedPosts, "frontmatter", "metadata")

                // Create pagination data
                const pagination = {
                    currentPage: page,
                    totalItems: allPosts.length,
                    pageSize: postsPerPage,
                    totalPages,
                    prevPage: page > 1 ? page - 1 : null,
                    nextPage: page < totalPages ? page + 1 : null,
                }

                // Prepare template data
                const pageTemplateData = await prepareTemplateData(mockReq, themeManager, siteSettings, {
                    posts,
                    homeRoute: true,
                    pagination,
                    year: new Date().getFullYear(),
                })

                // Process data through hooks
                const processedData = processTemplateData(hookSystem, pageTemplateData, "layout.html")

                // Determine output path
                const pageOutputPath = join(
                    this.options.outputDir,
                    this.options.cleanUrls ? `page/${page}/index.html` : `page-${page}.html`
                )

                // Ensure output directory exists
                await this.ensureDir(dirname(pageOutputPath))

                // Render the template to a file
                await this.app.renderToFile(templatePath, processedData, pageOutputPath)
            }
        }
    }

    /**
     * Generate all posts as static pages
     */
    async generatePosts() {
        const { contentManager, themeManager, hookSystem, settingsService } = this.systems

        // Get all published posts
        const posts = await contentManager.getPosts({ status: "published" })
        console.log(`Generating ${posts.length} posts...`)

        // Get site settings
        const siteSettings = await contentManager.getSiteSettings()

        // Create mock request object
        const mockReq = {
            isEditable: false,
            currentUser: null,
            queryParams: new Map(),
        }

        // Generate a static page for each post
        for (const post of posts) {
            // Get post content with navigation and related posts
            const content = await contentManager.getContentByProperty("post", "id", post.frontmatter.id, {
                addNavigation: true,
                resolveRelatedPosts: true,
            })

            if (!content) {
                console.warn(`Skipping post with ID ${post.frontmatter.id} - could not retrieve content`)
                continue
            }

            // Determine output path
            const slug = post.frontmatter.slug
            const outputPath = join(
                this.options.outputDir,
                this.options.cleanUrls ? `post/${slug}/index.html` : `post/${slug}.html`
            )

            // Ensure output directory exists
            await this.ensureDir(dirname(outputPath))

            // Get the appropriate template
            let templatePath = themeManager.getTemplatePath("layout.html")

            // Create template data
            const templateData = await prepareTemplateData(mockReq, themeManager, siteSettings, {
                content: marked.parse(content.content),
                metadata: content.frontmatter,
                fileType: "post",
                contentRoute: true,
                contentId: content.frontmatter.id,
                prevPost: content.prevPost || null,
                nextPost: content.nextPost || null,
                year: new Date().getFullYear(),
            })

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, templateData, "post.html")

            // Render the template to a file
            await this.app.renderToFile(templatePath, processedData, outputPath)
        }
    }

    /**
     * Generate all pages as static pages
     */
    async generatePages() {
        const { contentManager, themeManager, hookSystem, settingsService } = this.systems

        // Get all published pages
        const pages = await contentManager.getPages({ status: "published" })
        console.log(`Generating ${pages.length} pages...`)

        // Get site settings
        const siteSettings = await contentManager.getSiteSettings()

        // Create mock request object
        const mockReq = {
            isEditable: false,
            currentUser: null,
            queryParams: new Map(),
        }

        // Generate a static page for each page
        for (const page of pages) {
            // Skip custom pages, they'll be handled separately
            if (page.frontmatter.pageType === "custom") {
                continue
            }

            // Get page content
            const content = await contentManager.getContentByProperty("page", "id", page.frontmatter.id)

            if (!content) {
                console.warn(`Skipping page with ID ${page.frontmatter.id} - could not retrieve content`)
                continue
            }

            // Determine output path
            const slug = page.frontmatter.slug
            const outputPath = join(
                this.options.outputDir,
                this.options.cleanUrls ? `page/${slug}/index.html` : `page/${slug}.html`
            )

            // Ensure output directory exists
            await this.ensureDir(dirname(outputPath))

            // Get the appropriate template
            let templatePath = themeManager.getTemplatePath("layout.html")

            // Create template data
            const templateData = await prepareTemplateData(mockReq, themeManager, siteSettings, {
                content: marked.parse(content.content),
                metadata: content.frontmatter,
                fileType: "page",
                contentRoute: true,
                contentId: content.frontmatter.id,
                year: new Date().getFullYear(),
            })

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, templateData, "page.html")

            // Render the template to a file
            await this.app.renderToFile(templatePath, processedData, outputPath)
        }
    }

    /**
     * Generate taxonomy pages (categories and tags)
     */
    async generateTaxonomies() {
        const { contentManager, themeManager, hookSystem, settingsService } = this.systems

        // Get site settings
        const siteSettings = await contentManager.getSiteSettings()

        // Get all published posts
        const posts = await contentManager.getPosts({ status: "published" })

        // Extract all categories and tags
        const categories = new Set()
        const tags = new Set()

        posts.forEach((post) => {
            // Add category if it exists
            if (post.frontmatter.category) {
                categories.add(post.frontmatter.category)
            }

            // Add tags if they exist
            if (post.frontmatter.tags) {
                const postTags = Array.isArray(post.frontmatter.tags)
                    ? post.frontmatter.tags
                    : post.frontmatter.tags.split(",").map((tag) => tag.trim())

                postTags.forEach((tag) => tags.add(tag))
            }
        })

        console.log(`Generating ${categories.size} category pages...`)

        // Create mock request object
        const mockReq = {
            isEditable: false,
            currentUser: null,
            queryParams: new Map(),
        }

        // Generate category pages
        for (const category of categories) {
            // Get posts for this category
            const categoryPosts = await contentManager.getPostsByCategory(category)

            if (categoryPosts.length === 0) continue

            // Get the appropriate template using the same resolveTemplatePath logic from taxonomy.js
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "category",
                slug: contentManager.slugify(category),
                isTaxonomy: true,
            })

            // Determine base output path
            const slug = contentManager.slugify(category)
            const baseOutputPath = join(
                this.options.outputDir,
                this.options.cleanUrls ? `category/${slug}/index.html` : `category/${slug}.html`
            )

            // Get posts per page from settings
            const postsPerPage = siteSettings.postsPerPage || 10

            // Render callback function for pagination
            const renderPageFunction = async ({ pageItems, pagination, pageOutputPath, page }) => {
                // Convert frontmatter to metadata
                const postsWithMetadata = contentManager.renameKey(pageItems, "frontmatter", "metadata")

                // Create base template data
                let templateData = {
                    posts: postsWithMetadata,
                    fileType: "category",
                    taxonomyType: "category",
                    taxonomyTerm: category,
                    pagination,
                    taxonomyRoute: true,
                    categoryName: category,
                    year: new Date().getFullYear(),
                    isGenerateStatic: true,
                }

                // Apply template metadata
                templateData = await applyTemplateMetadata({
                    templatePath,
                    contentManager,
                    templateData,
                    taxonomyType: "category",
                    taxonomyTerm: category,
                    itemCount: categoryPosts.length,
                    page,
                })

                // Ensure output directory exists
                await this.ensureDir(dirname(pageOutputPath))

                // Prepare complete template data
                const fullTemplateData = await prepareTemplateData(mockReq, themeManager, siteSettings, templateData)

                // Process data through hooks
                const processedData = processTemplateData(hookSystem, fullTemplateData, "category.html")

                // Render the template to a file
                await this.app.renderToFile(templatePath, processedData, pageOutputPath)
            }

            // Generate all paginated pages
            await generatePaginated(categoryPosts, renderPageFunction, {
                postsPerPage,
                contentType: "category",
                slug,
                baseOutputPath,
                outputDir: this.options.outputDir,
                cleanUrls: this.options.cleanUrls,
                isGenerateStatic: true,
            })
        }

        console.log(`Generating ${tags.size} tag pages...`)

        // Generate tag pages
        for (const tag of tags) {
            // Get posts for this tag
            const tagPosts = await contentManager.getPostsByTag(tag)

            if (tagPosts.length === 0) continue

            // Get the appropriate template using resolveTemplatePath, same as in taxonomy.js
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "tag",
                slug: contentManager.slugify(tag),
                isTaxonomy: true,
            })

            // Determine base output path
            const slug = contentManager.slugify(tag)
            const baseOutputPath = join(
                this.options.outputDir,
                this.options.cleanUrls ? `tag/${slug}/index.html` : `tag/${slug}.html`
            )

            // Get posts per page from settings
            const postsPerPage = siteSettings.postsPerPage || 10

            // Render callback function for pagination
            const renderPageFunction = async ({ pageItems, pagination, pageOutputPath, page }) => {
                // Convert frontmatter to metadata
                const postsWithMetadata = contentManager.renameKey(pageItems, "frontmatter", "metadata")

                // Create base template data
                let templateData = {
                    posts: postsWithMetadata,
                    fileType: "tag",
                    taxonomyType: "tag",
                    taxonomyTerm: tag,
                    pagination,
                    taxonomyRoute: true,
                    tagName: tag,
                    year: new Date().getFullYear(),
                    isGenerateStatic: true,
                }

                // Apply template metadata
                templateData = await applyTemplateMetadata({
                    templatePath,
                    contentManager,
                    templateData,
                    taxonomyType: "tag",
                    taxonomyTerm: tag,
                    itemCount: tagPosts.length,
                    page,
                })

                // Ensure output directory exists
                await this.ensureDir(dirname(pageOutputPath))

                // Prepare complete template data
                const fullTemplateData = await prepareTemplateData(mockReq, themeManager, siteSettings, templateData)

                // Process data through hooks
                const processedData = processTemplateData(hookSystem, fullTemplateData, "tag.html")

                // Render the template to a file
                await this.app.renderToFile(templatePath, processedData, pageOutputPath)
            }

            // Generate all paginated pages
            await generatePaginated(tagPosts, renderPageFunction, {
                postsPerPage,
                contentType: "tag",
                slug,
                baseOutputPath,
                outputDir: this.options.outputDir,
                cleanUrls: this.options.cleanUrls,
                isGenerateStatic: true,
            })
        }
    }

    /**
     * Generate custom pages based on theme templates in the custom directory
     * Supports nested custom pages with template inheritance and sibling navigation
     */
    async generateCustomPages() {
        const { contentManager, themeManager, hookSystem, settingsService } = this.systems

        // Get all custom pages from content
        const customPages = await contentManager.getPages({
            status: "published",
            pageType: "custom",
        })

        // Create a Set of custom slugs that should be excluded from top-level generation
        const customPagesToExclude = new Set(["homepage", "category", "tag"])

        // Also exclude custom pages that follow category-* or tag-* patterns
        const filteredCustomPages = customPages.filter((page) => {
            const slug = page.frontmatter.slug

            // Skip the homepage (already handled by generateHomepage)
            if (slug === "homepage") return false

            // Skip general taxonomy templates (category.html, tag.html)
            if (customPagesToExclude.has(slug)) return false

            // Skip specific taxonomy templates (category-tech.html, tag-javascript.html)
            if (slug.startsWith("category-") || slug.startsWith("tag-")) return false

            return true
        })

        console.log(`Generating ${filteredCustomPages.length} custom pages...`)

        // Build sibling navigation for all pages at once
        const siblingNavigationMap = buildSiblingCustomPagesNavigation(filteredCustomPages)
        console.log(`Built sibling navigation for ${siblingNavigationMap.size} pages`)

        // Get site settings
        const siteSettings = await contentManager.getSiteSettings()

        // Create mock request object
        const mockReq = {
            isEditable: false,
            currentUser: null,
            queryParams: new Map(),
        }

        // Build a map of parent pages for efficient lookups
        const parentMap = new Map()
        for (const page of filteredCustomPages) {
            if (page.frontmatter.parentPage) {
                const parent = filteredCustomPages.find((p) => p.frontmatter.slug === page.frontmatter.parentPage)
                if (parent) {
                    parentMap.set(page.frontmatter.slug, parent)
                }
            }
        }

        // Function to determine template for a custom page
        const findTemplateForPage = async (page) => {
            const slug = page.frontmatter.slug
            const parentPath = getParentPath(page)

            // Build the full template pattern (e.g., docs-faqs-install)
            const fullTemplatePattern = parentPath ? `${parentPath}-${slug}` : slug

            // Let resolveTemplatePath handle all the fallback logic
            const templatePath = await resolveTemplatePath({
                themeManager,
                contentType: "custom",
                slug: fullTemplatePattern,
                isCustomPage: true,
            })

            // If we got layout.html, it means no custom template was found
            if (templatePath === themeManager.getTemplatePath("layout.html")) {
                return null
            }

            return templatePath
        }

        // Function to get all parent slugs for a page (recursive)
        const getParentPath = (page) => {
            const parents = []
            let currentPage = page

            while (currentPage.frontmatter.parentPage) {
                const parent = parentMap.get(currentPage.frontmatter.slug)
                if (!parent) break

                parents.unshift(parent.frontmatter.slug)
                currentPage = parent

                // Prevent infinite loops
                if (parents.length > 10) break
            }

            return parents.join("-")
        }

        // Generate each custom page
        for (const customPage of filteredCustomPages) {
            const slug = customPage.frontmatter.slug

            // Find the appropriate template for this page
            const templatePath = await findTemplateForPage(customPage)

            if (!templatePath) {
                console.warn(`Custom template for ${slug} not found, skipping from SSG...`)
                continue
            }

            // Build URL path
            let urlPath = slug

            // If this page has a parent, build the nested path
            if (customPage.frontmatter.parentPage) {
                const parentChain = []
                let currentPage = customPage

                // Build the parent chain by traversing up
                while (currentPage.frontmatter.parentPage) {
                    const parent = filteredCustomPages.find(
                        (p) => p.frontmatter.slug === currentPage.frontmatter.parentPage
                    )
                    if (!parent) break

                    parentChain.unshift(parent.frontmatter.slug)
                    currentPage = parent
                }

                // Create the nested URL path
                urlPath = parentChain.length > 0 ? `${parentChain.join("/")}/${slug}` : slug
            }

            console.log(`Generating custom page: ${slug} at path: ${urlPath}`)

            // Determine output path with proper nesting
            const outputPath = join(
                this.options.outputDir,
                this.options.cleanUrls ? `${urlPath}/index.html` : `${urlPath}.html`
            )

            // Ensure output directory exists
            await this.ensureDir(dirname(outputPath))

            // Get parent page data if exists
            let parentPageData = null
            if (customPage.frontmatter.parentPage) {
                parentPageData = parentMap.get(customPage.frontmatter.slug)
            }

            // Get sibling navigation for this page
            const siblingNavigation = siblingNavigationMap.get(slug) || null

            // Base template data
            let templateData = {
                customPath: urlPath,
                metadata: customPage.frontmatter,
                content: marked.parse(customPage.content),
                fileType: "page",
                contentRoute: true,
                contentId: customPage.frontmatter.id,
                isCustomPage: true,
                isCustomTemplate: true,
                year: new Date().getFullYear(),
                isGenerateStatic: true,
                // Add parent page data
                parentPage: parentPageData
                    ? {
                          title: parentPageData.frontmatter.title,
                          slug: parentPageData.frontmatter.slug,
                      }
                    : null,
                // Add sibling navigation
                siblingNavigation: siblingNavigation,
            }

            // Build breadcrumb navigation for nested pages
            if (parentPageData) {
                const breadcrumbs = []
                let currentPage = customPage

                // Build all ancestors in reverse order first
                const ancestors = []
                while (currentPage.frontmatter.parentPage) {
                    const parent = parentMap.get(currentPage.frontmatter.slug)
                    if (!parent) break
                    ancestors.unshift(parent) // Add to beginning of array
                    currentPage = parent
                }

                // Now build breadcrumbs with correct order values
                // Start with the topmost parent (order 0)
                for (let i = 0; i < ancestors.length; i++) {
                    const parent = ancestors[i]
                    const parentPath = ancestors
                        .slice(0, i)
                        .map((p) => p.frontmatter.slug)
                        .join("/")

                    breadcrumbs.push({
                        title: parent.frontmatter.title,
                        slug: parentPath ? `/${parentPath}/${parent.frontmatter.slug}` : `/${parent.frontmatter.slug}`,
                        order: i, // Order matches the level in hierarchy (0, 1, ...)
                    })
                }

                // Add current page as the final breadcrumb
                breadcrumbs.push({
                    title: customPage.frontmatter.title,
                    slug: `/${urlPath}`,
                    active: true,
                    order: ancestors.length, // Current page gets highest order (matches depth level)
                })

                templateData.breadcrumbs = breadcrumbs
            }

            // Determine template slug for special handling
            const { templateSlug } = checkCustomTemplate(templatePath)

            // Handle special templates that need additional data
            const paginatedTemplates = new Set(["blog", "archive", "articles", "news", "search"])
            const needsPagination = paginatedTemplates.has(templateSlug)

            const templateWithTaxonomyCounts = new Set(["categories", "tags", "topics"])
            const needsTaxonomyCounts = templateWithTaxonomyCounts.has(templateSlug)

            // Add pagination if needed
            if (needsPagination) {
                console.log(`Generating paginated custom page: ${urlPath}`)

                // Get all published posts
                const allPostsRaw = await contentManager.getPosts({ status: "published" })

                // Create clean objects to avoid reference issues
                const allPosts = allPostsRaw.map((post) => ({
                    id: post.frontmatter.id,
                    title: post.frontmatter.title,
                    slug: post.frontmatter.slug,
                    frontmatter: { ...post.frontmatter },
                    content: post.content,
                }))

                // Get posts per page from settings
                const postsPerPage = parseInt(siteSettings.postsPerPage) || 10

                // Render callback function
                const renderPageFunction = async ({ pageItems, pagination, pageOutputPath }) => {
                    // Convert frontmatter to metadata
                    const postsWithMetadata = pageItems.map((post) => ({
                        ...post,
                        metadata: { ...post.frontmatter },
                        frontmatter: undefined,
                    }))

                    // Create template data for this page
                    const pageTemplateData = {
                        ...templateData,
                        posts: postsWithMetadata,
                        pagination,
                    }

                    // Ensure output directory exists
                    await this.ensureDir(dirname(pageOutputPath))

                    // Prepare full template data
                    const fullTemplateData = await prepareTemplateData(
                        mockReq,
                        themeManager,
                        siteSettings,
                        pageTemplateData
                    )

                    // Process data through hooks
                    const processedData = processTemplateData(hookSystem, fullTemplateData, `${templateSlug}.html`)

                    // Render the template to a file
                    await this.app.renderToFile(templatePath, processedData, pageOutputPath)
                }

                // Generate all paginated pages
                await generatePaginated(allPosts, renderPageFunction, {
                    postsPerPage,
                    contentType: "custom",
                    slug: urlPath,
                    baseOutputPath: outputPath,
                    outputDir: this.options.outputDir,
                    cleanUrls: this.options.cleanUrls,
                    isGenerateStatic: true,
                })

                // Skip the rest of the loop since we've handled all pages
                continue
            }

            // Add taxonomy counts if needed
            if (needsTaxonomyCounts) {
                console.log(`Generating taxonomy counts custom page: ${urlPath}`)

                if (templateSlug === "categories") {
                    // Extract category data from all posts
                    const posts = await contentManager.getPosts({ status: "published", frontmatterOnly: true })
                    const groupedByCategory = await this.app.groupByMarkdownProperty(
                        posts,
                        ["title", "slug", "id", "category"],
                        "category"
                    )

                    // Format data for template
                    const categoriesWithCounts = Object.entries(groupedByCategory)
                        .filter(
                            ([category]) => category && category.toLowerCase() !== "undefined" && category.trim() !== ""
                        )
                        .map(([category, posts]) => ({
                            name: category,
                            slug: contentManager.slugify(category),
                            count: posts.length,
                            posts,
                        }))

                    templateData.categories = categoriesWithCounts
                    templateData.taxonomies = categoriesWithCounts
                    templateData.taxonomiesType = "categories"
                    templateData.taxonomyType = "category"
                    templateData.hasTaxonomyData = true
                } else if (templateSlug === "tags") {
                    // Get all posts
                    const posts = await contentManager.getPosts({ status: "published", frontmatterOnly: true })

                    // Create a map to count tags
                    const tagCounts = new Map()

                    // Process each post to count tags
                    posts.forEach((post) => {
                        const tags = post.frontmatter.tags
                        if (tags) {
                            // Handle different tag formats (string, array)
                            const tagArray = Array.isArray(tags)
                                ? tags
                                : typeof tags === "string"
                                ? tags.split(",").map((t) => t.trim())
                                : []

                            tagArray.forEach((tag) => {
                                if (tag) {
                                    const count = tagCounts.get(tag) || 0
                                    tagCounts.set(tag, count + 1)
                                }
                            })
                        }
                    })

                    // Convert map to array for template
                    const tagsWithCounts = Array.from(tagCounts.entries()).map(([tag, count]) => ({
                        name: tag,
                        slug: contentManager.slugify(tag),
                        count: count,
                    }))

                    templateData.tags = tagsWithCounts
                    templateData.taxonomies = tagsWithCounts
                    templateData.taxonomiesType = "tags"
                    templateData.taxonomyType = "tag"
                    templateData.hasTaxonomyData = true
                }
            }

            // Always provide recentPosts for sidebar/related content
            if (!needsPagination) {
                const recentPosts = await contentManager.getPosts({
                    frontmatterOnly: true,
                    status: "published",
                    limit: 5,
                })
                templateData.recentPosts = recentPosts
            }

            // Prepare full template data
            const fullTemplateData = await prepareTemplateData(mockReq, themeManager, siteSettings, templateData)

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, fullTemplateData, `${templateSlug}.html`)

            // Render the template to a file
            await this.app.renderToFile(templatePath, processedData, outputPath)
        }
    }

    /**
     * Generate SEO files (RSS feed and sitemap) with intelligent content detection
     */
    async generateSeoFiles() {
        try {
            console.log("Generating SEO files (RSS and sitemaps)...")
            const { contentManager, settingsService, themeManager } = this.systems

            // Get site settings and active theme
            const siteSettings = await settingsService.getSettings()
            const activeTheme = themeManager.getActiveTheme()

            // Determine base URL from options or settings
            let baseUrl = this.options.baseUrl || siteSettings.siteUrl || "/"

            // Ensure baseUrl has no trailing slash
            baseUrl = baseUrl.replace(/\/$/, "")

            // Get all published posts and pages
            const posts = await contentManager.getPosts({ status: "published" })
            const pages = await contentManager.getPages({ status: "published" })

            // Create directory structure for output
            const sitemapDir = join(this.options.outputDir, "sitemap")

            // Ensure directories exist
            await this.ensureDir(sitemapDir)

            // Generate sitemap XML (always generated, adapts to content)
            const sitemapXml = await generateSitemapXml({
                posts,
                pages,
                siteSettings,
                baseUrl,
                contentManager,
                themeManager,
            })

            // Generate HTML sitemap (always generated, adapts to content)
            const sitemapHtml = await generateSitemapHtml({
                posts,
                pages,
                siteSettings,
                baseUrl,
                contentManager,
                themeManager,
            })

            // Generate robots.txt (always generated, but content adapts)
            let robotsTxt = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`

            // Only generate RSS if posts exist
            let rssGenerated = false
            if (posts && posts.length > 0) {
                console.log(`Generating RSS feed for ${posts.length} posts...`)

                // Create theme-specific stylesheet directory
                const themeStylesheetDir = join(
                    this.options.outputDir,
                    "content",
                    "themes",
                    activeTheme.name,
                    "assets",
                    "css"
                )
                await this.ensureDir(themeStylesheetDir)

                // Generate RSS XML with isStatic=true to get proper stylesheet path
                const rssXml = await generateRssXml({
                    posts,
                    siteSettings,
                    baseUrl,
                    contentManager,
                    themeManager,
                    isStatic: true,
                })

                if (rssXml) {
                    // Write RSS feed to root
                    await writeFile(join(this.options.outputDir, "rss.xml"), rssXml)

                    // Copy RSS stylesheet to theme-specific location
                    try {
                        const stylesheetContent = await readFile("./assets/css/rss-stylesheet.xsl", "utf8")
                        await writeFile(join(themeStylesheetDir, "rss-stylesheet.xsl"), stylesheetContent)
                    } catch (error) {
                        console.error("Error copying RSS stylesheet:", error)
                    }

                    // Add RSS to robots.txt
                    robotsTxt += `\nSitemap: ${baseUrl}/rss.xml`
                    rssGenerated = true
                }
            } else {
                console.log("No published posts found - skipping RSS generation")
            }

            // Finalize robots.txt
            robotsTxt += "\n"

            // Write sitemap XML to root
            await writeFile(join(this.options.outputDir, "sitemap.xml"), sitemapXml)

            // Write HTML sitemap to /sitemap/index.html
            await writeFile(join(sitemapDir, "index.html"), sitemapHtml)

            // Write robots.txt to root
            await writeFile(join(this.options.outputDir, "robots.txt"), robotsTxt)

            console.log(
                `SEO files generated successfully${
                    rssGenerated ? " (including RSS feed)" : " (no RSS - no posts found)"
                }`
            )
        } catch (error) {
            console.error("Error generating SEO files:", error)
        }
    }

    /**
     * Generate static 404.html page for the root directory
     */
    async generate404() {
        console.log("Generating 404.html...")
        const { themeManager, settingsService, hookSystem } = this.systems

        try {
            // Get site settings
            const siteSettings = await settingsService.getSettings()

            // Create mock request object
            const mockReq = {
                isEditable: false,
                currentUser: null,
                queryParams: new Map(),
            }

            // Get the appropriate template - this will look for 404.html in the theme
            const templatePath = themeManager.getTemplatePath("layout.html")

            // Prepare template data for 404 page
            const templateData = {
                notFoundRoute: true,
                metadata: {
                    title: "404 - The Page You're Looking For Doesn't Exist",
                    description:
                        "The page you were looking for could not be found. It may have been moved or deleted. Please check the URL or return to the homepage.",
                },
                year: new Date().getFullYear(),
                isGenerateStatic: true,
            }

            // Prepare full template data
            const fullTemplateData = await prepareTemplateData(mockReq, themeManager, siteSettings, templateData)

            // Process data through hooks
            const processedData = processTemplateData(hookSystem, fullTemplateData, "404.html")

            // Output path at the root of the static site
            const outputPath = join(this.options.outputDir, "404.html")

            // Render the template to the 404.html file
            await this.app.renderToFile(templatePath, processedData, outputPath)

            console.log("404.html generated successfully")
        } catch (error) {
            console.error("Error generating 404.html:", error)
            // Create a fallback 404.html if template rendering fails
            const fallback404 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
</head>
<body>
    <h1>404 - The Page You're Looking For Doesn't Exist</h1>
    <p>The page you were looking for could not be found. It may have been moved or deleted.</p>
    <p><a href="/">Return to Homepage</a></p>
</body>
</html>`

            const outputPath = join(this.options.outputDir, "404.html")
            await writeFile(outputPath, fallback404)
            console.log("Fallback 404.html generated")
        }
    }

    /**
     * Copy theme assets to the static site
     */
    async copyThemeAssets() {
        console.log("Copying theme assets...")
        const { themeManager } = this.systems

        // Get active theme
        const activeTheme = themeManager.getActiveTheme()

        if (!activeTheme) {
            console.warn("No active theme found, skipping asset copying")
            return
        }

        // Manually create the themes directory structure to ensure we only copy the active theme
        const themesDir = join(this.options.outputDir, "content/themes")
        const activeThemeDir = join(themesDir, activeTheme.name)

        // Create the theme directory structure
        await this.ensureDir(themesDir)
        await this.ensureDir(activeThemeDir)

        // Define source and destination directories for the active theme's assets
        const sourceDir = join(process.cwd(), "content/themes", activeTheme.name, "assets")
        const destDir = join(activeThemeDir, "assets")

        // Copy just the active theme's assets
        await this.copyDirRecursive(sourceDir, destDir)
    }

    /**
     * Copy uploads to the static site
     */
    async copyUploads() {
        console.log("Copying uploads...")

        // Define source and destination directories
        const sourceDir = join(process.cwd(), "content/uploads")
        const destDir = join(this.options.outputDir, "content/uploads")

        // Ensure destination directory exists
        await this.ensureDir(destDir)

        // Copy uploads recursively
        await this.copyDirRecursive(sourceDir, destDir)
    }

    /**
     * Recursively copy a directory
     * @param {string} source - Source directory
     * @param {string} destination - Destination directory
     * @param {Array<string>} excludePatterns - Patterns to exclude (defaults to metadata files)
     */
    async copyDirRecursive(source, destination, excludePatterns = [".metadata.json"]) {
        try {
            // Create destination directory
            await this.ensureDir(destination)

            // Read directory contents
            const entries = await readdir(source, { withFileTypes: true })

            // Process each entry
            for (const entry of entries) {
                const sourcePath = join(source, entry.name)
                const destPath = join(destination, entry.name)

                // Check if the file should be excluded
                const shouldExclude = excludePatterns.some((pattern) => entry.isFile() && entry.name.endsWith(pattern))

                if (shouldExclude) {
                    // Skip this file
                    continue
                }

                if (entry.isDirectory()) {
                    // Recursively copy subdirectory (passing along the exclude patterns)
                    await this.copyDirRecursive(sourcePath, destPath, excludePatterns)
                } else {
                    // Ensure parent directory exists
                    await this.ensureDir(dirname(destPath))

                    // Copy file
                    await copyFile(sourcePath, destPath)
                }
            }
        } catch (error) {
            console.error(`Error copying directory from ${source} to ${destination}:`, error)
        }
    }
}

/**
 * Generate paginated content using a unified approach
 * @param {Array} items - The array of items to paginate (posts, etc.)
 * @param {Function} renderPage - Callback function to render a specific page
 * @param {Object} options - Configuration options
 */
async function generatePaginated(items, renderPage, options) {
    const { postsPerPage, contentType, slug, baseOutputPath, outputDir, cleanUrls, isGenerateStatic = true } = options

    // Skip if no items
    if (!items || items.length === 0) return

    // Calculate total pages
    const totalPages = Math.ceil(items.length / postsPerPage)

    // Generate each page
    for (let page = 1; page <= totalPages; page++) {
        // Calculate current page items
        const offset = (page - 1) * postsPerPage
        const pageItems = items.slice(offset, offset + postsPerPage)

        // Create pagination object
        const pagination = {
            currentPage: page,
            totalItems: items.length,
            pageSize: postsPerPage,
            totalPages,
            prevPage: page > 1 ? page - 1 : null,
            nextPage: page < totalPages ? page + 1 : null,
        }

        // Add URL information using our shared utility
        pagination.urls = generatePaginationUrls({
            isGenerateStatic,
            contentType,
            slug,
            pagination,
            cleanUrls,
        })

        // Determine output path for this page
        let pageOutputPath
        if (page === 1) {
            pageOutputPath = baseOutputPath // First page uses base path
        } else {
            pageOutputPath = join(
                outputDir,
                cleanUrls
                    ? `${contentType === "custom" ? "" : contentType + "/"}${slug}/page/${page}/index.html`
                    : `${contentType === "custom" ? "" : contentType + "/"}${slug}/page-${page}.html`
            )
        }

        // Call the render function with the current page data
        await renderPage({
            pageItems,
            pagination,
            pageOutputPath,
            page,
        })
    }
}

/**
 * Create a static site generator command
 * @param {Object} app - LiteNode app instance
 * @param {Object} systems - Core systems object
 * @returns {Function} Command function
 */
export function createStaticSiteCommand(app, systems) {
    return async (options = {}) => {
        // Get settings service from systems
        const { settingsService } = systems

        // Get site settings
        const settings = await settingsService.getSettings()

        // Merge options with settings as defaults
        const mergedOptions = {
            // Use provided options or fall back to settings or default values
            outputDir: options.outputDir || settings.staticOutputDir || "_site",
            baseUrl: options.baseUrl || settings.siteUrl || "/", // Use siteUrl as default baseUrl
            cleanUrls: options.cleanUrls !== undefined ? options.cleanUrls : settings.staticCleanUrls !== "off",
            ...options, // Preserve any other options
        }

        // Ensure baseUrl has no trailing slash for consistency (except for root "/")
        if (mergedOptions.baseUrl.endsWith("/") && mergedOptions.baseUrl !== "/") {
            mergedOptions.baseUrl = mergedOptions.baseUrl.slice(0, -1)
        }

        // Log the configuration being used
        console.log(`\n🚀 Starting static site generation with:`)
        console.log(`Base URL: ${mergedOptions.baseUrl}`)
        console.log(`Output Directory: ${mergedOptions.outputDir}`)
        console.log(`Clean URLs: ${mergedOptions.cleanUrls ? "enabled" : "disabled"}`)

        // Create and run the generator
        const generator = new StaticSiteGenerator(app, systems, mergedOptions)
        await generator.generate()
    }
}

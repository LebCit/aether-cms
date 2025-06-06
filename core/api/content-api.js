/**
 * Sets up API routes for content management
 * @param {Object} app - LiteNode app instance
 * @param {Object} options - Configuration options object containing:
 *   @param {Object} contentManager - Used for CRUD operations on posts, pages and other content
 *   @param {Object} hookSystem - Used to apply filters and actions for extensibility
 *   @param {Object} settingsService - Used to access and update site settings
 *   @param {Object} authenticate - Used to secure API endpoints
 *   @param {Object} themeManager - Used primarily for theme-related operations when settings change
 *                                 (e.g., refreshing active theme when site settings are updated)
 */
export function setupContentApi(app, systems) {
    const { contentManager, hookSystem, themeManager, settingsService, authenticate } = systems

    // Get all posts
    app.get("/api/posts", authenticate, async (req, res) => {
        try {
            const status = req.queryParams?.get("status")
            const limit = parseInt(req.queryParams?.get("limit") || "10")
            const offset = parseInt(req.queryParams?.get("offset") || "0")

            const posts = await contentManager.getPosts({ status, limit, offset })

            // Apply filters to the result (allows themes to modify the response)
            // Pass the request to the filter to allow access to query parameters
            const filteredPosts = hookSystem.applyFilters("api_posts", posts, req)

            res.json({ success: true, data: filteredPosts })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get a specific post
    app.get("/api/posts/:id", authenticate, async (req, res) => {
        try {
            // Extract resolveRelated query parameter (default to true)
            const resolveRelated = req.queryParams?.get("resolveRelated") !== "false"

            // Pass options to getPost method
            const post = await contentManager.getPost(req.params.id, {
                resolveRelatedPosts: resolveRelated,
            })

            if (!post) {
                return res.status(404).json({ success: false, error: "Post not found" })
            }

            // Apply filters to the result
            const filteredPost = hookSystem.applyFilters("api_post", post, req)

            res.json({ success: true, data: filteredPost })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Create a new post
    app.post("/api/posts", authenticate, async (req, res) => {
        try {
            const postData = req.body

            // Validate required fields
            if (!postData.metadata.title || !postData.metadata.slug) {
                return res.status(400).json({ success: false, error: "Title is required" })
            }

            // Set the author to the current user if not provided
            if (!postData.metadata.author && req.user) {
                postData.author = req.user.username
            }

            // Check if a post with this slug already exists
            const existingContent = await contentManager.getContentByProperty("post", "slug", postData.metadata.slug)

            if (existingContent) {
                return res.status(409).json({
                    success: false,
                    error: "A post with this slug already exists",
                    code: "DUPLICATE_SLUG",
                    slug: postData.metadata.slug,
                })
            }

            // Apply filters to the post data before creation
            const filteredPostData = hookSystem.applyFilters("api_create_post", postData)

            const post = await contentManager.createPost(filteredPostData)

            // Run action hook after post creation
            hookSystem.doAction("post_created", post)

            res.status(201).json({ success: true, id: post.id })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Update a post
    app.put("/api/posts/:id", authenticate, async (req, res) => {
        try {
            const postData = req.body

            // Only check for duplicate slug if it's been changed
            if (postData.metadata.slug) {
                // Check if another post with this slug already exists (excluding the current post)
                const existingContent = await contentManager.getContentByProperty(
                    "post",
                    "slug",
                    postData.metadata.slug
                )

                if (existingContent && existingContent.frontmatter.id !== req.params.id) {
                    return res.status(409).json({
                        success: false,
                        error: "Another post with this slug already exists",
                        code: "DUPLICATE_SLUG",
                        slug: postData.metadata.slug,
                    })
                }
            }

            // Apply filters to the post data before update
            const filteredPostData = hookSystem.applyFilters("api_update_post", postData, req.params.id)

            const post = await contentManager.updatePost(req.params.id, filteredPostData)

            if (!post) {
                return res.status(404).json({ success: false, error: "Post not found" })
            }

            // Run action hook after post update
            hookSystem.doAction("post_updated", post)

            res.json({ success: true, data: post })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Delete a post
    app.delete("/api/posts/:id", authenticate, async (req, res) => {
        try {
            // Run action hook before post deletion
            hookSystem.doAction("pre_post_delete", req.params.id)

            const success = await contentManager.deletePost(req.params.id)

            if (!success) {
                return res.status(404).json({ success: false, error: "Post not found" })
            }

            // Run action hook after post deletion
            hookSystem.doAction("post_deleted", req.params.id)

            res.json({ success: true })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // API endpoint for bulk post and page actions with optimized batching
    app.post("/api/bulk/:contentType", authenticate, async (req, res) => {
        try {
            const { action, ids } = req.body
            const { contentType } = req.params

            // Validate content type
            if (!contentType || (contentType !== "posts" && contentType !== "pages")) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid content type. Must be 'posts' or 'pages'.",
                })
            }

            // Validate ids array
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid request. Array of IDs required.",
                })
            }

            // Helper functions for content operations
            const updateContentStatus = async (id, status) => {
                // Get existing item
                const existingItem =
                    contentType === "posts" ? await contentManager.getPost(id) : await contentManager.getPage(id)

                if (!existingItem) {
                    throw new Error(`${contentType.slice(0, -1)} with ID ${id} not found`)
                }

                // Extract frontmatter and update status
                const { content, type, ...frontmatter } = existingItem
                frontmatter.status = status

                // Update the item
                return contentType === "posts"
                    ? await contentManager.updatePost(id, frontmatter)
                    : await contentManager.updatePage(id, frontmatter)
            }

            const deleteContent = async (id) => {
                return contentType === "posts"
                    ? await contentManager.deletePost(id)
                    : await contentManager.deletePage(id)
            }

            // Action map (cleaner than switch-case)
            const actionHandlers = {
                publish: (id) => updateContentStatus(id, "published"),
                draft: (id) => updateContentStatus(id, "draft"),
                delete: (id) => deleteContent(id),
            }

            // Validate action
            if (!actionHandlers[action]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid action '${action}'. Allowed actions: ${Object.keys(actionHandlers).join(", ")}`,
                })
            }

            // Run pre-bulk operation hook
            hookSystem.doAction("pre_bulk_operation", { contentType, action, ids })

            // Process a single item
            const processItem = async (id) => {
                try {
                    // First check if the content item exists
                    const contentExists =
                        contentType === "posts" ? await contentManager.getPost(id) : await contentManager.getPage(id)

                    if (!contentExists) {
                        return {
                            id,
                            success: false,
                            error: `${contentType.slice(0, -1)} with ID ${id} not found`,
                        }
                    }

                    // Call the appropriate action handler
                    const result = await actionHandlers[action](id)

                    // FIXED: Better success detection logic
                    let isSuccess = false

                    if (action === "delete") {
                        // For delete operations, result should be true/false
                        isSuccess = result === true
                    } else {
                        // For update operations (publish/draft), result should be an object with the updated content
                        // Success means we got back a valid object with an id property
                        isSuccess = result && typeof result === "object" && result.id
                    }

                    // Run per-item hook
                    hookSystem.doAction(`bulk_${action}_item`, { contentType, id, result })

                    return {
                        id,
                        success: isSuccess,
                        result,
                    }
                } catch (err) {
                    console.error(`Bulk ${action} error for ${contentType} ID ${id}:`, err)
                    return { id, success: false, error: err.message }
                }
            }

            // Process items in fixed-size batches
            const results = []
            const BATCH_SIZE = 25 // Configurable batch size (25 items)

            // Process in batches
            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                // Create a batch
                const batchIds = ids.slice(i, i + BATCH_SIZE)

                // Process the current batch in sequence
                const batchResults = []
                for (const id of batchIds) {
                    const result = await processItem(id)
                    batchResults.push(result)

                    // Optional: Add a tiny delay between individual operations for system stability
                    await new Promise((resolve) => setTimeout(resolve, 10))
                }

                results.push(...batchResults)

                // Add a small delay between batches to allow system to breathe
                // Only for very high load scenarios
                if (i + BATCH_SIZE < ids.length) {
                    await new Promise((resolve) => setTimeout(resolve, 100))
                }
            }

            // Process results
            const errors = results
                .filter((result) => !result.success)
                .map((result) => ({ id: result.id, error: result.error }))

            const success = errors.length === 0

            // Run post-bulk operation hook
            hookSystem.doAction("post_bulk_operation", { contentType, action, results })

            // Send response with detailed results
            res.json({
                success,
                results,
                errors: errors.length ? errors : null,
                message: success
                    ? `Successfully applied "${action}" to all selected ${contentType}`
                    : `Applied "${action}" with ${errors.length} errors. See details in results.`,
                totalItems: ids.length,
                successCount: results.filter((r) => r.success).length,
                errorCount: errors.length,
            })
        } catch (error) {
            console.error("Bulk action error:", error)
            res.status(500).json({
                success: false,
                error: error.message,
                message: "Failed to process bulk action",
            })
        }
    })

    // Get all pages
    app.get("/api/pages", authenticate, async (req, res) => {
        try {
            const status = req.queryParams?.get("status")

            const pages = await contentManager.getPages({ status })

            // Apply filters to the result
            // Pass the request to the filter to allow access to query parameters
            const filteredPages = hookSystem.applyFilters("api_pages", pages, req)

            res.json({ success: true, data: filteredPages })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get a specific page
    app.get("/api/pages/:id", authenticate, async (req, res) => {
        try {
            const page = await contentManager.getPage(req.params.id)

            if (!page) {
                return res.status(404).json({ success: false, error: "Page not found" })
            }

            // Apply filters to the result
            const filteredPage = hookSystem.applyFilters("api_page", page)

            res.json({ success: true, data: filteredPage })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Create a new page
    app.post("/api/pages", authenticate, async (req, res) => {
        try {
            const pageData = req.body

            // Validate required fields
            if (!pageData.metadata.title || !pageData.metadata.slug) {
                return res.status(400).json({ success: false, error: "Title is required" })
            }

            // Set the author to the current user if not provided
            if (!pageData.metadata.author && req.user) {
                pageData.author = req.user.username
            }

            // Handle parent page for custom pages
            if (pageData.metadata.pageType === "custom" && pageData.metadata.parentPage) {
                // Validate that the parent page exists and is also a custom page
                const parentPage = await contentManager.getContentByProperty(
                    "page",
                    "slug",
                    pageData.metadata.parentPage
                )

                if (!parentPage || parentPage.frontmatter.pageType !== "custom") {
                    return res.status(400).json({
                        success: false,
                        error: "Parent page must be a valid custom page",
                    })
                }

                // Check for circular references
                if (pageData.metadata.slug === pageData.metadata.parentPage) {
                    return res.status(400).json({
                        success: false,
                        error: "A page cannot be its own parent",
                    })
                }
            }

            // Check if a page with this slug already exists
            const existingContent = await contentManager.getContentByProperty("page", "slug", pageData.metadata.slug)

            if (existingContent) {
                return res.status(409).json({
                    success: false,
                    error: "A page with this slug already exists",
                    code: "DUPLICATE_SLUG",
                    slug: pageData.metadata.slug,
                })
            }

            // Apply filters to the page data before creation
            const filteredPageData = hookSystem.applyFilters("api_create_page", pageData)

            const page = await contentManager.createPage(filteredPageData)

            // Run action hook after page creation
            hookSystem.doAction("page_created", page)

            res.status(201).json({ success: true, id: page.id })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Update a page
    app.put("/api/pages/:id", authenticate, async (req, res) => {
        try {
            const pageData = req.body

            // Only check for duplicate slug if it's been changed
            if (pageData.metadata.slug) {
                // Check if another page with this slug already exists (excluding the current page)
                const existingContent = await contentManager.getContentByProperty(
                    "page",
                    "slug",
                    pageData.metadata.slug
                )

                if (existingContent && existingContent.frontmatter.id !== req.params.id) {
                    return res.status(409).json({
                        success: false,
                        error: "Another page with this slug already exists",
                        code: "DUPLICATE_SLUG",
                        slug: pageData.metadata.slug,
                    })
                }
            }

            // Handle parent page for custom pages
            if (pageData.metadata.pageType === "custom" && pageData.metadata.parentPage) {
                // Validate that the parent page exists and is also a custom page
                const parentPage = await contentManager.getContentByProperty(
                    "page",
                    "slug",
                    pageData.metadata.parentPage
                )

                if (!parentPage || parentPage.frontmatter.pageType !== "custom") {
                    return res.status(400).json({
                        success: false,
                        error: "Parent page must be a valid custom page",
                    })
                }

                // Check for circular references
                if (pageData.metadata.slug === pageData.metadata.parentPage) {
                    return res.status(400).json({
                        success: false,
                        error: "A page cannot be its own parent",
                    })
                }

                // Check if current page is not already an ancestor of the proposed parent
                let currentParent = parentPage
                while (currentParent.frontmatter.parentPage) {
                    const grandParent = await contentManager.getContentByProperty(
                        "page",
                        "slug",
                        currentParent.frontmatter.parentPage
                    )
                    if (!grandParent) break

                    if (grandParent.frontmatter.slug === pageData.metadata.slug) {
                        return res.status(400).json({
                            success: false,
                            error: "This would create a circular parent relationship",
                        })
                    }
                    currentParent = grandParent
                }
            }

            // Apply filters to the page data before update
            const filteredPageData = hookSystem.applyFilters("api_update_page", pageData, req.params.id)

            const page = await contentManager.updatePage(req.params.id, filteredPageData)

            if (!page) {
                return res.status(404).json({ success: false, error: "Page not found" })
            }

            // Run action hook after page update
            hookSystem.doAction("page_updated", page)

            res.json({ success: true, data: page })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Delete a page
    app.delete("/api/pages/:id", authenticate, async (req, res) => {
        try {
            // Run action hook before page deletion
            hookSystem.doAction("pre_page_delete", req.params.id)

            const success = await contentManager.deletePage(req.params.id)

            if (!success) {
                return res.status(404).json({ success: false, error: "Page not found" })
            }

            // Run action hook after page deletion
            hookSystem.doAction("page_deleted", req.params.id)

            res.json({ success: true })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get site settings
    app.get("/api/settings", authenticate, async (req, res) => {
        try {
            const settings = await settingsService.getSettings()

            // Apply filters to the result
            const filteredSettings = hookSystem.applyFilters("api_settings", settings)

            res.json({ success: true, data: filteredSettings })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Update site settings
    app.put("/api/settings", authenticate, async (req, res) => {
        try {
            const settingsData = req.body

            // Apply filters to the settings data before update
            const filteredSettingsData = hookSystem.applyFilters("api_update_settings", settingsData)

            const settings = await settingsService.updateSettings(filteredSettingsData)

            // Run action hook after settings update
            hookSystem.doAction("settings_updated", settings)

            // Check if the activeTheme changed and refresh ThemeManager if needed
            if (settingsData.activeTheme && themeManager) {
                await themeManager.refreshActiveTheme()
            }

            res.json({ success: true, data: settings })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })
}

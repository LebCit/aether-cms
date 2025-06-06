/**
 * Manages content queries and filtering
 */
import { join } from "node:path"
import { getMarkdownFiles, findMarkdownFileByProperty } from "../utils/file-utils.js"
import {
    renameProperty,
    sortContentByDate,
    applyPagination,
    addPostReferences,
    truncateExcerpt,
    transformContentItems,
} from "../utils/content-utils.js"

export class ContentQueryManager {
    /**
     * @param {string} dataDir - Directory for content files
     * @param {Object} app - App instance with parseMarkdownFile method
     */
    constructor(dataDir, app) {
        this.dataDir = dataDir
        this.postsDir = join(dataDir, "posts")
        this.pagesDir = join(dataDir, "pages")
        this.customPagesDir = join(dataDir, "custom")
        this.app = app
    }

    /**
     * Get all posts
     * @param {Object} options - Query options (status, limit, etc.)
     * @returns {Promise<Array>} Array of posts
     */
    async getPosts(options = {}) {
        try {
            // Get all post files
            const posts = await getMarkdownFiles(this.postsDir, this.app.parseMarkdownFile.bind(this.app))

            // Filter by status if needed
            let filteredPosts = posts
            if (options.status) {
                filteredPosts = posts.filter((post) => post.frontmatter && post.frontmatter.status === options.status)
            }

            // Sort by date (newest first)
            const sortedPosts = sortContentByDate(filteredPosts)

            // Apply pagination
            const paginatedPosts = applyPagination(sortedPosts, options)

            // Apply content transformation based on view options
            return transformContentItems(paginatedPosts, options)
        } catch (error) {
            console.error("Error getting posts:", error)
            return []
        }
    }

    /**
     * Get all pages
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of pages
     */
    async getPages(options = {}) {
        try {
            // Get all page files from both directories
            const normalPages = await getMarkdownFiles(this.pagesDir, this.app.parseMarkdownFile.bind(this.app))
            const customPages = await getMarkdownFiles(this.customPagesDir, this.app.parseMarkdownFile.bind(this.app))

            // Add pageType attribute if not present
            normalPages.forEach((page) => {
                if (!page.frontmatter.pageType) {
                    page.frontmatter.pageType = "normal"
                }
            })

            customPages.forEach((page) => {
                if (!page.frontmatter.pageType) {
                    page.frontmatter.pageType = "custom"
                }
            })

            // Combine both sets of pages
            const pages = [...normalPages, ...customPages]

            // Filter by status if needed
            let filteredPages = pages
            if (options.status) {
                filteredPages = pages.filter((page) => page.frontmatter && page.frontmatter.status === options.status)
            }

            // Filter by pageType if specified
            if (options.pageType) {
                filteredPages = filteredPages.filter(
                    (page) => page.frontmatter && page.frontmatter.pageType === options.pageType
                )
            }

            // Transform filtered pages to return frontmatter only if specified
            if (options.frontmatterOnly) {
                filteredPages = transformContentItems(filteredPages, { frontmatterOnly: true })
            }

            // Return pages (no sorting or pagination by default)
            return options.limit ? applyPagination(filteredPages, options) : filteredPages
        } catch (error) {
            console.error("Error getting pages:", error)
            return []
        }
    }

    /**
     * Get content (post or page) by ID
     * @param {string} id - Content ID
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {Promise<Object|null>} Content object or null if not found
     */
    async getContent(id, contentType = "post") {
        try {
            // Determine content directories based on type
            let contentDirs = []
            if (contentType === "post") {
                contentDirs = [this.postsDir]
            } else {
                // Check both page directories
                contentDirs = [this.pagesDir, this.customPagesDir]
            }

            // Find the content item in any of the possible directories
            for (const dir of contentDirs) {
                const result = await findMarkdownFileByProperty(
                    dir,
                    this.app.parseMarkdownFile.bind(this.app),
                    "id",
                    id
                )

                if (result) {
                    // Return content data with type
                    return {
                        ...result.content.frontmatter,
                        content: result.content.content,
                        type: contentType,
                    }
                }
            }

            return null
        } catch (error) {
            console.error(`Error getting ${contentType} ${id}:`, error)
            return null
        }
    }

    /**
     * Get a post by ID with resolved related posts
     * @param {string} id - Post ID
     * @param {Object} options - Options for fetching (optional)
     * @returns {Promise<Object|null>} Post object with related posts data or null if not found
     */
    async getPost(id, options = {}) {
        try {
            // Get the base post data
            const post = await this.getContent(id, "post")

            if (!post) {
                return null
            }

            // If there are related posts and we should resolve them (enabled by default)
            if (post.relatedPosts && Array.isArray(post.relatedPosts) && options.resolveRelatedPosts !== false) {
                // Fetch minimal data for each related post
                const relatedPostsData = await Promise.all(
                    post.relatedPosts.map(async (relatedId) => {
                        try {
                            // Skip invalid IDs
                            if (!relatedId) return null

                            // Use findMarkdownFileByProperty to get the related post
                            const result = await findMarkdownFileByProperty(
                                this.postsDir,
                                this.app.parseMarkdownFile.bind(this.app),
                                "id",
                                relatedId
                            )

                            if (!result || !result.content || !result.content.frontmatter) {
                                return null
                            }

                            // Extract just the data we need
                            const relatedPost = result.content
                            return {
                                id: relatedPost.frontmatter.id,
                                title: relatedPost.frontmatter.title,
                                subtitle: relatedPost.frontmatter.subtitle,
                                slug: relatedPost.frontmatter.slug,
                                featuredImage: relatedPost.frontmatter.featuredImage,
                                excerpt: relatedPost.frontmatter.excerpt
                                    ? truncateExcerpt(relatedPost.frontmatter.excerpt, 120)
                                    : null,
                            }
                        } catch (err) {
                            console.error(`Error fetching related post ${relatedId}:`, err)
                            return null
                        }
                    })
                )

                // Filter out nulls (posts that don't exist or errored)
                post.relatedPostsData = relatedPostsData.filter(Boolean)
            }

            return post
        } catch (error) {
            console.error(`Error getting post ${id}:`, error)
            return null
        }
    }

    /**
     * Get a page by ID
     * @param {string} id - Page ID
     * @returns {Promise<Object|null>} Page object or null if not found
     */
    async getPage(id) {
        return this.getContent(id, "page")
    }

    /**
     * Get content by a specific frontmatter property value with additional filters
     * @param {string} contentType - Type of content ('post', 'page')
     * @param {string} property - The frontmatter property to match
     * @param {any} value - The value to search for
     * @param {Object} options - Additional options (e.g., addNavigation, parentPage)
     * @returns {Promise<Object|null>} Content data or null if not found
     */
    async getContentByProperty(contentType, property, value, options = {}) {
        try {
            // Determine the appropriate directories based on content type
            let contentDirs = []
            switch (contentType) {
                case "post":
                    contentDirs = [this.postsDir]
                    break
                case "page":
                    contentDirs = [this.pagesDir, this.customPagesDir]
                    break
                default:
                    console.error(`Unknown content type: ${contentType}`)
                    return null
            }

            // Search in all applicable directories
            for (const contentDir of contentDirs) {
                const contentItems = await getMarkdownFiles(contentDir, this.app.parseMarkdownFile.bind(this.app))

                // Filter by the specified property and additional criteria
                const matchingItems = contentItems.filter((item) => {
                    const frontmatter = item.frontmatter
                    if (!frontmatter || frontmatter[property] !== value) {
                        return false
                    }

                    // Additional filtering based on options
                    if (options.parentPage !== undefined) {
                        if (frontmatter.parentPage !== options.parentPage) {
                            return false
                        }
                    }

                    return true
                })

                // Return the first match
                if (matchingItems.length > 0) {
                    const result = matchingItems[0]

                    // For posts, add navigation references if requested
                    if (contentType === "post" && options.addNavigation) {
                        const allPosts = await this.getPosts({ status: "published" })
                        const currentPostIndex = allPosts.findIndex(
                            (post) => post.frontmatter && post.frontmatter[property] === value
                        )
                        if (currentPostIndex !== -1) {
                            addPostReferences(allPosts, {
                                getSlugFn: (post) => post.frontmatter.slug,
                            })
                            result.prevPost = allPosts[currentPostIndex].prevPost
                            result.nextPost = allPosts[currentPostIndex].nextPost
                        }
                    }

                    // Add related posts data if applicable
                    if (
                        contentType === "post" &&
                        result.frontmatter &&
                        result.frontmatter.relatedPosts &&
                        Array.isArray(result.frontmatter.relatedPosts) &&
                        options.resolveRelatedPosts !== false
                    ) {
                        const relatedPostIds = result.frontmatter.relatedPosts

                        // Fetch related posts data
                        const relatedPostsData = await Promise.all(
                            relatedPostIds.map(async (relatedId) => {
                                try {
                                    // Find the related post by ID
                                    const relatedResult = await findMarkdownFileByProperty(
                                        contentDir,
                                        this.app.parseMarkdownFile.bind(this.app),
                                        "id",
                                        relatedId
                                    )

                                    if (
                                        !relatedResult ||
                                        !relatedResult.content ||
                                        !relatedResult.content.frontmatter
                                    ) {
                                        return null
                                    }

                                    // Extract minimal data for display
                                    const relatedFrontmatter = relatedResult.content.frontmatter
                                    return {
                                        id: relatedFrontmatter.id,
                                        title: relatedFrontmatter.title,
                                        subtitle: relatedFrontmatter.subtitle,
                                        slug: relatedFrontmatter.slug,
                                        featuredImage: relatedFrontmatter.featuredImage,
                                        excerpt: relatedFrontmatter.excerpt
                                            ? truncateExcerpt(relatedFrontmatter.excerpt, 120)
                                            : null,
                                    }
                                } catch (err) {
                                    console.error(`Error fetching related post ${relatedId}:`, err)
                                    return null
                                }
                            })
                        )

                        // Add the related posts data to the content object
                        result.frontmatter.relatedPostsData = relatedPostsData.filter(Boolean)
                    }

                    return result
                }
            }

            // Not found in any directory
            return null
        } catch (error) {
            console.error(`Error getting ${contentType} by ${property}='${value}':`, error)
            return null
        }
    }

    /**
     * Get content items by a field that might contain multiple values
     * @param {string} contentType - Type of content to search ('post', 'page')
     * @param {string} field - Frontmatter field to check
     * @param {string} value - Value to match
     * @param {Object} options - Additional options (limit, offset)
     * @returns {Promise<Array>} Matching content items
     */
    async getContentByFieldValue(contentType, field, value, options = {}) {
        try {
            // Determine the appropriate directory based on content type
            let contentDir
            switch (contentType) {
                case "post":
                    contentDir = this.postsDir
                    break
                case "page":
                    contentDir = this.pagesDir
                    break
                default:
                    console.error(`Unknown content type: ${contentType}`)
                    return []
            }

            // Get all content files
            const contentItems = await getMarkdownFiles(contentDir, this.app.parseMarkdownFile.bind(this.app))

            // Filter items based on the field value
            const results = []

            for (const item of contentItems) {
                // Do not process draft/unpublished content
                if (!item.frontmatter || !item.frontmatter.status || item.frontmatter.status !== "published") continue

                // Try both singular and plural forms of the field
                const singularField = field
                const pluralField = field.endsWith("s") ? field : `${field}s`

                const fieldValue = item.frontmatter[singularField] || item.frontmatter[pluralField]

                if (fieldValue) {
                    let matches = false

                    // Check for matches in different data formats
                    if (Array.isArray(fieldValue)) {
                        matches = fieldValue.includes(value)
                    } else if (typeof fieldValue === "string") {
                        const valueList = fieldValue.split(",").map((v) => v.trim())
                        matches = valueList.includes(value)
                    }

                    if (matches) {
                        results.push(item)
                    }
                }
            }

            // Sort results by date (newest first)
            const sortedResults = sortContentByDate(results)

            // Apply pagination
            const paginatedResults = applyPagination(sortedResults, options)

            // Apply content transformation based on view options
            return transformContentItems(paginatedResults, options)
        } catch (error) {
            console.error(`Error getting ${contentType} by ${field}='${value}':`, error)
            return []
        }
    }

    /**
     * Get posts for a specific category
     * @param {string} categorySlug - The category slug to filter by
     * @param {Object} options - Additional options (limit, offset, etc.)
     * @returns {Promise<Array>} Matching posts
     */
    async getPostsByCategory(categorySlug, options = {}) {
        return this.getContentByFieldValue("post", "category", categorySlug, options)
    }

    /**
     * Get posts for a specific tag
     * @param {string} tagSlug - The tag slug to filter by
     * @param {Object} options - Additional options (limit, offset, etc.)
     * @returns {Promise<Array>} Matching posts
     */
    async getPostsByTag(tagSlug, options = {}) {
        return this.getContentByFieldValue("post", "tag", tagSlug, options)
    }

    /**
     * Find content by a custom query across all content types
     * This is useful for implementing search, tags, or other cross-content features
     * @param {Function} predicateFn - Function that takes content item and returns true if it matches
     * @param {Object} options - Query options like limit, offset, contentTypes
     * @returns {Promise<Array>} Array of matching content items
     */
    async findContent(predicateFn, options = {}) {
        const results = []
        const contentTypes = options.contentTypes || ["post", "page"]

        // Process each content type
        for (const contentType of contentTypes) {
            try {
                let contentDirs = []
                switch (contentType) {
                    case "post":
                        contentDirs = [this.postsDir]
                        break
                    case "page":
                        contentDirs = [this.pagesDir, this.customPagesDir]
                        break
                    default:
                        continue // Skip unknown content types
                }

                // Process each applicable directory
                for (const contentDir of contentDirs) {
                    // Get all content files for this directory
                    const contentItems = await getMarkdownFiles(contentDir, this.app.parseMarkdownFile.bind(this.app))

                    // Add content type to each item
                    for (const item of contentItems) {
                        item.contentType = contentType

                        // For pages, add pageType if it's not present
                        if (contentType === "page" && !item.frontmatter.pageType) {
                            // Determine pageType based on directory
                            item.frontmatter.pageType = contentDir === this.customPagesDir ? "custom" : "normal"
                        }

                        // Apply the predicate function
                        if (predicateFn(item)) {
                            results.push(item)
                        }
                    }
                }
            } catch (error) {
                console.error(`Error finding content in ${contentType}:`, error)
            }
        }

        // Sort results (typically by date, newest first)
        const sortedResults = sortContentByDate(results)

        // Apply pagination
        return applyPagination(sortedResults, options)
    }

    /**
     * Renames a property in all objects within an array
     * This method modifies the objects in place for optimal performance
     * @param {Array<Object>} array - The array of objects to process
     * @param {string} oldKey - The current property name to be renamed
     * @param {string} newKey - The new property name to replace the old key
     * @returns {Array<Object>} The modified array with renamed properties
     */
    renameProperty(array, oldKey, newKey) {
        return renameProperty(array, oldKey, newKey)
    }
}

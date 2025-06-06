/**
 * Sets up filtering hooks for optimizing content API responses
 *
 * This function registers hooks to the system that can modify API responses
 * to optimize payload size by:
 * 1. Returning only frontmatter without content when requested
 * 2. Filtering frontmatter to include only specific requested properties
 *
 * @param {Object} hookSystem - The hook system instance for registering filters
 */
export function setupContentOptimizationHooks(hookSystem) {
    /**
     * Filter for posts endpoint that optimizes response payload
     * Supports query parameters:
     * - frontmatterOnly=true - Returns only frontmatter data
     * - properties=id,title,slug - Returns only specified frontmatter properties
     */
    hookSystem.addFilter("api_posts", (posts, req) => {
        // Check if frontmatterOnly parameter is present
        const frontmatterOnly = req.queryParams?.get("frontmatterOnly") === "true"

        // Check if specific properties are requested
        const properties = req.queryParams?.get("properties")

        if (frontmatterOnly) {
            // Return posts with only frontmatter
            return posts.map((post) => {
                const { frontmatter } = post

                // If specific properties are requested, filter the frontmatter
                if (properties) {
                    const propArray = properties.split(",").map((prop) => prop.trim())
                    const filteredFrontmatter = {}

                    // Only include requested properties
                    propArray.forEach((prop) => {
                        if (frontmatter.hasOwnProperty(prop)) {
                            filteredFrontmatter[prop] = frontmatter[prop]
                        }
                    })

                    return filteredFrontmatter
                }

                // Return all frontmatter if no specific properties requested
                return frontmatter
            })
        }

        // If not frontmatterOnly, return unmodified posts
        return posts
    })

    /**
     * Filter for pages endpoint that optimizes response payload
     * Supports the same query parameters as the posts filter
     */
    hookSystem.addFilter("api_pages", (pages, req) => {
        // Check if frontmatterOnly parameter is present
        const frontmatterOnly = req.queryParams?.get("frontmatterOnly") === "true"

        // Check if specific properties are requested
        const properties = req.queryParams?.get("properties")

        if (frontmatterOnly) {
            return pages.map((page) => {
                const { frontmatter } = page

                if (properties) {
                    const propArray = properties.split(",").map((prop) => prop.trim())
                    const filteredFrontmatter = {}

                    propArray.forEach((prop) => {
                        if (frontmatter.hasOwnProperty(prop)) {
                            filteredFrontmatter[prop] = frontmatter[prop]
                        }
                    })

                    return filteredFrontmatter
                }

                return frontmatter
            })
        }

        return pages
    })

    /**
     * Filter hook to optimize API post responses with related posts data
     *
     * This filter optimizes the related posts data when frontmatterOnly is requested
     * by applying the same property filtering that's applied to the main post.
     * This ensures consistent data structure and minimal payload size.
     *
     * @param {Object} post - The post object to be filtered
     * @param {Object} req - The request object containing query parameters
     * @returns {Object} The filtered post object
     *
     * @example
     * // Query: /api/posts/123?frontmatterOnly=true&properties=id,title,slug
     * // Will return the post with only id, title, slug properties
     * // AND will also filter relatedPostsData to only include those same properties
     */
    hookSystem.addFilter("api_post", (post, req) => {
        // If frontmatterOnly is requested, also optimize relatedPostsData
        if (req.queryParams?.get("frontmatterOnly") === "true" && post.relatedPostsData) {
            // Keep relatedPostsData but make sure it's minimal
            const properties = req.queryParams?.get("properties")

            if (properties) {
                const propArray = properties.split(",").map((prop) => prop.trim())

                // If specific properties are requested, filter relatedPostsData too
                post.relatedPostsData = post.relatedPostsData.map((related) => {
                    const filtered = {}
                    propArray.forEach((prop) => {
                        if (related.hasOwnProperty(prop)) {
                            filtered[prop] = related[prop]
                        }
                    })
                    return filtered
                })
            }
        }

        return post
    })
}

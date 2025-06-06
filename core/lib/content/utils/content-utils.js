/**
 * Utility functions for content management
 */

/**
 * Convert a string to a URL-friendly slug
 * @param {string} text - Text to convert
 * @returns {string} Slug
 */
export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/&/g, "-and-") // Replace & with 'and'
        .replace(/[^\w\-]+/g, "") // Remove all non-word characters
        .replace(/\-\-+/g, "-") // Replace multiple - with single -
}

/**
 * Renames a property in all objects within an array
 * This function modifies the objects in place for optimal performance
 * @param {Array<Object>} array - The array of objects to process
 * @param {string} oldKey - The current property name to be renamed
 * @param {string} newKey - The new property name to replace the old key
 * @returns {Array<Object>} The modified array with renamed properties
 */
export function renameProperty(array, oldKey, newKey) {
    // Use for loop for better performance with large arrays
    for (let i = 0; i < array.length; i++) {
        const obj = array[i]
        // Only manipulate object if it has the property
        if (oldKey in obj) {
            // Create the property with new name
            obj[newKey] = obj[oldKey]
            // Delete the old property
            delete obj[oldKey]
        }
    }
    return array
}

/**
 * Adds lightweight references to previous and next posts in a collection
 * Optimized for performance with large datasets in a Node.js environment
 * @param {Array<Object>} posts - Array of post objects to process
 * @param {Object} options - Configuration options
 * @param {Function} options.getTitleFn - Function to extract title from a post
 * @param {Function} options.getSlugFn - Function to extract slug from a post
 * @param {String} options.prevFieldName - Field name for previous post reference
 * @param {String} options.nextFieldName - Field name for next post reference
 * @param {Boolean} options.mutate - Whether to mutate original posts array
 * @returns {Array<Object>} - Array of posts with added references
 */
export function addPostReferences(posts, options = {}) {
    // Set default options
    const {
        getTitleFn = (post) => post.frontmatter?.title,
        getSlugFn = (post) => post.fileBaseName,
        prevFieldName = "prevPost",
        nextFieldName = "nextPost",
        mutate = true,
    } = options

    // Create a new array if we shouldn't mutate the original
    const result = mutate ? posts : JSON.parse(JSON.stringify(posts))

    // Single pass through the array for optimal performance
    for (let i = 0; i < result.length; i++) {
        const post = result[i]

        // Add reference to previous post (next in chronological order)
        if (i + 1 < result.length) {
            const prevPost = result[i + 1]
            post[prevFieldName] = {
                title: getTitleFn(prevPost),
                slug: getSlugFn(prevPost),
            }
        } else {
            post[prevFieldName] = null
        }

        // Add reference to next post (previous in chronological order)
        if (i - 1 >= 0) {
            const nextPost = result[i - 1]
            post[nextFieldName] = {
                title: getTitleFn(nextPost),
                slug: getSlugFn(nextPost),
            }
        } else {
            post[nextFieldName] = null
        }
    }

    return result
}

/**
 * Sort content items by date (newest first)
 * @param {Array<Object>} items - Array of content items to sort
 * @returns {Array<Object>} Sorted array
 */
export function sortContentByDate(items) {
    return items.sort((a, b) => {
        const dateA = a.frontmatter?.createdAt ? new Date(a.frontmatter.createdAt) : new Date(0)
        const dateB = b.frontmatter?.createdAt ? new Date(b.frontmatter.createdAt) : new Date(0)
        return dateB - dateA
    })
}

/**
 * Apply offset and limit to an array
 * @param {Array<Object>} items - Array of items
 * @param {Object} options - Options object with offset and limit properties
 * @returns {Array<Object>} Sliced array
 */
export function applyPagination(items, options) {
    const limit = options.limit || Infinity
    const offset = options.offset || 0
    return items.slice(offset, offset + limit)
}

/**
 * Helper method to truncate excerpt to specified length
 * @param {string} excerpt - The excerpt to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated excerpt
 */
export function truncateExcerpt(excerpt, maxLength = 120) {
    if (!excerpt || excerpt.length <= maxLength) {
        return excerpt
    }

    // Find a good breaking point (end of word)
    const truncated = excerpt.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(" ")

    if (lastSpace > maxLength * 0.8) {
        // Only break at word if we're not losing too much text
        return truncated.substring(0, lastSpace) + "..."
    }

    // Otherwise just truncate and add ellipsis
    return truncated + "..."
}

/**
 * Transforms a list of content items based on view options
 * @param {Array<Object>} contentItems - Array of content items to transform
 * @param {Object} options - Transformation options
 * @param {boolean} options.summaryView - Whether to generate content previews
 * @param {number} options.previewLength - Length of content preview (default: 300)
 * @param {boolean} options.frontmatterOnly - Whether to return only frontmatter
 * @returns {Array<Object>} Transformed content items
 */
export function transformContentItems(contentItems, options = {}) {
    // Handle the summaryView option - includes frontmatter and truncated content
    if (options.summaryView) {
        // Default to 300 characters for content previews
        const previewLength = options.previewLength || 300

        return contentItems.map((item) => {
            // Create frontmatter with excerpt if needed
            const frontmatter = { ...item.frontmatter } || {}

            // Generate preview from content if needed
            let contentPreview = ""
            if (item.content) {
                // Strip markdown syntax
                const plainText = item.content
                    .replace(/#+\s+/g, "") // Remove headings
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace links with just text
                    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold but keep content
                    .replace(/\*([^*]+)\*/g, "$1") // Remove italic (asterisks) but keep content
                    .replace(/~~([^~]+)~~/g, "$1") // Remove strikethrough but keep content
                    .replace(/\_([^_]+)\_/g, "$1") // Remove italic (underscores) but keep content
                    .replace(/`{1,3}[^`]*`{1,3}/g, "") // Remove code blocks entirely
                    .replace(/>\s+(.*)/g, "$1") // Remove blockquote markers but keep content
                    .replace(/\|.*\|/g, "") // Remove table rows
                    .trim()

                contentPreview =
                    plainText.length > previewLength ? plainText.substring(0, previewLength - 3) + "..." : plainText
            }

            // Return structured object with frontmatter and preview content
            return {
                frontmatter,
                content: contentPreview || "",
            }
        })
    }

    // Handle the frontmatterOnly option
    if (options.frontmatterOnly) {
        return contentItems.map((item) => ({
            frontmatter: item.frontmatter || {},
        }))
    }

    // Return unmodified content items
    return contentItems
}

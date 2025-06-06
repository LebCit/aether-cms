/**
 * Core content manager that orchestrates all content-related modules
 */
import { join } from "node:path"
import { ContentItemManager } from "./modules/content-item-manager.js"
import { ContentQueryManager } from "./modules/content-query-manager.js"

/**
 * Manages content (posts, pages, etc.) in the CMS using Markdown files
 */
export class ContentManager {
    /**
     * @param {string} dataDir - Directory for storing content files
     * @param {Object} app - LiteNode app instance
     * @param {Object} settingsService - Settings service
     */
    constructor(dataDir, app, settingsService) {
        this.dataDir = dataDir
        this.postsDir = join(dataDir, "posts")
        this.pagesDir = join(dataDir, "pages")

        // Store LiteNode app instance
        this.app = app

        // Use the centralized settings service instead of own implementation

        this.settingsService = settingsService

        // Initialize sub-modules
        this.itemManager = new ContentItemManager(dataDir, app)
        this.queryManager = new ContentQueryManager(dataDir, app)
    }

    /**
     * Initialize the content manager
     */
    async initialize() {
        try {
            // Initialize all modules
            await this.itemManager.initialize()

            // Create default home page if no pages exist
            const pages = await this.getPages()

            if (pages.length === 0) {
                await this.createPage({
                    title: "Home",
                    slug: "home",
                    pageType: "normal",
                    content:
                        "# Welcome to your new site!\n\nThis is your homepage. You can edit this page in the admin dashboard.",
                })
            }
        } catch (error) {
            console.error("Error initializing content manager:", error)
            throw error
        }
    }

    // SETTINGS MANAGEMENT
    // ------------------

    /**
     * Get site settings
     * @param {boolean} [forceReload=false] - Whether to force reload from disk
     * @returns {Object} Site settings
     */
    async getSiteSettings(forceReload = false) {
        return await this.settingsService.getSettings(forceReload)
    }

    /**
     * Update site settings
     * @param {Object} newSettings - New settings to apply
     * @returns {Object} Updated settings
     */
    async updateSettings(newSettings) {
        return await this.settingsService.updateSettings(newSettings)
    }

    // POSTS MANAGEMENT
    // ---------------

    /**
     * Get all posts
     * @param {Object} options - Query options (status, limit, etc.)
     * @returns {Array} Array of posts
     */
    async getPosts(options = {}) {
        return await this.queryManager.getPosts(options)
    }

    /**
     * Get a post by ID
     * @param {string} id - Post ID
     * @returns {Object|null} Post object or null if not found
     */
    async getPost(id) {
        return await this.queryManager.getPost(id)
    }

    /**
     * Create a new post
     * @param {Object} postData - Post data
     * @returns {Object} Created post
     */
    async createPost(postData) {
        return await this.itemManager.createPost(postData)
    }

    /**
     * Update an existing post
     * @param {string} id - Post ID
     * @param {Object} postData - Updated post data
     * @returns {Object|null} Updated post or null if not found
     */
    async updatePost(id, postData) {
        return await this.itemManager.updatePost(id, postData)
    }

    /**
     * Delete a post
     * @param {string} id - Post ID
     * @returns {boolean} Success or failure
     */
    async deletePost(id) {
        return await this.itemManager.deletePost(id)
    }

    /**
     * Get posts for a specific category
     * @param {string} categorySlug - The category slug to filter by
     * @param {Object} options - Additional options (limit, offset, etc.)
     * @returns {Array} Matching posts
     */
    async getPostsByCategory(categorySlug, options = {}) {
        return await this.queryManager.getPostsByCategory(categorySlug, options)
    }

    /**
     * Get posts for a specific tag
     * @param {string} tagSlug - The tag slug to filter by
     * @param {Object} options - Additional options (limit, offset, etc.)
     * @returns {Array} Matching posts
     */
    async getPostsByTag(tagSlug, options = {}) {
        return await this.queryManager.getPostsByTag(tagSlug, options)
    }

    // PAGES MANAGEMENT
    // ---------------

    /**
     * Get all pages
     * @param {Object} options - Query options
     * @returns {Array} Array of pages
     */
    async getPages(options = {}) {
        return await this.queryManager.getPages(options)
    }

    /**
     * Get a page by ID
     * @param {string} id - Page ID
     * @returns {Object|null} Page object or null if not found
     */
    async getPage(id) {
        return await this.queryManager.getPage(id)
    }

    /**
     * Create a new page
     * @param {Object} pageData - Page data
     * @returns {Object} Created page
     */
    async createPage(pageData) {
        return await this.itemManager.createPage(pageData)
    }

    /**
     * Update an existing page
     * @param {string} id - Page ID
     * @param {Object} pageData - Updated page data
     * @returns {Object|null} Updated page or null if not found
     */
    async updatePage(id, pageData) {
        return await this.itemManager.updatePage(id, pageData)
    }

    /**
     * Delete a page
     * @param {string} id - Page ID
     * @returns {boolean} Success or failure
     */
    async deletePage(id) {
        return await this.itemManager.deletePage(id)
    }

    // GENERAL CONTENT OPERATIONS
    // -------------------------

    /**
     * Get content (post or page) by ID
     * @param {string} id - Content ID
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {Object|null} Content object or null if not found
     */
    async getContent(id, contentType = "post") {
        return await this.queryManager.getContent(id, contentType)
    }

    /**
     * Get content by a specific frontmatter property value
     * @param {string} contentType - Type of content ('post', 'page')
     * @param {string} property - The frontmatter property to match
     * @param {any} value - The value to search for
     * @param {Object} options - Additional options (e.g., addNavigation)
     * @returns {Object|null} Content data or null if not found
     */
    async getContentByProperty(contentType, property, value, options = {}) {
        return await this.queryManager.getContentByProperty(contentType, property, value, options)
    }

    /**
     * Get content items by a field that might contain multiple values
     * @param {string} contentType - Type of content to search ('post', 'page')
     * @param {string} field - Frontmatter field to check
     * @param {string} value - Value to match
     * @param {Object} options - Additional options (limit, offset)
     * @returns {Array} Matching content items
     */
    async getContentByFieldValue(contentType, field, value, options = {}) {
        return await this.queryManager.getContentByFieldValue(contentType, field, value, options)
    }

    /**
     * Create a new content item (post or page)
     * @param {Object} contentData - Content data
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {Object} Created content item
     */
    async createContent(contentData, contentType = "post") {
        return await this.itemManager.createContent(contentData, contentType)
    }

    /**
     * Update existing content (post or page)
     * @param {string} id - Content ID
     * @param {Object} contentData - Updated content data
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {Object|null} Updated content or null if not found
     */
    async updateContent(id, contentData, contentType = "post") {
        return await this.itemManager.updateContent(id, contentData, contentType)
    }

    /**
     * Delete content (post or page)
     * @param {string} id - Content ID
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {boolean} Success or failure
     */
    async deleteContent(id, contentType = "post") {
        return await this.itemManager.deleteContent(id, contentType)
    }

    /**
     * Find content by a custom query across all content types
     * This is useful for implementing search, tags, or other cross-content features
     * @param {Function} predicateFn - Function that takes content item and returns true if it matches
     * @param {Object} options - Query options like limit, offset, contentTypes
     * @returns {Array} Array of matching content items
     */
    async findContent(predicateFn, options = {}) {
        return await this.queryManager.findContent(predicateFn, options)
    }

    /**
     * Convert a string to a URL-friendly slug
     * @param {string} text - Text to convert
     * @returns {string} Slug
     */
    slugify(text) {
        // Note: This is exposed for convenience, uses the implementation from content-utils
        return this.itemManager.slugify(text)
    }

    /**
     * Renames a key in all objects within an array
     * This function modifies the objects in place for optimal performance
     * @param {Array<Object>} array - The array of objects to process
     * @param {string} oldKey - The current key name to be renamed
     * @param {string} newKey - The new key name to replace the old key
     * @returns {Array<Object>} The modified array with renamed properties
     */
    renameKey(array, oldKey, newKey) {
        return this.queryManager.renameProperty(array, oldKey, newKey)
    }
}

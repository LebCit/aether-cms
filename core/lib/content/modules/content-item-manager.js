/**
 * Manages content items (posts and pages)
 */
import { join } from "node:path"
import { ensureDirectory, findMarkdownFileByProperty, writeMarkdownFile, deleteFile } from "../utils/file-utils.js"
import { slugify } from "../utils/content-utils.js"
import { serializeFrontmatter } from "../utils/yaml-utils.js"

export class ContentItemManager {
    /**
     * @param {string} dataDir - Directory for storing content files
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
     * Initialize content directories
     * @returns {Promise<boolean>} Success or failure
     */
    async initialize() {
        try {
            // Create data directories if they don't exist
            await ensureDirectory(this.dataDir)
            await ensureDirectory(this.postsDir)
            await ensureDirectory(this.pagesDir)
            await ensureDirectory(this.customPagesDir)
            return true
        } catch (error) {
            console.error("Error initializing content directories:", error)
            return false
        }
    }

    /**
     * Create a new content item (post or page)
     * @param {Object} contentData - Content data
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {Promise<Object>} Created content item
     */
    async createContent(contentData, contentType = "post") {
        try {
            const id = Date.now().toString()
            const createdAt = new Date().toISOString()
            const isPost = contentType === "post"

            // Determine content directory based on type and pageType
            let contentDir
            if (isPost) {
                contentDir = this.postsDir
            } else {
                // For pages, check if it's a custom page
                const isCustomPage = contentData.metadata && contentData.metadata.pageType === "custom"
                contentDir = isCustomPage ? this.customPagesDir : this.pagesDir
            }

            const defaultTitle = isPost ? "Untitled Post" : "Untitled Page"
            const defaultSlug = isPost ? "untitled-post" : "untitled-page"

            // Get metadata
            const metadata = contentData.metadata || contentData

            const slug = metadata.slug || slugify(metadata.title || defaultSlug)

            // Create frontmatter
            const frontmatter = {
                id,
                title: metadata.title || defaultTitle,
                subtitle: metadata.subtitle || "",
                slug,
                status: metadata.status || "draft",
                author: metadata.author || "admin",
                createdAt,
                updatedAt: createdAt,
                seoDescription: metadata.seoDescription || "",
            }

            // Add pageType for pages (not posts)
            if (!isPost && metadata.pageType) {
                frontmatter.pageType = metadata.pageType
            }

            // Add parentPage for custom pages
            if (!isPost && metadata.parentPage) {
                frontmatter.parentPage = metadata.parentPage
            }

            // Add publishDate if provided
            if (metadata.publishDate) {
                frontmatter.publishDate = metadata.publishDate
            }

            // Add featured image if provided
            if (metadata.featuredImage) {
                frontmatter.featuredImage = metadata.featuredImage
            }

            // Add excerpt if provided
            if (metadata.excerpt) {
                frontmatter.excerpt = metadata.excerpt
            }

            // Add categories/tags/relatedPosts if provided (for posts)
            if (isPost) {
                if (metadata.category) frontmatter.category = metadata.category
                if (metadata.tags) frontmatter.tags = metadata.tags
                if (metadata.relatedPosts) frontmatter.relatedPosts = metadata.relatedPosts
            }

            // Content from input or empty
            const content = contentData.content || ""

            // Serialize the frontmatter object to YAML format
            const yamlFrontmatter = serializeFrontmatter(frontmatter)

            // Create markdown file
            const filePath = join(contentDir, `${slug}.md`)
            await writeMarkdownFile(filePath, yamlFrontmatter, content)

            // Return the content object
            return {
                ...frontmatter,
                content: content,
                type: contentType,
            }
        } catch (error) {
            console.error(`Error creating ${contentType}:`, error)
            throw error
        }
    }

    /**
     * Create a new post
     * @param {Object} postData - Post data
     * @returns {Promise<Object>} Created post
     */
    async createPost(postData) {
        return this.createContent(postData, "post")
    }

    /**
     * Create a new page
     * @param {Object} pageData - Page data
     * @returns {Promise<Object>} Created page
     */
    async createPage(pageData) {
        return this.createContent(pageData, "page")
    }

    /**
     * Update existing content (post or page)
     * @param {string} id - Content ID
     * @param {Object} contentData - Updated content data
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {Promise<Object|null>} Updated content or null if not found
     */
    async updateContent(id, contentData, contentType = "post") {
        try {
            // Determine content directory based on type
            const isPost = contentType === "post"

            // For pages, we need to check both normal and custom directories
            let contentDirs = []
            if (isPost) {
                contentDirs = [this.postsDir]
            } else {
                // Check both page directories
                contentDirs = [this.pagesDir, this.customPagesDir]
            }

            // Find the content item in any of the possible directories
            let result = null
            for (const dir of contentDirs) {
                const foundResult = await findMarkdownFileByProperty(
                    dir,
                    this.app.parseMarkdownFile.bind(this.app),
                    "id",
                    id
                )

                if (foundResult) {
                    result = foundResult
                    break
                }
            }

            if (!result) {
                return null
            }

            const { filePath, content: originalContent } = result

            // Get metadata from the right property based on what's available
            const metadata = contentData.metadata || contentData

            // Update frontmatter
            const updatedFrontmatter = {
                id: String(originalContent.frontmatter.id), // Ensure ID is a string
                ...originalContent.frontmatter,
                ...metadata,
                updatedAt: new Date().toISOString(),
            }

            // Use updated content field if provided or keep original
            const content = contentData.content !== undefined ? contentData.content : originalContent.content

            // Regenerate slug if title changed and slug wasn't explicitly provided
            if (metadata.title && !metadata.slug && metadata.title !== originalContent.frontmatter.title) {
                updatedFrontmatter.slug = slugify(metadata.title)
            }

            // Check if page type changed (custom <-> normal)
            const pageTypeChanged =
                !isPost && metadata.pageType && originalContent.frontmatter.pageType !== metadata.pageType

            // Determine the target directory based on the (potentially new) page type
            let targetDir
            if (isPost) {
                targetDir = this.postsDir
            } else {
                targetDir = metadata.pageType === "custom" ? this.customPagesDir : this.pagesDir
            }

            // Serialize the updatedFrontmatter object to YAML format
            const yamlFrontmatter = serializeFrontmatter(updatedFrontmatter)

            // Save to file (potentially to a new location if slug changed or page type changed)
            const slugChanged = updatedFrontmatter.slug !== originalContent.frontmatter.slug

            // Determine new file path - consider both slug changes and page type changes
            const newFilePath =
                slugChanged || pageTypeChanged ? join(targetDir, `${updatedFrontmatter.slug}.md`) : filePath

            await writeMarkdownFile(newFilePath, yamlFrontmatter, content)

            // If slug changed or page type changed, remove the old file
            if (newFilePath !== filePath) {
                await deleteFile(filePath)
            }

            // Return the updated content
            return {
                ...updatedFrontmatter,
                content: content,
                type: contentType,
            }
        } catch (error) {
            console.error(`Error updating ${contentType} ${id}:`, error)
            return null
        }
    }

    /**
     * Update an existing post
     * @param {string} id - Post ID
     * @param {Object} postData - Updated post data
     * @returns {Promise<Object|null>} Updated post or null if not found
     */
    async updatePost(id, postData) {
        return this.updateContent(id, postData, "post")
    }

    /**
     * Update an existing page
     * @param {string} id - Page ID
     * @param {Object} pageData - Updated page data
     * @returns {Promise<Object|null>} Updated page or null if not found
     */
    async updatePage(id, pageData) {
        return this.updateContent(id, pageData, "page")
    }

    /**
     * Delete content (post or page)
     * @param {string} id - Content ID
     * @param {string} contentType - Type of content ('post' or 'page')
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteContent(id, contentType = "post") {
        try {
            // Determine content directory based on type
            let contentDirs = []
            if (contentType === "post") {
                contentDirs = [this.postsDir]
            } else {
                // Check both page directories
                contentDirs = [this.pagesDir, this.customPagesDir]
            }

            // Find the content item in any of the possible directories
            let result = null
            for (const dir of contentDirs) {
                const foundResult = await findMarkdownFileByProperty(
                    dir,
                    this.app.parseMarkdownFile.bind(this.app),
                    "id",
                    id
                )

                if (foundResult) {
                    result = foundResult
                    break
                }
            }

            if (!result) {
                return false
            }

            // Delete the file
            return await deleteFile(result.filePath)
        } catch (error) {
            console.error(`Error deleting ${contentType} ${id}:`, error)
            return false
        }
    }

    /**
     * Delete a post
     * @param {string} id - Post ID
     * @returns {Promise<boolean>} Success or failure
     */
    async deletePost(id) {
        return this.deleteContent(id, "post")
    }

    /**
     * Delete a page
     * @param {string} id - Page ID
     * @returns {Promise<boolean>} Success or failure
     */
    async deletePage(id) {
        return this.deleteContent(id, "page")
    }

    /**
     * Convert a string to a URL-friendly slug
     * @param {string} text - Text to convert
     * @returns {string} Slug
     */
    slugify(text) {
        // Note: This is exposed for convenience, uses the implementation from content-utils
        return slugify(text)
    }
}

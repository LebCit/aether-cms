/**
 * Manages checking and cleaning references to media files
 */
export class MediaReferenceManager {
    /**
     * @param {Object} fileStorage - The FileStorage instance
     */
    constructor(fileStorage) {
        this.fileStorage = fileStorage
    }

    /**
     * Check if a media file is referenced in posts or pages
     * @param {string} id - The file ID to check
     * @param {Object} contentManager - The ContentManager instance
     * @returns {Promise<Object>} - Result with referenced flag and list of references
     */
    async checkMediaReferences(id, contentManager) {
        try {
            // First, get the media file to check using the fileStorage instance
            const file = await this.fileStorage.getFileById(id)

            if (!file) return { referenced: false, references: [] }

            const references = [] // Array to store references if found

            // Helper function to check content items for references
            const checkContentItems = async (items, contentType) => {
                for (const item of items) {
                    // Check if this media file references a featuredImage
                    if (item.frontmatter && item.frontmatter.featuredImage) {
                        const featuredImage = item.frontmatter.featuredImage

                        // Check if featured image references our media
                        if (
                            (typeof featuredImage === "object" && featuredImage.id === file.id) ||
                            (typeof featuredImage === "string" &&
                                (featuredImage === file.id || featuredImage === file.url))
                        ) {
                            references.push({
                                id: item.frontmatter.id,
                                title: item.frontmatter.title,
                                type: contentType,
                                referenceType: "featuredImage",
                            })
                        }
                    }

                    // Check content for embedded media references
                    if (item.content && item.content.includes(file.url)) {
                        // Check for markdown image syntax, HTML img tags, and other potential references
                        // Only add if not already added as featuredImage
                        if (
                            !references.some(
                                (ref) => ref.id === item.frontmatter.id && ref.referenceType === "featuredImage"
                            )
                        ) {
                            references.push({
                                id: item.frontmatter.id,
                                title: item.frontmatter.title,
                                type: contentType,
                                referenceType: "embedded",
                            })
                        }
                    }
                }

                return references
            }

            // Get and check all posts and pages using contentManager methods
            const posts = await contentManager.getPosts()
            const pages = await contentManager.getPages()

            await checkContentItems(posts, "post")
            await checkContentItems(pages, "page")

            return {
                referenced: references.length > 0,
                references,
                file,
            }
        } catch (error) {
            console.error("Error checking for media references:", error)
            return { referenced: false, references: [], error: error.message }
        }
    }

    /**
     * Clean references to media in posts/pages
     * @param {string} id - The file ID to clean references for
     * @param {Object} contentManager - The ContentManager instance
     * @returns {Promise<Object>} - Result of the cleaning operation
     */
    async cleanMediaReferences(id, contentManager) {
        try {
            // Check for references first using the provided contentManager
            const { referenced, references, file } = await this.checkMediaReferences(id, contentManager)

            if (!referenced || !references.length) {
                return { success: true, message: "No references found" }
            }

            // Verify contentManager is available
            if (!contentManager) {
                console.error("ContentManager not available for reference cleaning")
                return { success: false, error: "ContentManager not available" }
            }

            // Track successful updates
            let updatedCount = 0
            const updatedReferences = []

            // Process each reference
            for (const ref of references) {
                try {
                    // Get the content item
                    const contentItem =
                        ref.type === "post"
                            ? await contentManager.getPost(ref.id)
                            : await contentManager.getPage(ref.id)

                    if (!contentItem) continue

                    let updated = false
                    const updatedData = { ...contentItem }

                    // Handle different reference types
                    if (ref.referenceType === "featuredImage") {
                        // Remove featuredImage reference
                        updatedData.featuredImage = null
                        updated = true
                    } else if (ref.referenceType === "embedded" && updatedData.content) {
                        // For embedded images, replace with placeholder text
                        // FIXED: Use the full path that's actually used in content
                        const fullImageUrl = `/content/uploads${file.url}`
                        let updatedContent = updatedData.content

                        // Replace markdown image references with placeholder
                        const markdownPattern = new RegExp(
                            `!\\[[^\\]]*\\]\\(${fullImageUrl.replace(/\//g, "\\/")}\\)`,
                            "g"
                        )
                        updatedContent = updatedContent.replace(markdownPattern, "![Image Not Found](missing-image)")

                        // Replace HTML image tags with placeholder
                        const htmlPattern = new RegExp(
                            `<img[^>]*src=["']${fullImageUrl.replace(/\//g, "\\/")}["'][^>]*>`,
                            "g"
                        )
                        updatedContent = updatedContent.replace(
                            htmlPattern,
                            '<img src="missing-image" alt="Image Not Found">'
                        )

                        // Replace figure elements containing the image
                        const figurePattern = new RegExp(
                            `<figure[^>]*>\\s*<img[^>]*src=["']${fullImageUrl.replace(
                                /\//g,
                                "\\/"
                            )}["'][^>]*>[\\s\\n]*(?:<figcaption[^>]*>[^<]*</figcaption>)?\\s*</figure>`,
                            "g"
                        )
                        updatedContent = updatedContent.replace(
                            figurePattern,
                            '<figure><img src="missing-image" alt="Image Not Found"><figcaption>Image Not Found</figcaption></figure>'
                        )

                        // Update the content if changes were made
                        if (updatedContent !== updatedData.content) {
                            updatedData.content = updatedContent
                            updated = true
                        }
                    }

                    // Only update if changes were made
                    if (updated) {
                        // Extract content and treat everything else as metadata
                        const { content, ...metadata } = updatedData

                        // IMPROVED: Clean structure using destructuring
                        const updatePayload = {
                            metadata,
                            content,
                        }

                        const result =
                            ref.type === "post"
                                ? await contentManager.updatePost(ref.id, updatePayload)
                                : await contentManager.updatePage(ref.id, updatePayload)

                        if (result) {
                            updatedCount++
                            updatedReferences.push({
                                ...ref,
                                status: "updated",
                            })
                        }
                    }
                } catch (error) {
                    console.error(`Error cleaning reference for content ID ${ref.id}:`, error)
                    updatedReferences.push({
                        ...ref,
                        status: "error",
                        error: error.message,
                    })
                }
            }

            return {
                success: true,
                totalReferences: references.length,
                updatedCount,
                updatedReferences,
            }
        } catch (error) {
            console.error("Error cleaning media references:", error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Update metadata (alt and caption) in content references
     * @param {string} id - The file ID
     * @param {Object} updates - Object containing new metadata values
     * @param {string} updates.newAlt - New alt text value
     * @param {string} updates.newCaption - New caption value
     * @param {Object} contentManager - The ContentManager instance
     * @returns {Promise<Object>} - Result of the operation
     */
    async updateMetadataInReferences(id, updates, contentManager) {
        try {
            // Determine what fields to update
            const updateAlt = updates.newAlt !== undefined && updates.oldAlt !== updates.newAlt
            const updateCaption = updates.newCaption !== undefined && updates.oldCaption !== updates.newCaption

            // If nothing to update, return early
            if (!updateAlt && !updateCaption) {
                return {
                    success: true,
                    updatedCount: 0,
                    message: "No changes to propagate",
                }
            }

            // Check for references first
            const { referenced, references, file } = await this.checkMediaReferences(id, contentManager)

            if (!referenced || !references.length) {
                return {
                    success: true,
                    updatedCount: 0,
                    altUpdates: updateAlt,
                    captionUpdates: updateCaption,
                }
            }

            // Track successful updates
            let updatedCount = 0
            const updatedReferences = []

            // Process each reference
            for (const ref of references) {
                try {
                    // Get the content item
                    let contentItem
                    if (ref.type === "post") {
                        contentItem = await contentManager.getPost(ref.id)
                    } else if (ref.type === "page") {
                        contentItem = await contentManager.getPage(ref.id)
                    }

                    if (!contentItem) continue

                    let updated = false
                    const updatedData = { ...contentItem }

                    // Handle different reference types
                    if (ref.referenceType === "featuredImage" && updatedData.featuredImage) {
                        if (updatedData.featuredImage.id === id) {
                            // Update alt text if needed
                            if (updateAlt) {
                                updatedData.featuredImage.alt = updates.newAlt
                                updated = true
                            }

                            // Update caption if needed
                            if (updateCaption) {
                                updatedData.featuredImage.caption = updates.newCaption
                                updated = true
                            }
                        }
                    } else if (ref.referenceType === "embedded" && updatedData.content) {
                        // Use the full path that's actually used in content
                        const fullImageUrl = `/content/uploads${file.url}`

                        // Only update alt text if needed
                        if (updateAlt) {
                            // Replace markdown image syntax with updated alt text
                            const markdownPattern = new RegExp(
                                `!\\[[^\\]]*\\]\\(${fullImageUrl.replace(/\//g, "\\/")}\\)`,
                                "g"
                            )
                            updatedData.content = updatedData.content.replace(
                                markdownPattern,
                                `![${updates.newAlt}](${fullImageUrl})`
                            )

                            // Replace HTML image tags with updated alt text
                            const htmlPattern = new RegExp(
                                `<img([^>]*)src=["']${fullImageUrl.replace(
                                    /\//g,
                                    "\\/"
                                )}["']([^>]*)alt=["'][^"']*["']([^>]*)>`,
                                "g"
                            )
                            updatedData.content = updatedData.content.replace(
                                htmlPattern,
                                `<img$1src="${fullImageUrl}"$2alt="${updates.newAlt}"$3>`
                            )

                            if (updatedData.content !== contentItem.content) {
                                updated = true
                            }
                        }

                        // Only update caption if needed
                        if (updateCaption) {
                            // Find figure elements with the image and update figcaption
                            const figurePattern = new RegExp(
                                `<figure[^>]*>\\s*<img[^>]*src=["']${fullImageUrl.replace(
                                    /\//g,
                                    "\\/"
                                )}["'][^>]*>[\\s\\n]*<figcaption[^>]*>[^<]*</figcaption>\\s*</figure>`,
                                "g"
                            )
                            updatedData.content = updatedData.content.replace(figurePattern, (match) => {
                                return match.replace(
                                    /<figcaption[^>]*>[^<]*<\/figcaption>/,
                                    `<figcaption>${updates.newCaption}</figcaption>`
                                )
                            })

                            if (updatedData.content !== contentItem.content) {
                                updated = true
                            }
                        }
                    }

                    // Only update if changes were made
                    if (updated) {
                        // Extract content and treat everything else as metadata
                        const { content, ...metadata } = updatedData

                        // IMPROVED: Clean structure using destructuring
                        const updatePayload = {
                            metadata,
                            content,
                        }

                        const result =
                            ref.type === "post"
                                ? await contentManager.updatePost(ref.id, updatePayload)
                                : await contentManager.updatePage(ref.id, updatePayload)

                        if (result) {
                            updatedCount++
                            updatedReferences.push({
                                ...ref,
                                status: "updated",
                                updateTypes: {
                                    alt: updateAlt,
                                    caption: updateCaption,
                                },
                            })
                        }
                    }
                } catch (error) {
                    console.error(`Error updating metadata for content ID ${ref.id}:`, error)
                }
            }

            return {
                success: true,
                totalReferences: references.length,
                updatedCount,
                updatedReferences,
                altUpdates: updateAlt,
                captionUpdates: updateCaption,
            }
        } catch (error) {
            console.error("Error updating metadata in references:", error)
            return { success: false, error: error.message }
        }
    }
}

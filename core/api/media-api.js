/**
 * Sets up API routes for media management
 * @param {Object} app - LiteNode app instance
 * @param {Object} options - Configuration options
 */
export function setupMediaApi(app, systems) {
    const { fileStorage, contentManager, authenticate } = systems

    // Get all media files
    app.get("/api/media", authenticate, async (req, res) => {
        try {
            const type = req.queryParams?.get("type") || "image"

            if (type !== "image" && type !== "document") {
                return res.status(400).json({ success: false, error: "Invalid media type" })
            }

            const files = await fileStorage.getFiles(type)
            res.json({ success: true, data: files })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Upload a media file
    app.post(
        "/api/media/upload",
        authenticate,
        async (req, res) => {
            try {
                // Check if there are files in the request body
                if (!req.body || !req.body.file || !req.body.file.length) {
                    return res.status(400).json({ success: false, error: "No file uploaded" })
                }

                // Get the file from the request body
                const fileData = req.body.file[0]

                if (!fileData || !fileData.body) {
                    return res.status(400).json({ success: false, error: "Invalid file data" })
                }

                // Determine file type based on contentType or filename extension
                let type = "document"
                if (fileData.contentType && fileData.contentType.startsWith("image/")) {
                    type = "image"
                } else {
                    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".ico"]
                    const fileExt = fileData.filename.substring(fileData.filename.lastIndexOf(".")).toLowerCase()
                    if (imageExtensions.includes(fileExt)) {
                        type = "image"
                    }
                }

                // LiteNode internally uses 'meros' to handle multipart/form-data submissions.
                // For each uploaded file, 'meros' provides access to the following properties: header, body, filename, and contentType.
                // Since 'alt', 'width', and 'height' are added to the form data, each will have those properties.
                // These fields are treated as arrays, so to access a specific value, use:
                // req.body.alt[0], req.body.width[0], req.body.height[0]
                // Each element in these arrays is an object that contains a 'body' property.
                // For example: req.body.alt[0].body contains the alternate text as a Buffer.
                // To extract meaningful content from this, we can:
                // - Use .toString() to convert the Buffer to a string (for text-based data)
                // - Use parseInt() to convert the value to a number (for numeric data)

                // Get alt text from form data if provided
                const altText = req.body.alt ? req.body.alt[0].body.toString() : ""

                // Get width and height from form data if provided
                const width = req.body.width ? parseInt(req.body.width[0].body) : null
                const height = req.body.height ? parseInt(req.body.height[0].body) : null

                // Prepare metadata object
                const metadata = {
                    alt: altText,
                    ...(width && height ? { width, height } : {}), // Only add if both exist
                }

                // Save the file with metadata
                const fileInfo = await fileStorage.saveFile(fileData.body, fileData.filename, type, metadata)

                // Return success response
                res.status(201).json({
                    success: true,
                    data: fileInfo,
                })
            } catch (error) {
                console.error("Upload error:", error)
                res.status(500).json({ success: false, error: error.message })
            }
        },
        10
    )

    // Check if a media item has references
    app.get("/api/media/:id/references", authenticate, async (req, res) => {
        try {
            const { id } = req.params
            const type = req.queryParams?.get("type") || "image"

            // Check references using the provided contentManager
            const referenceCheck = await fileStorage.checkMediaReferences(id, contentManager)

            if (!referenceCheck) {
                return res.status(404).json({ success: false, error: "File not found" })
            }

            res.json({
                success: true,
                referenced: referenceCheck.referenced,
                references: referenceCheck.references || [],
                file: referenceCheck.file,
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Propagate metadata changes (alt text and caption) to referenced content
    app.post("/api/media/:id/propagate-metadata", authenticate, async (req, res) => {
        try {
            const { id } = req.params
            const { oldAlt, newAlt, oldCaption, newCaption } = req.body

            // Track what fields are being updated
            const updateAlt = oldAlt !== newAlt
            const updateCaption = oldCaption !== newCaption

            if (!updateAlt && !updateCaption) {
                return res.json({
                    success: true,
                    updatedCount: 0,
                    message: "No changes to propagate",
                })
            }

            // Get the media item to confirm it exists
            const mediaItem = await fileStorage.getFileById(id)

            if (!mediaItem) {
                return res.status(404).json({ success: false, error: "Media item not found" })
            }

            // Check where this media is referenced
            const { referenced, references } = await fileStorage.checkMediaReferences(id, contentManager)

            if (!referenced || !references.length) {
                return res.json({
                    success: true,
                    updatedCount: 0,
                    altUpdates: updateAlt,
                    captionUpdates: updateCaption,
                    message: "No references found to update",
                })
            }

            // Update each reference
            let updatedCount = 0

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
                    const updates = { ...contentItem }

                    // Handle featured image metadata
                    if (ref.referenceType === "featuredImage" && updates.featuredImage) {
                        if (updates.featuredImage.id === id) {
                            if (updateAlt) {
                                updates.featuredImage.alt = newAlt
                                updated = true
                            }

                            if (updateCaption) {
                                updates.featuredImage.caption = newCaption
                                updated = true
                            }
                        }
                    }

                    // Handle embedded images in content
                    if (ref.referenceType === "embedded" && contentItem.content) {
                        // Use the full path that's actually used in content
                        const fullImageUrl = `/content/uploads${mediaItem.url}`
                        const imageUrlPattern = fullImageUrl.replace(/\//g, "\\/")

                        // Only update alt text in content if needed
                        if (updateAlt) {
                            // Replace markdown image syntax with updated alt text
                            const markdownPattern = new RegExp(`!\\[[^\\]]*\\]\\(${imageUrlPattern}\\)`, "g")
                            updates.content = contentItem.content.replace(
                                markdownPattern,
                                `![${newAlt}](${fullImageUrl})`
                            )

                            // Replace HTML image tags with updated alt text
                            const htmlPattern = new RegExp(
                                `<img([^>]*)src=["']${imageUrlPattern}["']([^>]*)alt=["'][^"']*["']([^>]*)>`,
                                "g"
                            )
                            updates.content = updates.content.replace(
                                htmlPattern,
                                `<img$1src="${fullImageUrl}"$2alt="${newAlt}"$3>`
                            )

                            if (updates.content !== contentItem.content) {
                                updated = true
                            }
                        }

                        // Caption handling for HTML tags with figcaption if needed
                        if (updateCaption) {
                            // Find figure elements with the image and update figcaption
                            const figurePattern = new RegExp(
                                `<figure[^>]*>\\s*<img[^>]*src=["']${imageUrlPattern}["'][^>]*>[\\s\\n]*<figcaption[^>]*>[^<]*</figcaption>\\s*</figure>`,
                                "g"
                            )
                            updates.content = updates.content.replace(figurePattern, (match) => {
                                return match.replace(
                                    /<figcaption[^>]*>[^<]*<\/figcaption>/,
                                    `<figcaption>${newCaption}</figcaption>`
                                )
                            })

                            if (updates.content !== contentItem.content) {
                                updated = true
                            }
                        }
                    }

                    // If changes were made, update the content
                    if (updated) {
                        // Extract content and treat everything else as metadata
                        const { content, ...metadata } = updates

                        // IMPROVED: Clean structure using destructuring
                        const updateData = {
                            metadata,
                            content,
                        }

                        if (ref.type === "post") {
                            await contentManager.updatePost(ref.id, updateData)
                        } else if (ref.type === "page") {
                            await contentManager.updatePage(ref.id, updateData)
                        }
                        updatedCount++
                    }
                } catch (error) {
                    console.error(`Error updating reference ${ref.id}:`, error)
                }
            }

            res.json({
                success: true,
                updatedCount,
                altUpdates: updateAlt,
                captionUpdates: updateCaption,
                message: `Updated metadata in ${updatedCount} references`,
            })
        } catch (error) {
            console.error("Error propagating metadata changes:", error)
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get a specific media file by ID
    app.get("/api/media/:id", authenticate, async (req, res) => {
        try {
            const { id } = req.params
            const file = await fileStorage.getFileById(id)

            if (!file) {
                return res.status(404).json({ success: false, error: "File not found" })
            }

            // If checkReferences is true, also check references
            if (req.queryParams?.get("checkReferences") === "true") {
                const referenceCheck = await fileStorage.checkMediaReferences(id, contentManager)
                const includeDetails = req.queryParams?.get("includeDetails") === "true"

                // If detailed references are requested, enhance the reference objects
                let references = referenceCheck.references || []

                if (includeDetails && references.length > 0) {
                    // Enhance references with additional content data
                    references = await Promise.all(
                        references.map(async (ref) => {
                            try {
                                // Get additional content data based on reference type
                                let content
                                if (ref.type === "post") {
                                    content = await contentManager.getPost(ref.id)
                                } else if (ref.type === "page") {
                                    content = await contentManager.getPage(ref.id)
                                }

                                // If content is found, enhance the reference with additional data
                                if (content) {
                                    return {
                                        ...ref,
                                        title: content.title || ref.title,
                                        slug: content.slug || contentManager.slugify(ref.title),
                                        status: content.status,
                                        createdAt: content.createdAt,
                                        updatedAt: content.updatedAt,
                                        excerpt: content.excerpt || "",
                                    }
                                }

                                return ref
                            } catch (err) {
                                console.error(`Error enhancing reference for ${ref.id}:`, err)
                                return ref
                            }
                        })
                    )
                }

                return res.json({
                    success: true,
                    data: file,
                    referenced: referenceCheck.referenced,
                    references: references,
                })
            }

            res.json({ success: true, data: file })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Update a media file's metadata
    app.put("/api/media/:id", authenticate, async (req, res) => {
        try {
            const { id } = req.params
            const { alt, caption } = req.body

            const updatedFile = await fileStorage.updateFile(id, { alt, caption })

            if (!updatedFile) {
                return res.status(404).json({ success: false, error: "File not found" })
            }

            res.json({ success: true, data: updatedFile })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Delete a media file
    app.delete("/api/media/:id", authenticate, async (req, res) => {
        try {
            const { id } = req.params
            const cleanReferences = req.queryParams?.get("clean") === "true"

            // Check references using the provided contentManager
            const { referenced, references } = await fileStorage.checkMediaReferences(id, contentManager)

            // Clean references if requested
            let referencesRemoved = 0
            if (referenced && cleanReferences) {
                const cleanResult = await fileStorage.cleanMediaReferences(id, contentManager)
                referencesRemoved = cleanResult.updatedCount || 0
            }

            // Proceed with deletion
            const success = await fileStorage.deleteFileById(id)

            if (!success) {
                return res.status(404).json({ success: false, error: "File not found" })
            }

            res.json({
                success: true,
                referencesFound: referenced ? references.length : 0,
                referencesRemoved: referencesRemoved,
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })
}

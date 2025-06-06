/**
 * Media Form Handler Module
 * Handles sidebar form and media details
 */
export class MediaFormHandler {
    /**
     * @param {Object} state - The MediaState instance
     * @param {Object} apiService - The MediaApiService instance
     * @param {Object} renderer - The MediaRenderer instance
     * @param {Object} notification - The NotificationService instance
     */
    constructor(state, apiService, renderer, notification) {
        this.state = state
        this.apiService = apiService
        this.renderer = renderer
        this.notification = notification

        // DOM Elements
        this.mediaSidebar = document.getElementById("media-sidebar")
        this.deleteMediaModal = document.getElementById("delete-media-modal")
        this.updateMediaButton = document.getElementById("update-media")
        this.referenceWarning = document.getElementById("reference-warning")

        this.initEventListeners()
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Sidebar close button
        document.getElementById("close-sidebar").addEventListener("click", () => {
            this.closeSidebar()
        })

        // Update button
        this.updateMediaButton.addEventListener("click", () => {
            if (this.state.currentMediaItem) {
                this.updateMediaItem(this.state.currentMediaItem.id)
            }
        })

        // Delete button
        document.getElementById("delete-media").addEventListener("click", () => {
            if (this.state.currentMediaItem) {
                this.showDeleteConfirmation([this.state.currentMediaItem.id])
            }
        })

        // Add keyboard event listeners
        document.addEventListener("keydown", (e) => {
            // Handle Escape key to close sidebar
            if (e.key === "Escape" && this.mediaSidebar.classList.contains("active")) {
                this.closeSidebar()
            }

            // Handle Tab key for focus trapping within sidebar
            if (e.key === "Tab" && this.mediaSidebar.classList.contains("active")) {
                this.trapFocus(e)
            }
        })

        // Delete confirmation modal events
        document.querySelectorAll("#delete-media-modal .close-modal").forEach((btn) => {
            btn.addEventListener("click", () => {
                this.deleteMediaModal.classList.remove("show")
            })
        })

        document.getElementById("cancel-delete-media").addEventListener("click", () => {
            this.deleteMediaModal.classList.remove("show")
        })

        document.getElementById("confirm-delete-media").addEventListener("click", () => {
            // Get ALL itemIds from the data attribute, not just the preview items
            const itemsToDelete = JSON.parse(this.deleteMediaModal.dataset.itemsToDelete || "[]")

            if (itemsToDelete.length > 0) {
                this.deleteMediaItems(itemsToDelete)
            }
        })

        // Custom events
        document.addEventListener("open-media-sidebar", (e) => {
            this.openMediaSidebar(e.detail.itemId)
        })
    }

    /**
     * Open the media sidebar with item details
     * @param {string} itemId - ID of the media item to display
     */
    async openMediaSidebar(itemId) {
        // Store the previously focused element
        this.previouslyFocusedElement = document.activeElement

        // Reset sidebar content scroll position to top
        const sidebarContent = this.mediaSidebar.querySelector(".sidebar-content")
        if (sidebarContent) {
            sidebarContent.scrollTop = 0
        }

        this.state.setCurrentMediaItem(itemId)
        const item = this.state.currentMediaItem

        if (!item) {
            console.error("Media item not found:", itemId)
            return
        }

        // Fill the sidebar with item details
        const mediaPreview = document.getElementById("media-preview")
        const mediaFilename = document.getElementById("media-filename")
        const mediaAlt = document.getElementById("media-alt")
        const mediaCaption = document.getElementById("media-caption")
        const mediaType = document.getElementById("media-type")
        const mediaSize = document.getElementById("media-size")
        const mediaDimensions = document.getElementById("media-dimensions")
        const mediaDate = document.getElementById("media-date")
        const mediaUsage = document.getElementById("media-usage")

        // Set preview
        if (item.type === "image") {
            mediaPreview.innerHTML = `<img src="/content/uploads${item.url}" alt="${item.alt || ""}">`
            mediaPreview.className = "media-preview"
        } else {
            // Document preview
            const fileExt = this.getFileExtension(item.filename)
            const icon = this.getDocumentIcon(fileExt)

            mediaPreview.innerHTML = `
                <div class="document-icon">${icon}</div>
                <div>${item.filename}</div>
            `
            mediaPreview.className = "media-preview document"
        }

        // Set details
        mediaFilename.value = item.filename
        mediaAlt.value = item.alt || ""
        mediaCaption.value = item.caption || ""

        mediaType.textContent =
            item.type === "image"
                ? `Image (${this.getFileExtension(item.filename).toUpperCase()})`
                : `Document (${this.getFileExtension(item.filename).toUpperCase()})`

        mediaSize.textContent = this.formatFileSize(item.size)

        if (item.width && item.height) {
            mediaDimensions.textContent = `${item.width} × ${item.height}`
        } else {
            mediaDimensions.textContent = "N/A"
        }

        mediaDate.textContent = this.formatDate(item.createdAt)

        // Show the sidebar
        this.mediaSidebar.classList.add("active")

        // Set focus to the close button for immediate keyboard navigation
        const closeButton = document.getElementById("close-sidebar")
        if (closeButton) {
            closeButton.focus()
        }

        // Show loading state for usage info
        mediaUsage.innerHTML = '<span class="loading-indicator">Checking usage...</span>'

        // Check for references
        try {
            const { hasReferences, references } = await this.checkMediaReferences([itemId])

            if (hasReferences && references.length > 0) {
                // Group references by type
                const referencesByType = references.reduce((grouped, ref) => {
                    grouped[ref.type] = grouped[ref.type] || []
                    grouped[ref.type].push(ref)
                    return grouped
                }, {})

                // Create usage HTML
                let usageHTML = '<ul class="usage-list">'

                // Add posts
                if (referencesByType.post && referencesByType.post.length > 0) {
                    usageHTML += `<li><strong>Posts (${referencesByType.post.length})</strong>: `
                    usageHTML += referencesByType.post
                        .map(
                            (ref) =>
                                `<a href="/post/${ref.slug}" target="_blank" title="${ref.title}">${this.truncateText(
                                    ref.title,
                                    25
                                )}</a>`
                        )
                        .join(", ")
                    usageHTML += "</li>"
                }

                // Add pages
                if (referencesByType.page && referencesByType.page.length > 0) {
                    usageHTML += `<li><strong>Pages (${referencesByType.page.length})</strong>: `
                    usageHTML += referencesByType.page
                        .map(
                            (ref) =>
                                `<a href="/page/${ref.slug}" target="_blank" title="${ref.title}">${this.truncateText(
                                    ref.title,
                                    25
                                )}</a>`
                        )
                        .join(", ")
                    usageHTML += "</li>"
                }

                usageHTML += "</ul>"

                // Show usage info
                mediaUsage.innerHTML = usageHTML
            } else {
                // No references found
                mediaUsage.innerHTML = "Not currently used in any posts or pages."
            }
        } catch (error) {
            console.error("Error checking media usage:", error)
            mediaUsage.innerHTML = "Unable to check usage information."
        }
    }

    /**
     * Close the sidebar with proper focus restoration
     */
    closeSidebar() {
        this.mediaSidebar.classList.remove("active")
        this.state.currentMediaItem = null

        // Restore focus to the previously focused element
        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus()
            this.previouslyFocusedElement = null
        }
    }

    /**
     * Trap focus within the sidebar when it's open
     * @param {KeyboardEvent} e - The keyboard event
     */
    trapFocus(e) {
        const focusableElements = this.mediaSidebar.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault()
                lastElement.focus()
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault()
                firstElement.focus()
            }
        }
    }

    /**
     * Truncate text to a specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length before truncation
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text
        return text.substring(0, maxLength) + "..."
    }

    /**
     * Update media item metadata
     * @param {string} itemId - ID of the media item to update
     */
    async updateMediaItem(itemId) {
        const mediaAlt = document.getElementById("media-alt")
        const mediaCaption = document.getElementById("media-caption")

        // Store the previous values for comparison
        const currentItem = this.state.findMediaItem(itemId)
        const previousAlt = currentItem ? currentItem.alt : null
        const previousCaption = currentItem ? currentItem.caption : null

        try {
            // Show a loading state in the update button
            this.updateMediaButton.textContent = "Saving..."
            this.updateMediaButton.disabled = true

            const updates = {
                alt: mediaAlt.value,
                caption: mediaCaption.value,
            }

            const data = await this.apiService.updateMediaItem(itemId, updates)

            if (data.success) {
                // Update local data
                this.state.updateMediaItem(itemId, updates)

                // If either alt text or caption has changed, propagate changes to content
                if (previousAlt !== updates.alt || previousCaption !== updates.caption) {
                    await this.propagateMetadataChanges(itemId, {
                        oldAlt: previousAlt,
                        newAlt: updates.alt,
                        oldCaption: previousCaption,
                        newCaption: updates.caption,
                    })
                }

                // Show success message
                this.notification.showToast("Media updated successfully", "success")

                // Update the grid to reflect changes
                document.dispatchEvent(new CustomEvent("filters-changed"))

                // Close sidebar
                this.mediaSidebar.classList.remove("active")
                this.state.currentMediaItem = null
            } else {
                this.notification.showToast(`Update failed: ${data.error}`, "error")
            }
        } catch (error) {
            console.error("Error updating media:", error)
            this.notification.showToast("Error updating media", "error")
        } finally {
            // Reset button state
            this.updateMediaButton.textContent = "Save Changes"
            this.updateMediaButton.disabled = false
        }
    }

    /**
     * Propagate alt text and caption changes to content that references this media
     * @param {string} itemId - ID of the media item being updated
     * @param {Object} changes - Metadata changes to propagate
     * @param {string} [changes.oldAlt] - Previous alt text value
     * @param {string} [changes.newAlt] - New alt text value
     * @param {string} [changes.oldCaption] - Previous caption value
     * @param {string} [changes.newCaption] - New caption value
     * @returns {Promise<void>} - Resolves when propagation is complete
     */
    async propagateMetadataChanges(itemId, changes) {
        try {
            // Check for references
            const { references } = await this.checkMediaReferences([itemId])

            if (references && references.length > 0) {
                // Call the API to update references
                const response = await fetch(`/api/media/${itemId}/propagate-metadata`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(changes),
                })

                const result = await response.json()

                if (result.success) {
                    let message = `Updated metadata in ${result.updatedCount} references`
                    if (result.altUpdates && result.captionUpdates) {
                        message = `Updated alt text and caption in ${result.updatedCount} references`
                    } else if (result.altUpdates) {
                        message = `Updated alt text in ${result.updatedCount} references`
                    } else if (result.captionUpdates) {
                        message = `Updated caption in ${result.updatedCount} references`
                    }

                    this.notification.showToast(message, "info")
                }
            }
        } catch (error) {
            console.error("Error propagating metadata changes:", error)
        }
    }

    /**
     * Check if media items have references in posts or pages
     * @param {Array} itemIds - Array of item IDs to check
     * @returns {Promise<Object>} Object containing reference information
     */
    async checkMediaReferences(itemIds) {
        try {
            // First check if we have cached reference data
            const references = []

            // Make a batch of checks for all items
            const checkPromises = itemIds.map((itemId) => {
                return fetch(`/api/media/${itemId}?checkReferences=true`)
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success && data.referenced) {
                            // Enhance references with additional data if available
                            const enhancedReferences = data.references.map((ref) => {
                                return {
                                    ...ref,
                                    slug: ref.slug || this.slugify(ref.title),
                                    url: `/${ref.type}/${ref.slug || this.slugify(ref.title)}`,
                                }
                            })

                            references.push(...enhancedReferences)
                            return true
                        }
                        return false
                    })
                    .catch((error) => {
                        console.error(`Error checking references for ${itemId}:`, error)
                        return false
                    })
            })

            const results = await Promise.all(checkPromises)
            const hasReferences = results.some((result) => result === true)

            return {
                hasReferences,
                references,
                totalReferences: references.length,
            }
        } catch (error) {
            console.error("Error checking media references:", error)
            return { hasReferences: false, references: [], totalReferences: 0 }
        }
    }

    /**
     * Simple slugify function to generate URL-friendly slugs
     * @param {string} text - Text to convert to slug
     * @returns {string} URL-friendly slug
     */
    slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-") // Replace spaces with -
            .replace(/&/g, "-and-") // Replace & with 'and'
            .replace(/[^\w\-]+/g, "") // Remove all non-word chars
            .replace(/\-\-+/g, "-") // Replace multiple - with single -
    }

    /**
     * Show delete confirmation modal
     * @param {Array} itemIds - Array of item IDs to delete
     */
    async showDeleteConfirmation(itemIds) {
        // Store all IDs to delete in a data attribute on the modal
        this.deleteMediaModal.dataset.itemsToDelete = JSON.stringify(itemIds)

        // Check if any of the items have references
        const { hasReferences, totalReferences } = await this.checkMediaReferences(itemIds)

        // Show or hide the reference warning
        this.referenceWarning.hidden = !hasReferences

        // Update warning text if needed
        if (hasReferences) {
            const warningText = this.referenceWarning.querySelector(".warning-text")
            warningText.innerHTML = `
                <strong>Warning:</strong> 
                ${
                    totalReferences > 1
                        ? `These files are used in ${totalReferences} places across your site.`
                        : "This file is used in content on your site."
                } 
                References will be automatically removed if you delete ${
                    itemIds.length > 1 ? "these files" : "this file"
                }.
            `
        }

        // Render preview (visual only)
        this.renderer.renderDeletePreview(itemIds)
        this.deleteMediaModal.classList.add("show")
    }

    /**
     * Delete media items
     * @param {Array} itemIds - Array of item IDs to delete
     */
    async deleteMediaItems(itemIds) {
        try {
            // Add an option to clean references
            const results = await this.apiService.deleteMediaItems(itemIds, {
                cleanReferences: true,
            })
            const allSuccessful = results.every((result) => result.success)

            // Handle results and update UI
            if (allSuccessful) {
                // Update local data
                this.state.removeMediaItems(itemIds)

                // Always close sidebar first before any other operations
                this.mediaSidebar.classList.remove("active")
                this.state.currentMediaItem = null

                // Close delete modal
                this.deleteMediaModal.classList.remove("show")

                // Show success message
                const message =
                    itemIds.length === 1
                        ? "Media item deleted successfully"
                        : `${itemIds.length} media items deleted successfully`

                this.notification.showToast(message, "success")

                // Update UI
                document.getElementById("total-items").textContent = this.state.mediaItems.length

                if (this.state.mediaItems.length === 0) {
                    this.renderer.showEmptyState(true)
                } else {
                    // Force re-render of the grid
                    document.dispatchEvent(new CustomEvent("apply-filters-and-render"))
                }

                // If any items had references, show that info in the notification
                const referencesRemoved = results.reduce((total, result) => total + (result.referencesRemoved || 0), 0)

                if (referencesRemoved > 0) {
                    this.notification.showToast(
                        `${itemIds.length} items deleted. ${referencesRemoved} references updated.`,
                        "info"
                    )
                }
            } else {
                // Close modal but keep sidebar open
                this.deleteMediaModal.classList.remove("show")

                // Show error message
                this.notification.showToast("Some items could not be deleted", "error")
            }
        } catch (error) {
            console.error("Error deleting media:", error)
            this.notification.showToast("Error deleting media", "error")

            // Close modal on error
            this.deleteMediaModal.classList.remove("show")
        }
    }

    // Utility methods (these could be pulled from the utils module instead)

    getFileExtension(filename) {
        return filename.split(".").pop().toLowerCase()
    }

    getDocumentIcon(fileExt) {
        let icon = "📄" // Default document icon

        if (["pdf"].includes(fileExt)) icon = "📕"
        else if (["doc", "docx"].includes(fileExt)) icon = "📘"
        else if (["xls", "xlsx"].includes(fileExt)) icon = "📗"
        else if (["ppt", "pptx"].includes(fileExt)) icon = "📙"

        return icon
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + " B"
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
        else return (bytes / 1048576).toFixed(1) + " MB"
    }

    formatDate(dateString) {
        const date = new Date(dateString)
        return date.toLocaleString()
    }
}

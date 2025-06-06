/**
 * EditorState - Manages the state of the editor
 */
export class EditorState {
    constructor({ contentType, isEdit, itemId }) {
        this.contentType = contentType
        this.isEdit = isEdit
        this.itemId = itemId
        this.originalData = null
        this.isDirty = false

        this.featuredImage = null
        this.gallery = []
    }

    /**
     * Update the editor state with fresh data
     * @param {Object} data - The current content data
     */
    updateState(data) {
        if (!this.originalData) {
            // Store initial state for comparison
            this.originalData = JSON.parse(JSON.stringify(data))

            // Initialize featured image from the loaded data if present
            if (data.metadata && data.metadata.featuredImage) {
                this.featuredImage = data.metadata.featuredImage
            }

            // Initialize gallery from the loaded data if present
            if (data.metadata && data.metadata.gallery) {
                this.gallery = data.metadata.gallery
            }
        }
        this.currentData = data
    }

    /**
     * Check if the content has been modified
     * @param {Object} currentData - The current content data to compare
     * @returns {boolean} Whether the content has changed
     */
    hasContentChanged(currentData) {
        if (!this.originalData) return true

        // Compare title, content, and other important fields
        return (
            this.originalData.metadata.title !== currentData.metadata.title ||
            this.originalData.metadata.slug !== currentData.metadata.slug ||
            this.originalData.metadata.status !== currentData.metadata.status ||
            this.originalData.metadata.excerpt !== currentData.metadata.excerpt ||
            this.originalData.content !== currentData.content
        )
    }

    /**
     * Mark the content as clean (saved)
     */
    markClean() {
        this.isDirty = false
    }

    /**
     * Mark the content as dirty (unsaved changes)
     */
    markDirty() {
        this.isDirty = true
    }

    /**
     * Get featured image
     * @returns {Object|null} Featured image object or null
     */
    getFeaturedImage() {
        return this.featuredImage
    }

    /**
     * Set featured image
     * @param {Object|null} image - Featured image object or null to remove
     */
    setFeaturedImage(image) {
        this.featuredImage = image
        this.markDirty()
    }

    /**
     * Get gallery images
     * @returns {Array} Array of gallery image objects
     */
    getGallery() {
        return this.gallery
    }

    /**
     * Set gallery images
     * @param {Array} images - Array of gallery image objects
     */
    setGallery(images) {
        this.gallery = images || []
        this.markDirty()
    }

    /**
     * Remove gallery image
     * @param {string} id - ID of the image to remove
     */
    removeGalleryImage(id) {
        this.gallery = this.gallery.filter((image) => image.id !== id)
        this.markDirty()
    }

    // Initialize the featured image from the editor state
    initExistingFeaturedImage() {
        if (!this.editorState) {
            console.warn("Cannot initialize featured image: editor state is not available")
            return
        }

        const featuredImage = this.editorState.getFeaturedImage()

        if (featuredImage && featuredImage.url) {
            // Update the preview to show the existing featured image
            if (this.featuredImagePreview) {
                this.featuredImagePreview.innerHTML = `
                <img src="/content/uploads${featuredImage.url}" alt="${featuredImage.alt || ""}">
                <button class="remove-featured-image">Remove</button>
            `

                // Add event listener to the new remove button
                const removeButton = this.featuredImagePreview.querySelector(".remove-featured-image")
                if (removeButton) {
                    removeButton.addEventListener("click", () => this.editorState.removeFeaturedImage())
                }
            }
        }
    }
}

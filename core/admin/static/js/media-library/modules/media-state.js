/**
 * Media State Module
 * Manages all state and data for the media library
 */
export class MediaState {
    constructor() {
        // Media items data
        this.mediaItems = []

        // Selection state
        this.selectedItems = new Set()
        this.currentMediaItem = null

        // Upload state
        this.filesToUpload = []

        // Filter and sort state
        this.filterQuery = ""
        this.filterType = "all"
        this.sortBy = "newest"

        // Pagination state
        this.currentPage = 1
        this.itemsPerPage = 48
        this.totalPages = 1

        // Initialize custom event listeners
        this.initEventListeners()
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Listen for requests to get media items
        document.addEventListener("get-media-item", (e) => {
            const item = this.findMediaItem(e.detail.itemId)
            if (e.detail.callback && typeof e.detail.callback === "function") {
                e.detail.callback(item)
            }
        })

        // Synchronous version for internal use
        document.addEventListener("get-media-item-sync", (e) => {
            return this.findMediaItem(e.detail.itemId)
        })
    }

    /**
     * Set the media items
     * @param {Array} items - The media items to set
     */
    setMediaItems(items) {
        this.mediaItems = items
    }

    /**
     * Add a new media item to the collection
     * @param {Object} mediaItem - The new media item
     */
    addMediaItem(mediaItem) {
        // Ensure the item has a type
        if (!mediaItem.type) {
            const filename = mediaItem.filename || ""
            const ext = filename.split(".").pop().toLowerCase()
            const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)
            mediaItem.type = isImage ? "image" : "document"
        }

        // Add to the beginning of the array (newest first)
        this.mediaItems.unshift(mediaItem)
    }

    /**
     * Find a media item by ID
     * @param {string} itemId - ID of the item to find
     * @returns {Object|null} The found media item or null
     */
    findMediaItem(itemId) {
        const item = this.mediaItems.find((item) => item.id === itemId)

        return item
    }

    /**
     * Remove media items by IDs
     * @param {Array} itemIds - Array of item IDs to remove
     */
    removeMediaItems(itemIds) {
        this.mediaItems = this.mediaItems.filter((item) => !itemIds.includes(item.id))

        // Also remove from selectedItems
        itemIds.forEach((id) => this.selectedItems.delete(id))

        // Reset currentMediaItem if it was deleted
        if (this.currentMediaItem && itemIds.includes(this.currentMediaItem.id)) {
            this.currentMediaItem = null
        }
    }

    /**
     * Update a media item's metadata
     * @param {string} itemId - ID of the item to update
     * @param {Object} updates - Object with properties to update
     */
    updateMediaItem(itemId, updates) {
        const itemIndex = this.mediaItems.findIndex((item) => item.id === itemId)

        if (itemIndex !== -1) {
            const oldItem = this.mediaItems[itemIndex]

            this.mediaItems[itemIndex] = {
                ...oldItem,
                ...updates,
            }

            // Update current item if it's the same
            if (this.currentMediaItem && this.currentMediaItem.id === itemId) {
                this.currentMediaItem = this.mediaItems[itemIndex]
            }
        } else {
            console.warn(`Could not update item ${itemId} - not found in state`)
        }
    }

    /**
     * Toggle selection state of an item
     * @param {string} itemId - ID of the item to toggle
     * @returns {boolean} New selection state
     */
    toggleItemSelection(itemId) {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId)
            return false
        } else {
            this.selectedItems.add(itemId)
            return true
        }
    }

    /**
     * Clear all selected items
     */
    clearSelection() {
        this.selectedItems.clear()
    }

    /**
     * Set the current media item being viewed
     * @param {string} itemId - ID of the item to set as current
     */
    setCurrentMediaItem(itemId) {
        const item = this.findMediaItem(itemId)

        this.currentMediaItem = item
    }

    /**
     * Add files to upload queue
     * @param {Array} files - Array of files to add to upload queue
     */
    addFilesToUpload(files) {
        this.filesToUpload = [...this.filesToUpload, ...files]
    }

    /**
     * Remove a file from the upload queue
     * @param {number} index - Index of the file to remove
     */
    removeFileFromUpload(index) {
        if (index >= 0 && index < this.filesToUpload.length) {
            this.filesToUpload.splice(index, 1)
        }
    }

    /**
     * Clear the upload queue
     */
    clearUploadQueue() {
        this.filesToUpload = []
    }
}

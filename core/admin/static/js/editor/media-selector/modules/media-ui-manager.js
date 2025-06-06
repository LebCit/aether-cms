/**
 * UI Media Manager
 * Handles UI components for media selection
 */
import { getDocumentIcon } from "./media-utils.js"

class UIMediaManager {
    constructor() {
        // DOM Elements
        this.modal = document.getElementById("media-selection-modal")
        this.modalTitle = document.getElementById("media-modal-title")
        this.modalGrid = document.getElementById("modal-media-grid")
        this.modalSearch = document.getElementById("modal-media-search")
        this.modalFilter = document.getElementById("modal-media-filter")
        this.modalLoading = document.getElementById("modal-loading")
        this.modalEmpty = document.getElementById("modal-empty")
        this.cancelButton = document.getElementById("cancel-media-selection")
        this.confirmButton = document.getElementById("confirm-media-selection")
        this.featuredImageButton = document.getElementById("select-featured-image")
        this.featuredImagePreview = document.getElementById("featured-image-preview")
    }

    /**
     * Show loading state in the modal
     * @param {boolean} show - Whether to show loading state
     */
    showLoading(show) {
        if (this.modalLoading) {
            this.modalLoading.classList.toggle("hidden", !show)
        }
    }

    /**
     * Show empty state in the modal
     * @param {boolean} show - Whether to show empty state
     */
    showEmptyState(show) {
        if (this.modalEmpty) {
            this.modalEmpty.classList.toggle("hidden", !show)
        }
    }

    /**
     * Show the media modal
     * @param {string} title - Modal title
     * @param {string} filterType - Initial filter type
     * @param {boolean} disableFilter - Whether to disable the filter dropdown
     */
    showModal(title, filterType = "image", disableFilter = false) {
        if (!this.modal) return

        // Reset modal state
        if (this.modalSearch) {
            this.modalSearch.value = ""
        }

        if (this.modalFilter) {
            this.modalFilter.value = filterType
            this.modalFilter.disabled = disableFilter
        }

        // Update modal title
        if (this.modalTitle) {
            this.modalTitle.textContent = title
        }

        // Show loading state
        this.showLoading(true)
        if (this.modalGrid) {
            this.modalGrid.innerHTML = ""
        }
        this.showEmptyState(false)

        // Show the modal
        this.modal.classList.add("show")
    }

    /**
     * Hide the media modal
     */
    hideModal() {
        if (!this.modal) return
        this.modal.classList.remove("show")
    }

    /**
     * Render the media grid
     * @param {Array} mediaItems - Array of media items to render
     * @param {Set} selectedItems - Set of selected item IDs
     * @param {string} selectionMode - Selection mode ('single' or 'multiple')
     * @param {string} filterType - Type to filter by
     * @param {string} searchQuery - Search query
     * @param {Function} onItemClick - Item click handler
     */
    renderMediaGrid(mediaItems, selectedItems, selectionMode, filterType, searchQuery, onItemClick) {
        if (!this.modalGrid) return

        const filteredItems = mediaItems.filter((item) => {
            // Filter by type
            const matchesType = filterType === "all" || filterType === item.type

            // Filter by search query
            const matchesSearch =
                searchQuery === "" ||
                item.filename.toLowerCase().includes(searchQuery) ||
                (item.alt && item.alt.toLowerCase().includes(searchQuery))

            return matchesType && matchesSearch
        })

        // Sort by newest first
        filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        // Clear grid
        this.modalGrid.innerHTML = ""

        // Show empty state if no items match filters
        if (filteredItems.length === 0) {
            this.showEmptyState(true)
            return
        } else {
            this.showEmptyState(false)
        }

        // Render items
        filteredItems.forEach((item) => {
            const isSelected = selectedItems.has(item.id)
            const mediaItem = document.createElement("div")
            mediaItem.className = `modal-media-item ${isSelected ? "selected" : ""}`
            mediaItem.dataset.id = item.id

            if (item.type === "image") {
                mediaItem.innerHTML = `<img src="/content/uploads${item.url}" alt="${item.alt || ""}">`
            } else {
                // Document preview
                const icon = getDocumentIcon(item.filename)
                mediaItem.innerHTML = `<div class="document-icon">${icon}</div>`
                mediaItem.classList.add("document")
            }

            // Add click handler for selection
            mediaItem.addEventListener("click", () => onItemClick(item, mediaItem))

            this.modalGrid.appendChild(mediaItem)
        })
    }

    /**
     * Update featured image preview
     * @param {Object|null} featuredImage - Featured image data or null to remove
     * @param {Function} onSelectClick - Handler for select button click
     * @param {Function} onRemoveClick - Handler for remove button click
     */
    updateFeaturedImagePreview(featuredImage, onSelectClick, onRemoveClick) {
        if (!this.featuredImagePreview) return

        if (!featuredImage) {
            this.featuredImagePreview.innerHTML = `
                <button id="select-featured-image" class="btn btn-sm btn-outline">Set Featured Image</button>
            `

            // Add event listener to the new select button
            const selectButton = this.featuredImagePreview.querySelector("#select-featured-image")
            if (selectButton) {
                selectButton.addEventListener("click", onSelectClick)
            }
        } else {
            this.featuredImagePreview.innerHTML = `
                <img src="/content/uploads${featuredImage.url}" alt="${featuredImage.alt || ""}">
                <button class="remove-featured-image">Remove</button>
            `

            // Add event listener to the new remove button
            const removeButton = this.featuredImagePreview.querySelector(".remove-featured-image")
            if (removeButton) {
                removeButton.addEventListener("click", onRemoveClick)
            }
        }
    }
}

// Export a singleton instance
export const uiMediaManager = new UIMediaManager()

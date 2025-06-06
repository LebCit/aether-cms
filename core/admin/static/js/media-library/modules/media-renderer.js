/**
 * Media Renderer Module
 * Handles all UI rendering for the media library
 */
export class MediaRenderer {
    /**
     * @param {Object} state - The MediaState instance
     * @param {Object} utils - The MediaUtils instance
     * @param {Object} notification - The NotificationService instance
     */
    constructor(state, utils, notification) {
        this.state = state
        this.utils = utils
        this.notification = notification

        // DOM references
        this.mediaGrid = document.getElementById("media-grid")
        this.emptyState = document.getElementById("empty-state")
        this.loadingState = document.getElementById("loading-state")
    }

    /**
     * Render the media grid with the provided items
     * @param {Array} items - The media items to render
     */
    renderMediaGrid(items = []) {
        this.mediaGrid.innerHTML = ""

        items.forEach((item) => {
            // Force type assignment if missing
            if (!item.type) {
                const fileExt = this.utils.getFileExtension(item.filename || "")
                const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp", "ico", "avif"].includes(fileExt)
                item.type = isImage ? "image" : "document"
            }

            const isSelected = this.state.selectedItems.has(item.id)
            const mediaItem = document.createElement("div")
            mediaItem.className = `media-item ${isSelected ? "selected" : ""}`
            mediaItem.dataset.id = item.id

            if (item.type === "image") {
                mediaItem.innerHTML = `
                <div class="media-item-preview">
                    <img src="/content/uploads${item.url}" alt="${item.alt || ""}">
                </div>
                <div class="media-item-info">
                    <div class="media-item-filename">${this.utils.truncateFilename(item.filename, 18)}</div>
                    <div class="media-item-meta">
                        ${this.utils.formatFileSize(item.size)}
                    </div>
                </div>
                <div class="media-item-actions">
                    <button class="media-item-select" title="${isSelected ? "Deselect" : "Select"}">
                        ${isSelected ? "✓" : ""}
                    </button>
                </div>
            `
            } else {
                mediaItem.classList.add("document")

                // Determine document icon based on extension
                const fileExt = this.utils.getFileExtension(item.filename)
                const icon = this.utils.getDocumentIcon(fileExt)

                mediaItem.innerHTML = `
                <div class="media-item-preview">
                    <div class="document-icon">${icon}</div>
                </div>
                <div class="media-item-info">
                    <div class="media-item-filename">${this.utils.truncateFilename(item.filename, 18)}</div>
                    <div class="media-item-meta">
                        ${this.utils.formatFileSize(item.size)}
                    </div>
                </div>
                <div class="media-item-actions">
                    <button class="media-item-select" title="${isSelected ? "Deselect" : "Select"}">
                        ${isSelected ? "✓" : ""}
                    </button>
                </div>
            `
            }

            // Add click event for item selection
            mediaItem.querySelector(".media-item-select").addEventListener("click", (e) => {
                e.stopPropagation() // Prevent opening sidebar
                document.dispatchEvent(
                    new CustomEvent("toggle-item-selection", {
                        detail: { itemId: item.id },
                    })
                )
            })

            // Add keyboard support for the select button
            mediaItem.querySelector(".media-item-select").addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.stopPropagation()
                    document.dispatchEvent(
                        new CustomEvent("toggle-item-selection", {
                            detail: { itemId: item.id },
                        })
                    )
                }
            })

            // Add click event for opening sidebar
            mediaItem.addEventListener("click", (e) => {
                // If we didn't click the select button, open the sidebar
                if (!e.target.classList.contains("media-item-select")) {
                    document.dispatchEvent(
                        new CustomEvent("open-media-sidebar", {
                            detail: { itemId: item.id },
                        })
                    )
                }
            })

            // Add keyboard event handling for individual items
            mediaItem.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    // Space/Enter opens the sidebar
                    document.dispatchEvent(
                        new CustomEvent("open-media-sidebar", {
                            detail: { itemId: item.id },
                        })
                    )
                }
            })

            // Make the media item focusable
            mediaItem.tabIndex = 0
            mediaItem.setAttribute("aria-label", `${item.type} ${item.filename}${isSelected ? " (selected)" : ""}`)

            this.mediaGrid.appendChild(mediaItem)
        })
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const paginationElement = document.getElementById("media-pagination")
        paginationElement.innerHTML = ""

        if (this.state.totalPages <= 1) {
            paginationElement.style.display = "none"
            return
        }

        paginationElement.style.display = "flex"

        // Previous button
        const prevButton = document.createElement("div")
        prevButton.className = `pagination-item ${this.state.currentPage === 1 ? "disabled" : ""}`
        prevButton.innerHTML = "&laquo;"
        if (this.state.currentPage > 1) {
            prevButton.addEventListener("click", () => {
                this.state.currentPage--
                document.dispatchEvent(new CustomEvent("filters-changed"))
                // Scroll to top of the grid
                this.mediaGrid.scrollIntoView({ behavior: "smooth" })
            })
        }
        paginationElement.appendChild(prevButton)

        // Page numbers
        const maxVisiblePages = 5
        let startPage = Math.max(1, this.state.currentPage - Math.floor(maxVisiblePages / 2))
        let endPage = Math.min(this.state.totalPages, startPage + maxVisiblePages - 1)

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1)
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement("div")
            pageButton.className = `pagination-item ${i === this.state.currentPage ? "active" : ""}`
            pageButton.textContent = i

            if (i !== this.state.currentPage) {
                pageButton.addEventListener("click", () => {
                    this.state.currentPage = i
                    document.dispatchEvent(new CustomEvent("filters-changed"))
                    // Scroll to top of the grid
                    this.mediaGrid.scrollIntoView({ behavior: "smooth" })
                })
            }

            paginationElement.appendChild(pageButton)
        }

        // Next button
        const nextButton = document.createElement("div")
        nextButton.className = `pagination-item ${this.state.currentPage === this.state.totalPages ? "disabled" : ""}`
        nextButton.innerHTML = "&raquo;"
        if (this.state.currentPage < this.state.totalPages) {
            nextButton.addEventListener("click", () => {
                this.state.currentPage++
                document.dispatchEvent(new CustomEvent("filters-changed"))
                // Scroll to top of the grid
                this.mediaGrid.scrollIntoView({ behavior: "smooth" })
            })
        }
        paginationElement.appendChild(nextButton)
    }

    /**
     * Update UI elements for selected items
     */
    updateSelectedUI() {
        document.getElementById("selected-items").textContent = this.state.selectedItems.size

        if (this.state.selectedItems.size > 0) {
            document.getElementById("bulk-actions").classList.remove("hidden")
        } else {
            document.getElementById("bulk-actions").classList.add("hidden")
        }

        // Update the selection state of items in the grid
        this.state.selectedItems.forEach((itemId) => {
            const mediaItem = this.mediaGrid.querySelector(`.media-item[data-id="${itemId}"]`)
            if (mediaItem) {
                mediaItem.classList.add("selected")
                const selectButton = mediaItem.querySelector(".media-item-select")
                selectButton.innerHTML = "✓"
                selectButton.title = "Deselect"
            }
        })
    }

    /**
     * Render the delete confirmation preview
     * @param {Array} itemIds - Array of item IDs to show in preview
     */
    renderDeletePreview(itemIds) {
        const deletePreview = document.getElementById("delete-preview")
        deletePreview.innerHTML = ""

        // Find the items to delete
        const itemsToDelete = itemIds.map((id) => this.state.findMediaItem(id)).filter(Boolean)

        // Update the confirmation message
        const modalBody = document.getElementById("delete-media-modal").querySelector(".modal-body p")
        modalBody.textContent =
            itemsToDelete.length === 1
                ? "Are you sure you want to delete this item? This action cannot be undone."
                : `Are you sure you want to delete these ${itemsToDelete.length} items? This action cannot be undone.`

        // Add preview images (max 8, then show count)
        const maxPreviewItems = 8
        const previewItems = itemsToDelete.slice(0, maxPreviewItems)

        previewItems.forEach((item) => {
            const previewItem = document.createElement("div")
            previewItem.className = "delete-preview-item"
            previewItem.dataset.id = item.id

            if (item.type === "image") {
                previewItem.innerHTML = `<img src="/content/uploads${item.url}" alt="${item.alt || ""}">`
            } else {
                const fileExt = this.utils.getFileExtension(item.filename)
                const icon = this.utils.getDocumentIcon(fileExt)
                previewItem.innerHTML = `<div class="document-icon">${icon}</div>`
            }

            deletePreview.appendChild(previewItem)
        })

        // Add count if there are more items
        if (itemsToDelete.length > maxPreviewItems) {
            const countElem = document.createElement("div")
            countElem.className = "delete-count"
            countElem.textContent = `+${itemsToDelete.length - maxPreviewItems} more`
            deletePreview.appendChild(countElem)
        }
    }

    /**
     * Show or hide the loading state
     * @param {boolean} show - Whether to show the loading state
     */
    showLoading(show) {
        this.loadingState.classList.toggle("hidden", !show)
    }

    /**
     * Show or hide the empty state
     * @param {boolean} show - Whether to show the empty state
     */
    showEmptyState(show) {
        this.emptyState.classList.toggle("hidden", !show)
        this.mediaGrid.style.display = show ? "none" : "grid"
    }
}

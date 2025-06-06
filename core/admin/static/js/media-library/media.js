/**
 * Media Library JavaScript - Main Module
 * Initializes and coordinates the media library components
 */

import { MediaState } from "./modules/media-state.js"
import { MediaRenderer } from "./modules/media-renderer.js"
import { UploadHandler } from "./modules/upload-handler.js"
import { MediaFormHandler } from "./modules/media-form-handler.js"
import { SelectionManager } from "./modules/selection-manager.js"
import { MediaApiService } from "./modules/media-api-service.js"
import { NotificationService } from "./modules/notification-service.js"
import { MediaUtils } from "./modules/media-utils.js"

document.addEventListener("DOMContentLoaded", function () {
    // Create services
    const apiService = new MediaApiService()
    const notification = new NotificationService()
    const utils = new MediaUtils()

    // Create state with dependencies
    const state = new MediaState()

    // Create managers with dependencies
    const renderer = new MediaRenderer(state, utils, notification)
    const uploadHandler = new UploadHandler(state, apiService, renderer, utils, notification)
    const formHandler = new MediaFormHandler(state, apiService, renderer, notification)
    const selectionManager = new SelectionManager(state, renderer, notification)

    // Initialize the application
    init()

    /**
     * Initialize the application
     */
    function init() {
        // Load initial data
        loadMediaItems()

        // Set up filter and search event listeners
        initFilterHandlers()

        // Set up custom events
        initCustomEvents()

        // Add keyboard navigation support
        initKeyboardNavigation()
    }

    /**
     * Initialize custom events
     */
    function initCustomEvents() {
        // Event for when filters change
        document.addEventListener("filters-changed", () => {
            applyFiltersAndRender()
        })

        // Event for explicit apply filters and render
        document.addEventListener("apply-filters-and-render", () => {
            applyFiltersAndRender()
        })

        // Event for handling delete modal
        document.addEventListener("open-delete-modal", (e) => {
            formHandler.showDeleteConfirmation(e.detail.itemIds)
        })
    }

    /**
     * Load media items from the API
     */
    async function loadMediaItems() {
        try {
            renderer.showLoading(true)

            const data = await apiService.getMediaItems()

            if (data.success) {
                state.setMediaItems(data.data)

                // Update UI
                if (state.mediaItems.length === 0) {
                    renderer.showEmptyState(true)
                } else {
                    renderer.showEmptyState(false)
                    applyFiltersAndRender()
                }

                document.getElementById("total-items").textContent = state.mediaItems.length
            } else {
                console.error("Error loading media:", data.error)
                renderer.showEmptyState(true)
            }
        } catch (error) {
            console.error("Error fetching media:", error)
            renderer.showEmptyState(true)
        } finally {
            renderer.showLoading(false)
        }
    }

    /**
     * Initialize filter and search handlers
     */
    function initFilterHandlers() {
        // Search input
        document.getElementById("media-search").addEventListener("input", function () {
            state.filterQuery = this.value.trim().toLowerCase()
            state.currentPage = 1
            applyFiltersAndRender()
        })

        // Filter by type
        document.getElementById("media-filter-type").addEventListener("change", function () {
            state.filterType = this.value
            state.currentPage = 1
            applyFiltersAndRender()
        })

        // Sort by
        document.getElementById("media-sort").addEventListener("change", function () {
            state.sortBy = this.value
            applyFiltersAndRender()
        })
    }

    /**
     * Apply filters and sorting, then render the grid
     */
    function applyFiltersAndRender() {
        // Apply filters
        let filteredItems = state.mediaItems.filter((item) => {
            // Text search
            const matchesSearch =
                state.filterQuery === "" ||
                (item.filename && item.filename.toLowerCase().includes(state.filterQuery)) ||
                (item.alt && item.alt.toLowerCase().includes(state.filterQuery))

            // Type filter
            const matchesType =
                state.filterType === "all" ||
                (state.filterType === "image" && item.type === "image") ||
                (state.filterType === "document" && item.type === "document")

            return matchesSearch && matchesType
        })

        // Apply sorting
        switch (state.sortBy) {
            case "newest":
                filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                break
            case "oldest":
                filteredItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                break
            case "name":
                filteredItems.sort((a, b) => (a.filename || "").localeCompare(b.filename || ""))
                break
            case "size":
                filteredItems.sort((a, b) => (b.size || 0) - (a.size || 0))
                break
        }

        // Paginate
        state.totalPages = Math.ceil(filteredItems.length / state.itemsPerPage)
        const startIndex = (state.currentPage - 1) * state.itemsPerPage
        const paginatedItems = filteredItems.slice(startIndex, startIndex + state.itemsPerPage)

        // Render grid and pagination
        renderer.renderMediaGrid(paginatedItems)
        renderer.renderPagination()

        // Update selection UI
        selectionManager.updateBulkActionsUI()
    }

    /**
     * Initialize keyboard navigation for media items
     */
    function initKeyboardNavigation() {
        document.addEventListener("keydown", (e) => {
            // Handle Escape key for deselecting items
            if (e.key === "Escape") {
                // Check if any media items are currently focused
                const focusedMediaItem = document.querySelector(".media-item:focus-within")

                if (focusedMediaItem) {
                    // Get the item ID
                    const itemId = focusedMediaItem.dataset.id

                    // Check if this item is selected
                    if (state.selectedItems.has(itemId)) {
                        // Deselect the item
                        document.dispatchEvent(
                            new CustomEvent("toggle-item-selection", {
                                detail: { itemId: itemId },
                            })
                        )

                        // Prevent the escape from bubbling up (so it doesn't close sidebar if open)
                        e.stopPropagation()
                    }
                }

                // If no specific item is focused but there are selected items, deselect all
                else if (state.selectedItems.size > 0 && document.activeElement.closest(".media-container")) {
                    selectionManager.clearSelection()
                    e.stopPropagation()
                }
            }
        })
    }
})
